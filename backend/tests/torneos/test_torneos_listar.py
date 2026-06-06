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
    db.commit()
    db.refresh(usuario)
    db.close()
    app.dependency_overrides[get_current_user] = lambda: usuario


def test_listar_torneos_abiertos():
    fecha = (datetime.now() + timedelta(days=5)).isoformat()
    datos1 = {
        "nombre": "Abierto",
        "fecha_inicio": fecha,
        "formato": "fase_grupos",
        "lugar": "Cancha A",
        "max_equipos": 4,
        "costo_inscripcion": 100.0,
        "descripcion": "Desc",
        "reglas": "Reglas"
    }
    datos2 = {
        "nombre": "Cerrado",
        "fecha_inicio": fecha,
        "formato": "eliminacion_directa",
        "lugar": "Cancha B",
        "max_equipos": 8,
        "costo_inscripcion": 200.0
    }

    r1 = client.post("/api/torneos/", json=datos1)
    assert r1.status_code == 201
    created1 = r1.json()
    r2 = client.post("/api/torneos/", json=datos2)
    assert r2.status_code == 201
    created2 = r2.json()

    # marcar el segundo torneo como finalizado (buscar por nombre)
    db = TestingSessionLocal()
    t2 = db.query(Torneo).filter(Torneo.nombre == created2["nombre"]).first()
    t2.estado = EstadoTorneo.finalizado
    db.commit()
    db.close()

    resp = client.get("/api/torneos/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    t = data[0]
    assert t["nombre"] == "Abierto"
    assert "inscriptos" in t
    assert t["inscriptos"] == 0
    assert "cupos_restantes" in t
    assert t["cupos_restantes"] == datos1["max_equipos"]


def test_obtener_detalle_torneo():
    fecha = (datetime.now() + timedelta(days=7)).isoformat()
    datos = {
        "nombre": "DetalleTorneo",
        "fecha_inicio": fecha,
        "formato": "todos_contra_todos",
        "lugar": "Cancha X",
        "max_equipos": 6,
        "costo_inscripcion": 150.0,
        "descripcion": "Desc",
        "reglas": "Reglas detalladas"
    }

    r = client.post("/api/torneos/", json=datos)
    assert r.status_code == 201
    created = r.json()
    torneo_id = created["id"]

    resp = client.get(f"/api/torneos/{torneo_id}")
    assert resp.status_code == 200
    detalle = resp.json()
    assert detalle["reglas"] == datos["reglas"]
    assert float(detalle["costo_inscripcion"]) == datos["costo_inscripcion"]
    assert detalle["organizador"]["email"] == "organizador@test.com"
