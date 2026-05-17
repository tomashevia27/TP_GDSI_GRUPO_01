from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..models.partido_model import Partido
from ..repositories import partido_repository
from ..schemas.partido_schemas import PartidoCreate
from ..repositories import cancha_repository


DIAS_SEMANA = {
    0: 1,    # lunes
    1: 2,    # martes
    2: 4,    # miércoles
    3: 8,    # jueves
    4: 16,   # viernes
    5: 32,   # sábado
    6: 64    # domingo
}

TAMANOS_MODALIDAD = {
    5: "futbol 5",
    7: "futbol 7",
    9: "futbol 9",
    11: "futbol 11"
}


def obtener_mis_partidos(db: Session, usuario_id: int):
    """Obtiene los partidos organizados e inscritos por el jugador."""
    
    organizados = partido_repository.obtener_organizados_por_usuario(
        db, usuario_id
    )

    inscritos = partido_repository.obtener_inscritos_por_usuario(
        db, usuario_id
    )

    return {
        "organizados": organizados,
        "inscritos": inscritos
    }


def obtener_detalle_partido(db: Session, partido_id: int):
    """Obtiene el detalle de un partido específico."""
    
    partido = partido_repository.obtener_por_id(db, partido_id)

    if not partido:
        raise HTTPException(
            status_code=404,
            detail="Partido no encontrado"
        )

    return partido


def crear_partido(
    db: Session,
    datos: PartidoCreate,
    #organizador_id: int hay que agregarlo luego cuando se implemente autenticación
):
    """Crea un nuevo partido validando los datos proporcionados."""

    # Validar que la cancha exista
    cancha = cancha_repository.obtener_por_id(
        db,
        datos.cancha_id
    )

    if not cancha:
        raise HTTPException(
            status_code=404,
            detail="Cancha no encontrada"
        )

    # Validar que la cancha esté activa
    if not cancha.activa:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está activa"
        )

    # Obtener modalidad automáticamente
    modalidad = TAMANOS_MODALIDAD.get(cancha.tamano)

    if not modalidad:
        raise HTTPException(
            status_code=400,
            detail="La cancha tiene un tamaño inválido"
        )

    # Cantidad de jugadores automática
    cantidad_jugadores = cancha.tamano * 2

    # Validar que la cancha opere ese día
    dia_semana = datos.fecha.weekday()

    if not (cancha.dias_operativos & DIAS_SEMANA[dia_semana]):
        raise HTTPException(
            status_code=400,
            detail="La cancha no opera ese día"
        )

    # Validar horario de funcionamiento
    hora_apertura = datetime.strptime(
        cancha.hora_apertura,
        "%H:%M"
    ).time()

    hora_cierre = datetime.strptime(
        cancha.hora_cierre,
        "%H:%M"
    ).time()

    hora_partido = datos.horario.replace(tzinfo=None)

    if (
        hora_partido < hora_apertura
        or hora_partido >= hora_cierre
    ):
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en ese horario"
        )

    # Validar disponibilidad
    cancha_disponible = partido_repository.verificar_disponibilidad_cancha(
        db,
        datos.cancha_id,
        datos.fecha,
        datos.horario
    )

    if not cancha_disponible:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en la fecha y horario seleccionados"
        )

    # Validar fecha futura
    now = datetime.now().astimezone().replace(tzinfo=None)

    if (
        datos.fecha < now.date()
        or (
            datos.fecha == now.date()
            and hora_partido <= now.time()
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="La fecha y hora deben ser futuras"
        )

    #validar tipo de partido
    if datos.tipo not in ["abierto", "cerrado"]:
        raise HTTPException(
            status_code=400,
            detail="El tipo de partido debe ser 'abierto' o 'cerrado'"
        )
       
    # Crear partido
    nuevo_partido = Partido(
        cancha_id=datos.cancha_id,
        fecha=datos.fecha,
        horario=datos.horario,
        modalidad=modalidad,
        tipo=datos.tipo,
        cantidad_jugadores=cantidad_jugadores,
        descripcion=datos.descripcion,
        estado="pendiente",
        organizador_id= 1 #organizador_id hay que reemplazarlo luego cuando se implemente autenticación
    )

    partido_guardado = partido_repository.guardar_partido(
        db,
        nuevo_partido
    )

    return partido_guardado