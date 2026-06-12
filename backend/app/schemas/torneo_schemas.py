from datetime import datetime, timedelta, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator, ConfigDict

from .usuario_schemas import UsuarioRespuesta
from .equipo_schemas import EquipoResponse
from ..models.torneo_model import FormatoTorneo, EstadoTorneo

# Valores válidos de max_equipos por formato
_ED_VALIDOS = {2, 4, 8, 16, 32, 64}
_TcT_MIN, _TcT_MAX = 4, 30
_FG_SEMIS   = {6, 8, 10}
_FG_CUARTOS = {12, 16, 20}
_FG_OCTAVOS = {24, 32, 40}
_FG_TODOS   = _FG_SEMIS | _FG_CUARTOS | _FG_OCTAVOS
_FASE_FINAL_VALIDOS = {"semis", "cuartos", "octavos"}
_TAMANOS_VALIDOS = {5, 7, 9, 11}  # F5, F7, F9, F11


class TorneoBase(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    fecha_inicio: datetime
    fecha_fin: datetime
    formato: FormatoTorneo
    zona: str = Field(..., min_length=2, max_length=100, description="Zona/barrio donde se jugará el torneo")
    dias_operativos: int = Field(..., description="Bitmask de días operativos (ej: 31 = Lun-Vie, 127 = todos)")
    franja_horaria: str = Field(..., description="Franja horaria en formato HH:MM-HH:MM (ej: '09:00-11:00')")
    max_equipos: int = Field(..., ge=2)
    min_integrantes_por_equipo: int = Field(..., description="Tamaño del equipo: 5 (F5), 7 (F7), 9 (F9) o 11 (F11)")
    costo_inscripcion: float = Field(..., ge=0)
    descripcion: Optional[str] = None
    reglas: Optional[str] = None
    # Campos específicos por formato
    ida_y_vuelta: bool = Field(False, description="Solo para Todos contra Todos")
    fase_final: Optional[str] = Field(None, description="'semis', 'cuartos' u 'octavos'. Solo para Fase de Grupos")


class TorneoCreate(TorneoBase):

    @model_validator(mode='after')
    def validar_torneo(self):
        # --- Validar fechas ---
        tz_local = timezone(timedelta(hours=-3))
        ahora = datetime.now(tz_local).replace(tzinfo=None)
        inicio = self.fecha_inicio.replace(tzinfo=None)
        fin = self.fecha_fin.replace(tzinfo=None)

        if inicio < ahora:
            raise ValueError("La fecha de inicio no puede estar en el pasado")
        if fin <= inicio:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")

        # --- Validar franja horaria ---
        try:
            partes = self.franja_horaria.split("-")
            if len(partes) != 2:
                raise ValueError()
            datetime.strptime(partes[0], "%H:%M")
            datetime.strptime(partes[1], "%H:%M")
            if partes[0] >= partes[1]:
                raise ValueError()
        except ValueError:
            raise ValueError("La franja horaria debe tener formato HH:MM-HH:MM y el cierre debe ser posterior a la apertura")

        # --- Validar tamaño de equipo ---
        if self.min_integrantes_por_equipo not in _TAMANOS_VALIDOS:
            raise ValueError("El tamaño del equipo debe ser 5 (F5), 7 (F7), 9 (F9) o 11 (F11)")

        # --- Validar max_equipos según formato ---
        if self.formato == FormatoTorneo.eliminacion_directa:
            if self.max_equipos not in _ED_VALIDOS:
                raise ValueError("Para Eliminación Directa, la cantidad de equipos debe ser potencia de 2: 2, 4, 8, 16, 32 o 64")

        elif self.formato == FormatoTorneo.todos_contra_todos:
            if not (_TcT_MIN <= self.max_equipos <= _TcT_MAX):
                raise ValueError(f"Para Todos contra Todos, la cantidad de equipos debe estar entre {_TcT_MIN} y {_TcT_MAX}")

        elif self.formato == FormatoTorneo.fase_grupos:
            if self.max_equipos not in _FG_TODOS:
                raise ValueError("Para Fase de Grupos, la cantidad de equipos debe ser: 6-8-10 (semis), 12-16-20 (cuartos) o 24-32-40 (octavos)")
            if not self.fase_final or self.fase_final not in _FASE_FINAL_VALIDOS:
                raise ValueError("Para Fase de Grupos debe indicar la fase final: 'semis', 'cuartos' u 'octavos'")
            # Coherencia cantidad-fase_final
            if self.fase_final == "semis" and self.max_equipos not in _FG_SEMIS:
                raise ValueError("Para Semifinales: deben ser 6, 8 o 10 equipos")
            elif self.fase_final == "cuartos" and self.max_equipos not in _FG_CUARTOS:
                raise ValueError("Para Cuartos de final: deben ser 12, 16 o 20 equipos")
            elif self.fase_final == "octavos" and self.max_equipos not in _FG_OCTAVOS:
                raise ValueError("Para Octavos de final: deben ser 24, 32 o 40 equipos")

        return self


class TorneoResponse(TorneoBase):
    id: int
    zona: str
    dias_operativos: int
    franja_horaria: str
    lugar: str
    min_integrantes_por_equipo: int
    ida_y_vuelta: bool
    fase_final: Optional[str]
    estado: EstadoTorneo
    organizador_id: int
    cupos_restantes: int

    model_config = ConfigDict(from_attributes=True)


class TorneoDetalleResponse(TorneoResponse):
    organizador: UsuarioRespuesta
    equipos_inscriptos: List[EquipoResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TorneoListado(BaseModel):
    id: int
    nombre: str
    formato: FormatoTorneo
    zona: str
    dias_operativos: int
    franja_horaria: str
    lugar: str
    fecha_inicio: datetime
    inscriptos: int
    cupos_restantes: int
    estado: EstadoTorneo
    costo_inscripcion: float
    max_equipos: int
    min_integrantes_por_equipo: int
    ida_y_vuelta: bool
    fase_final: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TorneoMisActividades(BaseModel):
    id: int
    nombre: str
    fecha_inicio: datetime
    formato: FormatoTorneo
    estado: EstadoTorneo
    rol: str
    lugar: str
    zona: str
    dias_operativos: int
    franja_horaria: str
    costo_inscripcion: float
    max_equipos: int
    equipos_inscriptos: int
    ida_y_vuelta: bool
    fase_final: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MisTorneosResponse(BaseModel):
    proximos: List[TorneoMisActividades] = []
    en_curso: List[TorneoMisActividades] = []
    finalizados: List[TorneoMisActividades] = []
    cancelados: List[TorneoMisActividades] = []
