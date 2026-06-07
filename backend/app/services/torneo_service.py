from fastapi import HTTPException, status

from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from backend.app.services.torneo_notificador import notificar_torneo_cancelado
from .user_service import obtener_usuarios_activos

from ..models.torneo_model import Torneo, EstadoTorneo
from ..schemas.torneo_schemas import TorneoCreate
from ..repositories import torneo_repository
from ..models.equipo_model import Equipo
from ..schemas.equipo_schemas import InscripcionEquipoCreate 
from .torneo_notificador import notificar_torneo_cancelado

from typing import List, Dict

def crear_torneo(db: Session, datos: TorneoCreate, organizador_id: int) -> Torneo:
    if datos.max_equipos < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El torneo debe admitir al menos 2 equipos"
        )
        
    tz_local = timezone(timedelta(hours=-3))
    ahora = datetime.now(tz_local).replace(tzinfo=None)
    if datos.fecha_inicio.replace(tzinfo=None) < ahora:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="La fecha de inicio no puede estar en el pasado"
        )

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El torneo especificado no existe."
        )

    if torneo.estado != EstadoTorneo.abierto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se aceptan inscripciones. El torneo no está abierto."
        )

    if len(torneo.equipos_inscriptos) >= torneo.max_equipos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El torneo ya no tiene cupos de inscripción disponibles."
        )

    if not datos.jugadores_ids or len(datos.jugadores_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El listado de los jugadores es obligatorio."
        )

    if creador_accion_id not in datos.jugadores_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes formar parte del equipo para poder inscribirlo."
        )

    jugadores = obtener_usuarios_activos(db, datos.jugadores_ids)

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


def listar_torneos_abiertos(db: Session) -> List[Torneo]:
    """Devuelve una lista de torneos con estado 'abierto' incluyendo cupos_restantes.  
    """
    return torneo_repository.obtener_todos(db, EstadoTorneo.abierto)


def listar_mis_torneos(db: Session, usuario_id: int) -> Dict[str, List[Dict]]:
    torneos = torneo_repository.obtener_torneos_por_usuario(db, usuario_id)
    
    resultado = {
        "proximos": [],
        "en_curso": [],
        "finalizados": []
    }
    
    for t in torneos:
        rol = "Organizador" if t.organizador_id == usuario_id else "Jugador"
        
        dto_torneo = {
            "id": t.id,
            "nombre": t.nombre,
            "fecha_inicio": t.fecha_inicio,
            "formato": t.formato,
            "estado": t.estado,
            "rol": rol
        }
        
        if t.estado == EstadoTorneo.abierto:
            resultado["proximos"].append(dto_torneo)
        elif t.estado == EstadoTorneo.en_curso:
            resultado["en_curso"].append(dto_torneo)
        elif t.estado in [EstadoTorneo.finalizado, EstadoTorneo.cancelado]:
            resultado["finalizados"].append(dto_torneo)
            
    return resultado


def cancelar_torneo(db: Session, torneo_id: int, usuario_accion_id: int):
    torneo = torneo_repository.obtener_por_id(db, torneo_id)
    
    if not torneo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Torneo no encontrado")
        
    if torneo.organizador_id != usuario_accion_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para cancelar este torneo"
        )
        
    if torneo.estado == "cancelado":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El torneo ya está cancelado")
    if torneo.estado == "finalizado":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede cancelar un torneo finalizado")


    notificar_torneo_cancelado(db, torneo)

    torneo.estado = "cancelado"
    db.commit()
    db.refresh(torneo)    
    return torneo
