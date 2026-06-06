from fastapi import APIRouter, Depends, status, HTTPException
from typing import List
from sqlalchemy.orm import Session

from ..core.db import engine
from ..core.dependencies import get_current_user, get_db
from ..schemas.torneo_schemas import TorneoCreate, TorneoResponse, TorneoListado, TorneoDetalleResponse
from ..schemas.usuario_schemas import UsuarioRespuesta
from ..models.usuario_model import Usuario
from ..services import torneo_service
from ..repositories import torneo_repository
 

router = APIRouter(
    prefix="/api/torneos",
    tags=["Torneos"]
)


@router.post("/", response_model=TorneoResponse, status_code=status.HTTP_201_CREATED)
def crear_torneo(
    torneo_in: TorneoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crea un nuevo torneo. 
    Queda asociado al usuario creador (organizador) y con estado Abierto para inscripción.
    """
    return torneo_service.crear_torneo(db, torneo_in, current_user.id)


@router.get("/", response_model=List[TorneoListado])
def listar_torneos_abiertos(db: Session = Depends(get_db)):
    """Lista torneos que están abiertos para inscripción."""
    return torneo_service.listar_torneos_abiertos(db)


@router.get("/{torneo_id}", response_model=TorneoDetalleResponse)
def obtener_torneo(
    torneo_id: int,
    db: Session = Depends(get_db)
):
    torneo = torneo_repository.obtener_por_id(db, torneo_id)
    if not torneo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Torneo no encontrado")
    # Asegurar que el organizador esté poblado para la serialización
    if getattr(torneo, "organizador", None) is None:
        organizador = db.query(Usuario).filter(Usuario.id == torneo.organizador_id).first()
        torneo.organizador = organizador
    return torneo
