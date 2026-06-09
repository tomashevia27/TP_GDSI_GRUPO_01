from fastapi import HTTPException, status

from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from ..models.usuario_model import Usuario

from ..models.torneo_model import Torneo, EstadoTorneo
from ..schemas.torneo_schemas import TorneoCreate
from ..repositories import torneo_repository
from ..models.equipo_model import Equipo
from ..schemas.equipo_schemas import InscripcionEquipoCreate 
from .torneo_notificador import notificar_torneo_cancelado

from typing import List, Dict

def crear_torneo(db: Session, datos: TorneoCreate, organizador_id: int) -> Torneo:
    """
    Crea un nuevo torneo asociado al organizador.
    La validación de datos (fechas, max_equipos, etc.) ya la realiza el schema TorneoCreate.
    """
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
        organizador_id=organizador_id,
        min_integrantes_por_equipo=datos.min_integrantes_por_equipo
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

    if not datos.jugadores_emails or len(datos.jugadores_emails) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El listado de los jugadores es obligatorio."
        )

    emails_busqueda = [email.lower() for email in datos.jugadores_emails]
    jugadores = db.query(Usuario).filter(Usuario.email.in_(emails_busqueda)).all()

    if len(jugadores) != len(set(emails_busqueda)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uno o más emails del listado no pertenecen a usuarios registrados."
        )

    if creador_accion_id not in [jugador.id for jugador in jugadores]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes formar parte del equipo para poder inscribirlo."
        )

    # Validar rango de jugadores: mínimo = titulares, máximo = titulares * 2 (suplentes)
    min_requerido = torneo.min_integrantes_por_equipo
    max_permitido = torneo.min_integrantes_por_equipo * 2

    if len(jugadores) < min_requerido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El equipo debe tener al menos {min_requerido} jugadores (titulares) para inscribirse en este torneo."
        )

    if len(jugadores) > max_permitido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El equipo no puede tener más de {max_permitido} jugadores (titulares + suplentes) para este torneo."
        )

    # Validar que ningún jugador esté ya en un equipo inscripto en este torneo
    ids_ya_inscriptos = {
        j.id
        for eq in torneo.equipos_inscriptos
        for j in eq.jugadores
    }
    conflictos = [j for j in jugadores if j.id in ids_ya_inscriptos]
    if conflictos:
        emails_conflicto = ", ".join(j.email for j in conflictos)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uno o más jugadores ya están inscriptos en otro equipo de este torneo: {emails_conflicto}"
        )

    nuevo_equipo = Equipo(
        nombre=datos.nombre,
        escudo=datos.escudo
    )
    nuevo_equipo.jugadores = jugadores

    torneo.equipos_inscriptos.append(nuevo_equipo)
    torneo.inscriptos += 1

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
        "finalizados": [],
        "cancelados": []
    }
    
    for t in torneos:
        rol = "Organizador" if t.organizador_id == usuario_id else "Jugador"
        
        dto_torneo = {
            "id": t.id,
            "nombre": t.nombre,
            "fecha_inicio": t.fecha_inicio,
            "formato": t.formato,
            "estado": t.estado,
            "rol": rol,
            "lugar": t.lugar,
            "costo_inscripcion": t.costo_inscripcion,
            "max_equipos": t.max_equipos,
            "equipos_inscriptos": len(t.equipos_inscriptos) if t.equipos_inscriptos else 0
        }
        
        if t.estado == EstadoTorneo.abierto:
            resultado["proximos"].append(dto_torneo)
        elif t.estado == EstadoTorneo.en_curso:
            resultado["en_curso"].append(dto_torneo)
        elif t.estado == EstadoTorneo.finalizado:
            resultado["finalizados"].append(dto_torneo)
        elif t.estado == EstadoTorneo.cancelado:
            resultado["cancelados"].append(dto_torneo)
            
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
        
    if torneo.estado == EstadoTorneo.cancelado:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El torneo ya está cancelado")
    if torneo.estado == EstadoTorneo.en_curso:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede cancelar un torneo que está en curso")
    if torneo.estado == EstadoTorneo.finalizado:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede cancelar un torneo finalizado")

    notificar_torneo_cancelado(db, torneo)

    torneo.estado = EstadoTorneo.cancelado
    db.commit()
    db.refresh(torneo)    
    return torneo
