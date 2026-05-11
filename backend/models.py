from sqlalchemy import Column, Integer, String, Text, Boolean

from .db import Base


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
    foto_perfil = Column(Text, nullable=True)
    activo = Column(Boolean, default=True)