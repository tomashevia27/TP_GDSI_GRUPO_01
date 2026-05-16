from sqlalchemy.orm import Session
from ..models.cancha_model import Cancha
from fastapi import HTTPException

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


def obtener_activas(db: Session):
    """Devuelve solo las canchas activas."""
    return db.query(Cancha).filter(Cancha.activa == True).all()


def obtener_por_id(db: Session, cancha_id: int):
    cancha = db.query(Cancha).filter(Cancha.id == cancha_id).first()
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return cancha


def tiene_reservas_activas(db: Session, cancha_id: int) -> bool:
    """Verifica si una cancha tiene reservas activas."""
    # Aquí se debe implementar la lógica para verificar reservas activas
    # Por ejemplo, buscar en la tabla de reservas si hay alguna con estado activo para esta cancha
    reservas_activas = db.query(Reserva).filter(Reserva.cancha_id == cancha_id, Reserva.estado == "activa").count()
    return reservas_activas > 0


def eliminar_cancha(db: Session, cancha: Cancha):
    """Elimina o desactiva una cancha."""
    db.delete(cancha)
    db.commit()


def obtener_por_admin(db: Session, admin_id: int):
    """Obtiene todas las canchas de un administrador."""
    return db.query(Cancha).filter(Cancha.propietario_id == admin_id).all()