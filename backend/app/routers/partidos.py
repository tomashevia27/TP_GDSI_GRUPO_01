from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..schemas.partido_schemas import PartidoCreate, PartidoRespuesta
from ..services import partido_service

router = APIRouter(prefix="/partidos", tags=["Partidos"])

@router.get("/mis-partidos", response_model=List[PartidoRespuesta])
def obtener_mis_partidos(usuario_id: int, db: Session = Depends(get_db)):
    """Obtiene los partidos organizados e inscritos por el jugador."""
    return partido_service.obtener_mis_partidos(db, usuario_id)

@router.get("/{partido_id}", response_model=PartidoRespuesta)
def obtener_detalle_partido(partido_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle de un partido específico."""
    return partido_service.obtener_detalle_partido(db, partido_id)

@router.post("", response_model=PartidoRespuesta)
def crear_partido(datos: PartidoCreate, db: Session = Depends(get_db)):
    """Crea un nuevo partido."""
    return partido_service.crear_partido(db, datos)