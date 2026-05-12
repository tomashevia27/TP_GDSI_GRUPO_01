from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import UsuarioEdicion, UsuarioRespuesta
from ..services import user_service

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

# US 3: Editar Perfil
@router.put("/{user_id}", response_model=UsuarioRespuesta)
def editar_perfil(user_id: int, datos: UsuarioEdicion, db: Session = Depends(get_db)):
    """Edita el perfil de un usuario."""
    return user_service.editar_perfil(db, user_id, datos)


@router.get("/{user_id}", response_model=UsuarioRespuesta)
def obtener_perfil(user_id: int, db: Session = Depends(get_db)):
    """Obtiene el perfil de un usuario."""
    return user_service.obtener_perfil(db, user_id)
