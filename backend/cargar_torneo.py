import sys
import os
import random
from datetime import datetime, timedelta, date, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:admin123@localhost:5432/bdd_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.core.db import Base
from app.models.usuario_model import Usuario, RolUsuario
from app.models.cancha_model import Cancha
from app.models.torneo_model import Torneo, FormatoTorneo, EstadoTorneo
from app.models.partido_torneo import FaseTorneo
from app.schemas.torneo_schemas import TorneoCreate
from app.schemas.equipo_schemas import InscripcionEquipoCreate
from app.schemas.partido_torneo_schemas import ProgramarPartidoRequest, CargarResultadoRequest, EstadisticaJugadorPartidoRequest
from app.services import torneo_service, partido_torneo_service

def cargar_torneo():
    db = SessionLocal()
    try:
        print("Iniciando carga de torneo...")
        
        laura = db.query(Usuario).filter(Usuario.email == "lauraherrera@gmail.com").first()
        if not laura:
            print("Laura Herrera no encontrada en la base de datos.")
            return

        cancha = db.query(Cancha).filter(Cancha.nombre == "La Canchita F5").first()
        if not cancha:
            print("Cancha 'La Canchita F5' no encontrada.")
            return

        print("1. Creando jugadores...")
        nombres_reales = ["Juan", "Pedro", "Lucas", "Matias", "Nicolas", "Martin", "Tomas", "Agustin", "Facundo", "Diego", "Franco", "Santiago", "Federico", "Joaquin", "Gonzalo", "Alejandro", "Ezequiel", "Pablo", "Maximiliano", "Julian"]
        apellidos_reales = ["Gomez", "Rodriguez", "Fernandez", "Lopez", "Martinez", "Gonzalez", "Perez", "Sanchez", "Romero", "Sosa", "Torres", "Alvarez", "Ruiz", "Ramirez", "Flores", "Benitez", "Acosta", "Medina", "Herrera", "Suarez"]
        nombres_equipos = [
            "Los Pibes de Siempre", "Sporting Saavedra", "Deportivo Belgrano", "Real Suciedad", 
            "Aston Birra", "Bayern de Múnich", "Los Galácticos", "Falso 9", 
            "La Naranja Mecánica", "Los Troncos", "Tiki Taka FC", "Sacachispas", 
            "Defensores del Birrin", "Club Atlético Asado", "Tercer Tiempo", "Los Magos del Balón"
        ]

        jugadores = []
        for i in range(1, 81): # 16 equipos * 5 jugadores
            nombre = random.choice(nombres_reales)
            apellido = random.choice(apellidos_reales)
            email = f"{nombre.lower()}.{apellido.lower()}{i}@gmail.com"
            usuario = db.query(Usuario).filter(Usuario.email == email).first()
            if not usuario:
                usuario = Usuario(
                    nombre=nombre,
                    apellido=apellido,
                    email=email,
                    password="password123",
                    edad=random.randint(18, 45),
                    genero="Masculino",
                    zona="Saavedra",
                    rol=RolUsuario.jugador,
                    email_confirmado=True,
                    partidos_a_favor=0
                )
                db.add(usuario)
                db.commit()
                db.refresh(usuario)
            jugadores.append(usuario)
        
        print("2. Creando Torneo...")
        datos_torneo = Torneo(
            nombre="Copa de Invierno 2026 (Nuevos Nombres)",
            fecha_inicio=datetime(2026, 6, 1, 0, 0),
            fecha_fin=datetime(2026, 6, 30, 23, 59),
            formato=FormatoTorneo.fase_grupos,
            zona="Saavedra",
            dias_operativos=127,  # Todos los dias (L-D)
            franja_horaria="18:00-23:00",
            max_equipos=16,
            min_integrantes_por_equipo=5,
            costo_inscripcion=50000.0,
            fase_final="cuartos",
            ida_y_vuelta=False,
            estado=EstadoTorneo.abierto,
            organizador_id=laura.id
        )
        
        db.add(datos_torneo)
        db.commit()
        db.refresh(datos_torneo)
        torneo = datos_torneo
        
        print("3. Inscribiendo 16 equipos...")
        equipos = []
        for i in range(16):
            start_idx = i * 5
            equipo_jugadores = jugadores[start_idx:start_idx+5]
            emails = [j.email for j in equipo_jugadores]
            
            inscripcion = InscripcionEquipoCreate(
                nombre=nombres_equipos[i],
                jugadores_emails=emails
            )
            capitan_id = equipo_jugadores[0].id
            equipo = torneo_service.inscribir_equipo(db, torneo.id, inscripcion, capitan_id)
            equipos.append(equipo)
            
        print("4. Generando Fixture...")
        partidos = torneo_service.generar_fixture(db, torneo.id, laura.id)
        
        print("5. Programando partidos de Fase de Grupos...")
        # 4 grupos de 4 = 6 partidos por grupo = 24 partidos en fase de grupos.
        # Vamos a programarlos consecutivamente.
        
        partidos_grupos = [p for p in torneo.partidos if p.fase == FaseTorneo.grupos]
        
        fecha_actual = date(2026, 6, 1)
        hora_actual = time(18, 0)
        
        def avanzar_horario(fecha, hora):
            # avanza 1 hora. Si pasa de las 22:00, pasa al dia siguiente a las 18:00
            h = hora.hour + 1
            if h > 22:
                return fecha + timedelta(days=1), time(18, 0)
            return fecha, time(h, 0)

        for p in partidos_grupos:
            while True:
                try:
                    req = ProgramarPartidoRequest(
                        cancha_id=cancha.id,
                        fecha=fecha_actual,
                        horario=hora_actual
                    )
                    partido_torneo_service.programar_partido(db, p.id, req, laura.id)
                    fecha_actual, hora_actual = avanzar_horario(fecha_actual, hora_actual)
                    break
                except Exception as e:
                    # Si falla (ej cancha ocupada), avanzamos el horario y reintentamos
                    fecha_actual, hora_actual = avanzar_horario(fecha_actual, hora_actual)

        print("6. Cargando resultados de Fase de Grupos...")
        # Recargar los partidos de la base de datos para asegurar el estado actualizado
        partidos_grupos = [p for p in db.query(partido_torneo_service.PartidoTorneo).filter_by(torneo_id=torneo.id, fase=FaseTorneo.grupos).all()]
        
        # Cargar todos menos el último primero, para que el último dispare la generación de playoffs
        for i, p in enumerate(partidos_grupos):
            # Evitar empate
            goles_l = random.randint(1, 5)
            goles_v = random.randint(0, goles_l - 1) if random.choice([True, False]) else random.randint(goles_l + 1, 6)
            
            estadisticas = []
            
            def generar_estadisticas_equipo(equipo, goles):
                if not equipo or not equipo.jugadores:
                    return
                jugadores_equipo = equipo.jugadores
                for _ in range(goles):
                    jugador = random.choice(jugadores_equipo)
                    stat = next((s for s in estadisticas if s.usuario_id == jugador.id), None)
                    if not stat:
                        estadisticas.append(EstadisticaJugadorPartidoRequest(
                            usuario_id=jugador.id,
                            equipo_id=equipo.id,
                            goles=1,
                            amarillas=random.choices([0, 1], weights=[90, 10])[0],
                            rojas=random.choices([0, 1], weights=[98, 2])[0]
                        ))
                    else:
                        stat.goles += 1
                
                # Asignar amarillas al resto aleatoriamente
                for jugador in jugadores_equipo:
                    stat = next((s for s in estadisticas if s.usuario_id == jugador.id), None)
                    if not stat and random.random() < 0.1:
                        estadisticas.append(EstadisticaJugadorPartidoRequest(
                            usuario_id=jugador.id,
                            equipo_id=equipo.id,
                            goles=0,
                            amarillas=random.choices([0, 1], weights=[80, 20])[0],
                            rojas=0
                        ))

            generar_estadisticas_equipo(p.equipo_local, goles_l)
            generar_estadisticas_equipo(p.equipo_visitante, goles_v)
            
            req_res = CargarResultadoRequest(
                goles_local=goles_l,
                goles_visitante=goles_v,
                estadisticas_jugadores=estadisticas
            )
            partido_torneo_service.cargar_resultado_partido(db, p.id, req_res)
            
        print("7. Programando y cargando resultados de Cuartos de final...")
        partidos_cuartos = db.query(partido_torneo_service.PartidoTorneo).filter_by(torneo_id=torneo.id, fase=FaseTorneo.cuartos).all()
        
        for p in partidos_cuartos:
            while True:
                try:
                    req = ProgramarPartidoRequest(
                        cancha_id=cancha.id,
                        fecha=fecha_actual,
                        horario=hora_actual
                    )
                    partido_torneo_service.programar_partido(db, p.id, req, laura.id)
                    fecha_actual, hora_actual = avanzar_horario(fecha_actual, hora_actual)
                    break
                except Exception as e:
                    fecha_actual, hora_actual = avanzar_horario(fecha_actual, hora_actual)
                    
        def generar_estadisticas_equipo_eliminatoria(equipo, goles, estadisticas):
            if not equipo or not equipo.jugadores:
                return
            jugadores_equipo = equipo.jugadores
            for _ in range(goles):
                jugador = random.choice(jugadores_equipo)
                stat = next((s for s in estadisticas if s.usuario_id == jugador.id), None)
                if not stat:
                    estadisticas.append(EstadisticaJugadorPartidoRequest(
                        usuario_id=jugador.id,
                        equipo_id=equipo.id,
                        goles=1,
                        amarillas=random.choices([0, 1], weights=[90, 10])[0],
                        rojas=random.choices([0, 1], weights=[98, 2])[0]
                    ))
                else:
                    stat.goles += 1

        # Cargamos los resultados de TODOS los cuartos de final
        for p in partidos_cuartos:
            goles_l = random.randint(1, 4)
            goles_v = random.randint(0, goles_l - 1) if random.choice([True, False]) else random.randint(goles_l + 1, 5)
            
            estadisticas = []
            generar_estadisticas_equipo_eliminatoria(p.equipo_local, goles_l, estadisticas)
            generar_estadisticas_equipo_eliminatoria(p.equipo_visitante, goles_v, estadisticas)
            
            req_res = CargarResultadoRequest(
                goles_local=goles_l,
                goles_visitante=goles_v,
                estadisticas_jugadores=estadisticas
            )
            partido_torneo_service.cargar_resultado_partido(db, p.id, req_res)

        print("8. Programando y cargando resultados de Semifinales...")
        partidos_semis = db.query(partido_torneo_service.PartidoTorneo).filter_by(torneo_id=torneo.id, fase=FaseTorneo.semifinal).all()
        
        for p in partidos_semis:
            while True:
                try:
                    req = ProgramarPartidoRequest(
                        cancha_id=cancha.id,
                        fecha=fecha_actual,
                        horario=hora_actual
                    )
                    partido_torneo_service.programar_partido(db, p.id, req, laura.id)
                    fecha_actual, hora_actual = avanzar_horario(fecha_actual, hora_actual)
                    break
                except Exception as e:
                    fecha_actual, hora_actual = avanzar_horario(fecha_actual, hora_actual)
                    
        for p in partidos_semis:
            goles_l = random.randint(1, 4)
            goles_v = random.randint(0, goles_l - 1) if random.choice([True, False]) else random.randint(goles_l + 1, 5)
            
            estadisticas = []
            generar_estadisticas_equipo_eliminatoria(p.equipo_local, goles_l, estadisticas)
            generar_estadisticas_equipo_eliminatoria(p.equipo_visitante, goles_v, estadisticas)
            
            req_res = CargarResultadoRequest(
                goles_local=goles_l,
                goles_visitante=goles_v,
                estadisticas_jugadores=estadisticas
            )
            partido_torneo_service.cargar_resultado_partido(db, p.id, req_res)

        print("9. Programando la Final...")
        partidos_final = db.query(partido_torneo_service.PartidoTorneo).filter_by(torneo_id=torneo.id, fase=FaseTorneo.final).all()
        if partidos_final:
            p_final = partidos_final[0]
            # Programar final para el martes 23 de junio de 2026
            req_final = ProgramarPartidoRequest(
                cancha_id=cancha.id,
                fecha=date(2026, 6, 17),
                horario=time(20, 0)
            )
            partido_torneo_service.programar_partido(db, p_final.id, req_final, laura.id)

        print("¡Proceso completado con éxito!")

    except Exception as e:
        print(f"Error durante la carga: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cargar_torneo()
