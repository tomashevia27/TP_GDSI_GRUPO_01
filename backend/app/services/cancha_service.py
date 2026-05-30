from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta

from ..models.usuario_model import Usuario, RolUsuario
from ..models.cancha_model import Cancha
from ..repositories import cancha_repository
from ..repositories import partido_repository
from ..schemas.cancha_schemas import CanchaCreate, CanchaUpdate, AgendaSlot, AgendaRespuesta

MINUTOS_VALIDOS = {0, 15, 30, 45}
DIAS_SEMANA_MAP = {0: 1, 1: 2, 2: 4, 3: 8, 4: 16, 5: 32, 6: 64}

# ─────────────────────────────────────────────
# Helpers Internos
# ─────────────────────────────────────────────

def _parse_time(time_str: str):
    try:
        return datetime.strptime(time_str, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="El formato de hora debe ser HH:MM")

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
        
    hora_ap = _parse_time(hora_apertura)
    hora_ci = _parse_time(hora_cierre)
    if hora_ci <= hora_ap:
        raise HTTPException(status_code=400, detail="La hora de cierre debe ser posterior a la de apertura")

def _verificar_permisos_admin(current_user: Usuario, propietario_cancha_id: int = None):
    if current_user.rol != RolUsuario.admin:
        raise HTTPException(status_code=403, detail="Acción permitida solo para dueños de canchas")
    if propietario_cancha_id is not None and propietario_cancha_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el propietario puede modificar o ver esta información")

def _generar_slots_base(cancha, fecha, partidos, excluir_partido_id=None, incluir_detalle=False):
    dia_semana = fecha.weekday()
    if not (cancha.dias_operativos & DIAS_SEMANA_MAP[dia_semana]):
        return []

    duracion = cancha.duracion_turno
    apertura = datetime.strptime(cancha.hora_apertura, "%H:%M")
    if cancha.hora_cierre == "24:00":
        cierre = datetime.strptime("00:00", "%H:%M") + timedelta(days=1)
    else:
        cierre = datetime.strptime(cancha.hora_cierre, "%H:%M")

    slots = []
    actual = apertura
    while actual < cierre:
        fin_slot = actual + timedelta(minutes=duracion)
        if fin_slot > cierre:
            break
            
        slot_data = {"horario": actual.strftime("%H:%M"), "estado": "disponible"}
        
        if incluir_detalle:
            slot_data.update({
                "partido_id": None, "cliente_nombre": None, "cliente_apellido": None,
                "cliente_telefono": None, "organizador_nombre": None,
                "organizador_apellido": None, "es_reserva_manual": False,
            })
            
        slots.append(slot_data)
        actual = fin_slot

    duracion_td = timedelta(minutes=duracion)

    for slot in slots:
        slot_inicio = datetime.combine(fecha, datetime.strptime(slot["horario"], "%H:%M").time())
        slot_fin = slot_inicio + duracion_td

        for p in partidos:
            if excluir_partido_id is not None and p.id == excluir_partido_id:
                continue
            
            p_inicio = datetime.combine(p.fecha, p.horario)
            p_fin = p_inicio + duracion_td

            if slot_inicio < p_fin and slot_fin > p_inicio:
                slot["estado"] = "bloqueado" if p.estado == "bloqueado" else "ocupado"
                
                if incluir_detalle:
                    slot["partido_id"] = p.id
                    slot["cliente_nombre"] = p.cliente_nombre
                    slot["cliente_apellido"] = p.cliente_apellido
                    slot["cliente_telefono"] = p.cliente_telefono
                    slot["organizador_nombre"] = p.organizador.nombre if p.organizador else None
                    slot["organizador_apellido"] = p.organizador.apellido if p.organizador else None
                    slot["es_reserva_manual"] = p.reserva_manual if p.reserva_manual is not None else False
                break

    return slots


# ─────────────────────────────────────────────
# Funciones CRUD Canchas
# ─────────────────────────────────────────────

def crear_cancha(db: Session, current_user: Usuario, datos: CanchaCreate) -> dict:
    _verificar_permisos_admin(current_user)
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
    _verificar_permisos_admin(current_user)
    return cancha_repository.obtener_por_admin(db, current_user.id)

def obtener_por_id(db: Session, cancha_id: int):
    return cancha_repository.obtener_por_id(db, cancha_id)

def editar_cancha(db: Session, current_user: Usuario, cancha_id: int, datos: CanchaUpdate):
    cancha = cancha_repository.obtener_por_id(db, cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    _verificar_permisos_admin(current_user, cancha.propietario_id)
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
    cancha = cancha_repository.obtener_por_id(db, cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    _verificar_permisos_admin(current_user, cancha.propietario_id)

    if cancha_repository.tiene_reservas_activas(db, cancha_id):
        raise HTTPException(
            status_code=400,
            detail="La cancha tiene reservas activas. No se puede eliminar hasta que se cancelen o reprogramen."
        )

    cancha_repository.eliminar_cancha(db, cancha)
    return {"mensaje": "Cancha eliminada exitosamente"}

def eliminar_canchas_por_admin(db: Session, current_user: Usuario):
    _verificar_permisos_admin(current_user)

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
    cancha = cancha_repository.obtener_por_id(db, cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    partidos = partido_repository.obtener_partidos_por_cancha_y_fecha(db, cancha_id, fecha)
    
    return _generar_slots_base(
        cancha=cancha, 
        fecha=fecha, 
        partidos=partidos, 
        excluir_partido_id=excluir_partido_id, 
        incluir_detalle=False
    )

def obtener_agenda(db: Session, current_user: Usuario, cancha_id: int, fecha: date):
    cancha = cancha_repository.obtener_por_id(db, cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    _verificar_permisos_admin(current_user, cancha.propietario_id)

    partidos = partido_repository.obtener_partidos_por_cancha_y_fecha(db, cancha_id, fecha)
    
    slots_data = _generar_slots_base(
        cancha=cancha, 
        fecha=fecha, 
        partidos=partidos, 
        incluir_detalle=True
    )

    return AgendaRespuesta(
        cancha=cancha,
        fecha=fecha,
        slots=[AgendaSlot(**s) for s in slots_data]
    )