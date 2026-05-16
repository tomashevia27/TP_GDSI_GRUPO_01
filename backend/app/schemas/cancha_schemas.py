from pydantic import BaseModel, Field, validator
from typing import Optional

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
    fotos: Optional[str] = None
    propietario_id: int

class CanchaRespuesta(BaseModel):
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
    fotos: Optional[str] = None
    activa: bool
    propietario_id: int

    class Config:
        orm_mode = True

    @validator('dias_operativos_texto', always=True)
    def calcular_dias_texto(cls, v, values):
        bitmask = values.get('dias_operativos', 0)
        dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        activos = [dias[i] for i in range(7) if (bitmask >> i) & 1]

        if not activos:
            return "Sin días operativos"
        if len(activos) == 7:
            return "Todos los días"
        if activos == dias[:5]:
            return "Lunes a Viernes"
        if activos == dias[5:]:
            return "Fines de semana"
        return ", ".join(activos)