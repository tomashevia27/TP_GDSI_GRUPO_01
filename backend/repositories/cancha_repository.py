from sqlalchemy.orm import Session
from ..models import Cancha


def guardar_cancha(db: Session, cancha: Cancha) -> Cancha:
    """Guarda una cancha en la base de datos."""
    db.add(cancha)
    db.commit()
    db.refresh(cancha)
    return cancha


def obtener_por_nombre_direccion_propietario(db: Session, nombre: str, direccion: str, propietario_id: int):
    """Busca si ya existe una cancha con el mismo nombre y dirección para un propietario."""
    return db.query(Cancha).filter(
        Cancha.nombre == nombre,
        Cancha.direccion == direccion,
        Cancha.propietario_id == propietario_id
    ).first()


def obtener_todas(db: Session):
    """Devuelve todas las canchas registradas."""
    return db.query(Cancha).all()
