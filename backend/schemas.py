from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from .models import RolUsuario

# -----------------------------------------
# US 1: Registro de Usuario
# -----------------------------------------
class UsuarioRegistro(BaseModel):
    nombre: str = Field(..., min_length=1, description="El nombre no puede estar vacío")
    apellido: str = Field(..., min_length=1, description="El apellido no puede estar vacío")
    email: EmailStr # valida el formato usuario@dominio.com automáticamente
    password: str = Field(..., min_length=8, description="La contraseña debe tener al menos 8 caracteres")
    edad: int
    genero: str = Field(..., min_length=1, description="El género no puede estar vacío")
    zona: str = Field(..., min_length=1, description="La zona no puede estar vacía")
    rol: RolUsuario = RolUsuario.jugador
    foto_perfil: Optional[str] = None

# -----------------------------------------
# US 2: Inicio de Sesión
# -----------------------------------------
class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

# -----------------------------------------
# US 3: Editar Perfil
# -----------------------------------------
class UsuarioEdicion(BaseModel):
    nombre: str = Field(..., min_length=1)
    apellido: str = Field(..., min_length=1)
    edad: int
    genero: str = Field(..., min_length=1)
    password: Optional[str] = Field(None, min_length=8)
    zona: str = Field(..., min_length=1)
    foto_perfil: Optional[str] = None

# -----------------------------------------
# Esquema de Respuesta (Lo que le devolvemos al frontend)
# -----------------------------------------
class UsuarioRespuesta(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: EmailStr
    edad: int
    genero: str
    zona: str
    rol: RolUsuario
    foto_perfil: Optional[str] = None
    
    class Config:
        orm_mode = True

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
    hora_apertura: str
    hora_cierre: str
    fotos: Optional[str] = None
    activa: bool
    propietario_id: int

    class Config:
        orm_mode = True