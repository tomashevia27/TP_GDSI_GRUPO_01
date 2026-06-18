from fastapi.testclient import TestClient
import sys
import os

# Ajustar sys.path para que encuentre backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.main import app
from backend.app.core.dependencies import get_current_user
from backend.app.models.usuario_model import RolUsuario

class MockUser:
    id = 1
    rol = RolUsuario.jugador

app.dependency_overrides[get_current_user] = lambda: MockUser()

client = TestClient(app)
payload = {
    "nombre":"Test Torneo Edit",
    "fecha_inicio":"2026-06-25T12:00:00.000Z",
    "fecha_fin":"2026-06-25T12:00:00.000Z",
    "formato":"eliminacion_directa",
    "zona":"CABA",
    "dias_operativos":31,
    "franja_horaria":"09:00-11:00",
    "max_equipos":8,
    "min_integrantes_por_equipo":5,
    "costo_inscripcion":100,
    "ida_y_vuelta":False,
    "fase_final":None,
    "descripcion":"",
    "reglas":""
}
response = client.patch("/api/torneos/1", json=payload)
print(response.status_code)
print(response.json())
