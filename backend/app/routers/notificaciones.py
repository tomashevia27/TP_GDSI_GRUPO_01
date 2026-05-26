from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.usuario_model import Usuario
from ..schemas.notificacion_schemas import (
    NotificacionRespuesta,
    NotificacionesListado,
    ConteoNoLeidas,
    MensajeRespuesta
)
from ..services import notificacion_service
from ..security import get_current_user

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get("", response_model=NotificacionesListado)
def obtener_notificaciones(
    solo_no_leidas: bool = Query(False, description="Filtrar solo las no leídas"),
    limit: int = Query(50, ge=1, le=50, description="Cantidad máxima de notificaciones"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene las notificaciones del usuario autenticado."""
    return notificacion_service.obtener_notificaciones(
        db, current_user.id, solo_no_leidas, limit, offset
    )


@router.get("/no-leidas/count", response_model=ConteoNoLeidas)
def contar_no_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la cantidad de notificaciones no leídas (para el badge)."""
    total = notificacion_service.contar_no_leidas(db, current_user.id)
    return {"total_no_leidas": total}


@router.patch("/{notificacion_id}/leer", response_model=NotificacionRespuesta)
def marcar_como_leida(
    notificacion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Marca una notificación como leída."""
    return notificacion_service.marcar_como_leida(db, notificacion_id, current_user.id)


@router.patch("/leer-todas", response_model=MensajeRespuesta)
def marcar_todas_como_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Marca todas las notificaciones del usuario como leídas."""
    return notificacion_service.marcar_todas_como_leidas(db, current_user.id)


@router.delete("/{notificacion_id}", response_model=MensajeRespuesta)
def eliminar_notificacion(
    notificacion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Elimina una notificación individual."""
    return notificacion_service.eliminar_notificacion(db, notificacion_id, current_user.id)


@router.delete("", response_model=MensajeRespuesta)
def eliminar_todas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Elimina todas las notificaciones del usuario."""
    return notificacion_service.eliminar_todas(db, current_user.id)
