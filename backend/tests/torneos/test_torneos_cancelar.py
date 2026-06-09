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
from backend.app.models.torneo_model import Torneo, EstadoTorneo, FormatoTorneo
from backend.app.models.cancha_model import Cancha
from backend.app.models.equipo_model import Equipo
from backend.app.models.notificacion_model import Notificacion

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
    """Inicializa la base de datos de prueba antes de cada test."""
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    usuario = Usuario(
        nombre="Organizador",
        apellido="Del Torneo",
        email="organizador@test.com",
        password="password123",
        edad=35,
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


def test_cancelar_torneo_exitoso_y_notifica():
    """Verifica la baja exitosa, cambio de estado y generación de alertas masivas."""
    db = TestingSessionLocal()
    
    torneo = Torneo(
        nombre="Copa de Campeones",
        fecha_inicio=datetime.now() + timedelta(days=7),
        formato=FormatoTorneo.eliminacion_directa,
        cancha_id=1,
        fecha_fin=datetime.now() + timedelta(days=20),
        max_equipos=4,
        costo_inscripcion=1500.0,
        estado=EstadoTorneo.abierto,
        organizador_id=1
    )
    
    jugador_rival = Usuario(
        nombre="Carlos", apellido="Tevez", email="carlitos@test.com",
        password="123", edad=28, genero="M", zona="Boca", rol=RolUsuario.jugador,
        email_confirmado=True
    )
    equipo = Equipo(nombre="Fuerte Apache FC")
    equipo.jugadores.append(jugador_rival)
    torneo.equipos_inscriptos.append(equipo)
    
    db.add(torneo)
    db.add(jugador_rival)
    db.add(equipo)
    db.commit()
    
    torneo_id = torneo.id
    db.close()

    response = client.post(f"/api/torneos/{torneo_id}/cancelar")
    
    assert response.status_code == 200
    assert response.json()["estado"] == "cancelado"
    
    db = TestingSessionLocal()
    notificaciones = db.query(Notificacion).filter(Notificacion.usuario_id == 2).all()
    assert len(notificaciones) == 1
    assert "Copa de Campeones" in notificaciones[0].mensaje
    assert notificaciones[0].tipo == "torneo_cancelado"
    db.close()


def test_cancelar_torneo_sin_permisos():
    """Un usuario común intenta cancelar de forma fraudulenta un torneo ajeno (Debe dar 403)."""
    db = TestingSessionLocal()
    
    torneo = Torneo(
        nombre="Liga Privada Pro",
        fecha_inicio=datetime.now() + timedelta(days=3),
        formato=FormatoTorneo.eliminacion_directa,
        cancha_id=1,
        fecha_fin=datetime.now() + timedelta(days=20),
        max_equipos=8,
        costo_inscripcion=2000.0,
        estado=EstadoTorneo.abierto,
        organizador_id=99  
    )
    db.add(torneo)
    db.commit()
    torneo_id = torneo.id
    db.close()

    response = client.post(f"/api/torneos/{torneo_id}/cancelar")
    
    assert response.status_code == 403
    assert "permisos" in response.json()["detail"].lower()


def test_cancelar_torneo_ya_finalizado():
    """Intento fallido de cancelar un torneo cuyo estado es Finalizado (Debe dar 400)."""
    db = TestingSessionLocal()
    
    torneo = Torneo(
        nombre="Torneo Relámpago Pasado",
        fecha_inicio=datetime.now() - timedelta(days=15),
        formato=FormatoTorneo.eliminacion_directa,
        cancha_id=1,
        fecha_fin=datetime.now() + timedelta(days=20),
        max_equipos=4,
        costo_inscripcion=0.0,
        estado=EstadoTorneo.finalizado,  
        organizador_id=1
    )
    db.add(torneo)
    db.commit()
    torneo_id = torneo.id
    db.close()

    response = client.post(f"/api/torneos/{torneo_id}/cancelar")
    
    assert response.status_code == 400
    assert "finalizado" in response.json()["detail"].lower()


def test_cancelar_torneo_en_curso():
    """No se puede cancelar un torneo que ya está en curso (Debe dar 400)."""
    db = TestingSessionLocal()

    torneo = Torneo(
        nombre="Torneo En Marcha",
        fecha_inicio=datetime.now() - timedelta(days=2),
        formato=FormatoTorneo.eliminacion_directa,
        cancha_id=1,
        fecha_fin=datetime.now() + timedelta(days=20),
        max_equipos=8,
        costo_inscripcion=500.0,
        estado=EstadoTorneo.en_curso,
        organizador_id=1
    )
    db.add(torneo)
    db.commit()
    torneo_id = torneo.id
    db.close()

    response = client.post(f"/api/torneos/{torneo_id}/cancelar")

    assert response.status_code == 400
    assert "en curso" in response.json()["detail"].lower()