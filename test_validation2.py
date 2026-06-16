from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.dependencies import get_current_user, get_db
from backend.app.models.usuario_model import Usuario, RolUsuario
from backend.app.models.torneo_model import Torneo, EstadoTorneo, FormatoTorneo
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.core.db import Base

engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class MockUser:
    id = 1
    rol = RolUsuario.jugador

app.dependency_overrides[get_current_user] = lambda: MockUser()

db = TestingSessionLocal()
organizador = Usuario(
    id=1,
    nombre="Organizador",
    apellido="Test",
    email="organizador@test.com",
    password="password123",
    edad=30,
    genero="Masculino",
    zona="CABA",
    rol=RolUsuario.jugador,
    email_confirmado=True
)
db.add(organizador)

torneo = Torneo(
    id=1,
    nombre="Torneo Original",
    fecha_inicio=datetime.now() + timedelta(days=10),
    fecha_fin=datetime.now() + timedelta(days=20),
    formato=FormatoTorneo.eliminacion_directa,
    zona="Palermo",
    dias_operativos=31,
    franja_horaria="10:00-14:00",
    max_equipos=8,
    min_integrantes_por_equipo=5,
    costo_inscripcion=1000.0,
    estado=EstadoTorneo.abierto,
    organizador_id=1
)
db.add(torneo)
db.commit()
db.close()

client = TestClient(app)
payload = {
    "nombre":"Test Torneo Edit",
    "fecha_inicio":"2026-06-25T12:00:00.000Z",
    "fecha_fin":"2026-06-25T12:00:00.000Z",
    "formato":"eliminacion_directa",
    "zona":"CABA",
    "dias_operativos":31,
    "franja_horaria":"09:00-11:00",
    "max_equipos":8,
    "min_integrantes_por_equipo":5,
    "costo_inscripcion":100,
    "ida_y_vuelta":False,
    "fase_final":None,
    "descripcion":"",
    "reglas":""
}
response = client.patch("/api/torneos/1", json=payload)
print(response.status_code)
print(response.json())
