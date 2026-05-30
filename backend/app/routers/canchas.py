from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from ..core.dependencies import get_db
from ..models.usuario_model import Usuario
from ..schemas.cancha_schemas import CanchaCreate, CanchaRespuesta, CanchaUpdate, AgendaRespuesta, TurnosRespuesta, TurnoSlot
from ..services import cancha_service
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/canchas", tags=["Canchas"])

@router.get("", response_model=List[CanchaRespuesta])
def obtener_canchas(db: Session = Depends(get_db)):
    """Obtiene todas las canchas registradas."""
    return cancha_service.obtener_todas(db)

@router.get("/me", response_model=List[CanchaRespuesta])
def obtener_mis_canchas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene solo las canchas del usuario autenticado si es dueño de cancha."""
    return cancha_service.obtener_mis_canchas(db, current_user)

@router.post("")
def crear_cancha(
    datos: CanchaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea una nueva cancha."""
    return cancha_service.crear_cancha(db, current_user, datos)

@router.get("/disponibles", response_model=List[CanchaRespuesta])
def obtener_canchas_disponibles(db: Session = Depends(get_db)):
    """Obtiene todas las canchas disponibles."""
    return cancha_service.obtener_activas(db)

@router.get("/{cancha_id}", response_model=CanchaRespuesta)
def obtener_cancha_por_id(cancha_id: int, db: Session = Depends(get_db)):
    """Obtiene una cancha por ID."""
    return cancha_service.obtener_por_id(db, cancha_id)

@router.put("/{cancha_id}")
def editar_cancha(
    cancha_id: int,
    datos: CanchaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Edita parcialmente las características de una cancha existente."""
    return cancha_service.editar_cancha(db, current_user, cancha_id, datos)

@router.delete("/{cancha_id}")
def eliminar_cancha(
    cancha_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Elimina una cancha si no tiene reservas activas."""
    return cancha_service.eliminar_cancha(db, current_user, cancha_id)

@router.delete("/admin/me")
def eliminar_canchas_por_admin(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Elimina todas las canchas de un administrador."""
    return cancha_service.eliminar_canchas_por_admin(db, current_user)

@router.get("/{cancha_id}/agenda", response_model=AgendaRespuesta)
def obtener_agenda_cancha(
    cancha_id: int,
    fecha: date = Query(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la agenda de una cancha para una fecha específica (turnos disponible/ocupado)."""
    return cancha_service.obtener_agenda(db, current_user, cancha_id, fecha)


@router.get("/{cancha_id}/turnos", response_model=TurnosRespuesta)
def obtener_turnos_cancha(
    cancha_id: int,
    fecha: date = Query(...),
    excluir_partido_id: int = Query(None),
    db: Session = Depends(get_db),
):
    """Obtiene los turnos de una cancha para una fecha con su estado (disponible/ocupado/bloqueado).
    Endpoint público para usar al crear o editar partidos."""
    turnos = cancha_service.obtener_turnos_disponibles(db, cancha_id, fecha, excluir_partido_id)
    return TurnosRespuesta(
        cancha_id=cancha_id,
        fecha=fecha,
        slots=[TurnoSlot(**t) for t in turnos]
    )