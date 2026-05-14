from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..schemas import CanchaCreate, CanchaRespuesta
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

