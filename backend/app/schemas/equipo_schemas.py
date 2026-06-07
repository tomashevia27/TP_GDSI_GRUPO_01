from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from .usuario_schemas import UsuarioRespuesta

class EquipoBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre del equipo participante")
    escudo: Optional[str] = Field(None, description="URL o representación en string del escudo del equipo")
    
class InscripcionEquipoCreate(EquipoBase):
    jugadores_ids: List[int] = Field(..., min_length=1, description="Lista de IDs de los jugadores del equipo")

class EquipoResponse(EquipoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class EquipoDetalleResponse(EquipoResponse):
    jugadores: List[UsuarioRespuesta]
    model_config = ConfigDict(from_attributes=True)