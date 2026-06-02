import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.main import app
from backend.app.core.db import Base
from backend.app.core.dependencies import get_db, get_current_user
from backend.app.models.usuario_model import Usuario, RolUsuario
from backend.app.models.cancha_model import Cancha
from backend.app.core.dependencies import get_current_user as dep_get_current_user

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
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    # Usuario 1
    u1 = Usuario(
        nombre="User1",
        apellido="Test",
        email="u1@test.com",
        password="pwd",
        edad=30,
        genero="M",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True,
        partidos_a_favor=1
    )
    db.add(u1)

    # Usuario 2
    u2 = Usuario(
        nombre="User2",
        apellido="Test",
        email="u2@test.com",
        password="pwd",
        edad=25,
        genero="F",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True,
        partidos_a_favor=0
    )
    db.add(u2)

    # Cancha
    cancha = Cancha(
        nombre="Cancha",
        tipo_superficie="Sintetico",
        tamano=5,
        iluminacion=True,
        zona="Zona",
        direccion="Dir",
        precio_por_turno=10000,
        dias_operativos=127,
        hora_apertura="08:00",
        hora_cierre="23:00",
        propietario_id=1,
        activa=True
    )
    db.add(cancha)
    db.commit()
    db.refresh(u1)
    db.refresh(u2)
    db.refresh(cancha)
    db.close()


def mock_get_current_user(user_id=1):
    db = TestingSessionLocal()
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    db.close()
    return user


def test_obtener_partidos_a_favor():
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    res = client.get("/partidos/partidos-a-favor")
    assert res.status_code == 200
    data = res.json()
    assert data["cantidad"] == 1
    assert data["tiene"] is True

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res2 = client.get("/partidos/partidos-a-favor")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["cantidad"] == 0
    assert data2["tiene"] is False


def test_inscripcion_usando_partido_a_favor_consumido():
    # Crear partido abierto (lo crea el usuario 2)
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    fecha = (datetime.now() + timedelta(days=1)).date().isoformat()
    datos = {"cancha_id": 1, "fecha": fecha, "horario": "12:00:00", "tipo": "abierto", "cupos_disponibles": 3}
    res_crear = client.post("/partidos", json=datos)
    assert res_crear.status_code == 200
    partido_id = res_crear.json()["id"]

    # Usuario 1 usa partido_a_favor para inscribirse
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    res_ins = client.post(f"/partidos/{partido_id}/inscribirse?use_partido_a_favor=true")
    assert res_ins.status_code == 200

    # Verificar que se consumió el partido a favor en BD
    db = TestingSessionLocal()
    u = db.query(Usuario).filter(Usuario.id == 1).first()
    assert u.partidos_a_favor == 0
    db.close()


def test_inscripcion_usando_partido_a_favor_sin_tener_falla():
    # Crear partido abierto (lo crea el usuario 1)
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    fecha = (datetime.now() + timedelta(days=1)).date().isoformat()
    datos = {"cancha_id": 1, "fecha": fecha, "horario": "14:00:00", "tipo": "abierto", "cupos_disponibles": 3}
    res_crear = client.post("/partidos", json=datos)
    assert res_crear.status_code == 200
    partido_id = res_crear.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res_ins = client.post(f"/partidos/{partido_id}/inscribirse?use_partido_a_favor=true")
    assert res_ins.status_code == 400
    assert "No tenés partidos a favor" in res_ins.json()["detail"]
