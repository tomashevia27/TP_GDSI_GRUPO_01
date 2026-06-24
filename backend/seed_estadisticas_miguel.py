import sys
import os
import random
from datetime import datetime, date, time, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base 
from app.models.usuario_model import Usuario
from app.models.cancha_model import Cancha
from app.models.partido_model import Partido
from app.models.torneo_model import Torneo
from app.models.partido_torneo import PartidoTorneo
from app.models.equipo_model import Equipo
from app.models.notificacion_model import Notificacion

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:admin123@localhost:5432/bdd_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generar_datos():
    db = SessionLocal()
    try:
        laura = db.query(Usuario).filter(Usuario.email == "lauraherrera@gmail.com").first()
        if not laura:
            print("No se encontró a Laura Herrera")
            return
            
        canchas = db.query(Cancha).filter(Cancha.propietario_id == laura.id).all()
        if not canchas:
            print("Laura no tiene canchas")
            return
            
        cancha_ids = [c.id for c in canchas]
        
        # Limpiar partidos anteriores para estas canchas (para evitar duplicados al correr varias veces)
        db.query(Partido).filter(Partido.cancha_id.in_(cancha_ids)).delete(synchronize_session=False)
        db.commit()
        
        # Get some players to use as organizers
        jugadores = db.query(Usuario).filter(Usuario.rol == "jugador").all()
        
        # Mayo a 5 de Julio 2026
        fechas = []
        fecha_actual = date(2026, 5, 1)
        fecha_fin = date(2026, 7, 5)
        while fecha_actual <= fecha_fin:
            fechas.append(fecha_actual)
            fecha_actual += timedelta(days=1)
            
        horarios = [time(h, 0) for h in range(8, 24)] # 8:00 to 23:00
        
        partidos_creados = 0
        cancelados = 0
        
        for fecha in fechas:
            for cancha in canchas:
                # Decidir si hay partido
                for horario in horarios:
                    hora = horario.hour
                    
                    # Probabilidades: 
                    # Tarde/Noche (18 a 22): 80% de ocupación
                    # Mañana (8 a 12): 10% de ocupación
                    # Tarde (13 a 17): 30% de ocupación
                    prob = 0
                    if 18 <= hora <= 22:
                        prob = 0.8
                    elif 8 <= hora <= 12:
                        prob = 0.1
                    else:
                        prob = 0.3
                        
                    if random.random() < prob:
                        # Crear partido
                        organizador = random.choice(jugadores) if jugadores else laura
                        
                        # Tipos: todos cerrados (algunos manuales, otros por app)
                        tipo = random.choices(["cerrado", "manual"], weights=[0.7, 0.3])[0]
                        reserva_manual = True if tipo == "manual" else False
                        if tipo == "manual": tipo = "cerrado"
                        
                        # Estado: 15% de cancelacion
                        if random.random() < 0.15:
                            estado = "Cancelado"
                            cancelados += 1
                        else:
                            estado = "confirmado"
                            
                        # Modalidad F5 ya que sus canchas son F5
                        modalidad = "Fútbol 5"
                        
                        nombres_manuales = ["Carlos", "Jose", "Martin", "Luis", "Roberto", "Alejandro", "Jorge", "Raul"]
                        apellidos_manuales = ["Perez", "Gonzalez", "Rodriguez", "Fernandez", "Lopez", "Diaz", "Martinez", "Paz"]
                        
                        cliente_nombre = None
                        cliente_apellido = None
                        cliente_telefono = None
                        if reserva_manual:
                            cliente_nombre = random.choice(nombres_manuales)
                            cliente_apellido = random.choice(apellidos_manuales)
                            cliente_telefono = f"11{random.randint(20000000, 79999999)}"
                        
                        partido = Partido(
                            cancha_id=cancha.id,
                            organizador_id=organizador.id,
                            fecha=fecha,
                            horario=horario,
                            tipo=tipo,
                            modalidad=modalidad,
                            estado=estado,
                            reserva_manual=reserva_manual,
                            cliente_nombre=cliente_nombre,
                            cliente_apellido=cliente_apellido,
                            cliente_telefono=cliente_telefono,
                            cantidad_jugadores=10,
                            cupos_disponibles=10 if tipo == "abierto" else 0,
                            descripcion=f"Partido generado para stats en {cancha.nombre}"
                        )
                        db.add(partido)
                        partidos_creados += 1
                        
        db.commit()
        print(f"Se crearon {partidos_creados} partidos exitosamente. ({cancelados} cancelados)")
        
    except Exception as e:
        print("Error:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generar_datos()
