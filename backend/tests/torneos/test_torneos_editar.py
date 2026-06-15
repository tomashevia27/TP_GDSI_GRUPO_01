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
from backend.app.models.torneo_model import Torneo, EstadoTorneo, FormatoTorneo

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
    
    otro_usuario = Usuario(
        id=2,
        nombre="Otro",
        apellido="Usuario",
        email="otro@test.com",
        password="password123",
        edad=25,
        genero="Masculino",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )
    
    db.add(organizador)
    db.add(otro_usuario)
    
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
    
    class MockUser:
        def __init__(self, id, rol):
            self.id = id
            self.rol = rol

    app.dependency_overrides[get_current_user] = lambda: MockUser(id=1, rol=RolUsuario.jugador)

def test_editar_torneo_exitoso():
    datos = {
        "nombre": "Torneo Editado",
        "costo_inscripcion": 2000.0
    }
    
    response = client.patch("/api/torneos/1", json=datos)
    assert response.status_code == 200
    data = response.json()
    assert data["nombre"] == "Torneo Editado"
    assert data["costo_inscripcion"] == 2000.0
    assert data["formato"] == "eliminacion_directa"  # No cambió

def test_editar_torneo_sin_permisos():
    class MockUser:
        def __init__(self, id, rol):
            self.id = id
            self.rol = rol

    app.dependency_overrides[get_current_user] = lambda: MockUser(id=2, rol=RolUsuario.jugador)
    
    datos = {
        "nombre": "Torneo Hacker"
    }
    
    response = client.patch("/api/torneos/1", json=datos)
    assert response.status_code == 403
    assert "permisos" in response.json()["detail"].lower()

def test_editar_torneo_no_abierto():
    # Cambiamos el estado del torneo a En Curso
    db = TestingSessionLocal()
    torneo = db.query(Torneo).filter(Torneo.id == 1).first()
    torneo.estado = EstadoTorneo.en_curso
    db.commit()
    db.close()
    
    datos = {
        "nombre": "Intentando editar"
    }
    
    response = client.patch("/api/torneos/1", json=datos)
    assert response.status_code == 400
    assert "abierto" in response.json()["detail"].lower()

def test_editar_torneo_invalido():
    # Si cambiamos el formato a grupos pero no pasamos fase_final
    datos = {
        "formato": "fase_grupos",
        "max_equipos": 10
    }
    
    response = client.patch("/api/torneos/1", json=datos)
    assert response.status_code == 400
    assert "fase final" in response.json()["detail"].lower()
