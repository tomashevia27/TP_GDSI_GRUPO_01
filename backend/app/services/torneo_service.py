from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from ..models.torneo_model import Torneo, EstadoTorneo
from ..schemas.torneo_schemas import TorneoCreate
from ..repositories import torneo_repository
from ..core.exceptions import DomainRuleError
from ..models.equipo_model import Equipo
from ..models.usuario_model import Usuario
from ..schemas.equipo_schemas import InscripcionEquipoCreate 

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

def inscribir_equipo(db: Session, torneo_id: int, datos: InscripcionEquipoCreate, creador_accion_id: int) -> Equipo:
    
    torneo = torneo_repository.obtener_por_id(db, torneo_id)
    if not torneo:
        raise DomainRuleError("El torneo especificado no existe.")

    if torneo.estado != EstadoTorneo.abierto:
        raise DomainRuleError("No se aceptan inscripciones. El torneo no está abierto.")

    if len(torneo.equipos_inscriptos) >= torneo.max_equipos:
        raise DomainRuleError("El torneo ya no tiene cupos de inscripción disponibles.")

    if not datos.jugadores_ids or len(datos.jugadores_ids) == 0:
        raise DomainRuleError("El listado de los jugadores es obligatorio.")

    if creador_accion_id not in datos.jugadores_ids:
        raise DomainRuleError("Debes formar parte del equipo para poder inscribirlo.")

    jugadores = torneo_repository.obtener_usuarios_por_ids(db, datos.jugadores_ids)
    if len(jugadores) != len(datos.jugadores_ids):
        raise DomainRuleError("Uno o más jugadores del listado no son válidos o no existen.")

    nuevo_equipo = Equipo(
        nombre=datos.nombre,
        escudo=datos.escudo  
    )
    nuevo_equipo.jugadores = jugadores

    torneo.equipos_inscriptos.append(nuevo_equipo)

    db.add(nuevo_equipo)
    db.commit()
    db.refresh(nuevo_equipo)

    return nuevo_equipo


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
