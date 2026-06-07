from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from ..core.db import Base

equipo_jugadores = Table(
    "equipo_jugadores",
    Base.metadata,
    Column("equipo_id", Integer, ForeignKey("equipos.id", ondelete="CASCADE"), primary_key=True),
    Column("usuario_id", Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
)

torneo_equipos = Table(
    "torneo_equipos",
    Base.metadata,
    Column("torneo_id", Integer, ForeignKey("torneos.id", ondelete="CASCADE"), primary_key=True),
    Column("equipo_id", Integer, ForeignKey("equipos.id", ondelete="CASCADE"), primary_key=True),
)

class Equipo(Base):
    __tablename__ = "equipos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)        
    escudo = Column(Text, nullable=True)    
    max_integrantes = Column(Integer, nullable=False, default=10)           

    jugadores = relationship("Usuario", secondary="equipo_jugadores", back_populates="equipos")
    
    torneos = relationship("Torneo", secondary="torneo_equipos", back_populates="equipos_inscriptos")
