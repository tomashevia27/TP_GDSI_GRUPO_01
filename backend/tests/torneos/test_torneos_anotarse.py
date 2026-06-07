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
from backend.app.models.torneo_model import Torneo, EstadoTorneo

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
        id=1,
        nombre="Julian",
        apellido="Test",
        email="julian@test.com",
        password="password123",
        edad=25,
        genero="Masculino",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )
    usuario2 = Usuario(
        id=2,
        nombre="Tomas",
        apellido="Test",
        email="tomas@test.com",
        password="password123",
        edad=24,
        genero="Masculino",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )
    db.add(usuario)
    db.add(usuario2)
    db.commit()
    db.refresh(usuario) 
    db.refresh(usuario2)
    db.close()
    
    # Mockear usuario logueado por defecto (ID 1)
    app.dependency_overrides[get_current_user] = lambda: usuario


def crear_torneo_base(max_equipos: int = 2, estado: EstadoTorneo = EstadoTorneo.abierto) -> int:
    """Función auxiliar para insertar un torneo rápido directo a la DB de pruebas"""
    db = TestingSessionLocal()
    torneo = Torneo(
        nombre="Torneo de Testeo",
        fecha_inicio=datetime.now() + timedelta(days=5),
        formato="fase_grupos",
        lugar="Predio Norte",
        max_equipos=max_equipos,
        costo_inscripcion=100.0,
        estado=estado,
        organizador_id=1
    )
    db.add(torneo)
    db.commit()
    db.refresh(torneo)
    t_id = torneo.id
    db.close()
    return t_id


def test_inscripcion_exitosa():
    torneo_id = crear_torneo_base(max_equipos=2)
    
    payload = {
        "nombre": "Los Magos de OpenCode",
        "escudo": "https://imagen.com/escudo.png",
        "jugadores_ids": [1, 2]
    }
    
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert data["nombre"] == "Los Magos de OpenCode"
    assert "id" in data


def test_error_usuario_logueado_no_forma_parte_del_equipo():
    torneo_id = crear_torneo_base()
    
    payload = {
        "nombre": "Equipo Intruso",
        "jugadores_ids": [2] 
    }
    
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 400
    assert "Debes formar parte del equipo" in response.json()["detail"]


def test_error_torneo_inexistente():
    payload = {
        "nombre": "Inter de Milán",
        "jugadores_ids": [1]
    }
    response = client.post("/api/torneos/999/inscripciones", json=payload)
    assert response.status_code == 404
    assert "El torneo especificado no existe" in response.json()["detail"]


def test_error_torneo_no_abierto():
    torneo_id = crear_torneo_base(estado=EstadoTorneo.en_curso)
    
    payload = {
        "nombre": "Los Tardíos",
        "jugadores_ids": [1]
    }
    
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 400
    assert "El torneo no está abierto" in response.json()["detail"]


def test_error_sin_cupos_disponibles():
    torneo_id = crear_torneo_base(max_equipos=1)
    
    payload1 = {
        "nombre": "Equipo Veloz",
        "jugadores_ids": [1, 2]
    }
    r1 = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload1)
    assert r1.status_code == 201
    
    payload2 = {
        "nombre": "Equipo Quedado",
        "jugadores_ids": [1]
    }
    r2 = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload2)
    assert r2.status_code == 400
    assert "no tiene cupos de inscripción disponibles" in r2.json()["detail"]


def test_error_jugadores_no_validos_o_inexistentes():
    torneo_id = crear_torneo_base()
    
    payload = {
        "nombre": "Fantasmas FC",
        "jugadores_ids": [1, 99]
    }
    
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 404
    assert "Uno o más usuarios del listado no existen" in response.json()["detail"]
