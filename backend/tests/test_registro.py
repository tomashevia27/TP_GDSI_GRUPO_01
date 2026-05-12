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
    """Recrea la base de datos vacía antes de cada test para asegurar aislamiento."""
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_registro_exitoso_sin_foto():
    """
    US 1 - Criterio 1 y 6: El formulario solicita campos obligatorios y la foto es opcional.
    Si el registro se completa, el usuario queda registrado.

    Cómo funciona:
    - Se envía un payload POST con todos los campos obligatorios válidos, omitiendo 'foto_perfil'.
    - Verifica que la respuesta HTTP sea 200 OK.
    - Verifica que el JSON devuelto contenga un mensaje de éxito (el registro no devuelve datos
      del usuario; el siguiente paso es confirmar el email).
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "tomas@dominio.com",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA"
    }
    response = client.post("/registro", json=datos)

    assert response.status_code == 200
    assert "mensaje" in response.json()

def test_registro_exitoso_con_foto():
    """
    US 1 - Criterio 1: La foto de perfil es opcional y el registro puede completarse con ella.

    Cómo funciona:
    - Se envía un payload POST igual al anterior pero añadiendo el campo 'foto_perfil' (ej. URL de Cloudinary).
    - Verifica que la respuesta HTTP sea 200 OK y que el backend haya aceptado el payload.
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "tomas_foto@dominio.com",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA",
        "foto_perfil": "https://res.cloudinary.com/demo/image.jpg"
    }
    response = client.post("/registro", json=datos)

    assert response.status_code == 200
    assert "mensaje" in response.json()

def test_registro_falla_campo_faltante():
    """
    US 1 - Criterio 2: Si falta un campo obligatorio, el sistema indica el error y no avanza.
    
    Cómo funciona:
    - Se envía un payload POST omitiendo intencionalmente el campo obligatorio 'zona'.
    - Verifica que la respuesta HTTP sea 422 Unprocessable Entity (error de validación de Pydantic).
    - Inspecciona el detalle del error para asegurar que señala específicamente a 'zona'.
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "tomas@dominio.com",
        "password": "password123",
        "edad": 25,
        "genero": "Masculino"
    }
    response = client.post("/registro", json=datos)
    
    assert response.status_code == 422 
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "zona"] for err in errores)

def test_registro_falla_email_invalido():
    """
    US 1 - Criterio 3: El email debe tener formato válido.
    
    Cómo funciona:
    - Se envía un payload POST con un email sin estructura válida ("un-email-sin-arroba").
    - Verifica que Pydantic rechace la petición con 422.
    - Asegura que el error devuelto especifique que el problema está en el campo 'email'.
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
    assert any(err["loc"] == ["body", "email"] for err in errores)

def test_registro_falla_password_corta():
    """
    US 1 - Criterio 4: La contraseña debe tener al menos 8 caracteres.
    
    Cómo funciona:
    - Se envía un payload POST con una contraseña de 3 caracteres ("123").
    - Verifica que se devuelva un error 422.
    - Asegura que el detalle de error apunte al campo 'password' por no cumplir la longitud mínima.
    """
    datos = {
        "nombre": "Tomas",
        "apellido": "Hevia",
        "email": "tomas@dominio.com",
        "password": "123",
        "edad": 25,
        "genero": "Masculino",
        "zona": "CABA"
    }
    response = client.post("/registro", json=datos)
    
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "password"] for err in errores)

def test_registro_falla_email_repetido():
    """
    US 1 - Criterio 5: Un usuario con cuenta existente no puede registrarse nuevamente con el mismo email.
    
    Cómo funciona:
    - Se realiza un primer registro exitoso de un usuario.
    - Se intenta un segundo registro usando el mismo payload exacto.
    - Verifica que el servidor devuelva un HTTP 400 Bad Request.
    - Comprueba que el mensaje de error sea textualmente 'El email ya está registrado'.
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
    client.post("/registro", json=datos)
    
    response2 = client.post("/registro", json=datos)
    
    assert response2.status_code == 400
    assert response2.json()["detail"] == "El email ya está registrado"

def test_registro_luego_login_exitoso():
    """
    US 1 - Criterio 6: Si el registro se completa, el usuario puede iniciar sesión con sus credenciales.

    Cómo funciona:
    - Crea un usuario nuevo vía POST /registro.
    - Simula la confirmación de email: recupera el código generado directamente desde la base
      de datos de test (ya que el email real no llega en entorno de pruebas) y llama a
      POST /confirmar-email. Esto refleja el flujo real que el usuario completaría.
    - Realiza POST /login y verifica que el acceso sea exitoso (HTTP 200) con usuario_id.
    """
    from backend.models import Usuario as UsuarioModel

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

    # Recuperamos el código de confirmación desde la DB de test para simular el flujo de email
    db = TestingSessionLocal()
    usuario = db.query(UsuarioModel).filter_by(email="tomas_nuevo@dominio.com").first()
    codigo = usuario.confirmation_code
    db.close()

    response_confirmacion = client.post("/confirmar-email", json={"email": "tomas_nuevo@dominio.com", "code": codigo})
    assert response_confirmacion.status_code == 200

    datos_login = {
        "email": "tomas_nuevo@dominio.com",
        "password": "miclavesegura123"
    }
    response_login = client.post("/login", json=datos_login)

    assert response_login.status_code == 200
    assert response_login.json()["mensaje"] == "Login exitoso"
    assert "usuario_id" in response_login.json()
