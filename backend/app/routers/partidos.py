from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from ..db import get_db
from ..models.usuario_model import Usuario
from ..schemas.partido_schemas import PartidoCreate, PartidoUpdate, PartidoRespuesta, MisPartidosRespuesta, FiltrosDisponibles
from ..services import partido_service
from ..security import get_current_user

router = APIRouter(prefix="/partidos", tags=["Partidos"])

@router.get("/mis-partidos", response_model=MisPartidosRespuesta)
def obtener_mis_partidos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene los partidos organizados e inscritos por el jugador."""
    return partido_service.obtener_mis_partidos(db, current_user.id)

@router.get("/disponibles", response_model=List[PartidoRespuesta])
def obtener_partidos_disponibles(
    zona: Optional[str] = None,
    modalidad: Optional[str] = None,
    fecha: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene el listado de partidos abiertos, futuros y con cupos."""
    return partido_service.obtener_partidos_disponibles(db, zona, modalidad, fecha)

@router.get("/filtros", response_model=FiltrosDisponibles)
def obtener_filtros_disponibles(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene las opciones de filtros dinámicas para partidos disponibles."""
    return partido_service.obtener_filtros_disponibles(db)


@router.get("/{partido_id}", response_model=PartidoRespuesta)
def obtener_detalle_partido(partido_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle de un partido específico."""
    return partido_service.obtener_detalle_partido(db, partido_id)

@router.post("/{partido_id}/inscribirse", response_model=PartidoRespuesta)
def inscribirse_a_partido(
    partido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Inscribe al jugador actual en un partido abierto con cupo."""
    return partido_service.inscribirse_a_partido(db, partido_id, current_user.id)

@router.post("", response_model=PartidoRespuesta)
def crear_partido(
    datos: PartidoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea un nuevo partido."""
    return partido_service.crear_partido(db, current_user.id, datos)

@router.patch("/{partido_id}/cancelar", response_model=PartidoRespuesta)
def cancelar_partido(
    partido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Cancela un partido previamente creado."""
    return partido_service.cancelar_partido(db, partido_id, current_user.id)

@router.put("/{partido_id}", response_model=PartidoRespuesta)
def editar_partido(
    partido_id: int,
    datos: PartidoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Edita los datos de un partido."""
    return partido_service.editar_partido(db, partido_id, current_user.id, datos)