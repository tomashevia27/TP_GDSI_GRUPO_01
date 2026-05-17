from sqlalchemy.orm import Session
from ..models.partido_model import Partido

def obtener_organizados_por_usuario(db: Session, usuario_id: int):
    """Obtiene los partidos organizados por un usuario."""
    return db.query(Partido).filter(Partido.organizador_id == usuario_id).all()

def obtener_inscritos_por_usuario(db: Session, usuario_id: int):
    """Obtiene los partidos en los que un usuario está inscrito."""
    return db.query(Partido).filter(Partido.jugadores.any(id=usuario_id)).all()

def obtener_por_id(db: Session, partido_id: int):
    """Obtiene un partido por su ID."""
    return db.query(Partido).filter(Partido.id == partido_id).first()

def verificar_disponibilidad_cancha(db: Session, cancha_id: int, fecha: str, horario: str) -> bool:
    """Verifica si una cancha está disponible en una fecha y horario específicos."""
    partidos = db.query(Partido).filter(
        Partido.cancha_id == cancha_id,
        Partido.fecha == fecha,
        Partido.horario == horario,
        Partido.estado == "confirmado"
    ).count()
    return partidos == 0

def guardar_partido(db: Session, partido: Partido):
    """Guarda un nuevo partido en la base de datos."""
    db.add(partido)
    db.commit()
    db.refresh(partido)
    return partido