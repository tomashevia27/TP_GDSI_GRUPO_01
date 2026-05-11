from sqlalchemy.orm import Session
from ..models import Usuario
from ..schemas import UsuarioEdicion


def obtener_por_email(db: Session, email: str) -> Usuario | None:
    """Busca un usuario por email."""
    return db.query(Usuario).filter(Usuario.email == email).first()


def obtener_por_id(db: Session, user_id: int) -> Usuario | None:
    """Busca un usuario por ID."""
    return db.get(Usuario, user_id)


def crear_usuario(db: Session, usuario: Usuario) -> Usuario:
    """Crea un nuevo usuario en la BD."""
    db.add(usuario)
    db.flush()
    return usuario


def guardar(db: Session, entity: Usuario) -> Usuario:
    """Guarda una entidad (add + commit)."""
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def editar_usuario(db: Session, user_id: int, datos: UsuarioEdicion) -> Usuario | None:
    """Edita un usuario existente."""
    usuario = obtener_por_id(db, user_id)
    if not usuario:
        return None

    usuario.nombre = datos.nombre
    usuario.apellido = datos.apellido
    usuario.edad = datos.edad
    usuario.genero = datos.genero
    if datos.password:
        usuario.password = datos.password
    usuario.zona = datos.zona
    usuario.foto_perfil = datos.foto_perfil

    db.commit()
    db.refresh(usuario)
    return usuario


def obtener_todos(db: Session) -> list[Usuario]:
    """Obtiene todos los usuarios."""
    return db.query(Usuario).all()
