import enum

from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, Float, ForeignKey

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


class Cancha(Base):
    __tablename__ = "canchas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    tipo_superficie = Column(String(50), nullable=False)
    tamano = Column(Integer, nullable=False)
    iluminacion = Column(Boolean, nullable=False, default=False)
    zona = Column(String(100), nullable=False)
    direccion = Column(String(200), nullable=False)
    precio_por_turno = Column(Float, nullable=False)
    dias_operativos = Column(Integer, nullable=False, default=31)
    hora_apertura = Column(String(10), nullable=False)
    hora_cierre = Column(String(10), nullable=False)
    fotos = Column(Text, nullable=True)
    activa = Column(Boolean, default=True)
    propietario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)