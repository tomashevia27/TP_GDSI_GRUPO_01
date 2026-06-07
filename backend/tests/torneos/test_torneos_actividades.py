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
        nombre="Julián",
        apellido="Test",
        email="julian@test.com",
        password="password123",
        edad=25,
        genero="Masculino",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True if hasattr(Usuario, 'email_confirmado') else True 
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    db.close()
    
    app.dependency_overrides[get_current_user] = lambda: usuario


def test_obtener_mis_torneos_vacio():
    """Si el usuario no participa en nada, debe traer las 3 categorías vacías."""
    response = client.get("/api/torneos/mis-torneos")
    assert response.status_code == 200
    
    data = response.json()
    assert data["proximos"] == []
    assert data["en_curso"] == []
    assert data["finalizados"] == []


def test_obtener_mis_torneos_como_organizador_y_jugador():
    """Prueba que categorice correctamente y asigne los roles dinámicos."""
    db = TestingSessionLocal()
    
    torneo_org = Torneo(
        nombre="Torneo del Organizador",
        fecha_inicio=datetime.now() + timedelta(days=5),
        formato=FormatoTorneo.eliminacion_directa,
        lugar="Cancha 1",
        max_equipos=4,
        costo_inscripcion=1000.0,
        estado=EstadoTorneo.abierto,
        organizador_id=1  # Nuestro usuario logueado
    )
    
    torneo_jug = Torneo(
        nombre="Torneo del Jugador",
        fecha_inicio=datetime.now() - timedelta(days=2),
        formato=FormatoTorneo.todos_contra_todos,
        lugar="Cancha 2",
        max_equipos=6,
        costo_inscripcion=1500.0,
        estado=EstadoTorneo.en_curso,
        organizador_id=99  # Organizado por otro usuario ficticio
    )
    
    equipo = Equipo(nombre="Los Rusticos FC")
    usuario_actual = db.get(Usuario, 1)
    equipo.jugadores.append(usuario_actual)
    torneo_jug.equipos_inscriptos.append(equipo)
    
    db.add(torneo_org)
    db.add(torneo_jug)
    db.add(equipo)
    db.commit()
    db.close()

    response = client.get("/api/torneos/mis-torneos")
    assert response.status_code == 200
    
    data = response.json()
    
    assert len(data["proximos"]) == 1
    assert data["proximos"][0]["nombre"] == "Torneo del Organizador"
    assert data["proximos"][0]["rol"] == "Organizador"
    
    assert len(data["en_curso"]) == 1
    assert data["en_curso"][0]["nombre"] == "Torneo del Jugador"
    assert data["en_curso"][0]["rol"] == "Jugador"
    
    assert data["finalizados"] == []


def test_obtener_mis_torneos_finalizado():
    """Prueba que un torneo finalizado entre en su lista correspondiente."""
    db = TestingSessionLocal()
    
    torneo_fin = Torneo(
        nombre="Antiguo Torneo Comercial",
        fecha_inicio=datetime.now() - timedelta(days=30),
        formato=FormatoTorneo.eliminacion_directa,
        lugar="Predio Norte",
        max_equipos=8,
        costo_inscripcion=0.0,
        estado=EstadoTorneo.finalizado,
        organizador_id=1
    )
    db.add(torneo_fin)
    db.commit()
    db.close()
    
    response = client.get("/api/torneos/mis-torneos")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data["finalizados"]) == 1
    assert data["finalizados"][0]["nombre"] == "Antiguo Torneo Comercial"
    assert data["finalizados"][0]["rol"] == "Organizador"
    assert data["proximos"] == []
    assert data["en_curso"] == []
