from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class NotificacionRespuesta(BaseModel):
    id: int
    tipo: str
    mensaje: str
    partido_id: Optional[int] = None
    leida: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificacionesListado(BaseModel):
    notificaciones: List[NotificacionRespuesta]
    total_no_leidas: int


class ConteoNoLeidas(BaseModel):
    total_no_leidas: int


class MensajeRespuesta(BaseModel):
    mensaje: str
