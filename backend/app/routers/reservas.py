from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.usuario_model import Usuario
from ..schemas.partido_schemas import ReservaManualCreate, PartidoRespuesta
from ..services import partido_service
from ..security import get_current_user

router = APIRouter(prefix="/reservas", tags=["Reservas"])


@router.post("/manual", response_model=PartidoRespuesta)
def crear_reserva_manual(
    datos: ReservaManualCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea una reserva manual en la agenda del dueño de cancha."""
    return partido_service.crear_reserva_manual(db, current_user, datos)


@router.post("/bloquear", response_model=PartidoRespuesta)
def crear_bloqueo_turno(
    datos: ReservaManualCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Bloquea un turno para que no esté disponible para reservas."""
    return partido_service.crear_bloqueo_turno(db, current_user, datos)


@router.delete("/bloquear/{partido_id}")
def eliminar_bloqueo_turno(
    partido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Desbloquea un turno previamente bloqueado."""
    return partido_service.eliminar_bloqueo_turno(db, current_user, partido_id)
