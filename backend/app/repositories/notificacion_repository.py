from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.notificacion_model import Notificacion

# Zona horaria de la aplicación (Argentina UTC-3)
TZ_LOCAL = timezone(timedelta(hours=-3))

# Límite máximo de notificaciones por usuario
MAX_NOTIFICACIONES = 50


def crear_notificacion(db: Session, usuario_id: int, tipo: str, mensaje: str, partido_id: int = None):
    """Crea una notificación y aplica el límite máximo por usuario."""
    notificacion = Notificacion(
        usuario_id=usuario_id,
        tipo=tipo,
        mensaje=mensaje,
        partido_id=partido_id,
        leida=False,
        fecha_creacion=datetime.now(TZ_LOCAL).replace(tzinfo=None)
    )
    db.add(notificacion)
    db.flush()

    # Aplicar límite: eliminar las más antiguas si se excede el máximo
    _aplicar_limite(db, usuario_id)

    return notificacion


def crear_notificaciones_bulk(db: Session, notificaciones_data: list):
    """Crea múltiples notificaciones en batch.
    
    Cada elemento de la lista debe ser un dict con:
    usuario_id, tipo, mensaje, partido_id (opcional)
    """
    ahora = datetime.now(TZ_LOCAL).replace(tzinfo=None)
    usuarios_afectados = set()

    for datos in notificaciones_data:
        notificacion = Notificacion(
            usuario_id=datos["usuario_id"],
            tipo=datos["tipo"],
            mensaje=datos["mensaje"],
            partido_id=datos.get("partido_id"),
            leida=False,
            fecha_creacion=ahora
        )
        db.add(notificacion)
        usuarios_afectados.add(datos["usuario_id"])

    db.flush()

    # Aplicar límite para cada usuario afectado
    for usuario_id in usuarios_afectados:
        _aplicar_limite(db, usuario_id)


def obtener_por_usuario(db: Session, usuario_id: int, solo_no_leidas: bool = False, limit: int = 50, offset: int = 0):
    """Obtiene las notificaciones de un usuario con paginación."""
    query = db.query(Notificacion).filter(Notificacion.usuario_id == usuario_id)

    if solo_no_leidas:
        query = query.filter(Notificacion.leida == False)

    return query.order_by(Notificacion.fecha_creacion.desc()).offset(offset).limit(limit).all()


def contar_no_leidas(db: Session, usuario_id: int) -> int:
    """Cuenta las notificaciones no leídas de un usuario."""
    return db.query(func.count(Notificacion.id)).filter(
        Notificacion.usuario_id == usuario_id,
        Notificacion.leida == False
    ).scalar()


def marcar_como_leida(db: Session, notificacion_id: int, usuario_id: int):
    """Marca una notificación como leída verificando que pertenece al usuario."""
    notificacion = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.usuario_id == usuario_id
    ).first()

    if notificacion:
        notificacion.leida = True
        db.flush()

    return notificacion


def marcar_todas_como_leidas(db: Session, usuario_id: int):
    """Marca todas las notificaciones del usuario como leídas."""
    db.query(Notificacion).filter(
        Notificacion.usuario_id == usuario_id,
        Notificacion.leida == False
    ).update({"leida": True})
    db.flush()


def eliminar_notificacion(db: Session, notificacion_id: int, usuario_id: int):
    """Elimina una notificación verificando que pertenece al usuario."""
    notificacion = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.usuario_id == usuario_id
    ).first()

    if notificacion:
        db.delete(notificacion)
        db.flush()
        return True

    return False


def eliminar_todas(db: Session, usuario_id: int):
    """Elimina todas las notificaciones de un usuario."""
    cantidad = db.query(Notificacion).filter(
        Notificacion.usuario_id == usuario_id
    ).delete()
    db.flush()
    return cantidad


def _aplicar_limite(db: Session, usuario_id: int):
    """Elimina las notificaciones más antiguas si se excede el límite máximo."""
    total = db.query(func.count(Notificacion.id)).filter(
        Notificacion.usuario_id == usuario_id
    ).scalar()

    if total > MAX_NOTIFICACIONES:
        exceso = total - MAX_NOTIFICACIONES
        # Obtener los IDs de las notificaciones más antiguas a eliminar
        ids_a_eliminar = db.query(Notificacion.id).filter(
            Notificacion.usuario_id == usuario_id
        ).order_by(Notificacion.fecha_creacion.asc()).limit(exceso).all()

        ids = [id_tuple[0] for id_tuple in ids_a_eliminar]
        if ids:
            db.query(Notificacion).filter(Notificacion.id.in_(ids)).delete(synchronize_session=False)
            db.flush()
