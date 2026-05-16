from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..models.usuario_model import Usuario, RolUsuario
from ..models.cancha_model import Cancha
from ..repositories import cancha_repository
from ..schemas.cancha_schemas import CanchaCreate

def parse_time(time_str: str):
    try:
        return datetime.strptime(time_str, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="El formato de hora debe ser HH:MM")


def crear_cancha(db: Session, datos: CanchaCreate) -> dict:
    """Valida y crea una nueva cancha."""

    # 0. Validar que el propietario exista y sea un dueño de cancha (admin)
    propietario = db.query(Usuario).filter(Usuario.id == datos.propietario_id).first()
    if not propietario or propietario.rol != RolUsuario.admin:
        raise HTTPException(status_code=403, detail="Solo los dueños de cancha pueden crear canchas")

    # 1. Validar que la hora de cierre sea posterior a la de apertura
    hora_apertura = parse_time(datos.hora_apertura)
    hora_cierre = parse_time(datos.hora_cierre)
    
    if hora_cierre <= hora_apertura:
        raise HTTPException(status_code=400, detail="La hora de cierre debe ser posterior a la de apertura")
        
    # 2. Validar que el precio sea mayor a cero (aunque Pydantic lo hace, doble validación por las dudas)
    if datos.precio_por_turno <= 0:
        raise HTTPException(status_code=400, detail="El precio por turno debe ser mayor a cero")

    # 3. Validar duplicados
    cancha_existente = cancha_repository.obtener_por_nombre_direccion_propietario(
        db, datos.nombre, datos.direccion, datos.propietario_id
    )
    if cancha_existente:
        raise HTTPException(status_code=400, detail="Ya existe una cancha con este nombre y dirección para este propietario")

    # 4. Crear instancia y guardar (queda activa=True por defecto según el modelo)
    nueva_cancha = Cancha(**datos.dict(), activa=True)
    cancha_guardada = cancha_repository.guardar_cancha(db, nueva_cancha)

    return {"mensaje": "Cancha creada exitosamente", "cancha": cancha_guardada}

def obtener_todas(db: Session):
    return cancha_repository.obtener_todas(db)

def obtener_activas(db: Session):
    return cancha_repository.obtener_activas(db)

def obtener_por_id(db: Session, cancha_id: int):
    return cancha_repository.obtener_por_id(db, cancha_id)

def editar_cancha(db: Session, cancha_id: int, datos: CanchaCreate):
    """Edita una cancha existente."""
    cancha = cancha_repository.obtener_por_id(db, cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    # Validar que el propietario exista y sea un dueño de cancha
    propietario = db.query(Usuario).filter(Usuario.id == datos.propietario_id).first()
    if not propietario or propietario.rol != RolUsuario.admin:
        raise HTTPException(status_code=403, detail="Solo los dueños de cancha pueden editar canchas")

    # Validar que la hora de cierre sea posterior a la de apertura
    hora_apertura = parse_time(datos.hora_apertura)
    hora_cierre = parse_time(datos.hora_cierre)
    if hora_cierre <= hora_apertura:
        raise HTTPException(status_code=400, detail="La hora de cierre debe ser posterior a la de apertura")

    # Actualizar los datos de la cancha
    for key, value in datos.dict(exclude_unset=True).items():
        setattr(cancha, key, value)

    db.commit()
    db.refresh(cancha)
    return {"mensaje": "Cancha actualizada exitosamente", "cancha": cancha}

def eliminar_cancha(db: Session, cancha_id: int):
    """Elimina una cancha si no tiene reservas activas."""
    cancha = cancha_repository.obtener_por_id(db, cancha_id)
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    # Validar si la cancha tiene reservas activas
    if cancha_repository.tiene_reservas_activas(db, cancha_id):
        raise HTTPException(
            status_code=400,
            detail="La cancha tiene reservas activas. No se puede eliminar hasta que se cancelen o reprogramen."
        )

    # Eliminar o desactivar la cancha
    cancha_repository.eliminar_cancha(db, cancha)
    return {"mensaje": "Cancha eliminada exitosamente"}

def eliminar_canchas_por_admin(db: Session, admin_id: int):
    """Elimina todas las canchas asociadas a un administrador."""
    administrador = db.query(Usuario).filter(Usuario.id == admin_id, Usuario.rol == RolUsuario.admin).first()
    if not administrador:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")

    canchas = cancha_repository.obtener_por_admin(db, admin_id)
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