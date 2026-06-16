from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field
from datetime import date, time

from .equipo_schemas import EquipoResponse, EquipoDetalleResponse
from ..models.partido_torneo import (
    EstadoPartidoTorneo,
    FaseTorneo,
)


class PartidoTorneoResponse(BaseModel):
    id: int

    equipo_local: Optional[EquipoDetalleResponse] = None
    equipo_visitante: Optional[EquipoDetalleResponse] = None

    goles_local: Optional[int] = None
    goles_visitante: Optional[int] = None

    fase: FaseTorneo
    grupo: Optional[str] = None
    numero_fecha: Optional[int] = None

    estado: EstadoPartidoTorneo

    fecha: Optional[date] = None
    horario: Optional[time] = None
    cancha_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ProgramarPartidoRequest(BaseModel):
    cancha_id: int
    fecha: date
    horario: time


class EstadisticaJugadorPartidoRequest(BaseModel):
    usuario_id: int = Field(..., description="ID del jugador")
    equipo_id: int = Field(..., description="ID del equipo del jugador")
    goles: int = Field(ge=0, default=0)
    amarillas: int = Field(ge=0, default=0)
    rojas: int = Field(ge=0, default=0)


class CargarResultadoRequest(BaseModel):
    goles_local: int = Field(ge=0, description="Goles del equipo local")
    goles_visitante: int = Field(ge=0, description="Goles del equipo visitante")
    estadisticas_jugadores: List[EstadisticaJugadorPartidoRequest] = Field(
        default_factory=list,
        description="Participaciones individuales a registrar para este partido",
    )


class EstadisticaJugadorPartidoResponse(BaseModel):
    usuario_id: int
    equipo_id: int
    goles: int
    amarillas: int
    rojas: int

    model_config = ConfigDict(from_attributes=True)


class EstadisticaJugadorTorneoResponse(BaseModel):
    usuario_id: int
    usuario_nombre: str
    usuario_apellido: str
    equipo_id: int
    equipo_nombre: str
    goles: int
    amarillas: int
    rojas: int


class EstadisticaEquipoTorneoResponse(BaseModel):
    equipo_id: int
    equipo_nombre: str
    goles: int
    amarillas: int
    rojas: int


class EstadisticasTorneoResponse(BaseModel):
    jugadores: List[EstadisticaJugadorTorneoResponse] = Field(default_factory=list)
    equipos: List[EstadisticaEquipoTorneoResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class TopJugadorResponse(BaseModel):
    usuario_id: int
    usuario_nombre: str
    usuario_apellido: str
    equipo_id: int
    equipo_nombre: str
    valor: int


class TablaPosicionResponse(BaseModel):
    equipo_id: int
    equipo_nombre: str
    pts: int
    pj: int
    pg: int
    pe: int
    pp: int
    gf: int
    gc: int
    dg: int

    model_config = ConfigDict(from_attributes=True)


class VallaInvictaResponse(BaseModel):
    equipo_id: int
    equipo_nombre: str
    partidos_invicto: int


class PlayerStatPerMatchResponse(BaseModel):
    partido_id: int
    fecha: Optional[date] = None
    equipo_id: int
    equipo_nombre: str
    equipo_oponente_id: Optional[int] = None
    equipo_oponente_nombre: Optional[str] = None
    goles: int
    amarillas: int
    rojas: int

    model_config = ConfigDict(from_attributes=True)

class PartidoBracketResponse(BaseModel):
    id: int
    equipo_local: Optional[EquipoResponse] = None
    equipo_visitante: Optional[EquipoResponse] = None
    goles_local: Optional[int] = None
    goles_visitante: Optional[int] = None
    estado: str
    fecha: Optional[str] = None 

    model_config = ConfigDict(from_attributes=True)

class RondaResponse(BaseModel):
    nombre: str  
    partidos: List[PartidoBracketResponse]

class BracketResponse(BaseModel):
    rondas: List[RondaResponse]

class FechaResponse(BaseModel):
    numero: int
    partidos: List[PartidoBracketResponse]

class FixtureResponse(BaseModel):
    fechas: List[FechaResponse]