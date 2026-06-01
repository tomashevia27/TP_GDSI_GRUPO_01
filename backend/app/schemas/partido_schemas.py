from pydantic import BaseModel, ConfigDict, Field, validator
from typing import Optional, List
from datetime import date, time

from .usuario_schemas import UsuarioRespuesta

class CanchaBasica(BaseModel):
    id: int
    nombre: str
    zona: str
    direccion: str
    duracion_turno: int
    model_config = ConfigDict(from_attributes=True)

class PartidoCreate(BaseModel):
    cancha_id: int
    fecha: date
    horario: time
    tipo: str
    descripcion: Optional[str] = None
    cupos_disponibles: Optional[int] = None
    use_partido_a_favor: Optional[bool] = False

class ReservaManualCreate(BaseModel):
    cancha_id: int
    fecha: date
    horario: time
    cliente_nombre: Optional[str] = None
    cliente_apellido: Optional[str] = None
    cliente_telefono: Optional[str] = None

class PartidoUpdate(BaseModel):
    cancha_id: Optional[int] = None
    fecha: Optional[date] = None
    horario: Optional[time] = None
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    cupos_disponibles: Optional[int] = None

class PartidoRespuesta(BaseModel):
    id: int
    cancha_id: int
    fecha: date
    horario: time
    modalidad: str
    tipo: str
    cantidad_jugadores: int
    cupos_disponibles: int
    descripcion: Optional[str]
    estado: str
    cancha: Optional[CanchaBasica] = None
    organizador: Optional[UsuarioRespuesta] = None
    jugadores: List[UsuarioRespuesta] = []
    cliente_nombre: Optional[str] = None
    cliente_apellido: Optional[str] = None
    cliente_telefono: Optional[str] = None
    reserva_manual: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

class MisPartidosRespuesta(BaseModel):
    organizados: List[PartidoRespuesta]
    inscritos: List[PartidoRespuesta]

class FiltroOpcion(BaseModel):
    valor: str
    cantidad: int

class FiltrosDisponibles(BaseModel):
    zonas: List[FiltroOpcion]
    modalidades: List[FiltroOpcion]


class PartidosAFavorRespuesta(BaseModel):
    cantidad: int
    tiene: bool


class ReprogramarReserva(BaseModel):
    fecha: date
    horario: time
    cancha_id: Optional[int] = None