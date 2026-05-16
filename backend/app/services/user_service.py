from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.usuario_model import Usuario
from ..repositories import usuario_repository
from ..schemas.usuario_schemas import UsuarioEdicion, UsuarioRespuesta


def _usuario_a_respuesta(usuario: Usuario) -> UsuarioRespuesta:
    """Convierte un modelo Usuario a UsuarioRespuesta."""
    return UsuarioRespuesta(
        id=usuario.id,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        email=usuario.email,
        edad=usuario.edad,
        genero=usuario.genero,
        zona=usuario.zona,
        rol=usuario.rol,
        foto_perfil=usuario.foto_perfil,
    )


def obtener_perfil(db: Session, user_id: int) -> UsuarioRespuesta:
    """Obtiene el perfil de un usuario."""
    usuario = usuario_repository.obtener_por_id(db, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _usuario_a_respuesta(usuario)


def editar_perfil(db: Session, user_id: int, datos: UsuarioEdicion) -> UsuarioRespuesta:
    """Edita el perfil de un usuario."""
    usuario = usuario_repository.editar_usuario(db, user_id, datos)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _usuario_a_respuesta(usuario)
