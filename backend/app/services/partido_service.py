from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta, timezone

# Zona horaria de la aplicación (Argentina UTC-3)
TZ_LOCAL = timezone(timedelta(hours=-3))

from ..models.partido_model import Partido
from ..models.usuario_model import Usuario, RolUsuario
from ..repositories import partido_repository
from ..repositories import usuario_repository
from ..schemas.partido_schemas import PartidoCreate, PartidoUpdate, ReservaManualCreate, ReprogramarReserva
from ..repositories import cancha_repository
from ..services import notificacion_service


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

def obtener_partidos_disponibles(db: Session, zona: str = None, modalidad: str = None, fecha: date = None):
    """Llama al repositorio para obtener los partidos disponibles aplicando los filtros dados."""
    return partido_repository.obtener_disponibles(db, zona, modalidad, fecha)

def obtener_filtros_disponibles(db: Session):
    """Llama al repositorio para obtener los filtros dinámicos disponibles."""
    return partido_repository.obtener_filtros_disponibles(db)


def obtener_detalle_partido(db: Session, partido_id: int):
    """Obtiene el detalle de un partido específico."""
    
    partido = partido_repository.obtener_por_id(db, partido_id)

    if not partido:
        raise HTTPException(
            status_code=404,
            detail="Partido no encontrado"
        )

    return partido


def inscribirse_a_partido(db: Session, partido_id: int, usuario_id: int):
    """Inscribe un jugador a un partido abierto aplicando validaciones básicas."""
    partido = partido_repository.obtener_por_id_bloqueado(db, partido_id)

    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    if partido.organizador_id == usuario_id:
        raise HTTPException(
            status_code=400,
            detail="El organizador no puede inscribirse nuevamente en su propio partido"
        )

    if partido.tipo != "abierto":
        raise HTTPException(
            status_code=400,
            detail="Solo te podés inscribir en partidos abiertos"
        )

    if partido.estado == "Cancelado":
        raise HTTPException(
            status_code=400,
            detail="No te podés inscribir a un partido cancelado"
        )

    now = datetime.now(TZ_LOCAL).replace(tzinfo=None)
    hora_partido = partido.horario.replace(tzinfo=None)

    if partido.fecha < now.date() or (partido.fecha == now.date() and hora_partido <= now.time()):
        raise HTTPException(
            status_code=400,
            detail="No te podés inscribir a un partido que ya pasó"
        )

    if any(jugador.id == usuario_id for jugador in partido.jugadores):
        raise HTTPException(
            status_code=400,
            detail="Ya estás inscripto en este partido"
        )

    usuario = usuario_repository.obtener_por_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if partido.cupos_disponibles <= 0:
        raise HTTPException(
            status_code=400,
            detail="El partido ya no tiene cupos disponibles"
        )

    resultado = partido_repository.guardar_inscripcion(db, partido, usuario)

    # Notificar a los demás jugadores y al organizador
    notificacion_service.notificar_inscripcion(db, partido, usuario)
    db.commit()

    return resultado


def bajarse_de_partido(db: Session, partido_id: int, usuario_id: int):
    """Permite que un jugador se baje de un partido abierto respetando el plazo mínimo."""
    partido = partido_repository.obtener_por_id_bloqueado(db, partido_id)

    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    if partido.tipo != "abierto":
        raise HTTPException(
            status_code=400,
            detail="Solo te podés bajar de partidos abiertos"
        )

    if partido.estado == "Cancelado":
        raise HTTPException(
            status_code=400,
            detail="No te podés bajar de un partido cancelado"
        )

    usuario = usuario_repository.obtener_por_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not any(jugador.id == usuario_id for jugador in partido.jugadores):
        raise HTTPException(
            status_code=400,
            detail="No estás inscripto en este partido"
        )

    now = datetime.now(TZ_LOCAL).replace(tzinfo=None)
    partido_inicio = datetime.combine(partido.fecha, partido.horario)

    if partido_inicio - now <= timedelta(hours=2):
        raise HTTPException(
            status_code=400,
            detail="El plazo para bajarse de este partido expiró"
        )

    resultado = partido_repository.guardar_baja_inscripcion(db, partido, usuario)

    # Notificar a los demás jugadores y al organizador
    notificacion_service.notificar_baja(db, partido, usuario)
    db.commit()

    return resultado


def crear_partido(
    db: Session,
    organizador_id: int,
    datos: PartidoCreate,
):
    """Crea un nuevo partido validando los datos proporcionados."""
    hora_partido = datos.horario.replace(tzinfo=None)
    now = datetime.now(TZ_LOCAL).replace(tzinfo=None)

    if datos.tipo not in ["abierto", "cerrado"]:
        raise HTTPException(
            status_code=400,
            detail="El tipo de partido debe ser 'abierto' o 'cerrado'"
        )

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

    cancha = cancha_repository.obtener_por_id_bloqueado(db, datos.cancha_id)

    if not cancha.activa:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está activa"
        )

    modalidad = TAMANOS_MODALIDAD.get(cancha.tamano)

    if not modalidad:
        raise HTTPException(
            status_code=400,
            detail="La cancha tiene un tamaño inválido"
        )

    cantidad_jugadores = cancha.tamano * 2

    if datos.tipo == "abierto":
        cupos_disponibles = datos.cupos_disponibles
        if cupos_disponibles is None or cupos_disponibles < 1 or cupos_disponibles >= cantidad_jugadores:
            raise HTTPException(
                status_code=400,
                detail=f"Para partidos abiertos, debes especificar entre 1 y {cantidad_jugadores - 1} cupos disponibles"
            )
    else:
        cupos_disponibles = 0

    dia_semana = datos.fecha.weekday()

    if not (cancha.dias_operativos & DIAS_SEMANA[dia_semana]):
        raise HTTPException(
            status_code=400,
            detail="La cancha no opera ese día"
        )

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

    if (
        hora_partido < hora_apertura
        or hora_partido >= hora_cierre
    ):
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en ese horario"
        )

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

    resultado = partido_repository.guardar_partido(db, nuevo_partido)

    # Notificar al propietario de la cancha
    notificacion_service.notificar_propietario_reserva(db, cancha, resultado)
    db.commit()

    return resultado

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
    now = datetime.now(TZ_LOCAL).replace(tzinfo=None)
    hora_partido = partido.horario.replace(tzinfo=None)
    
    if partido.fecha < now.date() or (partido.fecha == now.date() and hora_partido <= now.time()):
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar un partido que ya pasó"
        )

    partido.estado = "Cancelado"

    # Notificar a los inscriptos (solo si abierto)
    notificacion_service.notificar_partido_cancelado(db, partido)

    # Notificar al propietario de la cancha
    cancha = cancha_repository.obtener_por_id(db, partido.cancha_id)
    if cancha:
        notificacion_service.notificar_propietario_cancelacion(db, cancha, partido)

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
    now = datetime.now(TZ_LOCAL).replace(tzinfo=None)
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

    # Guardar valores anteriores para detectar cambios
    cancha_id_anterior = partido.cancha_id
    fecha_anterior = partido.fecha
    horario_anterior = partido.horario
    descripcion_anterior = partido.descripcion
    cupos_anterior = partido.cupos_disponibles

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

    # Detectar cambios para las notificaciones
    cambios = {}
    if fecha_anterior != datos.fecha:
        cambios["fecha"] = {
            "anterior": fecha_anterior.strftime("%d/%m/%Y"),
            "nuevo": datos.fecha.strftime("%d/%m/%Y")
        }
    if horario_anterior != datos.horario:
        cambios["horario"] = {
            "anterior": horario_anterior.strftime("%H:%M"),
            "nuevo": datos.horario.strftime("%H:%M")
        }
    if cancha_id_anterior != datos.cancha_id:
        cancha_anterior_obj = cancha_repository.obtener_por_id(db, cancha_id_anterior)
        cambios["cancha"] = {
            "anterior": cancha_anterior_obj.nombre if cancha_anterior_obj else "desconocida",
            "nuevo": cancha.nombre
        }
    if datos.descripcion is not None and descripcion_anterior != datos.descripcion:
        cambios["descripcion"] = True
    if cupos_anterior != nuevo_cupos:
        cambios["cupos_disponibles"] = {
            "anterior": str(cupos_anterior),
            "nuevo": str(nuevo_cupos)
        }

    # Notificar a los inscriptos sobre los cambios (solo si abierto)
    if cambios:
        notificacion_service.notificar_partido_editado(db, partido, cambios)

    # Notificar cambio de cancha a los propietarios
    if cancha_id_anterior != datos.cancha_id:
        cancha_anterior_obj = cancha_repository.obtener_por_id(db, cancha_id_anterior)
        if cancha_anterior_obj:
            notificacion_service.notificar_cambio_cancha(db, cancha_anterior_obj, cancha, partido)

    db.commit()
    db.refresh(partido)
    return partido


def crear_reserva_manual(
    db: Session,
    current_user: Usuario,
    datos: ReservaManualCreate,
):
    """Crea una reserva manual en nombre de un dueño de cancha."""
    if current_user.rol != RolUsuario.admin:
        raise HTTPException(
            status_code=403,
            detail="Solo los dueños de cancha pueden cargar reservas manuales"
        )

    # Validar que no sea un turno pasado o en curso
    hora_partido = datos.horario.replace(tzinfo=None)
    now = datetime.now(TZ_LOCAL).replace(tzinfo=None)

    if (
        datos.fecha < now.date()
        or (
            datos.fecha == now.date()
            and hora_partido <= now.time()
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="No se puede reservar un turno que ya pasó o está en curso"
        )

    cancha = cancha_repository.obtener_por_id(db, datos.cancha_id)

    if cancha.propietario_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="No podés cargar una reserva en una cancha que no te pertenece"
        )

    if not cancha.activa:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está activa"
        )

    # Validar día operativo
    dia_semana = datos.fecha.weekday()
    if not (cancha.dias_operativos & DIAS_SEMANA[dia_semana]):
        raise HTTPException(
            status_code=400,
            detail="La cancha no opera ese día"
        )

    # Validar horario dentro del rango
    hora_apertura = datetime.strptime(cancha.hora_apertura, "%H:%M").time()
    if cancha.hora_cierre == "24:00":
        hora_cierre = datetime.strptime("23:59", "%H:%M").time()
    else:
        hora_cierre = datetime.strptime(cancha.hora_cierre, "%H:%M").time()

    if hora_partido < hora_apertura or hora_partido >= hora_cierre:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en ese horario"
        )

    # Validar disponibilidad (sin solapamiento)
    cancha_disponible = partido_repository.verificar_disponibilidad_cancha(
        db, datos.cancha_id, datos.fecha, datos.horario, cancha.duracion_turno
    )
    if not cancha_disponible:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en la fecha y horario seleccionados"
        )

    modalidad = TAMANOS_MODALIDAD.get(cancha.tamano)
    if not modalidad:
        raise HTTPException(
            status_code=400,
            detail="La cancha tiene un tamaño inválido"
        )

    cantidad_jugadores = cancha.tamano * 2

    nuevo_partido = Partido(
        cancha_id=datos.cancha_id,
        fecha=datos.fecha,
        horario=datos.horario,
        modalidad=modalidad,
        tipo="cerrado",
        cantidad_jugadores=cantidad_jugadores,
        cupos_disponibles=0,
        descripcion=None,
        estado="pendiente",
        organizador_id=current_user.id,
        cliente_nombre=datos.cliente_nombre,
        cliente_apellido=datos.cliente_apellido,
        cliente_telefono=datos.cliente_telefono,
        reserva_manual=True,
    )

    resultado = partido_repository.guardar_partido(db, nuevo_partido)
    db.commit()

    return resultado


def crear_bloqueo_turno(
    db: Session,
    current_user: Usuario,
    datos: ReservaManualCreate,
):
    """Bloquea un turno para que no esté disponible."""
    if current_user.rol != RolUsuario.admin:
        raise HTTPException(
            status_code=403,
            detail="Solo los dueños de cancha pueden bloquear turnos"
        )

    cancha = cancha_repository.obtener_por_id(db, datos.cancha_id)

    if cancha.propietario_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="No podés bloquear un turno en una cancha que no te pertenece"
        )

    if not cancha.activa:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está activa"
        )

    # Validar día operativo
    dia_semana = datos.fecha.weekday()
    if not (cancha.dias_operativos & DIAS_SEMANA[dia_semana]):
        raise HTTPException(
            status_code=400,
            detail="La cancha no opera ese día"
        )

    # Validar horario dentro del rango
    hora_partido = datos.horario.replace(tzinfo=None)
    hora_apertura = datetime.strptime(cancha.hora_apertura, "%H:%M").time()
    if cancha.hora_cierre == "24:00":
        hora_cierre = datetime.strptime("23:59", "%H:%M").time()
    else:
        hora_cierre = datetime.strptime(cancha.hora_cierre, "%H:%M").time()

    if hora_partido < hora_apertura or hora_partido >= hora_cierre:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en ese horario"
        )

    # Validar disponibilidad (sin solapamiento)
    cancha_disponible = partido_repository.verificar_disponibilidad_cancha(
        db, datos.cancha_id, datos.fecha, datos.horario, cancha.duracion_turno
    )
    if not cancha_disponible:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en la fecha y horario seleccionados"
        )

    modalidad = TAMANOS_MODALIDAD.get(cancha.tamano)
    if not modalidad:
        raise HTTPException(
            status_code=400,
            detail="La cancha tiene un tamaño inválido"
        )

    cantidad_jugadores = cancha.tamano * 2

    nuevo_partido = Partido(
        cancha_id=datos.cancha_id,
        fecha=datos.fecha,
        horario=datos.horario,
        modalidad=modalidad,
        tipo="cerrado",
        cantidad_jugadores=cantidad_jugadores,
        cupos_disponibles=0,
        descripcion=None,
        estado="bloqueado",
        organizador_id=current_user.id,
        reserva_manual=True,
    )

    resultado = partido_repository.guardar_partido(db, nuevo_partido)
    db.commit()

    return resultado


def eliminar_bloqueo_turno(
    db: Session,
    current_user: Usuario,
    partido_id: int,
):
    """Elimina el bloqueo de un turno."""
    partido = partido_repository.obtener_por_id(db, partido_id)

    if not partido:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    if partido.estado != "bloqueado":
        raise HTTPException(
            status_code=400,
            detail="El turno no está bloqueado"
        )

    cancha = cancha_repository.obtener_por_id(db, partido.cancha_id)
    if cancha.propietario_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="No podés desbloquear un turno en una cancha que no te pertenece"
        )

    db.delete(partido)
    db.commit()

    return {"mensaje": "Bloqueo eliminado exitosamente"}


def cancelar_reserva_dueno(db: Session, current_user: Usuario, partido_id: int):
    """Cancela una reserva desde la perspectiva del dueño de cancha."""


    if current_user.rol != RolUsuario.admin:
        raise HTTPException(
            status_code=403,
            detail="Solo los dueños de cancha pueden cancelar reservas"
        )


    partido = partido_repository.obtener_por_id(db, partido_id)
    if not partido:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")


    cancha = cancha_repository.obtener_por_id(db, partido.cancha_id)
    if cancha.propietario_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="No podés cancelar reservas de canchas que no te pertenecen"
        )


    if partido.estado == "Cancelado":
        raise HTTPException(
            status_code=400,
            detail="La reserva ya se encuentra cancelada"
        )


    if partido.estado == "bloqueado":
        raise HTTPException(
            status_code=400,
            detail="Para desbloquear un turno, usá la función de desbloqueo"
        )


    partido.estado = "Cancelado"


    if not partido.reserva_manual and partido.organizador_id:
        notificacion_service.notificar_reserva_cancelada_por_dueno(db, cancha, partido)

    db.commit()
    db.refresh(partido)

    return partido


def reprogramar_reserva(
    db: Session,
    current_user: Usuario,
    partido_id: int,
    datos: ReprogramarReserva,
):
    """Reprograma una reserva existente a un nuevo turno."""


    if current_user.rol != RolUsuario.admin:
        raise HTTPException(
            status_code=403,
            detail="Solo los dueños de cancha pueden reprogramar reservas"
        )


    partido = partido_repository.obtener_por_id(db, partido_id)
    if not partido:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")


    if partido.estado == "Cancelado":
        raise HTTPException(
            status_code=400,
            detail="No se puede reprogramar una reserva cancelada"
        )
    if partido.estado == "bloqueado":
        raise HTTPException(
            status_code=400,
            detail="No se puede reprogramar un turno bloqueado"
        )


    cancha_id_destino = datos.cancha_id if datos.cancha_id else partido.cancha_id
    cancha = cancha_repository.obtener_por_id(db, cancha_id_destino)


    if cancha.propietario_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="No podés reprogramar reservas en canchas que no te pertenecen"
        )


    if datos.cancha_id and datos.cancha_id != partido.cancha_id:
        cancha_original = cancha_repository.obtener_por_id(db, partido.cancha_id)
        if cancha_original.propietario_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="No podés mover reservas desde canchas que no te pertenecen"
            )


    hora_nueva = datos.horario.replace(tzinfo=None)
    now = datetime.now(TZ_LOCAL).replace(tzinfo=None)

    if (
        datos.fecha < now.date()
        or (datos.fecha == now.date() and hora_nueva <= now.time())
    ):
        raise HTTPException(
            status_code=400,
            detail="La nueva fecha y hora deben ser futuras"
        )


    dia_semana = datos.fecha.weekday()
    if not (cancha.dias_operativos & DIAS_SEMANA[dia_semana]):
        raise HTTPException(
            status_code=400,
            detail="La cancha no opera ese día"
        )

    hora_apertura = datetime.strptime(cancha.hora_apertura, "%H:%M").time()
    if cancha.hora_cierre == "24:00":
        hora_cierre = datetime.strptime("23:59", "%H:%M").time()
    else:
        hora_cierre = datetime.strptime(cancha.hora_cierre, "%H:%M").time()

    if hora_nueva < hora_apertura or hora_nueva >= hora_cierre:
        raise HTTPException(
            status_code=400,
            detail="La cancha no está disponible en ese horario"
        )


    disponible = partido_repository.verificar_disponibilidad_cancha(
        db, cancha_id_destino, datos.fecha, datos.horario,
        cancha.duracion_turno,
        excluir_partido_id=partido.id
    )
    if not disponible:
        raise HTTPException(
            status_code=400,
            detail="El turno seleccionado no está disponible (está ocupado o bloqueado)"
        )


    fecha_anterior = partido.fecha
    horario_anterior = partido.horario
    cancha_id_anterior = partido.cancha_id


    partido.fecha = datos.fecha
    partido.horario = datos.horario
    if datos.cancha_id:
        partido.cancha_id = datos.cancha_id

        modalidad = TAMANOS_MODALIDAD.get(cancha.tamano)
        if modalidad:
            partido.modalidad = modalidad
            partido.cantidad_jugadores = cancha.tamano * 2


    if not partido.reserva_manual and partido.organizador_id:
        notificacion_service.notificar_reserva_reprogramada(
            db, cancha, partido,
            fecha_anterior, horario_anterior, cancha_id_anterior
        )

    db.commit()
    db.refresh(partido)

    return partido