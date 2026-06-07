from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.equipo_model import Equipo
from app.models.usuario_model import Usuario

from ..models.torneo_model import Torneo, EstadoTorneo

def crear_torneo(db: Session, torneo: Torneo) -> Torneo:
    db.add(torneo)
    db.commit()
    db.refresh(torneo)
    return torneo

def obtener_por_id(db: Session, torneo_id: int) -> Optional[Torneo]:
    return db.query(Torneo).filter(Torneo.id == torneo_id).first()

def obtener_todos(db: Session, estado: Optional[EstadoTorneo] = None) -> List[Torneo]:
    query = db.query(Torneo)
    if estado:
        query = query.filter(Torneo.estado == estado)
    return query.all()

def obtener_torneos_por_usuario(db: Session, usuario_id: int) -> List[Torneo]:
    return db.query(Torneo).distinct().join(
        Torneo.equipos_inscriptos, isouter=True
    ).join(
        Equipo.jugadores, isouter=True 
    ).filter(
        or_(
            Torneo.organizador_id == usuario_id,
            Usuario.id == usuario_id    
        )
    ).all()