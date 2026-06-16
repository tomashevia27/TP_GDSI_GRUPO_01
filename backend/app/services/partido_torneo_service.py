from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, time
from collections import defaultdict

from ..models.tabla_posicion import TablaPosiciones
from ..models.cancha_model import Cancha
from ..models.torneo_model import Torneo, FormatoTorneo
from ..models.partido_torneo import EstadoPartidoTorneo, PartidoTorneo, FaseTorneo
from ..models.partido_torneo import PartidoTorneo
from ..models.estadistica_jugador_partido_torneo import EstadisticaJugadorPartidoTorneo
from ..repositories import cancha_repository, partido_repository
from ..schemas.partido_torneo_schemas import (
    CargarResultadoRequest,
    ProgramarPartidoRequest,
    EstadisticasTorneoResponse,
    EstadisticaJugadorTorneoResponse,
    EstadisticaEquipoTorneoResponse,
    BracketResponse,
    FixtureResponse,
)
from ..schemas.partido_torneo_schemas import TopJugadorResponse, TablaPosicionResponse, VallaInvictaResponse
from ..services.fixture.eliminacion_directa_generator import EliminacionDirectaGenerator    

def obtener_partidos_torneo(db: Session, torneo_id: int) -> list[PartidoTorneo]:
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return db.query(PartidoTorneo).filter(PartidoTorneo.torneo_id == torneo_id).all()

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


def programar_partido(db: Session, partido_id: int, data: ProgramarPartidoRequest, user_id: int):
    partido = db.query(PartidoTorneo).filter(PartidoTorneo.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    if partido.torneo.organizador_id != user_id:
        raise HTTPException(
            status_code=403, 
            detail="Solo el organizador del torneo puede programar partidos"
        )

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

    if partido.equipo_local_id is None or partido.equipo_visitante_id is None:
        raise HTTPException(
            status_code=400, 
            detail="No se puede cargar el resultado porque aún no se han definido los dos equipos."
        )

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


def top_jugadores_por_goles(db: Session, torneo_id: int, limit: int = 10) -> list[TopJugadorResponse]:
    registros = db.query(EstadisticaJugadorPartidoTorneo).filter(
        EstadisticaJugadorPartidoTorneo.torneo_id == torneo_id
    ).all()

    acumulado = {}
    for r in registros:
        key = (r.usuario_id, r.equipo_id)
        acumulado.setdefault(key, {"usuario": r.usuario, "equipo": r.equipo, "valor": 0})
        acumulado[key]["valor"] += r.goles

    items = [TopJugadorResponse(
        usuario_id=k[0],
        usuario_nombre=v["usuario"].nombre if v["usuario"] else "",
        usuario_apellido=v["usuario"].apellido if v["usuario"] else "",
        equipo_id=k[1],
        equipo_nombre=v["equipo"].nombre if v["equipo"] else "",
        valor=v["valor"],
    ) for k, v in acumulado.items()]

    items.sort(key=lambda x: x.valor, reverse=True)
    return items[:limit]


def top_jugadores_por_amarillas(db: Session, torneo_id: int, limit: int = 10) -> list[TopJugadorResponse]:
    registros = db.query(EstadisticaJugadorPartidoTorneo).filter(
        EstadisticaJugadorPartidoTorneo.torneo_id == torneo_id
    ).all()

    acumulado = {}
    for r in registros:
        key = (r.usuario_id, r.equipo_id)
        acumulado.setdefault(key, {"usuario": r.usuario, "equipo": r.equipo, "valor": 0})
        acumulado[key]["valor"] += r.amarillas

    items = [TopJugadorResponse(
        usuario_id=k[0],
        usuario_nombre=v["usuario"].nombre if v["usuario"] else "",
        usuario_apellido=v["usuario"].apellido if v["usuario"] else "",
        equipo_id=k[1],
        equipo_nombre=v["equipo"].nombre if v["equipo"] else "",
        valor=v["valor"],
    ) for k, v in acumulado.items()]

    items.sort(key=lambda x: x.valor, reverse=True)
    return items[:limit]


def top_jugadores_por_rojas(db: Session, torneo_id: int, limit: int = 10) -> list[TopJugadorResponse]:
    registros = db.query(EstadisticaJugadorPartidoTorneo).filter(
        EstadisticaJugadorPartidoTorneo.torneo_id == torneo_id
    ).all()

    acumulado = {}
    for r in registros:
        key = (r.usuario_id, r.equipo_id)
        acumulado.setdefault(key, {"usuario": r.usuario, "equipo": r.equipo, "valor": 0})
        acumulado[key]["valor"] += r.rojas

    items = [TopJugadorResponse(
        usuario_id=k[0],
        usuario_nombre=v["usuario"].nombre if v["usuario"] else "",
        usuario_apellido=v["usuario"].apellido if v["usuario"] else "",
        equipo_id=k[1],
        equipo_nombre=v["equipo"].nombre if v["equipo"] else "",
        valor=v["valor"],
    ) for k, v in acumulado.items()]

    items.sort(key=lambda x: x.valor, reverse=True)
    return items[:limit]


def tabla_posiciones_torneo(db: Session, torneo_id: int) -> list[TablaPosicionResponse]:
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if not torneo:
        return []

    # Mapa de posiciones existentes por equipo_id
    posiciones_existentes = db.query(TablaPosiciones).filter(TablaPosiciones.torneo_id == torneo_id).all()
    posiciones_map = {pos.equipo_id: pos for pos in posiciones_existentes}

    tabla = []
    for equipo in torneo.equipos_inscriptos:
        pos = posiciones_map.get(equipo.id)
        if pos:
            tabla.append(TablaPosicionResponse(
                equipo_id=equipo.id,
                equipo_nombre=equipo.nombre,
                pts=pos.pts,
                pj=pos.pj,
                pg=pos.pg,
                pe=pos.pe,
                pp=pos.pp,
                gf=pos.gf,
                gc=pos.gc,
                dg=pos.dg,
            ))
        else:
            # Equipo inscripto pero sin partidos jugados aún
            tabla.append(TablaPosicionResponse(
                equipo_id=equipo.id,
                equipo_nombre=equipo.nombre,
                pts=0,
                pj=0,
                pg=0,
                pe=0,
                pp=0,
                gf=0,
                gc=0,
                dg=0,
            ))

    tabla.sort(key=lambda x: (x.pts, x.dg, x.gf, -x.gc), reverse=True)
    return tabla


def estadisticas_jugador_por_torneo(db: Session, torneo_id: int, usuario_id: int) -> list:
    registros = db.query(EstadisticaJugadorPartidoTorneo).filter(
        EstadisticaJugadorPartidoTorneo.torneo_id == torneo_id,
        EstadisticaJugadorPartidoTorneo.usuario_id == usuario_id,
    ).all()

    resultado = []
    for r in registros:
        partido = db.query(PartidoTorneo).filter(PartidoTorneo.id == r.partido_id).first()
        equipo_oponente_id = None
        equipo_oponente_nombre = None
        if partido:
            if partido.equipo_local_id == r.equipo_id:
                equipo_oponente_id = partido.equipo_visitante_id
                equipo_oponente_nombre = partido.equipo_visitante.nombre if partido.equipo_visitante else None
            else:
                equipo_oponente_id = partido.equipo_local_id
                equipo_oponente_nombre = partido.equipo_local.nombre if partido.equipo_local else None

        resultado.append({
            "partido_id": r.partido_id,
            "fecha": partido.fecha if partido else None,
            "equipo_id": r.equipo_id,
            "equipo_nombre": r.equipo.nombre if r.equipo else "",
            "equipo_oponente_id": equipo_oponente_id,
            "equipo_oponente_nombre": equipo_oponente_nombre,
            "goles": r.goles,
            "amarillas": r.amarillas,
            "rojas": r.rojas,
        })

    # order by partido fecha asc
    resultado.sort(key=lambda x: (x["fecha"] or date.min))
    return resultado



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
    
def obtener_bracket_torneo(db: Session, torneo_id: int) -> BracketResponse:
    fases_eliminatorias = [FaseTorneo.final, FaseTorneo.semifinal, FaseTorneo.cuartos, FaseTorneo.octavos]
    partidos = db.query(PartidoTorneo).filter(
        PartidoTorneo.torneo_id == torneo_id,
        PartidoTorneo.fase.in_(fases_eliminatorias)
    ).all()

    bracket_dict = {}
    for p in partidos:
        if p.fase.value not in bracket_dict:
            bracket_dict[p.fase.value] = []
        bracket_dict[p.fase.value].append(p)

    rondas = []
    orden_fases = [FaseTorneo.final, FaseTorneo.semifinal, FaseTorneo.cuartos, FaseTorneo.octavos]
    
    for fase in orden_fases:
        if fase.value in bracket_dict:
            rondas.append({
                "nombre": fase.value.capitalize(),
                "partidos": bracket_dict[fase.value]
            })
            
    return {"rondas": rondas}


def obtener_fixture_por_fechas(db: Session, torneo_id: int) -> FixtureResponse:
    partidos = db.query(PartidoTorneo).filter(
        PartidoTorneo.torneo_id == torneo_id,
        PartidoTorneo.fase.in_([FaseTorneo.grupos, FaseTorneo.liga]),
        PartidoTorneo.numero_fecha.isnot(None)
    ).order_by(PartidoTorneo.numero_fecha.asc()).all()

    fechas_dict = {}
    for p in partidos:
        if p.numero_fecha not in fechas_dict:
            fechas_dict[p.numero_fecha] = []
        fechas_dict[p.numero_fecha].append(p)

    lista_fechas = [
        {"numero": num, "partidos": partidos_lista}
        for num, partidos_lista in sorted(fechas_dict.items())
    ]
            
    return {"fechas": lista_fechas}

def top_equipos_vallas_invictas(db: Session, torneo_id: int, limit: int = 10) -> list[VallaInvictaResponse]:
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if not torneo:
        return []

    partidos = db.query(PartidoTorneo).filter(
        PartidoTorneo.torneo_id == torneo_id,
        PartidoTorneo.estado == EstadoPartidoTorneo.finalizado,
    ).all()

    # invictos por equipo_id
    invictos: dict[int, int] = {}
    for p in partidos:
        if p.goles_visitante == 0 and p.equipo_local_id:
            invictos[p.equipo_local_id] = invictos.get(p.equipo_local_id, 0) + 1
        if p.goles_local == 0 and p.equipo_visitante_id:
            invictos[p.equipo_visitante_id] = invictos.get(p.equipo_visitante_id, 0) + 1

    # todos los equipos aunque tengan 0
    resultado = [
        VallaInvictaResponse(
            equipo_id=equipo.id,
            equipo_nombre=equipo.nombre,
            partidos_invicto=invictos.get(equipo.id, 0),
        )
        for equipo in torneo.equipos_inscriptos
    ]

    resultado.sort(key=lambda x: x.partidos_invicto, reverse=True)
    return resultado[:limit]
