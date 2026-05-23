from sqlalchemy.orm import Session
from ..models.partido_model import Partido
import datetime
from sqlalchemy import or_, and_
from ..models.cancha_model import Cancha

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

def obtener_disponibles(db: Session, zona: str = None, modalidad: str = None, fecha_filtro: datetime.date = None):
    """Obtiene los partidos abiertos, con cupos y fecha futura."""
    now = datetime.datetime.now()
    hoy = now.date()
    hora_actual = now.time()

    query = db.query(Partido).join(Cancha).filter(
        Partido.tipo == "abierto",
        Partido.cupos_disponibles > 0,
        Partido.estado != "Cancelado"
    )

    query = query.filter(
        or_(
            Partido.fecha > hoy,
            and_(Partido.fecha == hoy, Partido.horario > hora_actual)
        )
    )

    if zona:
        query = query.filter(Cancha.zona.ilike(f"%{zona}%"))
    if modalidad:
        query = query.filter(Partido.modalidad.ilike(f"%{modalidad}%"))
    if fecha_filtro:
        query = query.filter(Partido.fecha == fecha_filtro)
        
    return query.order_by(Partido.fecha.asc(), Partido.horario.asc()).all()

def verificar_disponibilidad_cancha(db: Session, cancha_id: int, fecha: datetime.date, horario: datetime.time, duracion_turno: int = 60, excluir_partido_id: int = None) -> bool:
    """Verifica si una cancha está disponible en una fecha y horario específicos, sin solapamientos."""
    query = db.query(Partido).filter(
        Partido.cancha_id == cancha_id,
        Partido.fecha == fecha,
        Partido.estado.in_(["confirmado", "pendiente"])
    )
    
    if excluir_partido_id is not None:
        query = query.filter(Partido.id != excluir_partido_id)
        
    partidos_del_dia = query.all()
    
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