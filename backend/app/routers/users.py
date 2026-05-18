from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.usuario_model import Usuario
from ..schemas.usuario_schemas import UsuarioEdicion, UsuarioRespuesta
from ..services import user_service
from ..security import get_current_user

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

# US 3: Editar Perfil
@router.put("/me", response_model=UsuarioRespuesta)
def editar_perfil(
    datos: UsuarioEdicion,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Edita el perfil del usuario autenticado."""
    return user_service.editar_mi_perfil(db, current_user, datos)


@router.get("/me", response_model=UsuarioRespuesta)
def obtener_perfil(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene el perfil del usuario autenticado."""
    return user_service.obtener_mi_perfil(current_user)
