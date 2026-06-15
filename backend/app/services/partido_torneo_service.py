from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, time
from collections import defaultdict

from ..models.tabla_posicion import TablaPosiciones
from ..models.cancha_model import Cancha
from ..models.torneo_model import Torneo, FormatoTorneo
from ..models.partido_torneo import EstadoPartidoTorneo, PartidoTorneo, FaseTorneo
from ..models.estadistica_jugador_partido_torneo import EstadisticaJugadorPartidoTorneo
from ..repositories import cancha_repository, partido_repository
from ..schemas.partido_torneo_schemas import (
    CargarResultadoRequest,
    ProgramarPartidoRequest,
    EstadisticasTorneoResponse,
    EstadisticaJugadorTorneoResponse,
    EstadisticaEquipoTorneoResponse,
)
from ..services.fixture.eliminacion_directa_generator import EliminacionDirectaGenerator    


def _validar_reglas_torneo(cancha: Cancha, torneo: Torneo, fecha: date, horario: time):
    if cancha.zona != torneo.zona:
        raise HTTPException(status_code=400, detail=f"La cancha debe estar en la zona {torneo.zona}")

    try:
        inicio_franja, fin_franja = torneo.franja_horaria.split("-")
        hora_inicio = datetime.strptime(inicio_franja.strip(), "%H:%M").time()
        hora_fin = datetime.strptime(fin_franja.strip(), "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=500, detail="Formato de franja horaria del torneo inválido")

    if not (hora_inicio <= horario <= hora_fin):
        raise HTTPException(status_code=400, detail=f"El horario debe estar entre {inicio_franja} y {fin_franja}")


def _avanzar_ganador_a_siguiente_partido(siguiente_partido: PartidoTorneo, partido_actual: PartidoTorneo, data: CargarResultadoRequest):
    ganador_id = partido_actual.equipo_local_id if data.goles_local > data.goles_visitante else partido_actual.equipo_visitante_id
    
    if siguiente_partido.partido_padre_local_id == partido_actual.id:
        siguiente_partido.equipo_local_id = ganador_id
    else:
        siguiente_partido.equipo_visitante_id = ganador_id


def _verificar_fin_fase_grupos(db: Session, partido: PartidoTorneo):
    pendientes = db.query(PartidoTorneo).filter(
        PartidoTorneo.torneo_id == partido.torneo_id,
        PartidoTorneo.fase == FaseTorneo.grupos,
        PartidoTorneo.estado == EstadoPartidoTorneo.pendiente
    ).count()
    
    if pendientes == 0:
        generar_playoffs_desde_grupos(db, partido.torneo)


def programar_partido(db: Session, partido_id: int, data: ProgramarPartidoRequest):
    partido = db.query(PartidoTorneo).filter(PartidoTorneo.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    cancha = cancha_repository.obtener_por_id(db, data.cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    
    _validar_reglas_torneo(cancha, partido.torneo, data.fecha, data.horario)
    
    if not partido_repository.verificar_disponibilidad_cancha(
        db, data.cancha_id, data.fecha, data.horario, 
        duracion=cancha.duracion_turno, excluir_partido_id=partido_id, es_partido_torneo=True
    ):
        raise HTTPException(status_code=400, detail="La cancha está ocupada en ese horario")

    partido.cancha_id = data.cancha_id
    partido.fecha = data.fecha
    partido.horario = data.horario
    
    db.commit()
    db.refresh(partido)
    return partido

def generar_playoffs_desde_grupos(db: Session, torneo: Torneo):
    posiciones = db.query(TablaPosiciones).filter_by(torneo_id=torneo.id).all()
    
    grupos_dict = {}
    for pos in posiciones:
        grupos_dict.setdefault(pos.grupo, []).append(pos)
    
    for grupo in grupos_dict:
        grupos_dict[grupo].sort(key=lambda x: (x.pts, x.dg, x.gf), reverse=True)
    
    nombres_grupos = sorted(grupos_dict.keys()) 
    equipos_playoffs = []
    
    for i in range(0, len(nombres_grupos), 2):
        g1, g2 = nombres_grupos[i], nombres_grupos[i+1]
        
        g1_1 = grupos_dict[g1][0].equipo if len(grupos_dict[g1]) > 0 else None
        g1_2 = grupos_dict[g1][1].equipo if len(grupos_dict[g1]) > 1 else None
        g2_1 = grupos_dict[g2][0].equipo if len(grupos_dict[g2]) > 0 else None
        g2_2 = grupos_dict[g2][1].equipo if len(grupos_dict[g2]) > 1 else None
        
        equipos_playoffs.extend([g1_1, g2_2, g2_1, g1_2])

    equipos_playoffs = [eq for eq in equipos_playoffs if eq]
    
    generator = EliminacionDirectaGenerator()
    partidos_playoffs = generator.generar(torneo, equipos=equipos_playoffs)
    
    db.add_all(partidos_playoffs)


def cargar_resultado_partido(db: Session, partido_id: int, data: CargarResultadoRequest):
    
    partido = db.query(PartidoTorneo).filter(PartidoTorneo.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    if partido.estado != EstadoPartidoTorneo.pendiente:
        raise HTTPException(status_code=400, detail="El partido ya ha sido finalizado")

    hoy = datetime.now(partido_repository.TZ_LOCAL).date()
    if partido.fecha > hoy:
        raise HTTPException(status_code=400, detail="No podés cargar resultados de partidos futuros")

    # Si hay un partido siguiente en la llave (eliminación directa o playoffs de fase de grupos)
    siguiente_partido = db.query(PartidoTorneo).filter(
        (PartidoTorneo.partido_padre_local_id == partido.id) |
        (PartidoTorneo.partido_padre_visitante_id == partido.id)
    ).first()

    if siguiente_partido or partido.fase == FaseTorneo.final:
        if data.goles_local == data.goles_visitante:
            raise HTTPException(
                status_code=400,
                detail="Los partidos de eliminación directa no pueden terminar en empate"
            )

    partido.goles_local = data.goles_local
    partido.goles_visitante = data.goles_visitante
    partido.estado = EstadoPartidoTorneo.finalizado

    for estadistica in data.estadisticas_jugadores:
        if estadistica.goles == 0 and estadistica.amarillas == 0 and estadistica.rojas == 0:
            continue

        registro = db.query(EstadisticaJugadorPartidoTorneo).filter(
            EstadisticaJugadorPartidoTorneo.partido_id == partido.id,
            EstadisticaJugadorPartidoTorneo.usuario_id == estadistica.usuario_id,
        ).first()

        if not registro:
            registro = EstadisticaJugadorPartidoTorneo(
                torneo_id=partido.torneo_id,
                partido_id=partido.id,
                equipo_id=estadistica.equipo_id,
                usuario_id=estadistica.usuario_id,
                goles=0,
                amarillas=0,
                rojas=0,
            )
            db.add(registro)

        registro.goles = estadistica.goles
        registro.amarillas = estadistica.amarillas
        registro.rojas = estadistica.rojas
    
    if partido.torneo.formato in [FormatoTorneo.fase_grupos, FormatoTorneo.todos_contra_todos]:
        actualizar_tabla_posiciones(db, partido)

    db.flush()

    # Avanzar al ganador en la estructura de llaves si existe un siguiente partido
    if siguiente_partido:
        _avanzar_ganador_a_siguiente_partido(siguiente_partido, partido, data)

    # Si es fase_grupos, verificar si terminó la fase de grupos para generar playoffs
    if partido.torneo.formato == FormatoTorneo.fase_grupos and partido.fase == FaseTorneo.grupos:
        _verificar_fin_fase_grupos(db, partido)

    db.commit()
    db.refresh(partido)
    return partido


def obtener_estadisticas_torneo(db: Session, torneo_id: int) -> EstadisticasTorneoResponse:
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    registros = db.query(EstadisticaJugadorPartidoTorneo).filter(
        EstadisticaJugadorPartidoTorneo.torneo_id == torneo_id
    ).all()

    if not registros:
        return EstadisticasTorneoResponse()

    jugadores = defaultdict(lambda: {"goles": 0, "amarillas": 0, "rojas": 0, "usuario": None, "equipo": None})
    equipos = defaultdict(lambda: {"goles": 0, "amarillas": 0, "rojas": 0, "nombre": None})

    for registro in registros:
        jugador_key = (registro.usuario_id, registro.equipo_id)
        jugador_bucket = jugadores[jugador_key]
        jugador_bucket["goles"] += registro.goles
        jugador_bucket["amarillas"] += registro.amarillas
        jugador_bucket["rojas"] += registro.rojas
        jugador_bucket["usuario"] = registro.usuario
        jugador_bucket["equipo"] = registro.equipo

        equipo_bucket = equipos[registro.equipo_id]
        equipo_bucket["goles"] += registro.goles
        equipo_bucket["amarillas"] += registro.amarillas
        equipo_bucket["rojas"] += registro.rojas
        equipo_bucket["nombre"] = registro.equipo.nombre

    jugadores_response = [
        EstadisticaJugadorTorneoResponse(
            usuario_id=usuario_id,
            usuario_nombre=data["usuario"].nombre if data["usuario"] else "",
            usuario_apellido=data["usuario"].apellido if data["usuario"] else "",
            equipo_id=equipo_id,
            equipo_nombre=data["equipo"].nombre if data["equipo"] else "",
            goles=data["goles"],
            amarillas=data["amarillas"],
            rojas=data["rojas"],
        )
        for (usuario_id, equipo_id), data in jugadores.items()
    ]

    equipos_response = [
        EstadisticaEquipoTorneoResponse(
            equipo_id=equipo_id,
            equipo_nombre=data["nombre"] or "",
            goles=data["goles"],
            amarillas=data["amarillas"],
            rojas=data["rojas"],
        )
        for equipo_id, data in equipos.items()
    ]

    jugadores_response.sort(key=lambda item: (item.goles, item.amarillas, item.rojas), reverse=True)
    equipos_response.sort(key=lambda item: (item.goles, item.amarillas, item.rojas), reverse=True)

    return EstadisticasTorneoResponse(jugadores=jugadores_response, equipos=equipos_response)



def actualizar_tabla_posiciones(db: Session, partido: PartidoTorneo):
    equipos_data = [
        {"id": partido.equipo_local_id, "gf": partido.goles_local, "gc": partido.goles_visitante},
        {"id": partido.equipo_visitante_id, "gf": partido.goles_visitante, "gc": partido.goles_local}
    ]

    for data in equipos_data:
        pos = db.query(TablaPosiciones).filter_by(
            torneo_id=partido.torneo_id, 
            equipo_id=data["id"]
        ).first()

        if not pos:
            pos = TablaPosiciones(
                torneo_id=partido.torneo_id, 
                equipo_id=data["id"], 
                grupo=partido.grupo,
                pj=0,
                pg=0,
                pe=0,
                pp=0,
                gf=0,
                gc=0,
                pts=0
            )
            db.add(pos)

        pos.pj += 1
        pos.gf += data["gf"]
        pos.gc += data["gc"]

        if data["gf"] > data["gc"]:
            pos.pg += 1
            pos.pts += 3
        elif data["gf"] == data["gc"]:
            pos.pe += 1
            pos.pts += 1
        else:
            pos.pp += 1
    