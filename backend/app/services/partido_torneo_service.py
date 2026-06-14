from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, time
from ..models.cancha_model import Cancha
from ..models.torneo_model import Torneo
from ..models.partido_torneo import EstadoPartidoTorneo, PartidoTorneo
from ..repositories import cancha_repository, partido_repository
from ..schemas.partido_torneo_schemas import CargarResultadoRequest, ProgramarPartidoRequest

from ..models.cancha_model import Cancha

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

def cargar_resultado_partido(db: Session, partido_id: int, data: CargarResultadoRequest):
    
    partido = db.query(PartidoTorneo).filter(PartidoTorneo.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    if partido.estado != EstadoPartidoTorneo.pendiente:
        raise HTTPException(status_code=400, detail="El partido ya ha sido finalizado")

    hoy = datetime.now(partido_repository.TZ_LOCAL).date()
    if partido.fecha > hoy:
        raise HTTPException(status_code=400, detail="No podés cargar resultados de partidos futuros")

    partido.goles_local = data.goles_local
    partido.goles_visitante = data.goles_visitante
    partido.estado = EstadoPartidoTorneo.finalizado
    
    db.commit()
    db.refresh(partido)
    
    # actualizar_tabla_posiciones(db, partido.torneo_id)
    
    return partido