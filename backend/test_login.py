import pytest
from fastapi.testclient import TestClient
from backend.main import app, usuarios_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def preparar_db():
    usuarios_db.clear()
    
    # Mock de un usuario validado y activo
    usuarios_db["activo@dominio.com"] = {
        "id": 1,
        "nombre": "Usuario",
        "apellido": "Activo",
        "email": "activo@dominio.com",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA",
        "activo": True
    }
    
    # Mock de un usuario que todavía no validó su cuenta
    usuarios_db["inactivo@dominio.com"] = {
        "id": 2,
        "nombre": "Usuario",
        "apellido": "Inactivo",
        "email": "inactivo@dominio.com",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA",
        "activo": False
    }

def test_login_exitoso():
    """Criterio: Si las credenciales son correctas, el usuario accede a su panel principal."""
    response = client.post("/login", json={"email": "activo@dominio.com", "password": "password123"})
    assert response.status_code == 200
    assert response.json()["mensaje"] == "Login exitoso"

def test_login_faltan_datos():
    """Criterio: Para iniciar sesión se deben ingresar email y contraseña."""
    # Enviamos solo email, sin la password (falla Pydantic en FastAPI)
    response = client.post("/login", json={"email": "activo@dominio.com"})
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "password"] for err in errores)

def test_login_credenciales_incorrectas():
    """Criterio: Si la contraseña es incorrecta, muestra un mensaje de error genérico."""
    response = client.post("/login", json={"email": "activo@dominio.com", "password": "clave_equivocada"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Email o contraseña incorrectos"

def test_login_usuario_no_registrado():
    """Criterio: Si el usuario no existe, muestra el mismo mensaje de error genérico."""
    response = client.post("/login", json={"email": "fantasma@dominio.com", "password": "password123"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Email o contraseña incorrectos"

def test_login_cuenta_no_activa():
    """Criterio: Si el usuario no completó la validación, informar que la cuenta no está activa aún."""
    response = client.post("/login", json={"email": "inactivo@dominio.com", "password": "password123"})
    assert response.status_code == 403
    assert response.json()["detail"] == "La cuenta no está activa aún"
