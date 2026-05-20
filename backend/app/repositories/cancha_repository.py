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
    from ..models.partido_model import Partido
    # Consideramos un partido "activo" si su estado es pendiente (u otro estado que indique confirmación)
    # si usamos tabla reservas se puede cambiar, por ahora chequeo con partidos
    reservas_activas = db.query(Partido).filter(Partido.cancha_id == cancha_id, Partido.estado != "cancelado").count()
    return reservas_activas > 0

def tiene_reservas_activas_futuras(db: Session, cancha_id: int) -> bool:
    """Verifica si una cancha tiene reservas activas a partir de hoy."""
    from ..models.partido_model import Partido
    from datetime import date
    reservas_activas = db.query(Partido).filter(
        Partido.cancha_id == cancha_id, 
        Partido.estado != "cancelado",
        Partido.fecha >= date.today()
    ).count()
    return reservas_activas > 0


def eliminar_cancha(db: Session, cancha: Cancha):
    """Elimina o desactiva una cancha."""
    db.delete(cancha)
    db.commit()


def obtener_por_admin(db: Session, admin_id: int):
    """Obtiene todas las canchas de un administrador."""
    return db.query(Cancha).filter(Cancha.propietario_id == admin_id).all()