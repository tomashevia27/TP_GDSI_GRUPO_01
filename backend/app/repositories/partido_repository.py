from datetime import datetime, date, timedelta, timezone, time
from sqlalchemy.orm import Session, joinedload

from ..models.partido_torneo import PartidoTorneo
from ..models.partido_model import Partido
from ..models.usuario_model import Usuario
from sqlalchemy import or_, and_, func
from ..models.cancha_model import Cancha

# Zona horaria de la aplicación (Argentina UTC-3)
TZ_LOCAL = timezone(timedelta(hours=-3))

def obtener_organizados_por_usuario(db: Session, usuario_id: int):
    """Obtiene los partidos organizados por un usuario."""
    return db.query(Partido).filter(Partido.organizador_id == usuario_id).all()

def obtener_inscritos_por_usuario(db: Session, usuario_id: int):
    """Obtiene los partidos en los que un usuario está inscrito."""
    return db.query(Partido).filter(Partido.jugadores.any(id=usuario_id)).all()

def obtener_por_id(db: Session, partido_id: int):
    """Obtiene un partido por su ID."""
    return db.query(Partido).filter(Partido.id == partido_id).first()


def obtener_por_id_bloqueado(db: Session, partido_id: int):
    """Obtiene un partido bloqueando la fila para evitar carreras al inscribirse."""
    return db.query(Partido).filter(Partido.id == partido_id).with_for_update().first()

def obtener_disponibles(db: Session, zona: str = None, modalidad: str = None, fecha_filtro: date = None):
    """Obtiene los partidos abiertos, con cupos y fecha futura."""
    now = datetime.now(TZ_LOCAL)
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

def obtener_filtros_disponibles(db: Session):
    """Obtiene las opciones de filtros dinámicos basados en partidos disponibles."""
    now = datetime.now(TZ_LOCAL)
    hoy = now.date()
    hora_actual = now.time()

    # Filtros base comunes
    base_filter = and_(
        Partido.tipo == "abierto",
        Partido.cupos_disponibles > 0,
        Partido.estado != "Cancelado",
        or_(
            Partido.fecha > hoy,
            and_(Partido.fecha == hoy, Partido.horario > hora_actual)
        )
    )

    # Consulta para agrupar por zona
    zonas = db.query(Cancha.zona, func.count(Partido.id)).select_from(Partido).join(Cancha).filter(
        base_filter
    ).group_by(Cancha.zona).all()

    # Consulta para agrupar por modalidad
    modalidades = db.query(Partido.modalidad, func.count(Partido.id)).select_from(Partido).join(Cancha).filter(
        base_filter
    ).group_by(Partido.modalidad).all()

    return {
        "zonas": [{"valor": z[0], "cantidad": z[1]} for z in zonas if z[0]],
        "modalidades": [{"valor": m[0], "cantidad": m[1]} for m in modalidades if m[0]]
    }

def verificar_disponibilidad_cancha(
    db: Session, 
    cancha_id: int, 
    fecha: date, 
    horario: time, 
    duracion_turno: int = 60, 
    excluir_partido_id: int = None,
    es_partido_torneo: bool = False,
    **kwargs
) -> bool:
    
    duracion = kwargs.get("duracion", duracion_turno)
    nuevo_inicio = datetime.combine(fecha, horario)
    nuevo_fin = nuevo_inicio + timedelta(minutes=duracion)

    query_casuales = db.query(Partido).filter(
        Partido.cancha_id == cancha_id,
        Partido.fecha == fecha,
        Partido.estado.in_(["confirmado", "pendiente", "bloqueado"])
    )

    if excluir_partido_id is not None and not es_partido_torneo:
        query_casuales = query_casuales.filter(Partido.id != excluir_partido_id)
    
    query_torneos = db.query(PartidoTorneo).filter(
        PartidoTorneo.cancha_id == cancha_id,
        PartidoTorneo.fecha == fecha,
        PartidoTorneo.estado == "pendiente"
    )

    if excluir_partido_id is not None and es_partido_torneo:
        query_torneos = query_torneos.filter(PartidoTorneo.id != excluir_partido_id)

    todos_los_eventos = list(query_casuales.all()) + list(query_torneos.all())

    for evento in todos_los_eventos:
        e_inicio = datetime.combine(evento.fecha, evento.horario)
        e_fin = e_inicio + timedelta(minutes=duracion)
        
        if nuevo_inicio < e_fin and nuevo_fin > e_inicio:
            return False

    return True

def obtener_partidos_por_cancha_y_fecha(db: Session, cancha_id: int, fecha: date):
    """Obtiene todos los partidos (casuales y de torneo) de una cancha en una fecha."""
    # Partidos casuales no cancelados
    partidos_casuales = db.query(Partido).options(
        joinedload(Partido.organizador)
    ).filter(
        Partido.cancha_id == cancha_id,
        Partido.fecha == fecha,
        Partido.estado != "Cancelado"
    ).all()

    # Partidos de torneo programados (con cancha y horario asignado)
    partidos_torneo = db.query(PartidoTorneo).filter(
        PartidoTorneo.cancha_id == cancha_id,
        PartidoTorneo.fecha == fecha,
        PartidoTorneo.horario.isnot(None),
    ).all()

    # El AgendaBuilder solo usa .id, .fecha, .horario, .estado
    # PartidoTorneo tiene todos esos campos, así que los podemos mezclar directamente.
    # Los marcamos como "ocupado" para que aparezcan en gris en la UI.
    return partidos_casuales + partidos_torneo

def guardar_partido(db: Session, partido: Partido):
    """Guarda un nuevo partido en la base de datos."""
    db.add(partido)
    db.commit()
    db.refresh(partido)
    return partido


def guardar_inscripcion(db: Session, partido: Partido, usuario: Usuario):
    """Registra la inscripción de un jugador."""
    db.commit()
    db.refresh(partido)
    return partido


def guardar_baja_inscripcion(db: Session, partido: Partido, usuario: Usuario):
    """Registra la baja de un jugador."""
    db.commit()
    db.refresh(partido)
    return partido