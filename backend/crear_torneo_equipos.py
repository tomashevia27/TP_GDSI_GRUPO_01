import sys
import os
import datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:admin123@localhost:5432/bdd_db")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.usuario_model import Usuario, RolUsuario
from app.models.cancha_model import Cancha
from app.models.partido_model import Partido
from app.models.notificacion_model import Notificacion
from app.models.torneo_model import Torneo, FormatoTorneo, EstadoTorneo
from app.models.partido_torneo import PartidoTorneo
from app.models.equipo_model import Equipo, equipo_jugadores
from app.repositories.usuario_repository import guardar

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generar_jugadores(db, cantidad=30):
    print(f"Generando {cantidad} jugadores falsos...")
    jugadores = []
    for i in range(1, cantidad + 1):
        email = f"jugador_f5_{i}@gmail.com"
        # Check si ya existe
        existente = db.query(Usuario).filter(Usuario.email == email).first()
        if existente:
            jugadores.append(existente)
            continue
            
        nuevo_usuario = Usuario(
            nombre=f"Jugador",
            apellido=f"Falso {i}",
            email=email,
            password="password123",
            edad=25,
            genero="Masculino",
            zona="Saavedra",
            rol=RolUsuario.jugador,
            email_confirmado=True,
            partidos_a_favor=0
        )
        guardar(db, nuevo_usuario)
        jugadores.append(nuevo_usuario)
    
    print("Jugadores generados.")
    return jugadores

def main():
    db = SessionLocal()
    try:
        # 1. Buscar al organizador
        organizador = db.query(Usuario).filter(Usuario.email == "miguelgalvan@gmail.com").first()
        if not organizador:
            print("Organizador Miguel Galvan no encontrado.")
            return

        # 2. Generar 30 jugadores
        jugadores_disponibles = generar_jugadores(db, 30)

        # 3. Crear el torneo
        ahora = datetime.datetime.now()
        fecha_inicio = ahora + datetime.timedelta(days=7)
        fecha_fin = ahora + datetime.timedelta(days=21)

        nuevo_torneo = Torneo(
            nombre="Copa de Campeones F5",
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            formato=FormatoTorneo.eliminacion_directa,
            zona="Saavedra",
            franja_horaria="19:00-23:00",
            max_equipos=8,
            costo_inscripcion=75000.0,
            descripcion="Torneo competitivo de Fútbol 5. Premios en efectivo para el ganador.",
            reglas="Se aplican las reglas estándar de Fútbol 5. Tiempo de tolerancia 15 minutos.",
            estado=EstadoTorneo.abierto,
            organizador_id=organizador.id,
            min_integrantes_por_equipo=5,
            dias_operativos=127
        )
        db.add(nuevo_torneo)
        db.flush()
        print(f"Torneo '{nuevo_torneo.nombre}' creado con ID: {nuevo_torneo.id}")

        # 4. Crear 6 equipos y anotar 5 jugadores a cada uno
        nombres_equipos = [
            "Los Galacticos F5",
            "Sintetico FC",
            "Toco y Me Voy",
            "La Naranja Mecanica",
            "Tercer Tiempo",
            "Catenaccio 5"
        ]

        equipos_creados = []
        jugador_idx = 0
        for nombre in nombres_equipos:
            equipo = db.query(Equipo).filter(Equipo.nombre == nombre).first()
            if not equipo:
                equipo = Equipo(nombre=nombre)
                # Asignar 5 jugadores
                for _ in range(5):
                    if jugador_idx < len(jugadores_disponibles):
                        equipo.jugadores.append(jugadores_disponibles[jugador_idx])
                        jugador_idx += 1
                db.add(equipo)
                db.flush()
            equipos_creados.append(equipo)

        # 5. Inscribir los 6 equipos en el torneo
        for equipo in equipos_creados:
            nuevo_torneo.equipos_inscriptos.append(equipo)
            print(f"Equipo '{equipo.nombre}' (con {len(equipo.jugadores)} jugadores) inscripto exitosamente.")

        nuevo_torneo.inscriptos = len(nuevo_torneo.equipos_inscriptos)

        db.commit()
        print(f"¡Listo! Se anotaron {nuevo_torneo.inscriptos} equipos. Quedan {nuevo_torneo.max_equipos - nuevo_torneo.inscriptos} cupos libres.")

    except Exception as e:
        db.rollback()
        print(f"Ocurrió un error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()