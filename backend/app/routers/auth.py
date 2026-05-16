from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.usuario_schemas import UsuarioRegistro, UsuarioLogin
from ..services import auth_service

router = APIRouter(tags=["Autenticación"])

# US 1: Registro de Usuario
@router.post("/registro")
def registrar_usuario(usuario: UsuarioRegistro, db: Session = Depends(get_db)):
    """Registra un nuevo usuario y envía código de confirmación por email."""
    return auth_service.registrar(db, usuario)


# US 1b: Confirmar email
@router.post("/confirmar-email")
def confirmar_email(payload: dict, db: Session = Depends(get_db)):
    """Recibe JSON {"email":"...", "code":"..."} y confirma el email."""
    email = payload.get("email")
    code = payload.get("code")
    if not email or not code:
        raise HTTPException(status_code=422, detail="email y code son requeridos")
    return auth_service.confirmar_email(db, email, code)


# Reenviar código de confirmación
@router.post("/reenviar-codigo")
def reenviar_codigo(payload: dict, db: Session = Depends(get_db)):
    """Recibe JSON {"email":"..."} y reenvía el código de confirmación."""
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=422, detail="email es requerido")
    return auth_service.reenviar_codigo(db, email)


# US 2: Inicio de Sesión
@router.post("/login")
def login(datos: UsuarioLogin, db: Session = Depends(get_db)):
    """Valida credenciales e inicia sesión."""
    return auth_service.login(db, datos)
