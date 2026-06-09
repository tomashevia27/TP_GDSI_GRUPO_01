import enum
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from ..core.db import Base

class FormatoTorneo(str, enum.Enum):
    eliminacion_directa = "eliminacion_directa"
    fase_grupos = "fase_grupos"
    todos_contra_todos = "todos_contra_todos"
    fase_grupos_16avos = "fase_grupos_16avos"
    fase_grupos_8avos = "fase_grupos_8avos"

class EstadoTorneo(str, enum.Enum):
    abierto = "abierto"
    en_curso = "en_curso"
    finalizado = "finalizado"
    cancelado = "cancelado"

class Torneo(Base):
    __tablename__ = "torneos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    formato = Column(Enum(FormatoTorneo, native_enum=False), nullable=False)
    lugar = Column(String(200), nullable=False)
    max_equipos = Column(Integer, nullable=False)
    inscriptos = Column(Integer, nullable=False, default=0)
    costo_inscripcion = Column(Float, nullable=False)
    descripcion = Column(Text, nullable=True)
    reglas = Column(Text, nullable=True)
    estado = Column(Enum(EstadoTorneo, native_enum=False), nullable=False, default=EstadoTorneo.abierto)
    organizador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    min_integrantes_por_equipo = Column(Integer, nullable=False, default=5)
    equipos_inscriptos = relationship("Equipo", secondary="torneo_equipos", back_populates="torneos")
    organizador = relationship("Usuario", back_populates="torneos_organizados")
    

    @property
    def cupos_restantes(self) -> int:
        return max(0, self.max_equipos - len(self.equipos_inscriptos))