import enum

from sqlalchemy import Column, Integer, String, Text, Boolean, Enum

from .db import Base


class RolUsuario(str, enum.Enum):
    jugador = "jugador"
    admin = "admin"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    edad = Column(Integer, nullable=False)
    genero = Column(String(50), nullable=False)
    zona = Column(String(100), nullable=False)
    rol = Column(Enum(RolUsuario, native_enum=False), nullable=False, default=RolUsuario.jugador)
    foto_perfil = Column(Text, nullable=True)
    email_confirmado = Column(Boolean, default=False)
    confirmation_code = Column(String(20), nullable=True)