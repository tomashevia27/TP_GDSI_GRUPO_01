import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.db import Base, get_db
from backend.models import Usuario, RolUsuario

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

    # Crear usuario por defecto para usar como propietario
    db = TestingSessionLocal()
    usuario = Usuario(
        nombre="Propietario",
        apellido="Test",
        email="propietario@test.com",
        password="password123",
        edad=30,
        genero="Masculino",
        zona="CABA",
        rol=RolUsuario.admin,
        email_confirmado=True
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    db.close()


def test_crear_cancha_exitosa():
    """US 4: Se crea la cancha si todos los datos son válidos y pasa a estar activa."""
    datos = {
        "nombre": "Cancha El 10",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 15000.0,
        #"dias_operativos": "Lunes a Viernes",
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["mensaje"] == "Cancha creada exitosamente"
    assert res_json["cancha"]["activa"] is True
    assert res_json["cancha"]["nombre"] == "Cancha El 10"


def test_crear_cancha_precio_invalido():
    """US 4: El precio debe ser mayor a cero."""
    datos = {
        "nombre": "Cancha El 10",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 0,
        #"dias_operativos": "Lunes a Viernes",
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    # Pydantic va a fallar con 422 Unprocessable Entity
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "precio_por_turno"] for err in errores)


def test_crear_cancha_horario_invalido():
    """US 4: El horario de cierre debe ser posterior al de apertura."""
    datos = {
        "nombre": "Cancha El 10",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 10000,
        #"dias_operativos": "Lunes a Viernes",
        "dias_operativos": 31,
        "hora_apertura": "23:00",
        "hora_cierre": "08:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    # Falla la lógica del servicio con 400
    assert response.status_code == 400
    assert response.json()["detail"] == "La hora de cierre debe ser posterior a la de apertura"


def test_crear_cancha_faltan_campos():
    """US 4: Si falta un campo obligatorio, devuelve error."""
    datos = {
        "nombre": "Cancha El 10",
        # Falta tipo_superficie
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 10000,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "tipo_superficie"] for err in errores)


def test_crear_cancha_duplicada():
    """US 4: No pueden existir dos canchas con el mismo nombre y dirección del mismo propietario."""
    datos = {
        "nombre": "Cancha Duplicada",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Calle Falsa 123",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    # Primera vez funciona
    res1 = client.post("/canchas", json=datos)
    assert res1.status_code == 200

    # Segunda vez falla
    res2 = client.post("/canchas", json=datos)
    assert res2.status_code == 400
    assert "Ya existe una cancha con este nombre y dirección" in res2.json()["detail"]


def test_crear_cancha_jugador_no_puede():
    """US 4: Un usuario con rol 'jugador' no puede crear canchas."""
    # Crear un usuario jugador
    db = TestingSessionLocal()
    jugador = Usuario(
        nombre="Jugador",
        apellido="Test",
        email="jugador@test.com",
        password="password123",
        edad=25,
        genero="Masculino",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )
    db.add(jugador)
    db.commit()
    db.refresh(jugador)
    jugador_id = jugador.id
    db.close()

    datos = {
        "nombre": "Cancha El 10",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": jugador_id
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 403
    assert response.json()["detail"] == "Solo los dueños de cancha pueden crear canchas"

