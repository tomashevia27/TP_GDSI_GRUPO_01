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
    Prepara la base de datos para pruebas de edición de perfil.
    Crea un usuario mock (ID=1) con datos por defecto.
    """
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    
    user = Usuario(
        nombre="NombreOriginal",
        apellido="ApellidoOriginal",
        email="test_edit@dominio.com",
        password="password123",
        edad=20,
        genero="Femenino",
        zona="Norte",
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

def test_edicion_exitosa():
    """
    US 3 - Criterio 1 y 4: Se pueden editar múltiples campos, incluyendo foto y contraseña. 
    Los cambios se guardan y devuelven inmediatamente.
    
    Cómo funciona:
    - Realiza una petición PUT a /usuarios/1 con todos los campos editables cambiados.
    - Verifica respuesta HTTP 200 OK.
    - Extrae el JSON devuelto y comprueba que TODOS los campos (nombre, apellido, edad, genero, zona, foto_perfil) coincidan con el nuevo payload.
    - Verifica que el email permanezca inmutable en la respuesta.
    """
    datos = {
        "nombre": "NombreEditado",
        "apellido": "ApellidoEditado",
        "edad": 30,
        "genero": "Otro",
        "zona": "Sur",
        "password": "newpassword123",
        "foto_perfil": "https://url.com/nueva_foto.jpg"
    }
    
    response = client.put("/usuarios/1", json=datos)
    
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["nombre"] == "NombreEditado"
    assert res_json["apellido"] == "ApellidoEditado"
    assert res_json["edad"] == 30
    assert res_json["genero"] == "Otro"
    assert res_json["zona"] == "Sur"
    assert res_json["foto_perfil"] == "https://url.com/nueva_foto.jpg"
    assert res_json["email"] == "test_edit@dominio.com"

def test_edicion_exitosa_sin_password():
    """
    US 3 - Criterio 1 (Variación): La contraseña es opcional al editar perfil.
    
    Cómo funciona:
    - Realiza una petición PUT enviando datos nuevos, pero NO envía la clave 'password' (o la envía nula).
    - Verifica HTTP 200 OK y que los datos se actualizaron correctamente, demostrando que la contraseña no es obligatoria.
    """
    datos = {
        "nombre": "NombreSinPassword",
        "apellido": "ApellidoSinPassword",
        "edad": 31,
        "genero": "Masculino",
        "zona": "Oeste"
        # Sin campo password
    }
    
    response = client.put("/usuarios/1", json=datos)
    
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["nombre"] == "NombreSinPassword"

def test_edicion_ignora_email():
    """
    US 3 - Criterio 2: El email no puede ser modificado ya que es el identificador único.
    
    Cómo funciona:
    - Envía una petición PUT intentando modificar el email mediante el payload.
    - Pydantic/FastAPI descarta los campos que no están en el Schema UsuarioEdicion.
    - El test verifica mediante una petición GET posterior que el email original del usuario NO cambió.
    """
    datos = {
        "nombre": "NombreEditado",
        "apellido": "ApellidoEditado",
        "edad": 30,
        "genero": "Otro",
        "zona": "Sur",
        "email": "INTENTO_HACKEO@dominio.com" # Tratando de inyectar email
    }
    
    # La API debería responder OK porque simplemente ignora el campo extra (comportamiento por defecto de pydantic config)
    response = client.put("/usuarios/1", json=datos)
    assert response.status_code == 200
    
    # Validamos que en la BD el email sigue siendo el original
    get_response = client.get("/usuarios/1")
    assert get_response.json()["email"] == "test_edit@dominio.com"
    assert get_response.json()["email"] != "INTENTO_HACKEO@dominio.com"

def test_edicion_falla_por_campo_vacio():
    """
    US 3 - Criterio 3: Si se deja en blanco un campo obligatorio, se indica error y no se guarda.
    
    Cómo funciona:
    - Envía una petición PUT con el campo "nombre" como un string vacío ("").
    - Verifica HTTP 422 Unprocessable Entity (restricción min_length de Pydantic).
    - Confirma que el detalle de error señala el campo 'nombre'.
    - Realiza un GET posterior para asegurar que NINGÚN campo se modificó y prevalece la data original.
    """
    datos = {
        "nombre": "", # Vacio intencionalmente, campo obligatorio
        "apellido": "ApellidoEditado",
        "edad": 30,
        "genero": "Otro",
        "zona": "Sur"
    }
    
    response = client.put("/usuarios/1", json=datos)
    
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "nombre"] for err in errores)
    
    # Comprobamos que no se guardó parcialmente
    get_response = client.get("/usuarios/1")
    assert get_response.json()["nombre"] == "NombreOriginal"
    assert get_response.json()["apellido"] == "ApellidoOriginal"
