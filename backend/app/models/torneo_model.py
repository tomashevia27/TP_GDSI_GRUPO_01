import enum
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from ..core.db import Base

class FormatoTorneo(str, enum.Enum):
    eliminacion_directa = "eliminacion_directa"
    fase_grupos = "fase_grupos"
    todos_contra_todos = "todos_contra_todos"

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
    fecha_fin = Column(DateTime, nullable=False)
    formato = Column(Enum(FormatoTorneo, native_enum=False), nullable=False)
    zona = Column(String(100), nullable=False)
    franja_horaria = Column(String(20), nullable=False)  # "HH:MM-HH:MM"
    max_equipos = Column(Integer, nullable=False)
    inscriptos = Column(Integer, nullable=False, default=0)
    costo_inscripcion = Column(Float, nullable=False)
    descripcion = Column(Text, nullable=True)
    reglas = Column(Text, nullable=True)
    estado = Column(Enum(EstadoTorneo, native_enum=False), nullable=False, default=EstadoTorneo.abierto)
    organizador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    min_integrantes_por_equipo = Column(Integer, nullable=False, default=5)
    dias_operativos = Column(Integer, nullable=False, default=127)   # bitmask 7 días (igual que Cancha)
    # Campos específicos por formato
    ida_y_vuelta = Column(Boolean, nullable=False, default=False)   # solo todos_contra_todos
    fase_final = Column(String(20), nullable=True)                  # "semis" | "cuartos" | "octavos" (fase_grupos)

    equipos_inscriptos = relationship("Equipo", secondary="torneo_equipos", back_populates="torneos")
    organizador = relationship("Usuario", back_populates="torneos_organizados")

    @property
    def lugar(self) -> str:
        return self.zona or ""

    @property
    def cupos_restantes(self) -> int:
        return max(0, self.max_equipos - len(self.equipos_inscriptos))