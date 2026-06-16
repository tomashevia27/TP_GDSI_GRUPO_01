from datetime import date, datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.usuario_model import Usuario, RolUsuario
from ..models.cancha_model import Cancha, DIAS_SEMANA_MAP
from ..repositories import estadistica_repository
from ..schemas import estadistica_schemas as schemas

# Zona horaria local (Argentina UTC-3)
TZ_LOCAL = timezone(timedelta(hours=-3))

DIAS_SEMANA_NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

# Mapeo de strftime('%w') → índice ISO (Lunes=0 ... Domingo=6)
# strftime('%w'): 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado
STRFTIME_A_ISO = {'0': 6, '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5}


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _verificar_admin(current_user: Usuario):
    """Verifica que el usuario sea admin (dueño de cancha)."""
    if current_user.rol != RolUsuario.admin:
        raise HTTPException(status_code=403, detail="Acción permitida solo para dueños de canchas")


def _obtener_cancha_ids(db: Session, current_user: Usuario, cancha_id: int = None) -> list[int]:
    """Obtiene los IDs de las canchas del propietario, opcionalmente filtrado."""
    ids = estadistica_repository.obtener_ids_canchas_del_propietario(db, current_user.id, cancha_id)
    if not ids:
        if cancha_id:
            raise HTTPException(status_code=404, detail="Cancha no encontrada o no te pertenece")
        raise HTTPException(status_code=404, detail="No tenés canchas registradas")
    return ids


def _calcular_turnos_disponibles_dia(cancha: Cancha, fecha: date) -> int:
    """Calcula cuántos turnos tiene una cancha disponible en un día específico."""
    if not cancha.opera_en_fecha(fecha):
        return 0
    apertura, cierre = cancha.obtener_rango_datetime()
    minutos_operacion = (cierre - apertura).total_seconds() / 60
    return max(0, int(minutos_operacion // cancha.duracion_turno))


def _calcular_turnos_totales_periodo(
    canchas: list[Cancha], fecha_desde: date, fecha_hasta: date
) -> int:
    """Calcula el total de turnos disponibles en un período para un conjunto de canchas."""
    total = 0
    fecha_actual = fecha_desde
    while fecha_actual <= fecha_hasta:
        for cancha in canchas:
            total += _calcular_turnos_disponibles_dia(cancha, fecha_actual)
        fecha_actual += timedelta(days=1)
    return total


def _calcular_turnos_por_dia(
    canchas: list[Cancha], fecha: date
) -> int:
    """Calcula el total de turnos disponibles de todas las canchas para un día."""
    return sum(_calcular_turnos_disponibles_dia(c, fecha) for c in canchas)


# ─────────────────────────────────────────────
# KPIs principales
# ─────────────────────────────────────────────

def obtener_kpis(
    db: Session, current_user: Usuario, cancha_id: int = None
) -> schemas.KpiResumen:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)
    canchas = estadistica_repository.obtener_canchas_del_propietario(db, current_user.id)
    if cancha_id:
        canchas = [c for c in canchas if c.id == cancha_id]

    hoy = datetime.now(TZ_LOCAL).date()
    inicio_semana = hoy - timedelta(days=hoy.weekday())  # Lunes
    fin_semana = inicio_semana + timedelta(days=6)
    inicio_mes = hoy.replace(day=1)
    if hoy.month == 12:
        fin_mes = hoy.replace(year=hoy.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        fin_mes = hoy.replace(month=hoy.month + 1, day=1) - timedelta(days=1)

    reservas_hoy = estadistica_repository.contar_reservas_por_periodo(db, cancha_ids, hoy, hoy)
    reservas_semana = estadistica_repository.contar_reservas_por_periodo(db, cancha_ids, inicio_semana, fin_semana)
    reservas_mes = estadistica_repository.contar_reservas_por_periodo(db, cancha_ids, inicio_mes, fin_mes)

    # Tasa de ocupación de hoy
    turnos_hoy = _calcular_turnos_por_dia(canchas, hoy)
    tasa_ocupacion_hoy = round((reservas_hoy / turnos_hoy * 100) if turnos_hoy > 0 else 0, 1)

    # Ingreso estimado del mes
    precios = {c.id: c.precio_por_turno for c in canchas}
    reservas_por_cancha_mes = estadistica_repository.obtener_reservas_por_cancha(
        db, cancha_ids, inicio_mes, fin_mes
    )
    ingreso_mes = sum(precios.get(cid, 0) * cant for cid, cant in reservas_por_cancha_mes)

    # Próxima reserva
    proxima = estadistica_repository.obtener_proxima_reserva(db, cancha_ids, hoy)
    proxima_fecha = None
    proxima_horario = None
    proxima_cancha = None
    if proxima:
        proxima_fecha = proxima.fecha.strftime("%d/%m/%Y")
        proxima_horario = proxima.horario.strftime("%H:%M")
        cancha_obj = next((c for c in canchas if c.id == proxima.cancha_id), None)
        proxima_cancha = cancha_obj.nombre if cancha_obj else None

    return schemas.KpiResumen(
        reservas_hoy=reservas_hoy,
        reservas_semana=reservas_semana,
        reservas_mes=reservas_mes,
        tasa_ocupacion_hoy=tasa_ocupacion_hoy,
        ingreso_estimado_mes=ingreso_mes,
        proxima_reserva_fecha=proxima_fecha,
        proxima_reserva_horario=proxima_horario,
        proxima_reserva_cancha=proxima_cancha,
    )


# ─────────────────────────────────────────────
# Reservas por período (gráfico de tendencia)
# ─────────────────────────────────────────────

def obtener_reservas_por_periodo(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.ReservasPorPeriodoRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)

    reservas_diarias = estadistica_repository.obtener_reservas_diarias(db, cancha_ids, fecha_desde, fecha_hasta)
    
    # Crear un mapa para hacer fill de días sin reservas
    mapa = {r[0]: r[1] for r in reservas_diarias}
    datos = []
    total = 0
    fecha_actual = fecha_desde
    while fecha_actual <= fecha_hasta:
        cantidad = mapa.get(fecha_actual, 0)
        datos.append(schemas.ReservasDiarias(fecha=fecha_actual.isoformat(), cantidad=cantidad))
        total += cantidad
        fecha_actual += timedelta(days=1)

    return schemas.ReservasPorPeriodoRespuesta(datos=datos, total=total)


# ─────────────────────────────────────────────
# Distribución por día de la semana
# ─────────────────────────────────────────────

def obtener_reservas_por_dia_semana(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.ReservasPorDiaSemanaRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)

    resultados = estadistica_repository.obtener_reservas_por_dia_semana(db, cancha_ids, fecha_desde, fecha_hasta)
    
    # Inicializar todos los días en 0
    conteos = {i: 0 for i in range(7)}
    for dia_str, cantidad in resultados:
        idx_iso = STRFTIME_A_ISO.get(str(int(float(dia_str))), 0)
        conteos[idx_iso] += cantidad

    datos = [
        schemas.ReservasPorDiaSemana(
            dia=DIAS_SEMANA_NOMBRES[i],
            dia_numero=i,
            cantidad=conteos[i]
        )
        for i in range(7)
    ]

    return schemas.ReservasPorDiaSemanaRespuesta(datos=datos)


# ─────────────────────────────────────────────
# Distribución por hora
# ─────────────────────────────────────────────

def obtener_reservas_por_hora(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.ReservasPorHoraRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)

    resultados = estadistica_repository.obtener_reservas_por_hora(db, cancha_ids, fecha_desde, fecha_hasta)
    
    datos = [
        schemas.ReservasPorHora(hora=f"{int(float(hora)):02d}:00", cantidad=cantidad)
        for hora, cantidad in resultados
    ]

    return schemas.ReservasPorHoraRespuesta(datos=datos)


# ─────────────────────────────────────────────
# Mapa de calor
# ─────────────────────────────────────────────

def obtener_mapa_calor(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.MapaCalorRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)

    resultados = estadistica_repository.obtener_mapa_calor(db, cancha_ids, fecha_desde, fecha_hasta)
    
    datos = []
    for dia_str, hora, cantidad in resultados:
        idx_iso = STRFTIME_A_ISO.get(str(int(float(dia_str))), 0)
        datos.append(schemas.MapaCalorCelda(
            dia=DIAS_SEMANA_NOMBRES[idx_iso],
            dia_numero=idx_iso,
            hora=f"{int(float(hora)):02d}:00",
            cantidad=cantidad
        ))

    return schemas.MapaCalorRespuesta(datos=datos)


# ─────────────────────────────────────────────
# Tasa de ocupación
# ─────────────────────────────────────────────

def obtener_ocupacion(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.OcupacionRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)
    canchas = estadistica_repository.obtener_canchas_del_propietario(db, current_user.id)
    if cancha_id:
        canchas = [c for c in canchas if c.id == cancha_id]

    reservas_diarias = estadistica_repository.obtener_reservas_diarias(db, cancha_ids, fecha_desde, fecha_hasta)
    mapa_reservas = {r[0]: r[1] for r in reservas_diarias}

    datos = []
    total_tasa = 0
    dias_count = 0
    fecha_actual = fecha_desde
    while fecha_actual <= fecha_hasta:
        turnos_dia = _calcular_turnos_por_dia(canchas, fecha_actual)
        reservas_dia = mapa_reservas.get(fecha_actual, 0)
        tasa = round((reservas_dia / turnos_dia * 100) if turnos_dia > 0 else 0, 1)
        datos.append(schemas.OcupacionDiaria(fecha=fecha_actual.isoformat(), tasa=tasa))
        total_tasa += tasa
        dias_count += 1
        fecha_actual += timedelta(days=1)

    tasa_promedio = round(total_tasa / dias_count, 1) if dias_count > 0 else 0

    return schemas.OcupacionRespuesta(tasa_promedio=tasa_promedio, datos=datos)


# ─────────────────────────────────────────────
# Cancelaciones
# ─────────────────────────────────────────────

def obtener_cancelaciones(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.CancelacionesRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)

    total = estadistica_repository.contar_reservas_totales_por_periodo(db, cancha_ids, fecha_desde, fecha_hasta)
    cancelaciones = estadistica_repository.contar_cancelaciones_por_periodo(db, cancha_ids, fecha_desde, fecha_hasta)
    efectivas = total - cancelaciones
    tasa = round((cancelaciones / total * 100) if total > 0 else 0, 1)

    return schemas.CancelacionesRespuesta(
        total_reservas=total,
        total_cancelaciones=cancelaciones,
        total_efectivas=efectivas,
        tasa_cancelacion=tasa,
    )


# ─────────────────────────────────────────────
# Distribución por tipo de reserva
# ─────────────────────────────────────────────

def obtener_distribucion_tipo(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.DistribucionTipoRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)

    dist = estadistica_repository.obtener_distribucion_tipo_reserva(db, cancha_ids, fecha_desde, fecha_hasta)

    nombres_display = {
        "abierto": "Abierto",
        "cerrado": "Cerrado",
        "manual": "Reserva manual",
        "bloqueado": "Bloqueado",
    }

    datos = [
        schemas.TipoReservaItem(tipo=nombres_display[k], cantidad=v)
        for k, v in dist.items() if v > 0
    ]

    return schemas.DistribucionTipoRespuesta(datos=datos)


# ─────────────────────────────────────────────
# Distribución por modalidad
# ─────────────────────────────────────────────

def obtener_distribucion_modalidad(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.DistribucionModalidadRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)

    resultados = estadistica_repository.obtener_distribucion_modalidad(db, cancha_ids, fecha_desde, fecha_hasta)
    
    datos = [
        schemas.ModalidadItem(modalidad=mod or "Sin especificar", cantidad=cant)
        for mod, cant in resultados
    ]

    return schemas.DistribucionModalidadRespuesta(datos=datos)


# ─────────────────────────────────────────────
# Comparativa entre canchas
# ─────────────────────────────────────────────

def obtener_comparativa_canchas(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date
) -> schemas.ComparativaCanchasRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user)
    canchas = estadistica_repository.obtener_canchas_del_propietario(db, current_user.id)

    reservas_por_cancha = estadistica_repository.obtener_reservas_por_cancha(db, cancha_ids, fecha_desde, fecha_hasta)
    mapa_reservas = {cid: cant for cid, cant in reservas_por_cancha}

    datos = []
    for cancha in canchas:
        reservas = mapa_reservas.get(cancha.id, 0)
        ingreso = reservas * cancha.precio_por_turno
        turnos_totales = _calcular_turnos_totales_periodo([cancha], fecha_desde, fecha_hasta)
        tasa = round((reservas / turnos_totales * 100) if turnos_totales > 0 else 0, 1)

        datos.append(schemas.CanchaEstadistica(
            cancha_id=cancha.id,
            nombre=cancha.nombre,
            reservas=reservas,
            ingreso_estimado=ingreso,
            tasa_ocupacion=tasa,
        ))

    # Ordenar por reservas descendente
    datos.sort(key=lambda x: x.reservas, reverse=True)

    return schemas.ComparativaCanchasRespuesta(datos=datos)


# ─────────────────────────────────────────────
# Ingresos (tendencia)
# ─────────────────────────────────────────────

def obtener_ingresos(
    db: Session, current_user: Usuario,
    fecha_desde: date, fecha_hasta: date, cancha_id: int = None
) -> schemas.IngresosRespuesta:
    _verificar_admin(current_user)
    cancha_ids = _obtener_cancha_ids(db, current_user, cancha_id)
    canchas = estadistica_repository.obtener_canchas_del_propietario(db, current_user.id)
    if cancha_id:
        canchas = [c for c in canchas if c.id == cancha_id]

    # Para cada cancha necesitamos saber su precio_por_turno
    precios = {c.id: c.precio_por_turno for c in canchas}
    
    # Si solo hay una cancha (o todas tienen el mismo precio), podemos simplificar
    # Pero para ser precisos, necesitamos reservas por cancha por día
    # Simplificación: usar precio promedio ponderado por ahora
    # Para hacerlo bien, obtenemos reservas diarias por cancha
    from sqlalchemy import func as sqlfunc
    from ..models.partido_model import Partido
    
    reservas_raw = db.query(
        Partido.fecha,
        Partido.cancha_id,
        sqlfunc.count(Partido.id)
    ).filter(
        Partido.cancha_id.in_(cancha_ids),
        Partido.fecha >= fecha_desde,
        Partido.fecha <= fecha_hasta,
        Partido.estado != "Cancelado",
        Partido.estado != "bloqueado",
    ).group_by(Partido.fecha, Partido.cancha_id).all()

    # Agrupar ingresos por día
    ingresos_por_dia = {}
    for fecha_r, cid, cant in reservas_raw:
        precio = precios.get(cid, 0)
        if fecha_r not in ingresos_por_dia:
            ingresos_por_dia[fecha_r] = 0.0
        ingresos_por_dia[fecha_r] += cant * precio

    datos = []
    ingreso_total = 0.0
    dias_count = 0
    fecha_actual = fecha_desde
    while fecha_actual <= fecha_hasta:
        ingreso_dia = ingresos_por_dia.get(fecha_actual, 0.0)
        datos.append(schemas.IngresoDiario(fecha=fecha_actual.isoformat(), ingreso=ingreso_dia))
        ingreso_total += ingreso_dia
        dias_count += 1
        fecha_actual += timedelta(days=1)

    ingreso_promedio = round(ingreso_total / dias_count, 2) if dias_count > 0 else 0.0

    return schemas.IngresosRespuesta(
        ingreso_total=ingreso_total,
        ingreso_promedio_diario=ingreso_promedio,
        datos=datos,
    )
