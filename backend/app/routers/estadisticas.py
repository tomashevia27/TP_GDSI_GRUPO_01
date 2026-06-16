from datetime import date, timedelta, datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..core.dependencies import get_db, get_current_user
from ..models.usuario_model import Usuario
from ..services import estadistica_service
from ..schemas.estadistica_schemas import (
    KpiResumen,
    ReservasPorPeriodoRespuesta,
    ReservasPorDiaSemanaRespuesta,
    ReservasPorHoraRespuesta,
    MapaCalorRespuesta,
    OcupacionRespuesta,
    CancelacionesRespuesta,
    DistribucionTipoRespuesta,
    DistribucionModalidadRespuesta,
    ComparativaCanchasRespuesta,
    IngresosRespuesta,
)

router = APIRouter(prefix="/estadisticas", tags=["Estadísticas"])

TZ_LOCAL = timezone(timedelta(hours=-3))


def _resolver_fechas(fecha_desde: date = None, fecha_hasta: date = None) -> tuple[date, date]:
    """Resuelve valores por defecto para el rango de fechas (último mes)."""
    hoy = datetime.now(TZ_LOCAL).date()
    if fecha_hasta is None:
        fecha_hasta = hoy
    if fecha_desde is None:
        fecha_desde = hoy - timedelta(days=30)
    return fecha_desde, fecha_hasta


@router.get("/kpis", response_model=KpiResumen)
def obtener_kpis(
    cancha_id: Optional[int] = Query(None, description="Filtrar por cancha específica"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene los KPIs principales del dashboard."""
    return estadistica_service.obtener_kpis(db, current_user, cancha_id)


@router.get("/reservas-periodo", response_model=ReservasPorPeriodoRespuesta)
def obtener_reservas_por_periodo(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la cantidad de reservas por día en un período."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_reservas_por_periodo(db, current_user, desde, hasta, cancha_id)


@router.get("/reservas-dia-semana", response_model=ReservasPorDiaSemanaRespuesta)
def obtener_reservas_por_dia_semana(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la distribución de reservas por día de la semana."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_reservas_por_dia_semana(db, current_user, desde, hasta, cancha_id)


@router.get("/reservas-hora", response_model=ReservasPorHoraRespuesta)
def obtener_reservas_por_hora(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la distribución de reservas por hora del día."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_reservas_por_hora(db, current_user, desde, hasta, cancha_id)


@router.get("/mapa-calor", response_model=MapaCalorRespuesta)
def obtener_mapa_calor(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene el mapa de calor de reservas (días × horas)."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_mapa_calor(db, current_user, desde, hasta, cancha_id)


@router.get("/ocupacion", response_model=OcupacionRespuesta)
def obtener_ocupacion(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la tasa de ocupación diaria y promedio."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_ocupacion(db, current_user, desde, hasta, cancha_id)


@router.get("/cancelaciones", response_model=CancelacionesRespuesta)
def obtener_cancelaciones(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la tasa de cancelación de reservas."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_cancelaciones(db, current_user, desde, hasta, cancha_id)


@router.get("/distribucion-tipo", response_model=DistribucionTipoRespuesta)
def obtener_distribucion_tipo(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la distribución de reservas por tipo (abierto/cerrado/manual)."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_distribucion_tipo(db, current_user, desde, hasta, cancha_id)


@router.get("/distribucion-modalidad", response_model=DistribucionModalidadRespuesta)
def obtener_distribucion_modalidad(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la distribución de reservas por modalidad (fútbol 5, 7, etc.)."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_distribucion_modalidad(db, current_user, desde, hasta, cancha_id)


@router.get("/comparativa-canchas", response_model=ComparativaCanchasRespuesta)
def obtener_comparativa_canchas(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene la comparativa de rendimiento entre las canchas del dueño."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_comparativa_canchas(db, current_user, desde, hasta)


@router.get("/ingresos", response_model=IngresosRespuesta)
def obtener_ingresos(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    cancha_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene los ingresos estimados diarios y totales."""
    desde, hasta = _resolver_fechas(fecha_desde, fecha_hasta)
    return estadistica_service.obtener_ingresos(db, current_user, desde, hasta, cancha_id)
