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


def obtener_mi_perfil(usuario: Usuario) -> UsuarioRespuesta:
    """Obtiene el perfil del usuario autenticado."""
    return _usuario_a_respuesta(usuario)


def editar_mi_perfil(db: Session, usuario: Usuario, datos: UsuarioEdicion) -> UsuarioRespuesta:
    """Edita el perfil del usuario autenticado."""
    usuario = usuario_repository.editar_usuario(db, usuario.id, datos)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _usuario_a_respuesta(usuario)

def obtener_usuarios_activos(db: Session, ids: list[int]) -> list[Usuario]:
    usuarios = usuario_repository.obtener_usuarios_por_ids(db, ids)
    if len(usuarios) != len(ids):
        raise HTTPException(status_code=404, detail="Uno o más usuarios del listado no existen.")
    return usuarios