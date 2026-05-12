from pydantic import BaseModel, EmailStr, Field
from typing import Optional

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
    foto_perfil: Optional[str] = None
    
    class Config:
        orm_mode = True