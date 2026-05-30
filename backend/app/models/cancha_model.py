from datetime import datetime, date, timedelta
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..db import Base

DIAS_SEMANA_MAP = {0: 1, 1: 2, 2: 4, 3: 8, 4: 16, 5: 32, 6: 64}

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
    duracion_turno = Column(Integer, nullable=False, default=60)
    fotos = Column(Text, nullable=True)
    activa = Column(Boolean, default=True)
    propietario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    partidos = relationship("Partido", back_populates="cancha")

    def opera_en_fecha(self, fecha: date) -> bool:
        """Verifica si la cancha opera en la fecha solicitada."""
        return bool(self.dias_operativos & DIAS_SEMANA_MAP[fecha.weekday()])

    def obtener_rango_datetime(self) -> tuple[datetime, datetime]:
        """Convierte los strings de apertura y cierre en datetimes relativos al mismo día."""
        apertura = datetime.strptime(self.hora_apertura, "%H:%M")
        if self.hora_cierre == "24:00":
            cierre = datetime.strptime("00:00", "%H:%M") + timedelta(days=1)
        else:
            cierre = datetime.strptime(self.hora_cierre, "%H:%M")
        return apertura, cierre