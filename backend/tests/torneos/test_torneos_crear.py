import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta

from backend.app.main import app
from backend.app.core.db import Base
from backend.app.core.dependencies import get_db, get_current_user
from backend.app.models.usuario_model import Usuario, RolUsuario
from backend.app.models.cancha_model import Cancha
from backend.app.models.torneo_model import EstadoTorneo

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def limpiar_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    usuario = Usuario(
        nombre="Organizador",
        apellido="Torneo",
        email="organizador@test.com",
        password="password123",
        edad=30,
        genero="Masculino",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )
    db.add(usuario)
    cancha = Cancha(
        id=1, nombre="Cancha Test", tipo_superficie="Sintético", 
        tamano=5, zona="CABA", direccion="Calle 123", 
        precio_por_turno=1000.0, hora_apertura="10:00", 
        hora_cierre="23:00", propietario_id=1
    )
    db.add(cancha)

    db.commit()
    db.refresh(usuario)
    db.close()
    
    app.dependency_overrides[get_current_user] = lambda: usuario

def test_crear_torneo_exitoso():
    fecha_futura = (datetime.now() + timedelta(days=10)).isoformat()
    datos = {
        "nombre": "Torneo Relámpago",
        "fecha_inicio": fecha_futura,
        "fecha_fin": (datetime.now() + timedelta(days=20)).isoformat(),
        "formato": "eliminacion_directa",
        "zona": "CABA",
        "dias_operativos": 31,
        "franja_horaria": "09:00-11:00",
        "max_equipos": 8,
        "min_integrantes_por_equipo": 5,
        "costo_inscripcion": 5000.0,
        "descripcion": "Torneo de prueba",
        "reglas": "Sin reglas"
    }
    
    response = client.post("/api/torneos/", json=datos)
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Torneo Relámpago"
    assert data["estado"] == EstadoTorneo.abierto.value
    assert data["organizador_id"] == 1
    assert "id" in data

def test_crear_torneo_fecha_pasado():
    fecha_pasada = (datetime.now() - timedelta(days=1)).isoformat()
    datos = {
        "nombre": "Torneo Pasado",
        "fecha_inicio": fecha_pasada,
        "fecha_fin": (datetime.now() + timedelta(days=20)).isoformat(),
        "formato": "fase_grupos",
        "fase_final": "semis",
        "zona": "CABA",
        "dias_operativos": 31,
        "franja_horaria": "09:00-11:00",
        "max_equipos": 8,
        "min_integrantes_por_equipo": 5,
        "costo_inscripcion": 1000.0
    }
    
    response = client.post("/api/torneos/", json=datos)
    assert response.status_code == 400
    assert "pasado" in response.json()["detail"].lower()

def test_crear_torneo_max_equipos_invalido():
    fecha_futura = (datetime.now() + timedelta(days=10)).isoformat()
    datos = {
        "nombre": "Torneo Chico",
        "fecha_inicio": fecha_futura,
        "fecha_fin": (datetime.now() + timedelta(days=20)).isoformat(),
        "formato": "todos_contra_todos",
        "zona": "CABA",
        "dias_operativos": 31,
        "franja_horaria": "09:00-11:00",
        "max_equipos": 1,
        "min_integrantes_por_equipo": 5,
        "costo_inscripcion": 0
    }
    
    response = client.post("/api/torneos/", json=datos)
    assert response.status_code == 422
    assert any(err["loc"] == ["body", "max_equipos"] for err in response.json()["detail"])
