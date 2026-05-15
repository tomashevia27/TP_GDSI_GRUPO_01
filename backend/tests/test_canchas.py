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
    """Limpia la base de datos antes de cada test."""
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Crear usuario admin por defecto para usar como propietario
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
# ==========================================
# TESTS - CREAR CANCHA (US 4)
# ==========================================
def test_crear_cancha_exitosa():
    """
    CA-1: Se crea la cancha con todos los campos obligatorios.
    CA-5: La cancha queda activa y visible para jugadores.
    """
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
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["mensaje"] == "Cancha creada exitosamente"
    assert res_json["cancha"]["activa"] is True
    assert res_json["cancha"]["nombre"] == "Cancha El 10"
def test_crear_cancha_con_foto_opcional():
    """
    CA-1: Las fotos son opcionales.
    """
    datos = {
        "nombre": "Cancha Con Foto",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "fotos": "https://cloudinary.com/imagen.jpg",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 200
    assert response.json()["cancha"]["fotos"] == "https://cloudinary.com/imagen.jpg"
def test_crear_cancha_faltan_campos():
    """
    CA-2: Si falta un campo obligatorio, indica error y no crea la cancha.
    """
    datos = {
        "nombre": "Cancha Incompleta",
        # Falta tipo_superficie
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "tipo_superficie"] for err in errores)
def test_crear_cancha_precio_cero():
    """
    CA-3: El precio debe ser mayor a cero.
    """
    datos = {
        "nombre": "Cancha Barata",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 0,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 422
    errores = response.json()["detail"]
    assert any(err["loc"] == ["body", "precio_por_turno"] for err in errores)
def test_crear_cancha_precio_negativo():
    """
    CA-3: El precio debe ser mayor a cero (negativo也不行).
    """
    datos = {
        "nombre": "Cancha Negativa",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": -100,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 422
def test_crear_cancha_horario_cierre_antes_apertura():
    """
    CA-3: El horario de cierre debe ser posterior al de apertura.
    """
    datos = {
        "nombre": "Cancha Horario Invalido",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "23:00",
        "hora_cierre": "08:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 400
    assert response.json()["detail"] == "La hora de cierre debe ser posterior a la de apertura"
def test_crear_cancha_horario_igual():
    """
    CA-3: El horario de cierre no puede ser igual al de apertura.
    """
    datos = {
        "nombre": "Cancha Mismo Horario",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "10:00",
        "hora_cierre": "10:00",
        "propietario_id": 1
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 400
def test_crear_cancha_duplicada():
    """
    CA-4: No pueden existir dos canchas con el mismo nombre y dirección del mismo propietario.
    """
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
def test_crear_cancha_mismo_nombre_diferente_direccion():
    """
    CA-4: Diferentes direcciones = diferentes canchas (no es duplicado).
    """
    datos1 = {
        "nombre": "Cancha Central",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Centro",
        "direccion": "Calle 1",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    datos2 = {
        "nombre": "Cancha Central",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Centro",
        "direccion": "Calle 2",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    res1 = client.post("/canchas", json=datos1)
    assert res1.status_code == 200
    res2 = client.post("/canchas", json=datos2)
    assert res2.status_code == 200
def test_crear_cancha_jugador_no_puede():
    """
    CA-1: Solo los admins (dueños de canchas) pueden crear canchas.
    """
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
    db_id = jugador.id
    db.close()
    datos = {
        "nombre": "Cancha Jugador",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Av. Libertador 1234",
        "precio_por_turno": 15000.0,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": db_id
    }
    response = client.post("/canchas", json=datos)
    assert response.status_code == 403
    assert response.json()["detail"] == "Solo los dueños de cancha pueden crear canchas"
# ==========================================
# TESTS - LISTAR CANCHAS (CA-5: Visibles para jugadores)
# ==========================================
def test_obtener_todas_las_canchas():
    """
    CA-5: GET /canchas devuelve todas las canchas (admin).
    """
    # Crear una cancha
    datos = {
        "nombre": "Cancha Test",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Dir 1",
        "precio_por_turno": 10000,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    client.post("/canchas", json=datos)
    response = client.get("/canchas")
    assert response.status_code == 200
    canchas = response.json()
    assert len(canchas) == 1
def test_obtener_canchas_disponibles_solo_activas():
    """
    CA-5: GET /canchas/disponibles devuelve solo las canchas activas.
    """
    # Crear una cancha activa
    datos = {
        "nombre": "Cancha Activa",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Dir 1",
        "precio_por_turno": 10000,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    client.post("/canchas", json=datos)
    response = client.get("/canchas/disponibles")
    assert response.status_code == 200
    canchas = response.json()
    assert len(canchas) == 1
    assert canchas[0]["activa"] is True
    assert canchas[0]["nombre"] == "Cancha Activa"
def test_obtener_canchas_disponibles_vacio():
    """
    CA-5: GET /canchas/disponibles devuelve array vacío si no hay canchas.
    """
    response = client.get("/canchas/disponibles")
    assert response.status_code == 200
    canchas = response.json()
    assert canchas == []
def test_dias_operativos_texto_lunes_viernes():
    """
    CA-5: dias_operativos_texto formateado correctamente (31 = Lun-Vie).
    """
    datos = {
        "nombre": "Cancha Lunes Vie",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Dir 1",
        "precio_por_turno": 10000,
        "dias_operativos": 31,  # 0001111 = Lun-Vie
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    client.post("/canchas", json=datos)
    response = client.get("/canchas/disponibles")
    assert response.status_code == 200
    assert response.json()[0]["dias_operativos_texto"] == "Lunes a Viernes"
def test_dias_operativos_texto_fines_semana():
    """
    CA-5: dias_operativos_texto formateado (96 = Sáb-Dom).
    """
    datos = {
        "nombre": "Cancha Fin de Semana",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Dir 1",
        "precio_por_turno": 10000,
        "dias_operativos": 96,  # 1100000 = Sáb-Dom
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    client.post("/canchas", json=datos)
    response = client.get("/canchas/disponibles")
    assert response.status_code == 200
    assert response.json()[0]["dias_operativos_texto"] == "Fines de semana"
def test_dias_operativos_texto_todos_los_dias():
    """
    CA-5: dias_operativos_texto formateado (127 = todos).
    """
    datos = {
        "nombre": "Cancha Siempre Abierta",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Dir 1",
        "precio_por_turno": 10000,
        "dias_operativos": 127,  # 1111111 = todos
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    client.post("/canchas", json=datos)
    response = client.get("/canchas/disponibles")
    assert response.status_code == 200
    assert response.json()[0]["dias_operativos_texto"] == "Todos los días"
# ==========================================
# TESTS - DETALLE DE CANCHA (CA-5)
# ==========================================
def test_obtener_cancha_por_id_existe():
    """
    CA-5: GET /canchas/{id} devuelve la cancha cuando existe.
    """
    datos = {
        "nombre": "Cancha Detalle",
        "tipo_superficie": "Cemento",
        "tamano": 7,
        "iluminacion": False,
        "zona": "Nuñez",
        "direccion": "Dir 2",
        "precio_por_turno": 12000,
        "dias_operativos": 96,
        "hora_apertura": "09:00",
        "hora_cierre": "22:00",
        "propietario_id": 1
    }
    client.post("/canchas", json=datos)
    response = client.get("/canchas/1")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["nombre"] == "Cancha Detalle"
    assert res_json["tipo_superficie"] == "Cemento"
    assert res_json["tamano"] == 7
    assert res_json["iluminacion"] is False
    assert res_json["zona"] == "Nuñez"
    assert res_json["precio_por_turno"] == 12000
def test_obtener_cancha_por_id_no_existe():
    """
    CA-5: GET /canchas/{id} devuelve 404 cuando no existe.
    """
    response = client.get("/canchas/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Cancha no encontrada"
def test_obtener_cancha_por_id_incluye_dias_texto():
    """
    CA-5: El detalle incluye dias_operativos_texto.
    """
    datos = {
        "nombre": "Cancha Con Dias",
        "tipo_superficie": "Sintético",
        "tamano": 5,
        "iluminacion": True,
        "zona": "Palermo",
        "direccion": "Dir 1",
        "precio_por_turno": 10000,
        "dias_operativos": 31,
        "hora_apertura": "08:00",
        "hora_cierre": "23:00",
        "propietario_id": 1
    }
    client.post("/canchas", json=datos)
    response = client.get("/canchas/1")
    assert response.status_code == 200
    res_json = response.json()
    assert "dias_operativos_texto" in res_json
    assert res_json["dias_operativos_texto"] == "Lunes a Viernes"