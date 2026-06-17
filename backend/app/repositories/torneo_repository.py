from sqlalchemy import or_, select, exists
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from ..models.equipo_model import Equipo
from ..models.usuario_model import Usuario

from ..models.torneo_model import Torneo, EstadoTorneo

def crear_torneo(db: Session, torneo: Torneo) -> Torneo:
    db.add(torneo)
    db.commit()
    db.refresh(torneo)
    return torneo

def actualizar_torneo(db: Session, torneo: Torneo, update_data: dict) -> Torneo:
    for key, value in update_data.items():
        setattr(torneo, key, value)
    db.commit()
    db.refresh(torneo)
    return torneo

def obtener_por_id(db: Session, torneo_id: int) -> Optional[Torneo]:
    return db.query(Torneo).options(
        joinedload(Torneo.organizador),
        joinedload(Torneo.equipos_inscriptos).joinedload(Equipo.jugadores)
    ).filter(Torneo.id == torneo_id).first()

def verificar_jugadores_inscriptos(db: Session, torneo_id: int, jugador_ids: List[int]) -> List[Usuario]:
    """Devuelve los jugadores que ya están inscriptos en algún equipo del torneo especificado."""
    return db.query(Usuario).join(Equipo.jugadores).join(Equipo.torneos).filter(
        Torneo.id == torneo_id,
        Usuario.id.in_(jugador_ids)
    ).all()

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