from pydantic import BaseModel, ConfigDict, Field, validator
from typing import Optional
from datetime import date, time

class PartidoCreate(BaseModel):
    cancha_id: int
    fecha: date
    horario: time
    tipo: str
    descripcion: Optional[str] = None

class PartidoRespuesta(BaseModel):
    id: int
    cancha_id: int
    fecha: date
    horario: time
    modalidad: str
    tipo: str
    cantidad_jugadores: int
    descripcion: Optional[str]
    estado: str

    model_config = ConfigDict(from_attributes=True)