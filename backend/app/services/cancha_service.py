from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date

from ..models.usuario_model import Usuario, RolUsuario
from ..models.cancha_model import Cancha
from ..repositories import cancha_repository
from ..repositories import partido_repository
from ..schemas.cancha_schemas import CanchaCreate, CanchaUpdate, AgendaSlot, AgendaRespuesta
from .agenda_builder import AgendaBuilder

MINUTOS_VALIDOS = {0, 15, 30, 45}

# ─────────────────────────────────────────────
# Helpers Internos
# ─────────────────────────────────────────────

def _obtener_minutos_totales(hora_str: str) -> int:
    """Convierte un string 'HH:MM' a minutos totales. Permite '24:00'."""
    try:
        horas, minutos = map(int, hora_str.split(":"))
        if horas < 0 or horas > 24 or (horas == 24 and minutos != 0):
            raise ValueError
        return horas * 60 + minutos
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="El formato de hora debe ser HH:MM válido")

def _validar_horarios_apertura_cierre(hora_apertura: str, hora_cierre: str):
    """Valida los minutos y que el cierre sea posterior a la apertura."""
    try:
        ap_min = int(hora_apertura.split(":")[1])
        ci_min = int(hora_cierre.split(":")[1])
    except (IndexError, ValueError):
        raise HTTPException(status_code=400, detail="El formato de hora debe ser HH:MM")

    if ap_min not in MINUTOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Los minutos de apertura deben ser 00, 15, 30 o 45")
    if ci_min not in MINUTOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Los minutos de cierre deben ser 00, 15, 30 o 45")
    if ap_min != ci_min:
        raise HTTPException(
            status_code=400,
            detail="Los minutos de apertura y cierre deben coincidir para evitar turnos incompletos"
        )
        
    min_apertura = _obtener_minutos_totales(hora_apertura)
    min_cierre = _obtener_minutos_totales(hora_cierre)
    if min_cierre <= min_apertura:
        raise HTTPException(status_code=400, detail="La hora de cierre debe ser posterior a la de apertura")

def _verificar_rol_admin(current_user: Usuario):
    if current_user.rol != RolUsuario.admin:
        raise HTTPException(status_code=403, detail="Acción permitida solo para dueños de canchas")

def _obtener_cancha_existente(db: Session, cancha_id: int) -> Cancha:
    """Obtiene la cancha por ID o lanza error 404 si no existe."""
    cancha = cancha_repository.obtener_por_id(db, cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return cancha


# ─────────────────────────────────────────────
# Funciones CRUD Canchas
# ─────────────────────────────────────────────

def crear_cancha(db: Session, current_user: Usuario, datos: CanchaCreate) -> dict:
    _verificar_rol_admin(current_user)
    _validar_horarios_apertura_cierre(datos.hora_apertura, datos.hora_cierre)
    
    if datos.precio_por_turno <= 0:
        raise HTTPException(status_code=400, detail="El precio por turno debe ser mayor a cero")

    cancha_existente = cancha_repository.obtener_por_nombre_direccion_propietario(
        db, datos.nombre, datos.direccion, current_user.id
    )
    if cancha_existente:
        raise HTTPException(status_code=400, detail="Ya existe una cancha con este nombre y dirección para este propietario")

    cancha_data = datos.model_dump(exclude={"propietario_id"})
    nueva_cancha = Cancha(**cancha_data, activa=True, propietario_id=current_user.id)
    cancha_guardada = cancha_repository.guardar_cancha(db, nueva_cancha)

    return {"mensaje": "Cancha creada exitosamente", "cancha": cancha_guardada}

def obtener_todas(db: Session):
    return cancha_repository.obtener_todas(db)

def obtener_activas(db: Session):
    return cancha_repository.obtener_activas(db)

def obtener_mis_canchas(db: Session, current_user: Usuario):
    _verificar_rol_admin(current_user)
    return cancha_repository.obtener_por_admin(db, current_user.id)

def obtener_por_id(db: Session, cancha_id: int):
    return _obtener_cancha_existente(db, cancha_id)

def editar_cancha(db: Session, current_user: Usuario, cancha_id: int, datos: CanchaUpdate):
    cancha = _obtener_cancha_existente(db, cancha_id)

    _verificar_rol_admin(current_user)
    cancha.verificar_propietario(current_user.id, "Solo el propietario puede modificar o ver esta información")
    _validar_horarios_apertura_cierre(datos.hora_apertura, datos.hora_cierre)

    cambia_horarios = (
        datos.hora_apertura != cancha.hora_apertura or
        datos.hora_cierre != cancha.hora_cierre or
        datos.duracion_turno != cancha.duracion_turno or
        datos.dias_operativos != cancha.dias_operativos
    )

    if cambia_horarios and cancha_repository.tiene_reservas_activas_futuras(db, cancha_id):
        raise HTTPException(
            status_code=400, 
            detail="No se pueden modificar los horarios ni la duración de los turnos porque la cancha tiene reservas activas a futuro."
        )

    for key, value in datos.model_dump(exclude={"propietario_id"}, exclude_unset=True).items():
        setattr(cancha, key, value)

    cancha_repository.guardar_cancha(db, cancha)
    return {"mensaje": "Cancha actualizada exitosamente", "cancha": cancha}

def eliminar_cancha(db: Session, current_user: Usuario, cancha_id: int):
    cancha = _obtener_cancha_existente(db, cancha_id)

    _verificar_rol_admin(current_user)
    cancha.verificar_propietario(current_user.id, "Solo el propietario puede modificar o ver esta información")

    if cancha_repository.tiene_reservas_activas(db, cancha_id):
        raise HTTPException(
            status_code=400,
            detail="La cancha tiene reservas activas. No se puede eliminar hasta que se cancelen o reprogramen."
        )

    cancha_repository.eliminar_cancha(db, cancha)
    return {"mensaje": "Cancha eliminada exitosamente"}

def eliminar_canchas_por_admin(db: Session, current_user: Usuario):
    _verificar_rol_admin(current_user)

    canchas = cancha_repository.obtener_por_admin(db, current_user.id)
    if not canchas:
        return {"mensaje": "El administrador no tiene canchas registradas"}

    for cancha in canchas:
        if cancha_repository.tiene_reservas_activas(db, cancha.id):
            raise HTTPException(
                status_code=400,
                detail=f"La cancha con ID {cancha.id} tiene reservas activas y no puede ser eliminada"
            )
        cancha_repository.eliminar_cancha(db, cancha)

    return {"mensaje": "Todas las canchas del administrador han sido eliminadas"}


# ─────────────────────────────────────────────
# Funciones Agenda y Turnos
# ─────────────────────────────────────────────

def obtener_turnos_disponibles(db: Session, cancha_id: int, fecha: date, excluir_partido_id: int = None):
    cancha = _obtener_cancha_existente(db, cancha_id)

    partidos = partido_repository.obtener_partidos_por_cancha_y_fecha(db, cancha_id, fecha)
    
    return (AgendaBuilder(cancha, fecha)
            .generar_slots_vacios(incluir_detalle=False)
            .inyectar_partidos(partidos, excluir_partido_id=excluir_partido_id, incluir_detalle=False)
            .build())

def obtener_agenda(db: Session, current_user: Usuario, cancha_id: int, fecha: date):
    cancha = _obtener_cancha_existente(db, cancha_id)

    _verificar_rol_admin(current_user)
    cancha.verificar_propietario(current_user.id, "Solo el propietario puede modificar o ver esta información")

    partidos = partido_repository.obtener_partidos_por_cancha_y_fecha(db, cancha_id, fecha)
    
    slots_data = (AgendaBuilder(cancha, fecha)
                  .generar_slots_vacios(incluir_detalle=True)
                  .inyectar_partidos(partidos, incluir_detalle=True)
                  .build())

    return AgendaRespuesta(
        cancha=cancha,
        fecha=fecha,
        slots=[AgendaSlot(**s) for s in slots_data]
    )