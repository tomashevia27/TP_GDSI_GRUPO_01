from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..repositories import notificacion_repository
from ..repositories import cancha_repository


def obtener_notificaciones(db: Session, usuario_id: int, solo_no_leidas: bool = False, limit: int = 50, offset: int = 0):
    """Obtiene las notificaciones del usuario con el conteo de no leídas."""
    notificaciones = notificacion_repository.obtener_por_usuario(
        db, usuario_id, solo_no_leidas, limit, offset
    )
    total_no_leidas = notificacion_repository.contar_no_leidas(db, usuario_id)

    return {
        "notificaciones": notificaciones,
        "total_no_leidas": total_no_leidas
    }


def contar_no_leidas(db: Session, usuario_id: int):
    """Obtiene el conteo de notificaciones no leídas."""
    return notificacion_repository.contar_no_leidas(db, usuario_id)


def marcar_como_leida(db: Session, notificacion_id: int, usuario_id: int):
    """Marca una notificación individual como leída."""
    notificacion = notificacion_repository.marcar_como_leida(db, notificacion_id, usuario_id)
    if not notificacion:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    db.commit()
    return notificacion


def marcar_todas_como_leidas(db: Session, usuario_id: int):
    """Marca todas las notificaciones del usuario como leídas."""
    notificacion_repository.marcar_todas_como_leidas(db, usuario_id)
    db.commit()
    return {"mensaje": "Todas las notificaciones fueron marcadas como leídas"}


def eliminar_notificacion(db: Session, notificacion_id: int, usuario_id: int):
    """Elimina una notificación individual."""
    eliminada = notificacion_repository.eliminar_notificacion(db, notificacion_id, usuario_id)
    if not eliminada:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    db.commit()
    return {"mensaje": "Notificación eliminada"}


def eliminar_todas(db: Session, usuario_id: int):
    """Elimina todas las notificaciones del usuario."""
    notificacion_repository.eliminar_todas(db, usuario_id)
    db.commit()
    return {"mensaje": "Todas las notificaciones fueron eliminadas"}


def crear_notificaciones_bulk(db: Session, usuarios_ids: set, tipo: str, mensaje: str, partido_id: int):
    """Crea notificaciones en bulk para un conjunto de IDs de usuario."""
    if not usuarios_ids:
        return
    notificaciones = [
        {"usuario_id": uid, "tipo": tipo, "mensaje": mensaje, "partido_id": partido_id}
        for uid in usuarios_ids
    ]
    notificacion_repository.crear_notificaciones_bulk(db, notificaciones)
