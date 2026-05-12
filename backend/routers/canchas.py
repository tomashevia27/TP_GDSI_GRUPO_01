from fastapi import APIRouter

router = APIRouter(prefix="/canchas", tags=["Canchas"])

@router.get("")
def obtener_canchas():
    return [
        {"id": 1, "nombre": "Cancha 1", "tipo": "Fútbol 5", "precio_hora": 15000},
        {"id": 2, "nombre": "Cancha 2", "tipo": "Fútbol 7", "precio_hora": 22000},
        {"id": 3, "nombre": "Cancha Techada", "tipo": "Fútbol 5", "precio_hora": 18000}
    ]
