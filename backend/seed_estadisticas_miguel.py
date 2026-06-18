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
from app.models.equipo_model import Equipo
from app.models.notificacion_model import Notificacion

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:admin123@localhost:5432/bdd_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generar_datos():
    db = SessionLocal()
    try:
        miguel = db.query(Usuario).filter(Usuario.email == "miguelgalvan@gmail.com").first()
        if not miguel:
            print("No se encontro a Miguel Galvan")
            return
            
        canchas = db.query(Cancha).filter(Cancha.propietario_id == miguel.id).all()
        if not canchas:
            print("Miguel no tiene canchas")
            return
            
        # Get some players to use as organizers
        jugadores = db.query(Usuario).filter(Usuario.rol == "jugador").all()
        
        # Mayo y Junio 2026
        fechas = []
        fecha_actual = date(2026, 5, 1)
        fecha_fin = date(2026, 6, 30)
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
                        organizador = random.choice(jugadores) if jugadores else miguel
                        
                        # Tipos: mayormente cerrado
                        tipo = random.choices(["abierto", "cerrado", "manual"], weights=[0.2, 0.6, 0.2])[0]
                        reserva_manual = True if tipo == "manual" else False
                        if tipo == "manual": tipo = "cerrado"
                        
                        # Estado: 15% de cancelacion
                        if random.random() < 0.15:
                            estado = "Cancelado"
                            cancelados += 1
                        else:
                            estado = "confirmado"
                            
                        # Modalidad F11 ya que sus canchas son F11
                        modalidad = "Fútbol 11"
                        
                        partido = Partido(
                            cancha_id=cancha.id,
                            organizador_id=organizador.id,
                            fecha=fecha,
                            horario=horario,
                            tipo=tipo,
                            modalidad=modalidad,
                            estado=estado,
                            reserva_manual=reserva_manual,
                            cantidad_jugadores=22,
                            cupos_disponibles=22 if tipo == "abierto" else 0,
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
