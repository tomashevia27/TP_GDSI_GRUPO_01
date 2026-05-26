import pytest
from datetime import datetime, timedelta, date, time
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.main import app
from backend.app.db import Base, get_db
from backend.app.models.usuario_model import Usuario, RolUsuario
from backend.app.models.cancha_model import Cancha
from backend.app.models.partido_model import Partido
from backend.app.security import get_current_user

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
    
    # Usuario organizador
    organizador = Usuario(
        nombre="Organizador",
        apellido="Test",
        email="organizador@test.com",
        password="password123",
        edad=30,
        genero="Masculino",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )
    db.add(organizador)
    
    # Usuario extra
    otro_usuario = Usuario(
        nombre="Otro",
        apellido="Test",
        email="otro@test.com",
        password="password123",
        edad=25,
        genero="Femenino",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )
    db.add(otro_usuario)
    db.commit()
    db.refresh(organizador)
    db.refresh(otro_usuario)
    
    # Crear una cancha activa y otra inactiva
    cancha_activa = Cancha(
        nombre="Cancha Activa",
        tipo_superficie="Sintético",
        tamano=5,
        iluminacion=True,
        zona="Palermo",
        direccion="Calle 123",
        precio_por_turno=10000,
        dias_operativos=127, # Todos los dias
        hora_apertura="08:00",
        hora_cierre="23:00",
        propietario_id=1,
        activa=True
    )
    db.add(cancha_activa)
    db.commit()
    db.refresh(cancha_activa)
    
    db.close()

def mock_get_current_user(user_id=1):
    db = TestingSessionLocal()
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    db.close()
    return user

# Helper functions para tests
def crear_partido_test(fecha_offset_days=1, horario_str="14:00:00", cancha_id=1):
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    fecha = (datetime.now() + timedelta(days=fecha_offset_days)).date().isoformat()
    datos = {
        "cancha_id": cancha_id,
        "fecha": fecha,
        "horario": horario_str,
        "tipo": "cerrado"
    }
    return client.post("/partidos", json=datos)

def crear_partido_abierto_test(fecha_offset_days=1, horario_str="14:00:00", cancha_id=1, cupos_disponibles=3):
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    fecha = (datetime.now() + timedelta(days=fecha_offset_days)).date().isoformat()
    datos = {
        "cancha_id": cancha_id,
        "fecha": fecha,
        "horario": horario_str,
        "tipo": "abierto",
        "cupos_disponibles": cupos_disponibles
    }
    return client.post("/partidos", json=datos)


# ==========================================
# TESTS - CANCELAR PARTIDO
# ==========================================

def test_cancelar_partido_exito():
    # 1. Crear partido
    res_crear = crear_partido_test()
    assert res_crear.status_code == 200
    partido_id = res_crear.json()["id"]
    
    # 2. Cancelar partido
    res_cancelar = client.patch(f"/partidos/{partido_id}/cancelar")
    assert res_cancelar.status_code == 200
    assert res_cancelar.json()["estado"] == "Cancelado"

def test_cancelar_partido_no_organizador():
    res_crear = crear_partido_test()
    partido_id = res_crear.json()["id"]
    
    # Cambiar a otro usuario
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res_cancelar = client.patch(f"/partidos/{partido_id}/cancelar")
    assert res_cancelar.status_code == 403

def test_cancelar_partido_libera_turno():
    res_crear = crear_partido_test(fecha_offset_days=2, horario_str="15:00:00")
    partido_id = res_crear.json()["id"]
    
    # Cancelar
    client.patch(f"/partidos/{partido_id}/cancelar")
    
    # Otro usuario intenta crear en el mismo horario y cancha
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    fecha = (datetime.now() + timedelta(days=2)).date().isoformat()
    datos = {
        "cancha_id": 1,
        "fecha": fecha,
        "horario": "15:00:00",
        "tipo": "cerrado"
    }
    res_nuevo = client.post("/partidos", json=datos)
    # Debe ser exitoso porque el anterior está cancelado
    assert res_nuevo.status_code == 200

def test_cancelar_partido_inexistente():
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    res_cancelar = client.patch(f"/partidos/999/cancelar")
    assert res_cancelar.status_code == 404


# ==========================================
# TESTS - EDITAR PARTIDO
# ==========================================

def test_editar_partido_exito():
    res_crear = crear_partido_test(fecha_offset_days=3, horario_str="10:00:00")
    partido_id = res_crear.json()["id"]
    
    fecha_nueva = (datetime.now() + timedelta(days=4)).date().isoformat()
    datos_update = {
        "cancha_id": 1,
        "fecha": fecha_nueva,
        "horario": "12:00:00",
        "tipo": "abierto",
        "cupos_disponibles": 3
    }
    res_edit = client.put(f"/partidos/{partido_id}", json=datos_update)
    assert res_edit.status_code == 200
    assert res_edit.json()["fecha"] == fecha_nueva
    assert res_edit.json()["horario"] == "12:00:00"
    assert res_edit.json()["tipo"] == "abierto"
    assert res_edit.json()["cupos_disponibles"] == 3

def test_editar_partido_mismo_horario():
    # Comprobar que no colisiona consigo mismo
    res_crear = crear_partido_test(fecha_offset_days=3, horario_str="10:00:00")
    partido_id = res_crear.json()["id"]
    datos_originales = res_crear.json()
    
    datos_update = {
        "cancha_id": datos_originales["cancha_id"],
        "fecha": datos_originales["fecha"],
        "horario": datos_originales["horario"],
    }
    res_edit = client.put(f"/partidos/{partido_id}", json=datos_update)
    assert res_edit.status_code == 200

def test_editar_partido_ocupado():
    # Partido A
    res_a = crear_partido_test(fecha_offset_days=3, horario_str="10:00:00")
    # Partido B
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    fecha_b = (datetime.now() + timedelta(days=3)).date().isoformat()
    client.post("/partidos", json={"cancha_id": 1, "fecha": fecha_b, "horario": "11:00:00", "tipo": "cerrado"})
    
    # Intentar editar Partido A al horario del Partido B
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    datos_update = {
        "cancha_id": 1,
        "fecha": fecha_b,
        "horario": "11:00:00"
    }
    res_edit = client.put(f"/partidos/{res_a.json()['id']}", json=datos_update)
    assert res_edit.status_code == 400
    assert "no está disponible" in res_edit.json()["detail"]

def test_editar_partido_fecha_pasada():
    res_crear = crear_partido_test()
    partido_id = res_crear.json()["id"]
    
    fecha_pasada = (datetime.now() - timedelta(days=1)).date().isoformat()
    datos_update = {
        "cancha_id": 1,
        "fecha": fecha_pasada,
        "horario": "10:00:00"
    }
    res_edit = client.put(f"/partidos/{partido_id}", json=datos_update)
    assert res_edit.status_code == 400
    assert "futuras" in res_edit.json()["detail"]

def test_editar_partido_ya_cancelado():
    res_crear = crear_partido_test()
    partido_id = res_crear.json()["id"]
    client.patch(f"/partidos/{partido_id}/cancelar")
    
    fecha_futura = (datetime.now() + timedelta(days=2)).date().isoformat()
    datos_update = {
        "cancha_id": 1,
        "fecha": fecha_futura,
        "horario": "10:00:00"
    }
    res_edit = client.put(f"/partidos/{partido_id}", json=datos_update)
    assert res_edit.status_code == 400
    assert "cancelado" in res_edit.json()["detail"]

def test_editar_partido_campos_faltantes():
    res_crear = crear_partido_test()
    partido_id = res_crear.json()["id"]
    
    # Falta fecha
    datos_update = {
        "cancha_id": 1,
        "horario": "10:00:00"
    }
    res_edit = client.put(f"/partidos/{partido_id}", json=datos_update)
    assert res_edit.status_code == 422

def test_editar_partido_no_organizador():
    res_crear = crear_partido_test()
    partido_id = res_crear.json()["id"]
    
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    fecha_futura = (datetime.now() + timedelta(days=2)).date().isoformat()
    datos_update = {
        "cancha_id": 1,
        "fecha": fecha_futura,
        "horario": "10:00:00"
    }
    res_edit = client.put(f"/partidos/{partido_id}", json=datos_update)
    assert res_edit.status_code == 403

# ==========================================
# NUEVOS TESTS DE CASOS BORDE
# ==========================================

def test_cancelar_partido_ya_pasado():
    # Insertar directamente en BD para saltar validación de creación
    db = TestingSessionLocal()
    partido_pasado = Partido(
        cancha_id=1,
        fecha=(datetime.now() - timedelta(days=2)).date(),
        horario=time(14, 0),
        modalidad="futbol 5",
        tipo="cerrado",
        cantidad_jugadores=10,
        estado="pendiente",
        organizador_id=1
    )
    db.add(partido_pasado)
    db.commit()
    db.refresh(partido_pasado)
    p_id = partido_pasado.id
    db.close()

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    res = client.patch(f"/partidos/{p_id}/cancelar")
    assert res.status_code == 400
    assert "ya pasó" in res.json()["detail"]

def test_cancelar_partido_doble():
    res_crear = crear_partido_test()
    p_id = res_crear.json()["id"]
    
    # Primera vez
    res1 = client.patch(f"/partidos/{p_id}/cancelar")
    assert res1.status_code == 200
    
    # Segunda vez
    res2 = client.patch(f"/partidos/{p_id}/cancelar")
    assert res2.status_code == 400
    assert "ya se encuentra cancelado" in res2.json()["detail"]

def test_editar_partido_ya_pasado():
    db = TestingSessionLocal()
    partido_pasado = Partido(
        cancha_id=1,
        fecha=(datetime.now() - timedelta(days=2)).date(),
        horario=time(14, 0),
        modalidad="futbol 5",
        tipo="cerrado",
        cantidad_jugadores=10,
        estado="pendiente",
        organizador_id=1
    )
    db.add(partido_pasado)
    db.commit()
    db.refresh(partido_pasado)
    p_id = partido_pasado.id
    db.close()

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    fecha_futura = (datetime.now() + timedelta(days=2)).date().isoformat()
    datos_update = {
        "cancha_id": 1,
        "fecha": fecha_futura,
        "horario": "15:00:00"
    }
    res = client.put(f"/partidos/{p_id}", json=datos_update)
    assert res.status_code == 400
    assert "ya pasó" in res.json()["detail"]

def test_editar_partido_horario_cancha_cerrada():
    res_crear = crear_partido_test()
    p_id = res_crear.json()["id"]
    
    fecha_futura = (datetime.now() + timedelta(days=2)).date().isoformat()
    datos_update = {
        "cancha_id": 1,
        "fecha": fecha_futura,
        "horario": "03:00:00" # Fuera de 08:00 a 23:00
    }
    res = client.put(f"/partidos/{p_id}", json=datos_update)
    assert res.status_code == 400
    assert "no está disponible en ese horario" in res.json()["detail"]


def test_mis_partidos_incluye_inscritos():
    # Usuario 1 crea un partido
    res_crear = crear_partido_test(fecha_offset_days=2, horario_str="18:00:00")
    assert res_crear.status_code == 200
    partido_id = res_crear.json()["id"]

    # Usuario 2 queda inscripto por tabla intermedia
    db = TestingSessionLocal()
    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    usuario_2 = db.query(Usuario).filter(Usuario.id == 2).first()
    partido.jugadores.append(usuario_2)
    db.commit()
    db.close()

    # Al pedir mis-partidos como usuario 2, debe aparecer en inscritos
    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res_mis_partidos = client.get("/partidos/mis-partidos")

    assert res_mis_partidos.status_code == 200
    data = res_mis_partidos.json()
    ids_inscritos = [p["id"] for p in data["inscritos"]]
    assert partido_id in ids_inscritos


# ==========================================
# TESTS - INSCRIPCION A PARTIDO
# ==========================================

def test_inscribirse_partido_exito_descuenta_cupo():
    res_crear = crear_partido_abierto_test(fecha_offset_days=2, horario_str="18:00:00", cupos_disponibles=3)
    assert res_crear.status_code == 200
    partido_id = res_crear.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res_inscripcion = client.post(f"/partidos/{partido_id}/inscribirse")

    assert res_inscripcion.status_code == 200
    assert res_inscripcion.json()["cupos_disponibles"] == 2


def test_inscribirse_partido_duplicada():
    res_crear = crear_partido_abierto_test(fecha_offset_days=2, horario_str="18:00:00", cupos_disponibles=3)
    partido_id = res_crear.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res_1 = client.post(f"/partidos/{partido_id}/inscribirse")
    assert res_1.status_code == 200

    res_2 = client.post(f"/partidos/{partido_id}/inscribirse")
    assert res_2.status_code == 400
    assert "Ya estás inscripto" in res_2.json()["detail"]


def test_inscribirse_partido_sin_cupo():
    res_crear = crear_partido_abierto_test(fecha_offset_days=2, horario_str="18:00:00", cupos_disponibles=1)
    partido_id = res_crear.json()["id"]

    db = TestingSessionLocal()
    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    partido.cupos_disponibles = 0
    db.commit()
    db.close()

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res = client.post(f"/partidos/{partido_id}/inscribirse")
    assert res.status_code == 400
    assert "no tiene cupos" in res.json()["detail"]


def test_inscribirse_partido_cerrado():
    res_crear = crear_partido_test(fecha_offset_days=2, horario_str="18:00:00")
    partido_id = res_crear.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res = client.post(f"/partidos/{partido_id}/inscribirse")
    assert res.status_code == 400
    assert "partidos abiertos" in res.json()["detail"]


def test_inscribirse_partido_pasado():
    db = TestingSessionLocal()
    partido_pasado = Partido(
        cancha_id=1,
        fecha=(datetime.now() - timedelta(days=1)).date(),
        horario=time(15, 0),
        modalidad="futbol 5",
        tipo="abierto",
        cantidad_jugadores=10,
        cupos_disponibles=3,
        estado="pendiente",
        organizador_id=1
    )
    db.add(partido_pasado)
    db.commit()
    db.refresh(partido_pasado)
    p_id = partido_pasado.id
    db.close()

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res = client.post(f"/partidos/{p_id}/inscribirse")
    assert res.status_code == 400
    assert "ya pasó" in res.json()["detail"]


def test_bajarse_partido_exito_libera_cupo():
    res_crear = crear_partido_abierto_test(fecha_offset_days=2, horario_str="18:00:00", cupos_disponibles=3)
    assert res_crear.status_code == 200
    partido_id = res_crear.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res_inscripcion = client.post(f"/partidos/{partido_id}/inscribirse")
    assert res_inscripcion.status_code == 200
    assert res_inscripcion.json()["cupos_disponibles"] == 2

    res_baja = client.delete(f"/partidos/{partido_id}/bajarse")

    assert res_baja.status_code == 200
    assert res_baja.json()["cupos_disponibles"] == 3


def test_bajarse_partido_fuera_de_plazo():
    fecha = (datetime.now() + timedelta(hours=1)).date().isoformat()
    horario = (datetime.now() + timedelta(hours=1)).time().replace(microsecond=0).isoformat()

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(1)
    res_crear = client.post(
        "/partidos",
        json={
            "cancha_id": 1,
            "fecha": fecha,
            "horario": horario,
            "tipo": "abierto",
            "cupos_disponibles": 3,
        },
    )
    assert res_crear.status_code == 200
    partido_id = res_crear.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: mock_get_current_user(2)
    res_inscripcion = client.post(f"/partidos/{partido_id}/inscribirse")
    assert res_inscripcion.status_code == 200

    res_baja = client.delete(f"/partidos/{partido_id}/bajarse")

    assert res_baja.status_code == 400
    assert "plazo" in res_baja.json()["detail"]
