from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..db import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String(50), nullable=False)
    mensaje = Column(Text, nullable=False)
    partido_id = Column(Integer, ForeignKey("partidos.id"), nullable=True)
    leida = Column(Boolean, default=False, nullable=False)
    fecha_creacion = Column(DateTime, nullable=False)

    usuario = relationship("Usuario", back_populates="notificaciones")
    partido = relationship("Partido")
