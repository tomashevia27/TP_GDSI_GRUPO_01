from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Time, Table
from sqlalchemy.orm import relationship
from ..db import Base

partido_jugadores = Table(
    "partido_jugadores",
    Base.metadata,
    Column("partido_id", Integer, ForeignKey("partidos.id"), primary_key=True),
    Column("usuario_id", Integer, ForeignKey("usuarios.id"), primary_key=True),
)

class Partido(Base):
    __tablename__ = "partidos"

    id = Column(Integer, primary_key=True, index=True)
    cancha_id = Column(Integer, ForeignKey("canchas.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    horario = Column(Time, nullable=False)
    modalidad = Column(String, nullable=False)
    tipo = Column(String, nullable=False)  # "abierto" o "cerrado"
    cantidad_jugadores = Column(Integer, nullable=False)
    cupos_disponibles = Column(Integer, nullable=False, default=0)
    descripcion = Column(String, nullable=True)
    estado = Column(String, nullable=False, default="pendiente")
    organizador_id = Column(Integer, ForeignKey("usuarios.id")) # hay que agregar nullable=False luego
    cliente_nombre = Column(String(200), nullable=True)
    cliente_apellido = Column(String(200), nullable=True)
    cliente_telefono = Column(String(50), nullable=True)
    reserva_manual = Column(Boolean, default=False)

    cancha = relationship("Cancha", back_populates="partidos")
    organizador = relationship("Usuario", back_populates="partidos_organizados")
    jugadores = relationship("Usuario", secondary=partido_jugadores, back_populates="partidos_inscritos")