from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import Usuario
from ..repositories import usuario_repository
from ..schemas import UsuarioRegistro, UsuarioLogin, UsuarioEdicion, UsuarioRespuesta


def registrar(db: Session, usuario: UsuarioRegistro) -> UsuarioRespuesta:
    """Registra un nuevo usuario después de validar que el email no exista."""
    usuario_existente = usuario_repository.obtener_por_email(db, usuario.email)
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    nuevo_usuario = Usuario(**usuario.dict())
    usuario_repository.guardar(db, nuevo_usuario)
    return _usuario_a_respuesta(nuevo_usuario)


def login(db: Session, datos: UsuarioLogin) -> dict:
    """Valida credenciales y devuelve el ID del usuario."""
    usuario = usuario_repository.obtener_por_email(db, datos.email)
    if not usuario or usuario.password != datos.password:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    return {"mensaje": "Login exitoso", "usuario_id": usuario.id}


def editar_perfil(db: Session, user_id: int, datos: UsuarioEdicion) -> UsuarioRespuesta:
    """Edita el perfil de un usuario."""
    usuario = usuario_repository.editar_usuario(db, user_id, datos)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _usuario_a_respuesta(usuario)


def _usuario_a_respuesta(usuario: Usuario) -> UsuarioRespuesta:
    """Convierte un modelo Usuario a UsuarioRespuesta."""
    return UsuarioRespuesta(
        id=usuario.id,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        email=usuario.email,
    )
