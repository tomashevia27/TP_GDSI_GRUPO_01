from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time
from sqlalchemy.orm import relationship
from ..db import Base

class Partido(Base):
    __tablename__ = "partidos"

    id = Column(Integer, primary_key=True, index=True)
    cancha_id = Column(Integer, ForeignKey("canchas.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    horario = Column(Time, nullable=False)
    modalidad = Column(String, nullable=False)
    tipo = Column(String, nullable=False)  # "abierto" o "cerrado"
    cantidad_jugadores = Column(Integer, nullable=False)
    descripcion = Column(String, nullable=True)
    estado = Column(String, nullable=False, default="pendiente")
    organizador_id = Column(Integer, ForeignKey("usuarios.id")) # hay que agregar nullable=False luego

    cancha = relationship("Cancha", back_populates="partidos")
    organizador = relationship("Usuario", back_populates="partidos_organizados")
    #jugadores = relationship("Usuario", secondary="partido_jugadores", back_populates="partidos_inscritos")