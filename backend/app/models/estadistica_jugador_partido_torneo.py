from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from ..core.db import Base


class EstadisticaJugadorPartidoTorneo(Base):
    __tablename__ = "estadisticas_jugador_partido_torneo"

    id = Column(Integer, primary_key=True)

    torneo_id = Column(Integer, ForeignKey("torneos.id"), nullable=False, index=True)
    partido_id = Column(Integer, ForeignKey("partidos_torneo.id"), nullable=False, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)

    goles = Column(Integer, nullable=False, default=0)
    amarillas = Column(Integer, nullable=False, default=0)
    rojas = Column(Integer, nullable=False, default=0)

    torneo = relationship("Torneo")
    partido = relationship("PartidoTorneo")
    equipo = relationship("Equipo")
    usuario = relationship("Usuario")

    __table_args__ = (
        UniqueConstraint(
            "partido_id",
            "usuario_id",
            name="uq_estadisticas_jugador_partido_usuario",
        ),
    )