from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..schemas.cancha_schemas import CanchaCreate, CanchaRespuesta, CanchaUpdate
from ..services import cancha_service

router = APIRouter(prefix="/canchas", tags=["Canchas"])

@router.get("", response_model=List[CanchaRespuesta])
def obtener_canchas(db: Session = Depends(get_db)):
    """Obtiene todas las canchas registradas."""
    return cancha_service.obtener_todas(db)

@router.post("")
def crear_cancha(datos: CanchaCreate, db: Session = Depends(get_db)):
    """Crea una nueva cancha."""
    return cancha_service.crear_cancha(db, datos)

@router.get("/disponibles", response_model=List[CanchaRespuesta])
def obtener_canchas_disponibles(db: Session = Depends(get_db)):
    """Obtiene todas las canchas disponibles."""
    return cancha_service.obtener_activas(db)

@router.get("/{cancha_id}", response_model=CanchaRespuesta)
def obtener_cancha_por_id(cancha_id: int, db: Session = Depends(get_db)):
    """Obtiene una cancha por ID."""
    return cancha_service.obtener_por_id(db, cancha_id)

@router.patch("/{cancha_id}")
def editar_cancha(cancha_id: int, datos: CanchaUpdate, db: Session = Depends(get_db)):
    """Edita parcialmente las características de una cancha existente."""
    return cancha_service.editar_cancha(db, cancha_id, datos)

@router.delete("/{cancha_id}")
def eliminar_cancha(cancha_id: int, db: Session = Depends(get_db)):
    """Elimina una cancha si no tiene reservas activas."""
    return cancha_service.eliminar_cancha(db, cancha_id)

@router.delete("/admin/{admin_id}")
def eliminar_canchas_por_admin(admin_id: int, db: Session = Depends(get_db)):
    """Elimina todas las canchas de un administrador."""
    return cancha_service.eliminar_canchas_por_admin(db, admin_id)