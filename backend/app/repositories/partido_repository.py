from sqlalchemy.orm import Session
from ..models.partido_model import Partido
import datetime

def obtener_organizados_por_usuario(db: Session, usuario_id: int):
    """Obtiene los partidos organizados por un usuario."""
    return db.query(Partido).filter(Partido.organizador_id == usuario_id).all()

def obtener_inscritos_por_usuario(db: Session, usuario_id: int):
    """Obtiene los partidos en los que un usuario está inscrito."""
    # return db.query(Partido).filter(Partido.jugadores.any(id=usuario_id)).all()
    # TODO: Implementar cuando se agregue la tabla intermedia partido_jugadores
    return []

def obtener_por_id(db: Session, partido_id: int):
    """Obtiene un partido por su ID."""
    return db.query(Partido).filter(Partido.id == partido_id).first()

def verificar_disponibilidad_cancha(db: Session, cancha_id: int, fecha: datetime.date, horario: datetime.time, duracion_turno: int = 60) -> bool:
    """Verifica si una cancha está disponible en una fecha y horario específicos, sin solapamientos."""
    partidos_del_dia = db.query(Partido).filter(
        Partido.cancha_id == cancha_id,
        Partido.fecha == fecha,
        Partido.estado.in_(["confirmado", "pendiente"])
    ).all()
    
    delta_duracion = datetime.timedelta(minutes=duracion_turno)
    nuevo_inicio = datetime.datetime.combine(fecha, horario)
    nuevo_fin = nuevo_inicio + delta_duracion

    for p in partidos_del_dia:
        p_inicio = datetime.datetime.combine(p.fecha, p.horario)
        p_fin = p_inicio + delta_duracion
        
        if nuevo_inicio < p_fin and nuevo_fin > p_inicio:
            return False

    return True

def guardar_partido(db: Session, partido: Partido):
    """Guarda un nuevo partido en la base de datos."""
    db.add(partido)
    db.commit()
    db.refresh(partido)
    return partido