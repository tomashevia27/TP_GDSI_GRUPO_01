from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from ..models.torneo_model import Torneo, EstadoTorneo
from ..schemas.torneo_schemas import TorneoCreate
from ..repositories import torneo_repository
from ..core.exceptions import DomainRuleError

from typing import List, Dict

def crear_torneo(db: Session, datos: TorneoCreate, organizador_id: int) -> Torneo:
    if datos.max_equipos < 2:
        raise DomainRuleError("El torneo debe admitir al menos 2 equipos")
        
    tz_local = timezone(timedelta(hours=-3))
    ahora = datetime.now(tz_local).replace(tzinfo=None)
    if datos.fecha_inicio.replace(tzinfo=None) < ahora:
        raise DomainRuleError("La fecha de inicio no puede estar en el pasado")

    nuevo_torneo = Torneo(
        nombre=datos.nombre,
        fecha_inicio=datos.fecha_inicio,
        formato=datos.formato,
        lugar=datos.lugar,
        max_equipos=datos.max_equipos,
        costo_inscripcion=datos.costo_inscripcion,
        descripcion=datos.descripcion,
        reglas=datos.reglas,
        estado=EstadoTorneo.abierto,
        organizador_id=organizador_id
    )

    return torneo_repository.crear_torneo(db, nuevo_torneo)


def listar_torneos_abiertos(db: Session) -> List[Dict]:
    """Devuelve una lista de torneos con estado 'abierto' incluyendo cupos_restantes.  
    """
    torneos = torneo_repository.obtener_todos(db, EstadoTorneo.abierto)
    resultado = []
    for t in torneos:
        cupos_restantes = max(0, t.max_equipos - t.inscriptos)
        resultado.append({
            "id": t.id,
            "nombre": t.nombre,
            "formato": t.formato,
            "lugar": t.lugar,
            "fecha_inicio": t.fecha_inicio,
            "inscriptos": t.inscriptos,
            "cupos_restantes": cupos_restantes,
        })
    return resultado
