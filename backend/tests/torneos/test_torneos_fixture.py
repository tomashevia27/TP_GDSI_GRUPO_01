import pytest
from fastapi.testclient import TestClient
from collections import Counter
from datetime import datetime, timedelta

from backend.app.main import app
from backend.app.core.db import Base
from backend.app.core.dependencies import get_db, get_current_user
from backend.app.models.usuario_model import Usuario, RolUsuario
from backend.app.models.cancha_model import Cancha
from backend.app.models.torneo_model import EstadoTorneo

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    usuario = Usuario(
        id=1,
        nombre="Organizador",
        apellido="Test",
        email="organizador@test.com",
        password="123",
        edad=30,
        genero="M",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )

    cancha = Cancha(
        id=1,
        nombre="Cancha Test",
        tipo_superficie="Sintético",
        tamano=5,
        zona="CABA",
        direccion="Fake 123",
        precio_por_turno=1000.0,
        hora_apertura="10:00",
        hora_cierre="22:00",
        propietario_id=1
    )

    db.add(usuario)
    db.add(cancha)
    db.commit()

    db.refresh(usuario)

    app.dependency_overrides[get_current_user] = lambda: usuario

    yield

    db.close()


# ----------------------------
# HELPERS
# ----------------------------

def crear_torneo_base(max_equipos=4, formato="eliminacion_directa", fase_final=None, ida_y_vuelta=False):
    fecha_futura = (datetime.now() + timedelta(days=10)).isoformat()
    fecha_fin = (datetime.now() + timedelta(days=20)).isoformat()

    # Construimos el payload base
    payload = {
        "nombre": "Torneo Test",
        "fecha_inicio": fecha_futura,
        "fecha_fin": fecha_fin,
        "formato": formato,
        "zona": "CABA",
        "dias_operativos": 127,
        "franja_horaria": "10:00-12:00",
        "max_equipos": max_equipos,
        "ida_y_vuelta": ida_y_vuelta,
        "min_integrantes_por_equipo": 5,
        "costo_inscripcion": 1000
    }
    
    if formato == "fase_grupos":
        payload["fase_final"] = fase_final or "semis"

    response = client.post("/api/torneos/", json=payload)

    if response.status_code != 201:
        print(f"\nError al crear torneo: {response.json()}")

    assert response.status_code == 201
    return response.json()["id"]

def crear_jugadores(cantidad, equipo_index, torneo_id):
    db = TestingSessionLocal()
    emails = []
    for j in range(cantidad):
        email = f"jugador_{torneo_id}_{equipo_index}_{j}@test.com"
        usuario = Usuario(
            nombre=f"Jugador_{j}", apellido="Test", email=email,
            password="123", edad=20, genero="M", zona="CABA",
            rol=RolUsuario.jugador, email_confirmado=True
        )
        db.add(usuario)
        emails.append(email)
    db.commit()
    db.close()
    return emails

def inscribir_equipos(torneo_id, cantidad_equipos):
    db = TestingSessionLocal()
    for i in range(cantidad_equipos):
        emails = crear_jugadores(5, i, torneo_id)
        jugador_lider = db.query(Usuario).filter(Usuario.email == emails[0]).first()
        
        app.dependency_overrides[get_current_user] = lambda: jugador_lider
        
        response = client.post(
            f"/api/torneos/{torneo_id}/inscripciones",
            json={
                "nombre": f"Equipo {i}",
                "escudo": None,
                "jugadores_emails": emails
            }
        )
        
        if response.status_code != 201:
            print(f"\nDEBUG ERROR {response.status_code}: {response.json()}")
            
        assert response.status_code == 201
    
    db.close()
    
    usuario_original = db.query(Usuario).filter(Usuario.email == "organizador@test.com").first()
    app.dependency_overrides[get_current_user] = lambda: usuario_original


# ----------------------------
# TESTS
# ----------------------------

def test_fixture_eliminacion_directa():
    torneo_id = crear_torneo_base(max_equipos=4, formato="eliminacion_directa")
    inscribir_equipos(torneo_id, 4)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2

    for p in data:
        assert p["equipo_local"]
        assert p["equipo_visitante"]
        assert p["fase"] is not None


def test_fixture_todos_contra_todos():
    torneo_id = crear_torneo_base(max_equipos=4, formato="todos_contra_todos")
    inscribir_equipos(torneo_id, 4)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")

    data = response.json()

    assert len(data) == 6


def test_fixture_ida_vuelta():
    torneo_id = crear_torneo_base(
        max_equipos=4, 
        formato="todos_contra_todos", 
        ida_y_vuelta=True
    )
    inscribir_equipos(torneo_id, 4)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")
    
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 12 

    participaciones = Counter()
    for partido in data:
        local_id = partido["equipo_local"]["id"]
        visitante_id = partido["equipo_visitante"]["id"]
        participaciones[local_id] += 1
        participaciones[visitante_id] += 1
    
    for equipo, cantidad in participaciones.items():
        assert cantidad == 6, f"El {equipo} debería jugar 6 partidos, pero juega {cantidad}"


def test_fixture_fase_grupos():
    torneo_id = crear_torneo_base(max_equipos=8, formato="fase_grupos", fase_final="semis")
    inscribir_equipos(torneo_id, 8)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 12 
    assert all(p.get("grupo") is not None for p in data)

    grupos = {p["grupo"] for p in data}
    assert "A" in grupos
    assert "B" in grupos
    assert len(grupos) == 2

    participaciones = Counter()
    for partido in data:
        participaciones[partido["equipo_local"]["id"]] += 1
        participaciones[partido["equipo_visitante"]["id"]] += 1
    
    for equipo_id, cantidad in participaciones.items():
        assert cantidad == 3, f"El equipo {equipo_id} debería tener 3 partidos en fase de grupos"


def test_fixture_sin_equipos_falla():
    torneo_id = crear_torneo_base(max_equipos=4, formato="eliminacion_directa")

    response = client.post(f"/api/torneos/{torneo_id}/fixture")

    assert response.status_code == 400