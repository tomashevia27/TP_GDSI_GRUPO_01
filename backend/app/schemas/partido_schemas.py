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

class PartidoUpdate(BaseModel):
    cancha_id: int
    fecha: date
    horario: time
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