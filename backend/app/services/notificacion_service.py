from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..repositories import notificacion_repository
from ..repositories import cancha_repository


def obtener_notificaciones(db: Session, usuario_id: int, solo_no_leidas: bool = False, limit: int = 50, offset: int = 0):
    """Obtiene las notificaciones del usuario con el conteo de no leídas."""
    notificaciones = notificacion_repository.obtener_por_usuario(
        db, usuario_id, solo_no_leidas, limit, offset
    )
    total_no_leidas = notificacion_repository.contar_no_leidas(db, usuario_id)

    return {
        "notificaciones": notificaciones,
        "total_no_leidas": total_no_leidas
    }


def contar_no_leidas(db: Session, usuario_id: int):
    """Obtiene el conteo de notificaciones no leídas."""
    return notificacion_repository.contar_no_leidas(db, usuario_id)


def marcar_como_leida(db: Session, notificacion_id: int, usuario_id: int):
    """Marca una notificación individual como leída."""
    notificacion = notificacion_repository.marcar_como_leida(db, notificacion_id, usuario_id)
    if not notificacion:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    db.commit()
    return notificacion


def marcar_todas_como_leidas(db: Session, usuario_id: int):
    """Marca todas las notificaciones del usuario como leídas."""
    notificacion_repository.marcar_todas_como_leidas(db, usuario_id)
    db.commit()
    return {"mensaje": "Todas las notificaciones fueron marcadas como leídas"}


def eliminar_notificacion(db: Session, notificacion_id: int, usuario_id: int):
    """Elimina una notificación individual."""
    eliminada = notificacion_repository.eliminar_notificacion(db, notificacion_id, usuario_id)
    if not eliminada:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    db.commit()
    return {"mensaje": "Notificación eliminada"}


def eliminar_todas(db: Session, usuario_id: int):
    """Elimina todas las notificaciones del usuario."""
    notificacion_repository.eliminar_todas(db, usuario_id)
    db.commit()
    return {"mensaje": "Todas las notificaciones fueron eliminadas"}


# ─────────────────────────────────────────────
# Funciones para disparar notificaciones
# desde los eventos de partidos
# ─────────────────────────────────────────────

def notificar_partido_cancelado(db: Session, partido):
    """Notifica a todos los inscriptos que el partido fue cancelado (solo abiertos)."""
    if partido.tipo != "abierto":
        return

    nombre_organizador = f"{partido.organizador.nombre} {partido.organizador.apellido}"
    cancha_nombre = partido.cancha.nombre if partido.cancha else "cancha desconocida"
    fecha_str = partido.fecha.strftime("%d/%m/%Y")
    hora_str = partido.horario.strftime("%H:%M")

    mensaje = (
        f"{nombre_organizador} canceló el partido de {partido.modalidad} "
        f"en {cancha_nombre} del {fecha_str} a las {hora_str}hs."
    )

    notificaciones = []
    for jugador in partido.jugadores:
        notificaciones.append({
            "usuario_id": jugador.id,
            "tipo": "partido_cancelado",
            "mensaje": mensaje,
            "partido_id": partido.id
        })

    if notificaciones:
        notificacion_repository.crear_notificaciones_bulk(db, notificaciones)


def notificar_partido_editado(db: Session, partido, cambios: dict):
    """Notifica a los inscriptos que se editaron datos del partido (solo abiertos)."""
    if partido.tipo != "abierto":
        return

    campos_modificados = []
    if "fecha" in cambios:
        campos_modificados.append(f"fecha ({cambios['fecha']['anterior']} → {cambios['fecha']['nuevo']})")
    if "horario" in cambios:
        campos_modificados.append(f"horario ({cambios['horario']['anterior']} → {cambios['horario']['nuevo']})")
    if "cancha" in cambios:
        campos_modificados.append(f"cancha ({cambios['cancha']['anterior']} → {cambios['cancha']['nuevo']})")
    if "descripcion" in cambios:
        campos_modificados.append("descripción")
    if "cupos_disponibles" in cambios:
        campos_modificados.append(f"cupos ({cambios['cupos_disponibles']['anterior']} → {cambios['cupos_disponibles']['nuevo']})")

    if not campos_modificados:
        return

    nombre_organizador = f"{partido.organizador.nombre} {partido.organizador.apellido}"
    detalle = ", ".join(campos_modificados)
    mensaje = (
        f"{nombre_organizador} editó el partido de {partido.modalidad}: "
        f"se modificó {detalle}."
    )

    notificaciones = []
    for jugador in partido.jugadores:
        notificaciones.append({
            "usuario_id": jugador.id,
            "tipo": "partido_editado",
            "mensaje": mensaje,
            "partido_id": partido.id
        })

    if notificaciones:
        notificacion_repository.crear_notificaciones_bulk(db, notificaciones)


def notificar_inscripcion(db: Session, partido, jugador_nuevo):
    """Notifica a los demás jugadores que alguien se inscribió."""
    nombre_jugador = f"{jugador_nuevo.nombre} {jugador_nuevo.apellido}"
    cancha_nombre = partido.cancha.nombre if partido.cancha else "cancha desconocida"
    fecha_str = partido.fecha.strftime("%d/%m/%Y")
    hora_str = partido.horario.strftime("%H:%M")

    mensaje = (
        f"{nombre_jugador} se inscribió al partido de {partido.modalidad} "
        f"en {cancha_nombre} del {fecha_str} a las {hora_str}hs."
    )

    notificaciones = []
    for jugador in partido.jugadores:
        if jugador.id != jugador_nuevo.id:
            notificaciones.append({
                "usuario_id": jugador.id,
                "tipo": "jugador_inscripto",
                "mensaje": mensaje,
                "partido_id": partido.id
            })

    # También notificar al organizador si no es el mismo jugador
    if partido.organizador_id != jugador_nuevo.id:
        notificaciones.append({
            "usuario_id": partido.organizador_id,
            "tipo": "jugador_inscripto",
            "mensaje": mensaje,
            "partido_id": partido.id
        })

    if notificaciones:
        notificacion_repository.crear_notificaciones_bulk(db, notificaciones)


def notificar_baja(db: Session, partido, jugador_baja):
    """Notifica a los demás jugadores que alguien se bajó."""
    nombre_jugador = f"{jugador_baja.nombre} {jugador_baja.apellido}"
    cancha_nombre = partido.cancha.nombre if partido.cancha else "cancha desconocida"
    fecha_str = partido.fecha.strftime("%d/%m/%Y")
    hora_str = partido.horario.strftime("%H:%M")

    mensaje = (
        f"{nombre_jugador} se bajó del partido de {partido.modalidad} "
        f"en {cancha_nombre} del {fecha_str} a las {hora_str}hs."
    )

    notificaciones = []
    for jugador in partido.jugadores:
        if jugador.id != jugador_baja.id:
            notificaciones.append({
                "usuario_id": jugador.id,
                "tipo": "jugador_baja",
                "mensaje": mensaje,
                "partido_id": partido.id
            })

    # También notificar al organizador
    if partido.organizador_id != jugador_baja.id:
        notificaciones.append({
            "usuario_id": partido.organizador_id,
            "tipo": "jugador_baja",
            "mensaje": mensaje,
            "partido_id": partido.id
        })

    if notificaciones:
        notificacion_repository.crear_notificaciones_bulk(db, notificaciones)


def notificar_propietario_reserva(db: Session, cancha, partido):
    """Notifica al propietario de la cancha que se creó un partido."""
    nombre_organizador = f"{partido.organizador.nombre} {partido.organizador.apellido}"
    fecha_str = partido.fecha.strftime("%d/%m/%Y")
    hora_str = partido.horario.strftime("%H:%M")

    mensaje = (
        f"{nombre_organizador} reservó tu cancha {cancha.nombre} "
        f"para el {fecha_str} a las {hora_str}hs ({partido.modalidad})."
    )

    notificacion_repository.crear_notificacion(
        db,
        usuario_id=cancha.propietario_id,
        tipo="reserva_cancha",
        mensaje=mensaje,
        partido_id=partido.id
    )


def notificar_propietario_cancelacion(db: Session, cancha, partido):
    """Notifica al propietario de la cancha que se canceló un partido."""
    nombre_organizador = f"{partido.organizador.nombre} {partido.organizador.apellido}"
    fecha_str = partido.fecha.strftime("%d/%m/%Y")
    hora_str = partido.horario.strftime("%H:%M")

    mensaje = (
        f"{nombre_organizador} canceló la reserva de tu cancha {cancha.nombre} "
        f"del {fecha_str} a las {hora_str}hs."
    )

    notificacion_repository.crear_notificacion(
        db,
        usuario_id=cancha.propietario_id,
        tipo="cancelacion_cancha",
        mensaje=mensaje,
        partido_id=partido.id
    )


def notificar_cambio_cancha(db: Session, cancha_anterior, cancha_nueva, partido):
    """Notifica a los propietarios cuando se cambia de cancha al editar un partido."""
    nombre_organizador = f"{partido.organizador.nombre} {partido.organizador.apellido}"
    fecha_str = partido.fecha.strftime("%d/%m/%Y")
    hora_str = partido.horario.strftime("%H:%M")

    # Si ambas canchas son del mismo propietario, enviar una sola notificación
    if cancha_anterior.propietario_id == cancha_nueva.propietario_id:
        mensaje = (
            f"{nombre_organizador} cambió la reserva del {fecha_str} a las {hora_str}hs "
            f"de tu cancha {cancha_anterior.nombre} a tu cancha {cancha_nueva.nombre}."
        )
        notificacion_repository.crear_notificacion(
            db,
            usuario_id=cancha_anterior.propietario_id,
            tipo="cambio_cancha_ganada",
            mensaje=mensaje,
            partido_id=partido.id
        )
        return

    # Notificar al propietario que pierde el turno
    mensaje_perdida = (
        f"{nombre_organizador} movió su partido del {fecha_str} a las {hora_str}hs "
        f"de tu cancha {cancha_anterior.nombre} a otra cancha."
    )
    notificacion_repository.crear_notificacion(
        db,
        usuario_id=cancha_anterior.propietario_id,
        tipo="cambio_cancha_perdida",
        mensaje=mensaje_perdida,
        partido_id=partido.id
    )

    # Notificar al propietario que gana el turno
    mensaje_ganada = (
        f"{nombre_organizador} reservó tu cancha {cancha_nueva.nombre} "
        f"para el {fecha_str} a las {hora_str}hs ({partido.modalidad})."
    )
    notificacion_repository.crear_notificacion(
        db,
        usuario_id=cancha_nueva.propietario_id,
        tipo="cambio_cancha_ganada",
        mensaje=mensaje_ganada,
        partido_id=partido.id
    )
