from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..models.partido_model import Partido
from ..repositories import partido_repository
from ..schemas.partido_schemas import PartidoCreate, PartidoUpdate
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
    organizador_id: int,
    datos: PartidoCreate,
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

    # Manejo de cupos disponibles
    if datos.tipo == "abierto":
        cupos_disponibles = datos.cupos_disponibles
        if cupos_disponibles is None or cupos_disponibles < 1 or cupos_disponibles >= cantidad_jugadores:
            raise HTTPException(
                status_code=400,
                detail=f"Para partidos abiertos, debes especificar entre 1 y {cantidad_jugadores - 1} cupos disponibles"
            )
    else:
        cupos_disponibles = 0


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

    if cancha.hora_cierre == "24:00":
        hora_cierre = datetime.strptime("23:59", "%H:%M").time()
    else:
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
        datos.horario,
        cancha.duracion_turno
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
        cupos_disponibles=cupos_disponibles,
        descripcion=datos.descripcion,
        estado="pendiente",
        organizador_id=organizador_id
    )

    partido_guardado = partido_repository.guardar_partido(
        db,
        nuevo_partido
    )

    return partido_guardado

def cancelar_partido(db: Session, partido_id: int, usuario_id: int):
    """Cancela un partido si el usuario es el organizador y cumple las condiciones."""
    partido = partido_repository.obtener_por_id(db, partido_id)
    
    if not partido:
        raise HTTPException(
            status_code=404,
            detail="Partido no encontrado"
        )
        
    if partido.organizador_id != usuario_id:
        raise HTTPException(
            status_code=403,
            detail="Solo el organizador puede cancelar este partido"
        )
        
    if partido.estado == "Cancelado":
        raise HTTPException(
            status_code=400,
            detail="El partido ya se encuentra cancelado"
        )
        
    # Verificar que el partido no se haya jugado ya (fecha y hora pasadas)
    now = datetime.now().astimezone().replace(tzinfo=None)
    hora_partido = partido.horario.replace(tzinfo=None)
    
    if partido.fecha < now.date() or (partido.fecha == now.date() and hora_partido <= now.time()):
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar un partido que ya pasó"
        )

    partido.estado = "Cancelado"
    db.commit()
    db.refresh(partido)
    
    return partido

def editar_partido(
    db: Session,
    partido_id: int,
    usuario_id: int,
    datos: PartidoUpdate
):
    """Edita los datos de un partido validando disponibilidad y reglas de negocio."""
    partido = partido_repository.obtener_por_id(db, partido_id)
    
    if not partido:
        raise HTTPException(
            status_code=404,
            detail="Partido no encontrado"
        )
        
    if partido.organizador_id != usuario_id:
        raise HTTPException(
            status_code=403,
            detail="Solo el organizador puede editar este partido"
        )
        
    if partido.estado == "Cancelado":
        raise HTTPException(
            status_code=400,
            detail="No se puede editar un partido cancelado"
        )
        
    # Verificar que el partido original no haya pasado ya
    now = datetime.now().astimezone().replace(tzinfo=None)
    hora_original = partido.horario.replace(tzinfo=None)
    if partido.fecha < now.date() or (partido.fecha == now.date() and hora_original <= now.time()):
        raise HTTPException(
            status_code=400,
            detail="No se puede editar un partido que ya pasó"
        )
        
    # Validar que la NUEVA fecha y hora sean futuras
    hora_nueva = datos.horario.replace(tzinfo=None)
    if datos.fecha < now.date() or (datos.fecha == now.date() and hora_nueva <= now.time()):
        raise HTTPException(
            status_code=400,
            detail="La nueva fecha y hora deben ser futuras"
        )

    # Validar que la cancha exista y apliquen reglas
    cancha = cancha_repository.obtener_por_id(db, datos.cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    if not cancha.activa:
        raise HTTPException(status_code=400, detail="La cancha no está activa")

    # Obtener modalidad y cantidad_jugadores automáticamente
    modalidad = TAMANOS_MODALIDAD.get(cancha.tamano)
    if not modalidad:
        raise HTTPException(status_code=400, detail="La cancha tiene un tamaño inválido")
        
    cantidad_jugadores = cancha.tamano * 2

    if cantidad_jugadores != partido.cantidad_jugadores:
        raise HTTPException(
            status_code=400,
            detail="No se puede cambiar la modalidad del partido. Si deseas jugar en otra modalidad, cancelá el partido y creá uno nuevo."
        )

    # Tipo y cupos
    nuevo_tipo = datos.tipo if datos.tipo is not None else partido.tipo
    if nuevo_tipo not in ["abierto", "cerrado"]:
        raise HTTPException(status_code=400, detail="El tipo de partido debe ser 'abierto' o 'cerrado'")
        
    if nuevo_tipo == "abierto":
        nuevo_cupos = datos.cupos_disponibles if datos.cupos_disponibles is not None else partido.cupos_disponibles
        if nuevo_cupos is None or nuevo_cupos < 1 or nuevo_cupos >= cantidad_jugadores:
            raise HTTPException(
                status_code=400,
                detail=f"Para partidos abiertos, debes especificar entre 1 y {cantidad_jugadores - 1} cupos disponibles"
            )
    else:
        nuevo_cupos = 0

    # Validar días y horarios de la cancha
    dia_semana = datos.fecha.weekday()
    if not (cancha.dias_operativos & DIAS_SEMANA[dia_semana]):
        raise HTTPException(status_code=400, detail="La cancha no opera ese día")

    hora_apertura = datetime.strptime(cancha.hora_apertura, "%H:%M").time()
    hora_cierre = datetime.strptime("23:59", "%H:%M").time() if cancha.hora_cierre == "24:00" else datetime.strptime(cancha.hora_cierre, "%H:%M").time()

    if hora_nueva < hora_apertura or hora_nueva >= hora_cierre:
        raise HTTPException(status_code=400, detail="La cancha no está disponible en ese horario")

    # Validar disponibilidad EXCLUYENDO el partido actual
    cancha_disponible = partido_repository.verificar_disponibilidad_cancha(
        db,
        datos.cancha_id,
        datos.fecha,
        datos.horario,
        cancha.duracion_turno,
        excluir_partido_id=partido.id
    )

    if not cancha_disponible:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en la fecha y horario seleccionados"
        )

    # Actualizar valores
    partido.cancha_id = datos.cancha_id
    partido.fecha = datos.fecha
    partido.horario = datos.horario
    partido.modalidad = modalidad
    partido.cantidad_jugadores = cantidad_jugadores
    partido.tipo = nuevo_tipo
    partido.cupos_disponibles = nuevo_cupos
    if datos.descripcion is not None:
        partido.descripcion = datos.descripcion

    db.commit()
    db.refresh(partido)
    return partido