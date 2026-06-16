from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, extract

from ..models.partido_model import Partido
from ..models.cancha_model import Cancha


def obtener_ids_canchas_del_propietario(db: Session, propietario_id: int, cancha_id: int = None) -> list[int]:
    """Obtiene los IDs de las canchas pertenecientes al propietario.
    Si cancha_id se proporciona, filtra solo esa cancha (verificando propiedad).
    """
    query = db.query(Cancha.id).filter(Cancha.propietario_id == propietario_id)
    if cancha_id is not None:
        query = query.filter(Cancha.id == cancha_id)
    return [row[0] for row in query.all()]


def obtener_canchas_del_propietario(db: Session, propietario_id: int) -> list[Cancha]:
    """Obtiene todas las canchas del propietario."""
    return db.query(Cancha).filter(Cancha.propietario_id == propietario_id).all()


def contar_reservas_por_periodo(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> int:
    """Cuenta las reservas efectivas (no canceladas) en un rango de fechas."""
    return db.query(func.count(Partido.id)).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
    ).scalar() or 0


def contar_cancelaciones_por_periodo(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> int:
    """Cuenta las reservas canceladas en un rango de fechas."""
    return db.query(func.count(Partido.id)).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado == "Cancelado",
    ).scalar() or 0


def contar_reservas_totales_por_periodo(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> int:
    """Cuenta TODAS las reservas (incluyendo canceladas) en un rango de fechas."""
    return db.query(func.count(Partido.id)).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
    ).scalar() or 0


def obtener_reservas_por_dia_semana(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> list[tuple]:
    """Agrupa reservas efectivas por día de la semana (0=Lunes, 6=Domingo).
    Retorna lista de tuplas (dia_semana, cantidad).
    """
    # SQLite: strftime('%w', fecha) retorna 0=Domingo, 1=Lunes... 6=Sábado
    # PostgreSQL: extract(dow FROM fecha) retorna 0=Domingo, 1=Lunes... 6=Sábado
    # Usamos un approach compatible con ambos
    dia_semana = extract('dow', Partido.fecha)
    
    return db.query(
        dia_semana,
        func.count(Partido.id)
    ).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
    ).group_by(dia_semana).all()


def obtener_reservas_por_hora(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> list[tuple]:
    """Agrupa reservas efectivas por hora del día.
    Retorna lista de tuplas (hora, cantidad).
    """
    hora = extract('hour', Partido.horario)
    
    return db.query(
        hora,
        func.count(Partido.id)
    ).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
    ).group_by(hora).order_by(hora).all()


def obtener_mapa_calor(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> list[tuple]:
    """Agrupa reservas por día de la semana Y hora.
    Retorna lista de tuplas (dia_semana, hora, cantidad).
    """
    dia_semana = extract('dow', Partido.fecha)
    hora = extract('hour', Partido.horario)
    
    return db.query(
        dia_semana,
        hora,
        func.count(Partido.id)
    ).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
    ).group_by(dia_semana, hora).all()


def obtener_distribucion_tipo_reserva(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> dict:
    """Obtiene la distribución de reservas por tipo (abierto/cerrado/manual/bloqueado)."""
    resultados = db.query(
        Partido.tipo,
        Partido.reserva_manual,
        Partido.estado,
        func.count(Partido.id)
    ).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
    ).group_by(Partido.tipo, Partido.reserva_manual, Partido.estado).all()

    distribucion = {"abierto": 0, "cerrado": 0, "manual": 0, "bloqueado": 0}
    for tipo, es_manual, estado, cantidad in resultados:
        if estado == "bloqueado":
            distribucion["bloqueado"] += cantidad
        elif es_manual:
            distribucion["manual"] += cantidad
        elif tipo == "abierto":
            distribucion["abierto"] += cantidad
        else:
            distribucion["cerrado"] += cantidad

    return distribucion


def obtener_distribucion_modalidad(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> list[tuple]:
    """Obtiene la distribución de reservas por modalidad (fútbol 5, 7, 11, etc.)."""
    return db.query(
        Partido.modalidad,
        func.count(Partido.id)
    ).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
        Partido.estado != "bloqueado",
    ).group_by(Partido.modalidad).order_by(func.count(Partido.id).desc()).all()


def obtener_reservas_por_cancha(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> list[tuple]:
    """Agrupa reservas efectivas por cancha_id.
    Retorna lista de tuplas (cancha_id, cantidad).
    """
    return db.query(
        Partido.cancha_id,
        func.count(Partido.id)
    ).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
        Partido.estado != "bloqueado",
    ).group_by(Partido.cancha_id).all()


def obtener_reservas_diarias(
    db: Session, cancha_ids: list[int], fecha_desde: date, fecha_hasta: date
) -> list[tuple]:
    """Obtiene la cantidad de reservas efectivas por día.
    Retorna lista de tuplas (fecha, cantidad).
    """
    return db.query(
        Partido.fecha,
        func.count(Partido.id)
    ).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
    ).group_by(Partido.fecha).order_by(Partido.fecha).all()


def obtener_proxima_reserva(db: Session, cancha_ids: list[int], fecha_hoy: date):
    """Obtiene la próxima reserva futura."""
    return db.query(Partido).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_hoy,
        Partido.estado != "Cancelado",
    ).order_by(Partido.fecha.asc(), Partido.horario.asc()).first()
