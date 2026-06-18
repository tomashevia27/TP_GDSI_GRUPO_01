import os
from pathlib import Path
import re

TEST_DIR = Path("backend/tests/torneos")

for file_path in TEST_DIR.glob("test_*.py"):
    content = file_path.read_text()
    
    # Add Cancha import
    if "from backend.app.models.cancha_model import Cancha" not in content:
        content = content.replace("from backend.app.models.torneo_model import", "from backend.app.models.cancha_model import Cancha\nfrom backend.app.models.torneo_model import")
        content = content.replace("from backend.app.models.equipo_model import", "from backend.app.models.cancha_model import Cancha\nfrom backend.app.models.equipo_model import")

    # Inject Cancha in limpiar_db
    cancha_code = """
    cancha = Cancha(
        id=1, nombre="Cancha Test", tipo_superficie="Sintético", 
        tamano=5, zona="CABA", direccion="Calle 123", 
        precio_por_turno=1000.0, hora_apertura="10:00", 
        hora_cierre="23:00", propietario_id=1
    )
    db.add(cancha)
"""
    if "cancha = Cancha(" not in content:
        content = content.replace("db.add(usuario)", f"db.add(usuario){cancha_code}")

    # Fix Torneo base creations
    # Replace lugar="...", with cancha_id=1, fecha_fin=datetime.now() + timedelta(days=X)
    # We will just replace `lugar=".*",` with `cancha_id=1,\n        fecha_fin=datetime.now() + timedelta(days=20),`
    content = re.sub(r'lugar="[^"]+",', 'cancha_id=1,\n        fecha_fin=datetime.now() + timedelta(days=20),', content)
    
    # In test payloads:
    # "lugar": ".*", -> "cancha_id": 1, "fecha_fin": (datetime.now() + timedelta(days=20)).isoformat(),
    content = re.sub(r'"lugar":\s*"[^"]+",', '"cancha_id": 1,\n        "fecha_fin": (datetime.now() + timedelta(days=20)).isoformat(),', content)
    
    # Remove min_integrantes_por_equipo from payloads (since it's removed from TorneoCreate)
    content = re.sub(r'"min_integrantes_por_equipo":\s*\d+,?', '', content)

    file_path.write_text(content)

