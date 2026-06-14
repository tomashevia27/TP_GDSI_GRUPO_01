from typing import Optional

from pydantic import BaseModel, ConfigDict

from .equipo_schemas import EquipoResponse
from ..models.partido_torneo import (
    EstadoPartidoTorneo,
    FaseTorneo,
)


class PartidoTorneoResponse(BaseModel):
    id: int

    equipo_local: EquipoResponse
    equipo_visitante: EquipoResponse

    goles_local: Optional[int] = None
    goles_visitante: Optional[int] = None

    fase: FaseTorneo
    grupo: Optional[str] = None

    estado: EstadoPartidoTorneo

    model_config = ConfigDict(from_attributes=True)