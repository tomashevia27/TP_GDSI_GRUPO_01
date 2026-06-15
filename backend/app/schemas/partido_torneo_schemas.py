from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from datetime import date, time

from .equipo_schemas import EquipoResponse
from ..models.partido_torneo import (
    EstadoPartidoTorneo,
    FaseTorneo,
)


class PartidoTorneoResponse(BaseModel):
    id: int

    equipo_local: Optional[EquipoResponse] = None
    equipo_visitante: Optional[EquipoResponse] = None

    goles_local: Optional[int] = None
    goles_visitante: Optional[int] = None

    fase: FaseTorneo
    grupo: Optional[str] = None

    estado: EstadoPartidoTorneo

    model_config = ConfigDict(from_attributes=True)


class ProgramarPartidoRequest(BaseModel):
    cancha_id: int
    fecha: date
    horario: time

class CargarResultadoRequest(BaseModel):
    goles_local: int = Field(ge=0, description="Goles del equipo local")
    goles_visitante: int = Field(ge=0, description="Goles del equipo visitante")