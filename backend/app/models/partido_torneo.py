import enum

from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Enum,
    Date,
    Time,
    String,
)

from sqlalchemy.orm import relationship
from ..core.db import Base


class EstadoPartidoTorneo(str, enum.Enum):
    pendiente = "pendiente"
    finalizado = "finalizado"

class FaseTorneo(str, enum.Enum):
    grupos = "grupos"
    liga = "liga"
    dieciseisavos = "dieciseisavos"
    octavos = "octavos"
    cuartos = "cuartos"
    semifinal = "semifinal"
    final = "final"


class PartidoTorneo(Base):
    __tablename__ = "partidos_torneo"

    id = Column(Integer, primary_key=True)

    torneo_id = Column(
        Integer,
        ForeignKey("torneos.id"),
        nullable=False
    )

    equipo_local_id = Column(
        Integer,
        ForeignKey("equipos.id"),
        nullable=False
    )

    equipo_visitante_id = Column(
        Integer,
        ForeignKey("equipos.id"),
        nullable=False
    )

    cancha_id = Column(
        Integer,
        ForeignKey("canchas.id"),
        nullable=True
    )

    fecha = Column(Date, nullable=True)
    horario = Column(Time, nullable=True)
    goles_local = Column(Integer, nullable=True)
    goles_visitante = Column(Integer, nullable=True)
    fase = Column(Enum(FaseTorneo, native_enum=False), nullable=False)
    grupo = Column(String(10), nullable=True)
    estado = Column(
        Enum(EstadoPartidoTorneo, native_enum=False),
        nullable=False,
        default=EstadoPartidoTorneo.pendiente
    )

    torneo = relationship(
        "Torneo",
        back_populates="partidos"
    )

    equipo_local = relationship(
        "Equipo",
        foreign_keys=[equipo_local_id]
    )

    equipo_visitante = relationship(
        "Equipo",
        foreign_keys=[equipo_visitante_id]
    )

    cancha = relationship("Cancha")