from datetime import datetime, timedelta, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator, ConfigDict

from .usuario_schemas import UsuarioRespuesta
from .equipo_schemas import EquipoResponse
from ..models.torneo_model import FormatoTorneo, EstadoTorneo

class TorneoBase(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    fecha_inicio: datetime
    fecha_fin: datetime
    formato: FormatoTorneo
    max_equipos: int = Field(..., ge=2, description="Debe ser al menos 2")
    costo_inscripcion: float = Field(..., ge=0)
    descripcion: Optional[str] = None
    reglas: Optional[str] = None

class TorneoCreate(TorneoBase):
    cancha_id: int

    @model_validator(mode='after')
    def validar_fechas(self):
        tz_local = timezone(timedelta(hours=-3))
        ahora = datetime.now(tz_local).replace(tzinfo=None)
        inicio = self.fecha_inicio.replace(tzinfo=None)
        fin = self.fecha_fin.replace(tzinfo=None)
        
        if inicio < ahora:
            raise ValueError("La fecha de inicio no puede estar en el pasado")
        if fin <= inicio:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")
            
        return self

class TorneoResponse(TorneoBase):
    id: int
    cancha_id: int
    lugar: str
    min_integrantes_por_equipo: int
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
    lugar: str
    fecha_inicio: datetime
    inscriptos: int
    cupos_restantes: int
    estado: EstadoTorneo
    costo_inscripcion: float
    max_equipos: int

    model_config = ConfigDict(from_attributes=True)


class TorneoMisActividades(BaseModel):
    id: int
    nombre: str
    fecha_inicio: datetime
    formato: FormatoTorneo
    estado: EstadoTorneo
    rol: str
    lugar: str
    costo_inscripcion: float
    max_equipos: int
    equipos_inscriptos: int

    model_config = ConfigDict(from_attributes=True)


class MisTorneosResponse(BaseModel):
    proximos: List[TorneoMisActividades] = []
    en_curso: List[TorneoMisActividades] = []
    finalizados: List[TorneoMisActividades] = []
    cancelados: List[TorneoMisActividades] = []

