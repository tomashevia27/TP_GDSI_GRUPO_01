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
from backend.app.models.torneo_model import Torneo, EstadoTorneo
from backend.app.models.cancha_model import Cancha
from backend.app.models.equipo_model import Equipo

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
    cancha = Cancha(
        id=1, nombre="Cancha Test", tipo_superficie="Sintético", 
        tamano=5, zona="CABA", direccion="Calle 123", 
        precio_por_turno=1000.0, hora_apertura="10:00", 
        hora_cierre="23:00", propietario_id=1
    )
    db.add(cancha)

    db.add(usuario2)
    db.commit()
    db.refresh(usuario) 
    db.refresh(usuario2)
    db.close()
    
    # Mockear usuario logueado por defecto (ID 1 — julian@test.com)
    app.dependency_overrides[get_current_user] = lambda: usuario


def crear_torneo_base(max_equipos: int = 2, estado: EstadoTorneo = EstadoTorneo.abierto, min_integrantes: int = 2) -> int:
    """Función auxiliar para insertar un torneo rápido directo a la DB de pruebas"""
    db = TestingSessionLocal()
    torneo = Torneo(
        nombre="Torneo de Testeo",
        fecha_inicio=datetime.now() + timedelta(days=5),
        fecha_fin=datetime.now() + timedelta(days=20),
        formato="eliminacion_directa",
        max_equipos=max_equipos,
        costo_inscripcion=100.0,
        estado=estado,
        organizador_id=1,
        min_integrantes_por_equipo=min_integrantes,
        zona="CABA",
        dias_operativos=31,
        franja_horaria="10:00-20:00"
    )
    db.add(torneo)
    db.commit()
    db.refresh(torneo)
    t_id = torneo.id
    db.close()
    return t_id


def test_inscripcion_exitosa():
    """Inscripción válida: nombre de equipo + emails de jugadores registrados."""
    torneo_id = crear_torneo_base(max_equipos=2, min_integrantes=2)
    
    payload = {
        "nombre": "Los Magos de OpenCode",
        "escudo": "https://imagen.com/escudo.png",
        "jugadores_emails": ["julian@test.com", "tomas@test.com"]
    }
    
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert data["nombre"] == "Los Magos de OpenCode"
    assert "id" in data


def test_inscripcion_actualiza_contador_inscriptos():
    """Al inscribir un equipo, el campo 'inscriptos' del torneo debe incrementarse."""
    torneo_id = crear_torneo_base(max_equipos=2, min_integrantes=2)

    payload = {
        "nombre": "Equipo Contador",
        "jugadores_emails": ["julian@test.com", "tomas@test.com"]
    }
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 201

    db = TestingSessionLocal()
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    assert torneo.inscriptos == 1
    db.close()


def test_error_usuario_logueado_no_forma_parte_del_equipo():
    """El usuario logueado (julian) intenta inscribir un equipo donde él no está."""
    torneo_id = crear_torneo_base()
    
    payload = {
        "nombre": "Equipo Intruso",
        "jugadores_emails": ["tomas@test.com"]  # solo usuario2, sin julian (logueado)
    }
    
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 400
    assert "Debes formar parte del equipo" in response.json()["detail"]


def test_error_torneo_inexistente():
    """Intentar inscribirse en un torneo que no existe debe dar 404."""
    payload = {
        "nombre": "Inter de Milán",
        "jugadores_emails": ["julian@test.com"]
    }
    response = client.post("/api/torneos/999/inscripciones", json=payload)
    assert response.status_code == 404
    assert "El torneo especificado no existe" in response.json()["detail"]


def test_error_torneo_no_abierto():
    """No se puede inscribir en un torneo que no está en estado 'abierto'."""
    torneo_id = crear_torneo_base(estado=EstadoTorneo.en_curso)
    
    payload = {
        "nombre": "Los Tardíos",
        "jugadores_emails": ["julian@test.com"]
    }
    
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 400
    assert "El torneo no está abierto" in response.json()["detail"]


def test_error_sin_cupos_disponibles():
    """Al llenar el cupo máximo, cualquier nuevo intento de inscripción debe dar 400."""
    torneo_id = crear_torneo_base(max_equipos=1)
    
    # Primer equipo: llena el único cupo
    payload1 = {
        "nombre": "Equipo Veloz",
        "jugadores_emails": ["julian@test.com", "tomas@test.com"]
    }
    r1 = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload1)
    assert r1.status_code == 201
    
    # Segundo equipo: no hay cupos (el chequeo de cupos ocurre antes que el de duplicados)
    payload2 = {
        "nombre": "Equipo Quedado",
        "jugadores_emails": ["julian@test.com"]
    }
    r2 = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload2)
    assert r2.status_code == 400
    assert "no tiene cupos de inscripción disponibles" in r2.json()["detail"]


def test_error_emails_no_validos_o_inexistentes():
    """Enviar un email que no pertenece a ningún usuario registrado debe dar 404."""
    torneo_id = crear_torneo_base()
    
    payload = {
        "nombre": "Fantasmas FC",
        "jugadores_emails": ["julian@test.com", "fantasma@noexiste.com"]
    }
    
    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 404
    assert "no pertenecen a usuarios registrados" in response.json()["detail"]


def test_error_jugador_ya_inscripto_en_otro_equipo():
    """Un jugador ya inscripto en el torneo no puede unirse a un segundo equipo."""
    torneo_id = crear_torneo_base(max_equipos=2, min_integrantes=2)

    # Primer equipo: incluye a ambos jugadores disponibles
    payload1 = {
        "nombre": "Primer Equipo",
        "jugadores_emails": ["julian@test.com", "tomas@test.com"]
    }
    r1 = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload1)
    assert r1.status_code == 201

    # Segundo equipo: intenta incluir a julian+tomas de nuevo (ambos ya inscriptos)
    # julian (logueado) está en el payload, así que el chequeo de creator pasa.
    # El chequeo de duplicados es el que debe fallar.
    payload2 = {
        "nombre": "Segundo Equipo",
        "jugadores_emails": ["julian@test.com", "tomas@test.com"]
    }
    r2 = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload2)
    assert r2.status_code == 400
    assert "ya están inscriptos" in r2.json()["detail"]


def test_error_equipo_sin_minimo_jugadores():
    """Un equipo con menos jugadores que los titulares requeridos no puede inscribirse."""
    # Torneo de fútbol 5: se necesitan al menos 5 titulares
    torneo_id = crear_torneo_base(max_equipos=4, min_integrantes=5)

    payload = {
        "nombre": "Equipo Incompleto",
        "jugadores_emails": ["julian@test.com"]  # solo 1 de 5 requeridos
    }

    response = client.post(f"/api/torneos/{torneo_id}/inscripciones", json=payload)
    assert response.status_code == 400
    assert "al menos" in response.json()["detail"]
    assert "titulares" in response.json()["detail"]
    assert "5" in response.json()["detail"]
