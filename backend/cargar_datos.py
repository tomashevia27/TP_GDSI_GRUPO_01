import sys
import os

import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:admin123@localhost:5432/bdd_db")
#DATABASE_URL = "postgresql+psycopg2://teamup_user:oLnFneAtzOS1KrW0EBCl9KBs6BYQIcjh@dpg-d8bqhul8nd3s738tbc20-a.virginia-postgres.render.com/teamup_db_yilz?sslmode=require"
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.core.db import Base 
from app.models.usuario_model import Usuario, RolUsuario
from app.models.cancha_model import Cancha
from app.models.partido_model import Partido
from app.models.notificacion_model import Notificacion
from app.models.torneo_model import Torneo
from app.models.partido_torneo import PartidoTorneo
from app.models.equipo_model import Equipo, equipo_jugadores
from app.repositories.usuario_repository import guardar



USUARIOS_SEED = [
    {
        "nombre": "Martin",
        "apellido": "Rodriguez",
        "email": "martinrodriguez@gmail.com",
        "password": "martinrodriguez",
        "edad": 40,
        "genero": "Masculino",
        "zona": "Caballito",
        "rol": RolUsuario.jugador,
        "email_confirmado": True,
        "foto_perfil": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779490316/Captura_desde_2026-05-22_19-51-40_km9yne.png",
        "partidos_a_favor": 0,
    },
    {
        "nombre": "Valeria",
        "apellido": "Fernandez",
        "email": "valeriafernandez@gmail.com",
        "password": "valeriafernandez",
        "edad": 25,
        "genero": "Femenino",
        "zona": "Belgrano",
        "rol": RolUsuario.jugador,
        "email_confirmado": True,
        "foto_perfil": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779490533/Valeria_kmanxt.png",
        "partidos_a_favor": 0,
    },
    {
        "nombre": "Santiago",
        "apellido": "Gimenez",
        "email": "santiagogimenez@gmail.com",
        "password": "santiagogimenez",
        "edad": 32,
        "genero": "Masculino",
        "zona": "Almagro",
        "rol": RolUsuario.jugador,
        "email_confirmado": True,
        "foto_perfil": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779490533/Santiago_okjzdk.png",
        "partidos_a_favor": 0,
    },
    {
        "nombre": "Tomas",
        "apellido": "Godoy",
        "email": "tomasgodoy@gmail.com",
        "password": "tomasgodoy",
        "edad": 20,
        "genero": "Masculino",
        "zona": "Villa Crespo",
        "rol": RolUsuario.jugador,
        "email_confirmado": True,
        "foto_perfil": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779490533/Tomas_eyoa35.png",
        "partidos_a_favor": 0,
    },
    {
        "nombre": "Carlos",
        "apellido": "Alvarez",
        "email": "carlosalvarez@gmail.com",
        "password": "carlosalvarez",
        "edad": 42,
        "genero": "Masculino",
        "zona": "Palermo",
        "rol": RolUsuario.admin,
        "email_confirmado": True,
        "foto_perfil": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779490534/Carlos_dthk2y.png",
        "partidos_a_favor": 0,
    },
    {
        "nombre": "Miguel",
        "apellido": "Galvan",
        "email": "miguelgalvan@gmail.com",
        "password": "miguelgalvan",
        "edad": 45,
        "genero": "Masculino",
        "zona": "Flores",
        "rol": RolUsuario.admin,
        "email_confirmado": True,
        "foto_perfil": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779491362/Miguel_ibuv1k.png",
        "partidos_a_favor": 0,
    },
    {
        "nombre": "Laura",
        "apellido": "Herrera",
        "email": "lauraherrera@gmail.com",
        "password": "lauraherrera",
        "edad": 38,
        "genero": "Femenino",
        "zona": "Saavedra",
        "rol": RolUsuario.admin,
        "email_confirmado": True,
        "foto_perfil": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779491363/Laura_sa5urg.png",
        "partidos_a_favor": 0,
    }
]


def seed_usuarios():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for datos in USUARIOS_SEED:
            existente = db.query(Usuario).filter(Usuario.email == datos["email"]).first()
            if existente:
                print(f"  - {datos['email']} ya existe, saltando...")
                continue

            usuario = Usuario(**datos)
            guardar(db, usuario)
            print(f"  + Creado: {datos['email']}")

        print("\nSeed completado!")
    finally:
        db.close()


def seed_canchas(db: SessionLocal):
    print("\n--- Creando canchas ---")

    laura = db.query(Usuario).filter(Usuario.email == "lauraherrera@gmail.com").first()
    miguel = db.query(Usuario).filter(Usuario.email == "miguelgalvan@gmail.com").first()
    carlos = db.query(Usuario).filter(Usuario.email == "carlosalvarez@gmail.com").first()

    CANCHAS_SEED = [
        {
            "nombre": "La Canchita F5",
            "tipo_superficie": "cesped",
            "tamano": 5,
            "iluminacion": True,
            "zona": "Saavedra",
            "direccion": "Av. Garcia del Rio 2500",
            "precio_por_turno": 80000.0,
            "dias_operativos": 127,
            "hora_apertura": "08:00",
            "hora_cierre": "23:00",
            "duracion_turno": 60,
            "propietario_id": laura.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779492072/hotel-lagomar-compensar_astoax.jpg",
        },
        {
            "nombre": "El Estadio F5",
            "tipo_superficie": "cemento",
            "tamano": 5,
            "iluminacion": True,
            "zona": "Saavedra",
            "direccion": "Monroe 3200",
            "precio_por_turno": 60000.0,
            "dias_operativos": 127,
            "hora_apertura": "09:00",
            "hora_cierre": "22:00",
            "duracion_turno": 60,
            "propietario_id": laura.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779492021/800_600_parquechas_mptqpp.jpg",
        },
        {
            "nombre": "Sporting F5",
            "tipo_superficie": "sintetico",
            "tamano": 5,
            "iluminacion": True,
            "zona": "Saavedra",
            "direccion": "Cuba 1800",
            "precio_por_turno": 75000.0,
            "dias_operativos": 127,
            "hora_apertura": "07:00",
            "hora_cierre": "24:00",
            "duracion_turno": 60,
            "propietario_id": laura.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779492005/canchas-futbol-5_wkmjr1.jpg",
        },
        {
            "nombre": "La Grande F11",
            "tipo_superficie": "cesped",
            "tamano": 11,
            "iluminacion": True,
            "zona": "Flores",
            "direccion": "Av. Directorio 4500",
            "precio_por_turno": 250000.0,
            "dias_operativos": 127,
            "hora_apertura": "08:00",
            "hora_cierre": "23:00",
            "duracion_turno": 90,
            "propietario_id": miguel.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779491956/01-04_deportes_244-1024x556_ucgxiw.jpg",
        },
        {
            "nombre": "El Gigante F11",
            "tipo_superficie": "cesped",
            "tamano": 11,
            "iluminacion": True,
            "zona": "Flores",
            "direccion": "Pedernera 800",
            "precio_por_turno": 280000.0,
            "dias_operativos": 127,
            "hora_apertura": "09:00",
            "hora_cierre": "22:00",
            "duracion_turno": 90,
            "propietario_id": miguel.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779491955/cancha-futbol-11-del-parque-villa-mayor-bogota-tiene-nuevo-alumbrado-junio-2025_z3acps.jpg",
        },
        {
            "nombre": "Metrópolis F11",
            "tipo_superficie": "sintetico",
            "tamano": 11,
            "iluminacion": True,
            "zona": "Flores",
            "direccion": "Cacique Arriola 1500",
            "precio_por_turno": 220000.0,
            "dias_operativos": 127,
            "hora_apertura": "07:00",
            "hora_cierre": "24:00",
            "duracion_turno": 90,
            "propietario_id": miguel.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779491956/Se-inauguro-la-cancha-de-futbol-11-en-el-Camping-del-Circulo-Trovador-12_ah2kjy.png",
        },
        {
            "nombre": "La Seventh F7",
            "tipo_superficie": "cesped",
            "tamano": 7,
            "iluminacion": True,
            "zona": "Palermo",
            "direccion": "Honduras 3500",
            "precio_por_turno": 150000.0,
            "dias_operativos": 127,
            "hora_apertura": "08:00",
            "hora_cierre": "23:00",
            "duracion_turno": 60,
            "propietario_id": carlos.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779492308/pasto-artificial-Futbol-7-851x576_ukhfix.jpg",
        },
        {
            "nombre": "Club Social F7",
            "tipo_superficie": "cemento",
            "tamano": 7,
            "iluminacion": True,
            "zona": "Palermo",
            "direccion": "Uriarte 1200",
            "precio_por_turno": 120000.0,
            "dias_operativos": 127,
            "hora_apertura": "09:00",
            "hora_cierre": "22:00",
            "duracion_turno": 60,
            "propietario_id": carlos.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779491990/Futsal-vs-Almafuerte_kt1pyz.jpg",
        },
        {
            "nombre": "Arena F7",
            "tipo_superficie": "sintetico",
            "tamano": 7,
            "iluminacion": True,
            "zona": "Palermo",
            "direccion": "Borges 2100",
            "precio_por_turno": 140000.0,
            "dias_operativos": 127,
            "hora_apertura": "07:00",
            "hora_cierre": "24:00",
            "duracion_turno": 60,
            "propietario_id": carlos.id,
            "fotos": "https://res.cloudinary.com/dzsrgcgq6/image/upload/v1779492766/cancha-de-fut-7-2_nkcqcn.jpg",
        },
    ]

    for datos in CANCHAS_SEED:
        existente = db.query(Cancha).filter(Cancha.nombre == datos["nombre"]).first()
        if existente:
            print(f"  - {datos['nombre']} ya existe, saltando...")
            continue
        
        cancha = Cancha(**datos)
        db.add(cancha)
        print(f"  + Creada: {datos['nombre']}")

    db.commit()
    print("\nCanchas creadas!")


if __name__ == "__main__":
    print("Cargando usuarios de prueba...\n")
    seed_usuarios()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_canchas(db)
    finally:
        db.close()