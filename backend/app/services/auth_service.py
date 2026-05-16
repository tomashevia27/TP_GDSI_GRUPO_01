from fastapi import HTTPException
from sqlalchemy.orm import Session
import secrets

from ..models.usuario_model import Usuario
from ..repositories import usuario_repository
from ..schemas.usuario_schemas import UsuarioRegistro, UsuarioLogin
from . import email_service


def registrar(db: Session, usuario: UsuarioRegistro) -> dict:
    """Registra un nuevo usuario, genera código de confirmación y lo envía por email.

    Retorna dict con mensaje.
    """
    usuario_existente = usuario_repository.obtener_por_email(db, usuario.email)
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Generar código de 6 dígitos
    code = f"{secrets.randbelow(10**6):06d}"

    nuevo_usuario = Usuario(**usuario.dict(), confirmation_code=code, email_confirmado=False)
    usuario_repository.guardar(db, nuevo_usuario)

    # El helper envía por SMTP según la configuración.
    try:
        email_service.send_confirmation_email(nuevo_usuario.email, code)
    except Exception as e:
        print("Error enviando email de confirmación:", e)

    return {"mensaje": "Usuario registrado. Revisa tu email para confirmar la cuenta."}


def login(db: Session, datos: UsuarioLogin) -> dict:
    """Valida credenciales y devuelve el ID del usuario."""
    usuario = usuario_repository.obtener_por_email(db, datos.email)
    if not usuario or usuario.password != datos.password:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    if not usuario.email_confirmado:
        raise HTTPException(status_code=403, detail="La cuenta no está activa aún")

    return {"mensaje": "Login exitoso", "usuario_id": usuario.id, "rol": usuario.rol}


def confirmar_email(db: Session, email: str, code: str) -> dict:
    """Confirma el email si el código coincide."""
    usuario = usuario_repository.obtener_por_email(db, email)
    if not usuario:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    if usuario.confirmation_code != code:
        raise HTTPException(status_code=400, detail="Código inválido")

    usuario.email_confirmado = True
    usuario.confirmation_code = None
    usuario_repository.guardar(db, usuario)

    return {"mensaje": "Email confirmado exitosamente"}


def reenviar_codigo(db: Session, email: str) -> dict:
    """Genera y reenvía código de confirmación a un email existente."""
    usuario = usuario_repository.obtener_por_email(db, email)
    if not usuario:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    code = f"{secrets.randbelow(10**6):06d}"
    usuario.confirmation_code = code
    usuario_repository.guardar(db, usuario)

    try:
        email_service.send_confirmation_email(usuario.email, code)
    except Exception as e:
        print("Error reenviando email:", e)

    return {"mensaje": "Código reenviado (revisa tu email)."}



