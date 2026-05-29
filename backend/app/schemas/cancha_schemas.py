from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional
from datetime import date

# -----------------------------------------
# US 4: Crear Cancha
# -----------------------------------------
class CanchaCreate(BaseModel):
    nombre: str = Field(..., min_length=1)
    tipo_superficie: str = Field(..., min_length=1)
    tamano: int = Field(..., gt=0)
    iluminacion: bool
    zona: str = Field(..., min_length=1)
    direccion: str = Field(..., min_length=1)
    precio_por_turno: float = Field(..., gt=0, description="El precio debe ser mayor a cero")
    dias_operativos: int = Field(..., description="Bitmask de días operativos (ej: 31 = Lun-Vie)")
    hora_apertura: str = Field(..., min_length=1)
    hora_cierre: str = Field(..., min_length=1)
    duracion_turno: int = Field(60, gt=0, description="Duración del turno en minutos")
    fotos: Optional[str] = None

class CanchaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    tipo_superficie: str
    tamano: int
    iluminacion: bool
    zona: str
    direccion: str
    precio_por_turno: float
    dias_operativos: int
    dias_operativos_texto: Optional[str] = None
    hora_apertura: str
    hora_cierre: str
    duracion_turno: int
    fotos: Optional[str] = None
    activa: bool
    propietario_id: int

    @model_validator(mode="after")
    def calcular_dias_texto(self):
        bitmask = self.dias_operativos or 0
        dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        activos = [dias[i] for i in range(7) if (bitmask >> i) & 1]

        if not activos:
            self.dias_operativos_texto = "Sin días operativos"
            return self
        if len(activos) == 7:
            self.dias_operativos_texto = "Todos los días"
            return self
        if activos == dias[:5]:
            self.dias_operativos_texto = "Lunes a Viernes"
            return self
        if activos == dias[5:]:
            self.dias_operativos_texto = "Fines de semana"
            return self
        self.dias_operativos_texto = ", ".join(activos)
        return self

# -----------------------------------------
# US 4: Editar Cancha
# -----------------------------------------
class CanchaUpdate(BaseModel):
    nombre: str = Field(..., min_length=1)
    tipo_superficie: str = Field(..., min_length=1)
    tamano: int = Field(..., gt=0)
    iluminacion: bool
    zona: str = Field(..., min_length=1)
    direccion: str = Field(..., min_length=1)
    precio_por_turno: float = Field(..., gt=0, description="El precio debe ser mayor a cero")
    dias_operativos: int = Field(..., description="Bitmask de días operativos (ej: 31 = Lun-Vie)")
    hora_apertura: str = Field(..., min_length=1)
    hora_cierre: str = Field(..., min_length=1)
    duracion_turno: int = Field(60, gt=0, description="Duración del turno en minutos")
    fotos: Optional[str] = None

# -----------------------------------------
# US 24: Agenda de la Cancha
# -----------------------------------------
class AgendaSlot(BaseModel):
    horario: str
    estado: str  # "disponible" | "ocupado" | "bloqueado"
    partido_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    cliente_apellido: Optional[str] = None
    cliente_telefono: Optional[str] = None
    organizador_nombre: Optional[str] = None
    organizador_apellido: Optional[str] = None
    es_reserva_manual: Optional[bool] = False

class AgendaRespuesta(BaseModel):
    cancha: CanchaRespuesta
    fecha: date
    slots: list[AgendaSlot]
