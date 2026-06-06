from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.models.usuario_model import Usuario

from ..models.torneo_model import Torneo, EstadoTorneo

def crear_torneo(db: Session, torneo: Torneo) -> Torneo:
    db.add(torneo)
    db.commit()
    db.refresh(torneo)
    return torneo

def obtener_por_id(db: Session, torneo_id: int) -> Optional[Torneo]:
    return db.query(Torneo).filter(Torneo.id == torneo_id).first()

def obtener_usuarios_por_ids(db: Session, ids: list[int]) -> list[Usuario]:
    return db.query(Usuario).filter(Usuario.id.in_(ids)).all()

def obtener_todos(db: Session, estado: Optional[EstadoTorneo] = None) -> List[Torneo]:
    query = db.query(Torneo)
    if estado:
        query = query.filter(Torneo.estado == estado)
    return query.all()
