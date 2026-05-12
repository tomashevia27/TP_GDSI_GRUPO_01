import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.db import Base, get_db
from backend.models import Usuario

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
def preparar_db():
    """
    Prepara la base de datos en memoria para cada test de login.
    Inserta dos usuarios mock: uno activo y uno inactivo.
    """
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    
    user_activo = Usuario(
        nombre="Usuario",
        apellido="Activo",
        email="activo@dominio.com",
        password="password123",
        edad=25,
        genero="Masculino",
        zona="CABA",
        email_confirmado=True,
    )
    
    user_inactivo = Usuario(
        nombre="Usuario",
        apellido="Inactivo",
        email="inactivo@dominio.com",
        password="password123",
        edad=25,
        genero="Masculino",
        zona="CABA",
        email_confirmado=False,
    )
    
    db.add(user_activo)
    db.add(user_inactivo)
    db.commit()
    db.close()

def test_login_exitoso():
    """
    US 2 - Criterio 2: Si las credenciales son correctas, el usuario accede a su panel.
    
    Cómo funciona:
    - Envía credenciales correctas ('activo@dominio.com', 'password123') de un usuario insertado en el mock.
    - Verifica que la respuesta sea HTTP 200 OK y contenga un mensaje de éxito.
    """
    response = client.post("/login", json={"email": "activo@dominio.com", "password": "password123"})
    assert response.status_code == 200
    assert response.json()["mensaje"] == "Login exitoso"

def test_login_faltan_datos():
    """
    US 2 - Criterio 1: Se deben ingresar email y contraseña.
    
    Cómo funciona:
    - Envía un payload POST incompleto (solo email, sin password).
    - Verifica que el sistema (Pydantic) responda con HTTP 422 Unprocessable Entity.
    - Comprueba que el error indique específicamente la falta del campo 'password'.
    """
    response = client.post("/login", json={"email": "activo@dominio.com"})
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "password"] for err in errores)

def test_login_credenciales_incorrectas():
    """
    US 2 - Criterio 3: Contraseña incorrecta devuelve mensaje genérico.
    
    Cómo funciona:
    - Envía un email válido con una contraseña errónea ('clave_equivocada').
    - Verifica que la respuesta sea HTTP 401 Unauthorized.
    - Comprueba que el mensaje sea exactamente "Email o contraseña incorrectos" para no filtrar datos sensibles.
    """
    response = client.post("/login", json={"email": "activo@dominio.com", "password": "clave_equivocada"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Email o contraseña incorrectos"

def test_login_usuario_no_registrado():
    """
    US 2 - Criterio 4: Si el usuario no existe, devuelve el mismo mensaje genérico.
    
    Cómo funciona:
    - Envía un email que no está en la base de datos ('fantasma@dominio.com').
    - Verifica que devuelva HTTP 401 Unauthorized.
    - Asegura que el mensaje devuelto sea idéntico al de contraseña incorrecta ("Email o contraseña incorrectos").
    """
    response = client.post("/login", json={"email": "fantasma@dominio.com", "password": "password123"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Email o contraseña incorrectos"

def test_login_cuenta_no_activa():
    """
    US 2 - Criterio 5: Si el usuario no completó validación, informar que no está activo.
    
    Cómo funciona:
    - Envía credenciales correctas de un usuario cuya bandera 'activo' está en False.
    - Verifica que la respuesta sea HTTP 403 Forbidden.
    - Comprueba que el mensaje de error indique que la cuenta no está activa aún.
    """
    response = client.post("/login", json={"email": "inactivo@dominio.com", "password": "password123"})
    assert response.status_code == 403
    assert response.json()["detail"] == "La cuenta no está activa aún"
