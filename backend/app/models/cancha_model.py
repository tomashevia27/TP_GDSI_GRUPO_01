from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..db import Base

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
    partidos = relationship("Partido", back_populates="cancha")