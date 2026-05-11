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
        activo=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

def test_edicion_exitosa():
    """Criterio: Al guardar los cambios correctamente, el perfil se actualiza inmediatamente."""
    datos = {
        "nombre": "NombreEditado",
        "apellido": "ApellidoEditado",
        "edad": 30,
        "genero": "Otro",
        "zona": "Sur",
        "password": "newpassword123"
    }
    
    # Suponiendo que el user_id asignado fue 1
    response = client.put("/usuarios/1", json=datos)
    
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["nombre"] == "NombreEditado"
    assert res_json["apellido"] == "ApellidoEditado"
    assert res_json["edad"] == 30
    assert res_json["genero"] == "Otro"
    assert res_json["zona"] == "Sur"
    assert res_json["email"] == "test_edit@dominio.com"

def test_edicion_falla_por_campo_vacio():
    """Criterio: Si se deja en blanco un campo obligatorio (nombre o apellido), 
    el sistema debe indicar el error y no guardar los cambios."""
    datos = {
        "nombre": "", # Vacio intencionalmente
        "apellido": "ApellidoEditado",
        "edad": 30,
        "genero": "Otro",
        "zona": "Sur",
        "password": "newpassword123"
    }
    
    response = client.put("/usuarios/1", json=datos)
    
    # Pydantic atrapa el string length < 1 (min_length=1)
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "nombre"] for err in errores)
    
    # Comprobamos que no se modificó nada
    get_response = client.get("/usuarios/1")
    assert get_response.json()["nombre"] == "NombreOriginal"
