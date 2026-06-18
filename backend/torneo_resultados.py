import sys
import os
import random
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
from app.models.partido_torneo import PartidoTorneo, EstadoPartidoTorneo, FaseTorneo
from app.models.equipo_model import Equipo, equipo_jugadores
from app.repositories.usuario_repository import guardar

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generar_jugadores(db, cantidad=40):
    print(f"Generando {cantidad} jugadores falsos para el Torneo Master...")
    jugadores = []
    for i in range(1, cantidad + 1):
        email = f"master_player_{i}@gmail.com"
        existente = db.query(Usuario).filter(Usuario.email == email).first()
        if existente:
            jugadores.append(existente)
            continue
            
        nuevo_usuario = Usuario(
            nombre=f"Master",
            apellido=f"Player {i}",
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
    return jugadores

def generar_resultados():
    # Resultados un poco más realistas
    pesos_local = [0.1, 0.2, 0.3, 0.2, 0.1, 0.1]
    pesos_visitante = [0.2, 0.3, 0.2, 0.15, 0.1, 0.05]
    gl = random.choices(range(6), weights=pesos_local)[0]
    gv = random.choices(range(6), weights=pesos_visitante)[0]
    return gl, gv

def main():
    db = SessionLocal()
    try:
        # 1. Organizador
        organizador = db.query(Usuario).filter(Usuario.email == "miguelgalvan@gmail.com").first()
        if not organizador:
            print("Organizador Miguel Galvan no encontrado.")
            return

        # 2. Generar Jugadores
        jugadores_disponibles = generar_jugadores(db, 40)

        # 3. Crear el Torneo
        ahora = datetime.datetime.now()
        fecha_inicio = ahora - datetime.timedelta(days=14) # Empezó hace 2 semanas
        fecha_fin = ahora + datetime.timedelta(days=40)

        torneo_nombre = f"Torneo Master F5 - {random.randint(100, 999)}"
        nuevo_torneo = Torneo(
            nombre=torneo_nombre,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            formato=FormatoTorneo.todos_contra_todos,
            zona="Saavedra",
            franja_horaria="19:00-22:00",
            max_equipos=8,
            costo_inscripcion=200000.0,
            descripcion="Torneo completo autogenerado con fixture y resultados simulados.",
            reglas="Reglas estándar F5.",
            estado=EstadoTorneo.en_curso, # Ya está en curso
            organizador_id=organizador.id,
            min_integrantes_por_equipo=5,
            dias_operativos=127,
            ida_y_vuelta=False
        )
        db.add(nuevo_torneo)
        db.flush()
        print(f"Torneo '{nuevo_torneo.nombre}' creado (ID: {nuevo_torneo.id})")

        # 4. Crear e inscribir Equipos
        nombres_equipos = [
            "Titanes F5", "Relampago FC", "El Ciclon F5", "Diablos Rojos",
            "Los Magicos", "Dinamita FC", "Aleti 5", "Boca Jrs F5"
        ]

        equipos = []
        jugador_idx = 0
        for nombre in nombres_equipos:
            equipo = db.query(Equipo).filter(Equipo.nombre == nombre).first()
            if not equipo:
                equipo = Equipo(nombre=nombre)
                for _ in range(5):
                    if jugador_idx < len(jugadores_disponibles):
                        equipo.jugadores.append(jugadores_disponibles[jugador_idx])
                        jugador_idx += 1
                db.add(equipo)
                db.flush()
            equipos.append(equipo)
            nuevo_torneo.equipos_inscriptos.append(equipo)

        nuevo_torneo.inscriptos = len(nuevo_torneo.equipos_inscriptos)
        db.flush()

        # 5. Generar Fixture Completo (Algoritmo Round Robin / Circle Method)
        print("Generando el fixture completo (7 fechas)...")
        cancha = db.query(Cancha).filter(Cancha.nombre.ilike("%F5%")).first()
        cancha_id = cancha.id if cancha else None

        equipos_rotacion = list(equipos)
        total_equipos = len(equipos_rotacion)
        total_fechas = total_equipos - 1

        partidos_creados = 0
        fecha_base_partidos = fecha_inicio.date()

        for numero_fecha in range(1, total_fechas + 1):
            # En cada fecha se juegan total_equipos / 2 partidos
            for j in range(total_equipos // 2):
                local = equipos_rotacion[j]
                visitante = equipos_rotacion[total_equipos - 1 - j]
                
                # Para evitar que el equipo 0 sea siempre local, alternamos:
                if j == 0 and numero_fecha % 2 == 0:
                    local, visitante = visitante, local
                
                # Simular resultados
                # Las primeras 4 fechas ya se jugaron, las últimas 3 están pendientes
                if numero_fecha <= 4:
                    gl, gv = generar_resultados()
                    estado = EstadoPartidoTorneo.finalizado
                else:
                    gl, gv = None, None
                    estado = EstadoPartidoTorneo.pendiente

                partido = PartidoTorneo(
                    torneo_id=nuevo_torneo.id,
                    equipo_local_id=local.id,
                    equipo_visitante_id=visitante.id,
                    cancha_id=cancha_id,
                    fecha=fecha_base_partidos + datetime.timedelta(days=(numero_fecha - 1) * 7),
                    horario=datetime.time(20, 0),
                    goles_local=gl,
                    goles_visitante=gv,
                    fase=FaseTorneo.liga,
                    numero_fecha=numero_fecha,
                    estado=estado
                )
                db.add(partido)
                partidos_creados += 1
            
            # Rotar equipos para la siguiente fecha (el 0 queda fijo)
            equipos_rotacion = [equipos_rotacion[0]] + [equipos_rotacion[-1]] + equipos_rotacion[1:-1]

        db.commit()
        print(f"¡Éxito! Se programaron {partidos_creados} partidos en total (4 fechas finalizadas, 3 pendientes).")

    except Exception as e:
        db.rollback()
        print(f"Ocurrió un error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()