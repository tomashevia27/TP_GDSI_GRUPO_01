from sqlalchemy.orm import Session
from . import notificacion_service



def _obtener_nombre_completo(usuario):
    """Devuelve el nombre completo del usuario, manejando nulos."""
    return f"{usuario.nombre} {usuario.apellido}" if usuario else "Usuario Desconocido"

def _obtener_nombre_cancha(partido):
    return partido.cancha.nombre if partido.cancha else "cancha desconocida"

def _obtener_datos_base_partido(partido):
    """Devuelve (nombre_organizador, cancha_nombre, fecha_str, hora_str)"""
    fecha_str, hora_str = partido.obtener_fecha_hora_legible()
    return (
        _obtener_nombre_completo(partido.organizador),
        _obtener_nombre_cancha(partido),
        fecha_str,
        hora_str
    )

def _obtener_ids_involucrados(partido, excluir_id=None, incluir_jugadores=True):
    """Devuelve un set con los IDs del organizador y los jugadores (opcional), excluyendo uno si se especifica."""
    usuarios_ids = set()
    if partido.organizador_id and partido.organizador_id != excluir_id:
        usuarios_ids.add(partido.organizador_id)
    
    if incluir_jugadores:
        for jugador in partido.jugadores:
            if jugador.id != excluir_id:
                usuarios_ids.add(jugador.id)
                
    return usuarios_ids


# ─────────────────────────────────────────────
# Funciones para disparar notificaciones
# desde los eventos de partidos
# ─────────────────────────────────────────────

def notificar_partido_cancelado(db: Session, partido):
    """Notifica a todos los inscriptos que el partido fue cancelado (solo abiertos)."""
    if partido.tipo != "abierto":
        return

    org_nom, can_nom, f_str, h_str = _obtener_datos_base_partido(partido)
    mensaje = f"{org_nom} canceló el partido de {partido.modalidad} en {can_nom} del {f_str} a las {h_str}hs."
    
    usuarios_ids = _obtener_ids_involucrados(partido, excluir_id=partido.organizador_id)
    notificacion_service.crear_notificaciones_bulk(db, usuarios_ids, "partido_cancelado", mensaje, partido.id)


def notificar_partido_editado(db: Session, partido, cambios: dict):
    """Notifica a los inscriptos que se editaron datos del partido (solo abiertos)."""
    if partido.tipo != "abierto":
        return

    campos = []
    if "fecha" in cambios: campos.append(f"fecha ({cambios['fecha']['anterior']} → {cambios['fecha']['nuevo']})")
    if "horario" in cambios: campos.append(f"horario ({cambios['horario']['anterior']} → {cambios['horario']['nuevo']})")
    if "cancha" in cambios: campos.append(f"cancha ({cambios['cancha']['anterior']} → {cambios['cancha']['nuevo']})")
    if "descripcion" in cambios: campos.append("descripción")
    if "cupos_disponibles" in cambios: campos.append(f"cupos ({cambios['cupos_disponibles']['anterior']} → {cambios['cupos_disponibles']['nuevo']})")

    if not campos:
        return

    org_nom, _, _, _ = _obtener_datos_base_partido(partido)
    mensaje = f"{org_nom} editó el partido de {partido.modalidad}: se modificó {', '.join(campos)}."
    
    usuarios_ids = _obtener_ids_involucrados(partido, excluir_id=partido.organizador_id)
    notificacion_service.crear_notificaciones_bulk(db, usuarios_ids, "partido_editado", mensaje, partido.id)


def notificar_inscripcion(db: Session, partido, jugador_nuevo):
    """Notifica a los demás jugadores y al organizador que alguien se inscribió."""
    _, can_nom, f_str, h_str = _obtener_datos_base_partido(partido)
    nom_jugador = _obtener_nombre_completo(jugador_nuevo)
    
    mensaje = f"{nom_jugador} se inscribió al partido de {partido.modalidad} en {can_nom} del {f_str} a las {h_str}hs."
    
    usuarios_ids = _obtener_ids_involucrados(partido, excluir_id=jugador_nuevo.id)
    notificacion_service.crear_notificaciones_bulk(db, usuarios_ids, "jugador_inscripto", mensaje, partido.id)


def notificar_baja(db: Session, partido, jugador_baja):
    """Notifica a los demás jugadores y al organizador que alguien se bajó."""
    _, can_nom, f_str, h_str = _obtener_datos_base_partido(partido)
    nom_jugador = _obtener_nombre_completo(jugador_baja)
    
    mensaje = f"{nom_jugador} se bajó del partido de {partido.modalidad} en {can_nom} del {f_str} a las {h_str}hs."
    
    usuarios_ids = _obtener_ids_involucrados(partido, excluir_id=jugador_baja.id)
    notificacion_service.crear_notificaciones_bulk(db, usuarios_ids, "jugador_baja", mensaje, partido.id)


def notificar_propietario_reserva(db: Session, cancha, partido):
    """Notifica al propietario de la cancha que se creó un partido."""
    org_nom, _, f_str, h_str = _obtener_datos_base_partido(partido)
    mensaje = f"{org_nom} reservó tu cancha {cancha.nombre} para el {f_str} a las {h_str}hs ({partido.modalidad})."
    
    notificacion_service.crear_notificaciones_bulk(db, {cancha.propietario_id}, "reserva_cancha", mensaje, partido.id)


def notificar_propietario_cancelacion(db: Session, cancha, partido):
    """Notifica al propietario de la cancha que se canceló un partido."""
    org_nom, _, f_str, h_str = _obtener_datos_base_partido(partido)
    mensaje = f"{org_nom} canceló la reserva de tu cancha {cancha.nombre} del {f_str} a las {h_str}hs."
    
    notificacion_service.crear_notificaciones_bulk(db, {cancha.propietario_id}, "cancelacion_cancha", mensaje, partido.id)


def notificar_cambio_cancha(db: Session, cancha_anterior, cancha_nueva, partido):
    """Notifica a los propietarios cuando se cambia de cancha al editar un partido."""
    org_nom, _, f_str, h_str = _obtener_datos_base_partido(partido)

    if cancha_anterior.propietario_id == cancha_nueva.propietario_id:
        mensaje = f"{org_nom} cambió la reserva del {f_str} a las {h_str}hs de tu cancha {cancha_anterior.nombre} a tu cancha {cancha_nueva.nombre}."
        notificacion_service.crear_notificaciones_bulk(db, {cancha_anterior.propietario_id}, "cambio_cancha_ganada", mensaje, partido.id)
        return

    # Propietario anterior pierde turno
    mensaje_perdida = f"{org_nom} movió su partido del {f_str} a las {h_str}hs de tu cancha {cancha_anterior.nombre} a otra cancha."
    notificacion_service.crear_notificaciones_bulk(db, {cancha_anterior.propietario_id}, "cambio_cancha_perdida", mensaje_perdida, partido.id)

    # Nuevo propietario gana turno
    mensaje_ganada = f"{org_nom} reservó tu cancha {cancha_nueva.nombre} para el {f_str} a las {h_str}hs ({partido.modalidad})."
    notificacion_service.crear_notificaciones_bulk(db, {cancha_nueva.propietario_id}, "cambio_cancha_ganada", mensaje_ganada, partido.id)


def notificar_reserva_cancelada_por_dueno(db: Session, cancha, partido):
    _, _, f_str, h_str = _obtener_datos_base_partido(partido)
    mensaje = f"El complejo canceló tu reserva en {cancha.nombre} del {f_str} a las {h_str}hs. El turno fue liberado."
    
    usuarios_ids = _obtener_ids_involucrados(partido, incluir_jugadores=(partido.tipo == "abierto"))
    notificacion_service.crear_notificaciones_bulk(db, usuarios_ids, "reserva_cancelada_por_dueno", mensaje, partido.id)


def notificar_reserva_reprogramada(db: Session, cancha, partido, fecha_ant, horario_ant, cancha_id_ant):
    f_ant_str, h_ant_str = fecha_ant.strftime("%d/%m/%Y"), horario_ant.strftime("%H:%M")
    _, _, f_nueva_str, h_nueva_str = _obtener_datos_base_partido(partido)
    
    mensaje = f"El complejo reprogramó tu reserva en {cancha.nombre}: del {f_ant_str} a las {h_ant_str}hs al {f_nueva_str} a las {h_nueva_str}hs."
    
    usuarios_ids = _obtener_ids_involucrados(partido, incluir_jugadores=(partido.tipo == "abierto"))
    notificacion_service.crear_notificaciones_bulk(db, usuarios_ids, "reserva_reprogramada", mensaje, partido.id)
