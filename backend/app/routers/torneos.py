from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..core.db import engine, SessionLocal
from ..schemas.torneo_schemas import TorneoCreate, TorneoResponse
from ..schemas.usuario_schemas import UsuarioRespuesta
from ..models.usuario_model import Usuario
from ..services import torneo_service
from ..core.dependencies import get_current_user

router = APIRouter(
    prefix="/api/torneos",
    tags=["Torneos"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
