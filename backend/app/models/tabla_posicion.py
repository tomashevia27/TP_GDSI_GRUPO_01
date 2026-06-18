from ..core.db import Base
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class TablaPosiciones(Base):
    __tablename__ = "tabla_posiciones"
    
    id = Column(Integer, primary_key=True)
    torneo_id = Column(Integer, ForeignKey("torneos.id"), index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), index=True)
    grupo = Column(String(10), nullable=True) 

    pj = Column(Integer, default=0)  
    pg = Column(Integer, default=0)  
    pe = Column(Integer, default=0)  
    pp = Column(Integer, default=0)  
    gf = Column(Integer, default=0) 
    gc = Column(Integer, default=0)  

    @property
    def dg(self):
        return self.gf - self.gc

    pts = Column(Integer, default=0) 

    equipo = relationship("Equipo")