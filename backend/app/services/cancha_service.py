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