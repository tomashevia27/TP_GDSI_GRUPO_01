from ..core.exceptions import DomainRuleError, DomainPermissionError, DomainNotFoundError
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from ..models.usuario_model import Usuario

from ..models.torneo_model import Torneo, EstadoTorneo
from ..schemas.torneo_schemas import TorneoCreate, TorneoUpdate
from ..repositories import torneo_repository
from ..models.equipo_model import Equipo
from ..schemas.equipo_schemas import InscripcionEquipoCreate 
from .torneo_notificador import notificar_torneo_cancelado
from ..services.fixture.fixture_service import FixtureService
from ..models.partido_torneo import PartidoTorneo

from typing import List, Dict

def crear_torneo(db: Session, datos: TorneoCreate, organizador_id: int) -> Torneo:
    """
    Crea un nuevo torneo asociado al organizador.
    La zona y franja horaria se eligen al momento de la creación;
    la cancha concreta se asignará durante la generación del fixture.
    """
    nuevo_torneo = Torneo(
        nombre=datos.nombre,
        fecha_inicio=datos.fecha_inicio,
        fecha_fin=datos.fecha_fin,
        formato=datos.formato,
        zona=datos.zona,
        dias_operativos=datos.dias_operativos,
        franja_horaria=datos.franja_horaria,
        max_equipos=datos.max_equipos,
        costo_inscripcion=datos.costo_inscripcion,
        descripcion=datos.descripcion,
        reglas=datos.reglas,
        ida_y_vuelta=datos.ida_y_vuelta,
        fase_final=datos.fase_final,
        estado=EstadoTorneo.abierto,
        organizador_id=organizador_id,
        min_integrantes_por_equipo=datos.min_integrantes_por_equipo,
    )

    return torneo_repository.crear_torneo(db, nuevo_torneo)
    

def editar_torneo(db: Session, torneo_id: int, datos: TorneoUpdate, organizador_id: int) -> Torneo:
    torneo = torneo_repository.obtener_por_id(db, torneo_id)
    if not torneo:
        raise DomainNotFoundError("El torneo especificado no existe.")

    if torneo.organizador_id != organizador_id:
        raise DomainPermissionError("No tienes permisos para editar este torneo")

    if torneo.estado != EstadoTorneo.abierto:
        raise DomainRuleError("Solo se puede editar un torneo si se encuentra Abierto para inscripción")

    # Extraer datos actuales y superponer los nuevos
    datos_actualizacion = datos.model_dump(exclude_unset=True)
    
    # Validar consistencia usando el esquema de creación (simulando estado final)
    datos_completos = {
        "nombre": torneo.nombre,
        "fecha_inicio": torneo.fecha_inicio,
        "fecha_fin": torneo.fecha_fin,
        "formato": torneo.formato,
        "zona": torneo.zona,
        "dias_operativos": torneo.dias_operativos,
        "franja_horaria": torneo.franja_horaria,
        "max_equipos": torneo.max_equipos,
        "min_integrantes_por_equipo": torneo.min_integrantes_por_equipo,
        "costo_inscripcion": torneo.costo_inscripcion,
        "descripcion": torneo.descripcion,
        "reglas": torneo.reglas,
        "ida_y_vuelta": torneo.ida_y_vuelta,
        "fase_final": torneo.fase_final,
    }
    datos_completos.update(datos_actualizacion)
    
    from pydantic import ValidationError
    try:
        # Validamos usando TorneoCreate que tiene todos los @model_validator
        TorneoCreate(**datos_completos)
    except ValidationError as e:
        # Extraemos el primer mensaje de error para lanzarlo como HTTP 400
        error_msg = e.errors()[0]["msg"]
        # Remover prefijos de error si los hay, como "Value error, "
        if error_msg.startswith("Value error, "):
            error_msg = error_msg.replace("Value error, ", "")
        raise DomainRuleError(error_msg)

    return torneo_repository.actualizar_torneo(db, torneo, datos_actualizacion)


def inscribir_equipo(db: Session, torneo_id: int, datos: InscripcionEquipoCreate, creador_accion_id: int) -> Equipo:
    
    torneo = torneo_repository.obtener_por_id(db, torneo_id)
    if not torneo:
        raise DomainNotFoundError("El torneo especificado no existe.")

    if torneo.estado != EstadoTorneo.abierto:
        raise DomainRuleError("No se aceptan inscripciones. El torneo no está abierto.")

    if len(torneo.equipos_inscriptos) >= torneo.max_equipos:
        raise DomainRuleError("El torneo ya no tiene cupos de inscripción disponibles.")

    if not datos.jugadores_emails or len(datos.jugadores_emails) == 0:
        raise DomainRuleError("El listado de los jugadores es obligatorio.")

    from sqlalchemy import func
    emails_busqueda = [email.lower() for email in datos.jugadores_emails]
    jugadores = db.query(Usuario).filter(func.lower(Usuario.email).in_(emails_busqueda)).all()

    if len(jugadores) != len(set(emails_busqueda)):
        raise DomainRuleError("Uno o más emails del listado no pertenecen a usuarios registrados.")

    if creador_accion_id not in [jugador.id for jugador in jugadores]:
        raise DomainRuleError("Debes formar parte del equipo para poder inscribirlo.")

    # Validar rango de jugadores: mínimo = titulares, máximo = titulares * 2 (suplentes)
    min_requerido = torneo.min_integrantes_por_equipo
    max_permitido = torneo.min_integrantes_por_equipo * 2

    if len(jugadores) < min_requerido:
        raise DomainRuleError(f"El equipo debe tener al menos {min_requerido} jugadores (titulares) para inscribirse en este torneo.")

    if len(jugadores) > max_permitido:
        raise DomainRuleError(f"El equipo no puede tener más de {max_permitido} jugadores (titulares + suplentes) para este torneo.")

    conflictos = torneo_repository.verificar_jugadores_inscriptos(db, torneo.id, [j.id for j in jugadores])
    if conflictos:
        emails_conflicto = ", ".join(j.email for j in conflictos)
        raise DomainRuleError(f"Uno o más jugadores ya están inscriptos en otro equipo de este torneo: {emails_conflicto}")

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
    torneos = torneo_repository.obtener_todos(db, EstadoTorneo.abierto)
    return [t for t in torneos if t.inscriptos < t.max_equipos]


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
            "zona": t.zona,
            "dias_operativos": t.dias_operativos,
            "franja_horaria": t.franja_horaria,
            "costo_inscripcion": t.costo_inscripcion,
            "max_equipos": t.max_equipos,
            "equipos_inscriptos": len(t.equipos_inscriptos) if t.equipos_inscriptos else 0,
            "ida_y_vuelta": t.ida_y_vuelta,
            "fase_final": t.fase_final,
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
        raise DomainNotFoundError("Torneo no encontrado")
        
    if torneo.organizador_id != usuario_accion_id:
        raise DomainPermissionError("No tienes permisos para cancelar este torneo")
        
    if torneo.estado == EstadoTorneo.cancelado:
        raise DomainRuleError("El torneo ya está cancelado")
    if torneo.estado == EstadoTorneo.en_curso:
        raise DomainRuleError("No se puede cancelar un torneo que está en curso")
    if torneo.estado == EstadoTorneo.finalizado:
        raise DomainRuleError("No se puede cancelar un torneo finalizado")

    notificar_torneo_cancelado(db, torneo)

    torneo.estado = EstadoTorneo.cancelado
    db.commit()
    db.refresh(torneo)    
    return torneo

def generar_fixture(
    db: Session,
    torneo_id: int,
    usuario_accion_id: int,
):
    torneo = torneo_repository.obtener_por_id(db, torneo_id)

    if not torneo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Torneo no encontrado"
        )

    if torneo.organizador_id != usuario_accion_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el organizador puede generar el fixture"
        )

    if torneo.estado != EstadoTorneo.abierto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El fixture solo puede generarse para torneos abiertos"
        )

    if torneo.partidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El fixture ya fue generado"
        )

    partidos = FixtureService.generar(torneo)

    db.add_all(partidos)
    torneo.estado = EstadoTorneo.en_curso

    db.commit()
    
    for partido in partidos:
        db.refresh(partido)
    db.refresh(torneo)

    return partidos