from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date


# ─────────────────────────────────────────────
# KPI Cards
# ─────────────────────────────────────────────

class KpiResumen(BaseModel):
    """KPIs principales del dashboard."""
    reservas_hoy: int
    reservas_semana: int
    reservas_mes: int
    tasa_ocupacion_hoy: float  # porcentaje (0-100)
    ingreso_estimado_mes: float
    proxima_reserva_fecha: Optional[str] = None
    proxima_reserva_horario: Optional[str] = None
    proxima_reserva_cancha: Optional[str] = None


# ─────────────────────────────────────────────
# Reservas por período (gráfico de línea/barras)
# ─────────────────────────────────────────────

class ReservasDiarias(BaseModel):
    fecha: str
    cantidad: int

class ReservasPorPeriodoRespuesta(BaseModel):
    datos: list[ReservasDiarias]
    total: int


# ─────────────────────────────────────────────
# Reservas por día de la semana
# ─────────────────────────────────────────────

class ReservasPorDiaSemana(BaseModel):
    dia: str        # "Lunes", "Martes", etc.
    dia_numero: int  # 0=Lunes, 6=Domingo
    cantidad: int

class ReservasPorDiaSemanaRespuesta(BaseModel):
    datos: list[ReservasPorDiaSemana]


# ─────────────────────────────────────────────
# Reservas por hora (distribución horaria)
# ─────────────────────────────────────────────

class ReservasPorHora(BaseModel):
    hora: str   # "08:00", "09:00", etc.
    cantidad: int

class ReservasPorHoraRespuesta(BaseModel):
    datos: list[ReservasPorHora]


# ─────────────────────────────────────────────
# Mapa de calor (días × horas)
# ─────────────────────────────────────────────

class MapaCalorCelda(BaseModel):
    dia: str
    dia_numero: int
    hora: str
    cantidad: int

class MapaCalorRespuesta(BaseModel):
    datos: list[MapaCalorCelda]


# ─────────────────────────────────────────────
# Tasa de ocupación (tendencia)
# ─────────────────────────────────────────────

class OcupacionDiaria(BaseModel):
    fecha: str
    tasa: float  # porcentaje 0-100

class OcupacionRespuesta(BaseModel):
    tasa_promedio: float
    datos: list[OcupacionDiaria]


# ─────────────────────────────────────────────
# Cancelaciones
# ─────────────────────────────────────────────

class CancelacionesRespuesta(BaseModel):
    total_reservas: int
    total_cancelaciones: int
    total_efectivas: int
    tasa_cancelacion: float  # porcentaje 0-100


# ─────────────────────────────────────────────
# Distribución por tipo de reserva
# ─────────────────────────────────────────────

class TipoReservaItem(BaseModel):
    tipo: str       # "Abierto", "Cerrado", "Manual", "Bloqueado"
    cantidad: int

class DistribucionTipoRespuesta(BaseModel):
    datos: list[TipoReservaItem]


# ─────────────────────────────────────────────
# Distribución por modalidad
# ─────────────────────────────────────────────

class ModalidadItem(BaseModel):
    modalidad: str
    cantidad: int

class DistribucionModalidadRespuesta(BaseModel):
    datos: list[ModalidadItem]


# ─────────────────────────────────────────────
# Comparativa entre canchas
# ─────────────────────────────────────────────

class CanchaEstadistica(BaseModel):
    cancha_id: int
    nombre: str
    reservas: int
    ingreso_estimado: float
    tasa_ocupacion: float

class ComparativaCanchasRespuesta(BaseModel):
    datos: list[CanchaEstadistica]


# ─────────────────────────────────────────────
# Ingresos
# ─────────────────────────────────────────────

class IngresoDiario(BaseModel):
    fecha: str
    ingreso: float

class IngresosRespuesta(BaseModel):
    ingreso_total: float
    ingreso_promedio_diario: float
    datos: list[IngresoDiario]
