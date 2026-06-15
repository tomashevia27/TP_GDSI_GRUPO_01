import pytest
from fastapi.testclient import TestClient
from collections import Counter
from datetime import datetime, timedelta

from backend.app.main import app
from backend.app.core.db import Base
from backend.app.core.dependencies import get_db, get_current_user
from backend.app.models.usuario_model import Usuario, RolUsuario
from backend.app.models.cancha_model import Cancha
from backend.app.models.equipo_model import Equipo
from backend.app.models.torneo_model import EstadoTorneo
from backend.app.models.partido_torneo import PartidoTorneo
from backend.app.models.tabla_posicion import TablaPosiciones

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

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

    usuario = Usuario(
        id=1,
        nombre="Organizador",
        apellido="Test",
        email="organizador@test.com",
        password="123",
        edad=30,
        genero="M",
        zona="CABA",
        rol=RolUsuario.jugador,
        email_confirmado=True
    )

    cancha = Cancha(
        id=1,
        nombre="Cancha Test",
        tipo_superficie="Sintético",
        tamano=5,
        zona="CABA",
        direccion="Fake 123",
        precio_por_turno=1000.0,
        hora_apertura="10:00",
        hora_cierre="22:00",
        propietario_id=1
    )

    db.add(usuario)
    db.add(cancha)
    db.commit()

    db.refresh(usuario)

    app.dependency_overrides[get_current_user] = lambda: usuario

    yield

    db.close()


# ----------------------------
# HELPERS
# ----------------------------

def crear_torneo_base(max_equipos=4, formato="eliminacion_directa", fase_final=None, ida_y_vuelta=False):
    fecha_futura = (datetime.now() + timedelta(days=10)).isoformat()
    fecha_fin = (datetime.now() + timedelta(days=20)).isoformat()

    # Construimos el payload base
    payload = {
        "nombre": "Torneo Test",
        "fecha_inicio": fecha_futura,
        "fecha_fin": fecha_fin,
        "formato": formato,
        "zona": "CABA",
        "dias_operativos": 127,
        "franja_horaria": "10:00-12:00",
        "max_equipos": max_equipos,
        "ida_y_vuelta": ida_y_vuelta,
        "min_integrantes_por_equipo": 5,
        "costo_inscripcion": 1000
    }
    
    if formato == "fase_grupos":
        payload["fase_final"] = fase_final or "semis"

    response = client.post("/api/torneos/", json=payload)

    if response.status_code != 201:
        print(f"\nError al crear torneo: {response.json()}")

    assert response.status_code == 201
    return response.json()["id"]

def crear_jugadores(cantidad, equipo_index, torneo_id):
    db = TestingSessionLocal()
    emails = []
    for j in range(cantidad):
        email = f"jugador_{torneo_id}_{equipo_index}_{j}@test.com"
        usuario = Usuario(
            nombre=f"Jugador_{j}", apellido="Test", email=email,
            password="123", edad=20, genero="M", zona="CABA",
            rol=RolUsuario.jugador, email_confirmado=True
        )
        db.add(usuario)
        emails.append(email)
    db.commit()
    db.close()
    return emails

def inscribir_equipos(torneo_id, cantidad_equipos):
    db = TestingSessionLocal()
    for i in range(cantidad_equipos):
        emails = crear_jugadores(5, i, torneo_id)
        jugador_lider = db.query(Usuario).filter(Usuario.email == emails[0]).first()
        
        app.dependency_overrides[get_current_user] = lambda: jugador_lider
        
        response = client.post(
            f"/api/torneos/{torneo_id}/inscripciones",
            json={
                "nombre": f"Equipo {i}",
                "escudo": None,
                "jugadores_emails": emails
            }
        )
        
        if response.status_code != 201:
            print(f"\nDEBUG ERROR {response.status_code}: {response.json()}")
            
        assert response.status_code == 201
    
    db.close()
    
    usuario_original = db.query(Usuario).filter(Usuario.email == "organizador@test.com").first()
    app.dependency_overrides[get_current_user] = lambda: usuario_original


# ----------------------------
# TESTS
# ----------------------------

def test_fixture_eliminacion_directa():
    torneo_id = crear_torneo_base(max_equipos=4, formato="eliminacion_directa")
    inscribir_equipos(torneo_id, 4)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 3

    for p in data[:2]:
        assert p["equipo_local"] is not None
        assert p["equipo_visitante"] is not None
        assert p["fase"] == "semifinal"

    final = data[2]
    assert final["equipo_local"] is None
    assert final["equipo_visitante"] is None
    assert final["fase"] == "final"


def test_fixture_todos_contra_todos():
    torneo_id = crear_torneo_base(max_equipos=4, formato="todos_contra_todos")
    inscribir_equipos(torneo_id, 4)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")

    data = response.json()

    assert len(data) == 6


def test_fixture_ida_vuelta():
    torneo_id = crear_torneo_base(
        max_equipos=4, 
        formato="todos_contra_todos", 
        ida_y_vuelta=True
    )
    inscribir_equipos(torneo_id, 4)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")
    
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 12 

    participaciones = Counter()
    for partido in data:
        local_id = partido["equipo_local"]["id"]
        visitante_id = partido["equipo_visitante"]["id"]
        participaciones[local_id] += 1
        participaciones[visitante_id] += 1
    
    for equipo, cantidad in participaciones.items():
        assert cantidad == 6, f"El {equipo} debería jugar 6 partidos, pero juega {cantidad}"


def test_fixture_fase_grupos():
    torneo_id = crear_torneo_base(max_equipos=8, formato="fase_grupos", fase_final="semis")
    inscribir_equipos(torneo_id, 8)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 12 
    assert all(p.get("grupo") is not None for p in data)

    grupos = {p["grupo"] for p in data}
    assert "A" in grupos
    assert "B" in grupos
    assert len(grupos) == 2

    participaciones = Counter()
    for partido in data:
        participaciones[partido["equipo_local"]["id"]] += 1
        participaciones[partido["equipo_visitante"]["id"]] += 1
    
    for equipo_id, cantidad in participaciones.items():
        assert cantidad == 3, f"El equipo {equipo_id} debería tener 3 partidos en fase de grupos"


def test_fixture_sin_equipos_falla():
    torneo_id = crear_torneo_base(max_equipos=4, formato="eliminacion_directa")

    response = client.post(f"/api/torneos/{torneo_id}/fixture")

    assert response.status_code == 400


def test_estadisticas_de_jugadores_se_guardan_y_agregan():
    torneo_id = crear_torneo_base(max_equipos=4, formato="eliminacion_directa")
    inscribir_equipos(torneo_id, 4)

    response = client.post(f"/api/torneos/{torneo_id}/fixture")
    assert response.status_code == 200

    partido = response.json()[0]

    hoy = datetime.now().date().isoformat()
    prog_resp = client.put(
        f"/api/torneos/partidos/{partido['id']}",
        json={"cancha_id": 1, "fecha": hoy, "horario": "10:30"},
    )
    assert prog_resp.status_code == 200

    db = TestingSessionLocal()
    equipo_local = db.query(Equipo).filter(Equipo.id == partido["equipo_local"]["id"]).first()
    equipo_visitante = db.query(Equipo).filter(Equipo.id == partido["equipo_visitante"]["id"]).first()

    res_resp = client.post(
        f"/api/torneos/partidos/{partido['id']}/resultado",
        json={
            "goles_local": 2,
            "goles_visitante": 1,
            "estadisticas_jugadores": [
                {
                    "usuario_id": equipo_local.jugadores[0].id,
                    "equipo_id": equipo_local.id,
                    "goles": 2,
                    "amarillas": 0,
                    "rojas": 0,
                },
                {
                    "usuario_id": equipo_visitante.jugadores[0].id,
                    "equipo_id": equipo_visitante.id,
                    "goles": 1,
                    "amarillas": 1,
                    "rojas": 1,
                },
            ],
        },
    )
    assert res_resp.status_code == 200

    stats_resp = client.get(f"/api/torneos/{torneo_id}/estadisticas")
    assert stats_resp.status_code == 200

    data = stats_resp.json()
    assert len(data["jugadores"]) == 2
    assert data["jugadores"][0]["goles"] == 2
    assert data["jugadores"][1]["amarillas"] == 1
    assert len(data["equipos"]) == 2
    assert data["equipos"][0]["goles"] == 2
    assert data["equipos"][1]["rojas"] == 1

    db.close()

def test_transicion_fase_grupos_a_playoffs():
    # 1. Crear torneo con 8 equipos, fase de grupos, playoffs desde semis
    torneo_id = crear_torneo_base(max_equipos=8, formato="fase_grupos", fase_final="semis")
    inscribir_equipos(torneo_id, 8)

    # 2. Generar fixture inicial (12 partidos de fase de grupos)
    response = client.post(f"/api/torneos/{torneo_id}/fixture")
    assert response.status_code == 200
    partidos_iniciales = response.json()
    assert len(partidos_iniciales) == 12

    hoy = datetime.now().date().isoformat()

    for p in partidos_iniciales:
        p_id = p["id"]
        # Programar partido para hoy (para poder cargarle resultados)
        prog_resp = client.put(
            f"/api/torneos/partidos/{p_id}",
            json={
                "cancha_id": 1,
                "fecha": hoy,
                "horario": "10:30"
            }
        )
        assert prog_resp.status_code == 200

        loc_nombre = p["equipo_local"]["nombre"]
        vis_nombre = p["equipo_visitante"]["nombre"]

        # Extraemos el número del equipo de su nombre (ej. "Equipo 0" -> 0)
        loc_num = int(loc_nombre.split(" ")[1])
        vis_num = int(vis_nombre.split(" ")[1])

        # El equipo con número menor siempre gana (orden determinista)
        if loc_num < vis_num:
            goles_loc = 2
            goles_vis = 0
        else:
            goles_loc = 0
            goles_vis = 2

        res_resp = client.post(
            f"/api/torneos/partidos/{p_id}/resultado",
            json={
                "goles_local": goles_loc,
                "goles_visitante": goles_vis
            }
        )
        assert res_resp.status_code == 200

    # 3. Verificar que se generaron los partidos de playoffs (2 semis + 1 final)
    db = TestingSessionLocal()

    todos_los_partidos = db.query(PartidoTorneo).filter(PartidoTorneo.torneo_id == torneo_id).all()
    assert len(todos_los_partidos) == 15, f"Esperado 15 partidos, encontrado {len(todos_los_partidos)}"  # 12 grupos + 2 semis + 1 final

    semis = [p for p in todos_los_partidos if p.fase == "semifinal"]
    assert len(semis) == 2

    # Obtener los clasificados reales de cada grupo desde la tabla de posiciones
    posiciones = db.query(TablaPosiciones).filter_by(torneo_id=torneo_id).all()
    grupos_dict = {}
    for pos in posiciones:
        grupos_dict.setdefault(pos.grupo, []).append(pos)
    for g in grupos_dict:
        grupos_dict[g].sort(key=lambda x: (x.pts, x.dg, x.gf), reverse=True)

    nombres_grupos = sorted(grupos_dict.keys())
    assert len(nombres_grupos) == 2, f"Se esperaban 2 grupos, hay {len(nombres_grupos)}"
    g1_nombre, g2_nombre = nombres_grupos[0], nombres_grupos[1]

    lider_g1 = grupos_dict[g1_nombre][0].equipo
    segundo_g1 = grupos_dict[g1_nombre][1].equipo
    lider_g2 = grupos_dict[g2_nombre][0].equipo
    segundo_g2 = grupos_dict[g2_nombre][1].equipo

    # Cruces esperados: 1ro G1 vs 2do G2, y 1ro G2 vs 2do G1
    cruce_esperado_1 = {lider_g1.nombre, segundo_g2.nombre}
    cruce_esperado_2 = {lider_g2.nombre, segundo_g1.nombre}

    semis_equipos = [{s.equipo_local.nombre, s.equipo_visitante.nombre} for s in semis]
    assert cruce_esperado_1 in semis_equipos, f"Cruce {cruce_esperado_1} no encontrado en {semis_equipos}"
    assert cruce_esperado_2 in semis_equipos, f"Cruce {cruce_esperado_2} no encontrado en {semis_equipos}"

    # 4. Programar y cargar resultado de las semifinales
    # Ganador = equipo con número menor
    for semi in semis:
        prog = client.put(
            f"/api/torneos/partidos/{semi.id}",
            json={"cancha_id": 1, "fecha": hoy, "horario": "11:00"}
        )
        assert prog.status_code == 200

        loc_num = int(semi.equipo_local.nombre.split(" ")[1])
        vis_num = int(semi.equipo_visitante.nombre.split(" ")[1])
        gol_loc = 2 if loc_num < vis_num else 0
        gol_vis = 0 if loc_num < vis_num else 2

        res = client.post(
            f"/api/torneos/partidos/{semi.id}/resultado",
            json={"goles_local": gol_loc, "goles_visitante": gol_vis}
        )
        assert res.status_code == 200

    # 5. Verificar que la final tiene los equipos correctos (ganadores de cada semi)
    db.expire_all()
    final = db.query(PartidoTorneo).filter(
        PartidoTorneo.torneo_id == torneo_id,
        PartidoTorneo.fase == "final"
    ).first()

    assert final is not None
    assert final.equipo_local is not None
    assert final.equipo_visitante is not None

    # Los finalistas deben ser los líderes de cada grupo (número menor gana siempre)
    lider_g1_num = int(lider_g1.nombre.split(" ")[1])
    lider_g2_num = int(lider_g2.nombre.split(" ")[1])
    segundo_g1_num = int(segundo_g1.nombre.split(" ")[1])
    segundo_g2_num = int(segundo_g2.nombre.split(" ")[1])

    ganador_semi_1 = lider_g1 if lider_g1_num < segundo_g2_num else segundo_g2
    ganador_semi_2 = lider_g2 if lider_g2_num < segundo_g1_num else segundo_g1

    final_nombres = {final.equipo_local.nombre, final.equipo_visitante.nombre}
    assert ganador_semi_1.nombre in final_nombres, f"{ganador_semi_1.nombre} debería estar en la final"
    assert ganador_semi_2.nombre in final_nombres, f"{ganador_semi_2.nombre} debería estar en la final"

    # 6. Jugar la final
    prog_f = client.put(
        f"/api/torneos/partidos/{final.id}",
        json={"cancha_id": 1, "fecha": hoy, "horario": "12:00"}
    )
    assert prog_f.status_code == 200

    loc_num_f = int(final.equipo_local.nombre.split(" ")[1])
    vis_num_f = int(final.equipo_visitante.nombre.split(" ")[1])
    gol_loc_f = 1 if loc_num_f < vis_num_f else 0
    gol_vis_f = 0 if loc_num_f < vis_num_f else 1

    res_f = client.post(
        f"/api/torneos/partidos/{final.id}/resultado",
        json={"goles_local": gol_loc_f, "goles_visitante": gol_vis_f}
    )
    assert res_f.status_code == 200

    db.close()