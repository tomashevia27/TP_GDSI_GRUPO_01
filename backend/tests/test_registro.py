import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.db import Base, get_db

# Usamos SQLite en memoria para no ensuciar PostgreSQL durante los tests
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
    """Recrea la base de datos vacía antes de cada test."""
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_registro_exitoso_sin_foto():
    """
    Criterio: El formulario solicita campos obligatorios. 
    La foto de perfil es opcional y el registro puede completarse sin ella.
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "tomas@dominio.com",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA"
        # Notar que NO mandamos foto_perfil
    }
    response = client.post("/registro", json=datos)
    
    # Verificamos que el código HTTP sea 200 (OK)
    assert response.status_code == 200
    # Verificamos que devuelva el email y se le haya asignado un ID
    assert response.json()["email"] == "tomas@dominio.com"
    assert "id" in response.json()

def test_registro_falla_campo_faltante():
    """
    Criterio: Si algún campo obligatorio no está completo, el sistema 
    debe indicar cuál falta y no permitir avanzar.
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "tomas@dominio.com",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino"
        # Omitimos intencionalmente el campo 'zona'
    }
    response = client.post("/registro", json=datos)
    
    # 422 es el error estándar de FastAPI (Pydantic) cuando faltan datos o son inválidos
    assert response.status_code == 422 
    errores = response.json()["detail"]
    
    # Buscamos si dentro de los errores, FastAPI nos está marcando que falta "zona"
    assert any(err["loc"] == ["body", "zona"] for err in errores)

def test_registro_falla_email_invalido():
    """
    Criterio: El email debe tener un formato válido. Si es incorrecto, muestra error.
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "un-email-sin-arroba",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA"
    }
    response = client.post("/registro", json=datos)
    
    assert response.status_code == 422
    errores = response.json()["detail"]
    # Verificamos que el error sea justamente en el campo "email"
    assert any(err["loc"] == ["body", "email"] for err in errores)

def test_registro_falla_password_corta():
    """
    Criterio: La contraseña debe tener al menos 8 caracteres.
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "tomas@dominio.com",
        "password": "123", # Contraseña de solo 3 letras
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA"
    }
    response = client.post("/registro", json=datos)
    
    assert response.status_code == 422
    errores = response.json()["detail"]
    # Verificamos que el error marcado sea en la password
    assert any(err["loc"] == ["body", "password"] for err in errores)

def test_registro_falla_email_repetido():
    """
    Criterio: Un usuario que ya tiene cuenta con ese email no puede volver a registrarse.
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "repetido@dominio.com",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA"
    }
    # 1. Hacemos el registro la primera vez (debería funcionar)
    client.post("/registro", json=datos)
    
    # 2. Intentamos registrar exactamente el mismo usuario de vuelta
    response2 = client.post("/registro", json=datos)
    
    # Verificamos el status 400 que configuramos a mano en main.py
    assert response2.status_code == 400
    assert response2.json()["detail"] == "El email ya está registrado"

def test_registro_luego_login_exitoso():
    """
    Criterio: Si el registro se completa correctamente, el usuario queda registrado 
    y puede iniciar sesión con sus credenciales.
    """
    # 1. Registramos al usuario
    datos_registro = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "tomas_nuevo@dominio.com",
        "password": "miclavesegura123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA"
    }
    client.post("/registro", json=datos_registro)

    # 2. Intentamos loguear con ese usuario
    datos_login = {
        "email": "tomas_nuevo@dominio.com",
        "password": "miclavesegura123"
    }
    response_login = client.post("/login", json=datos_login)
    
    # Verificamos que el login nos devuelva un OK
    assert response_login.status_code == 200
    assert response_login.json()["mensaje"] == "Login exitoso"
    assert "usuario_id" in response_login.json()
