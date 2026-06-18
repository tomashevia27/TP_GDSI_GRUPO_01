import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://admin:admin123@localhost:5432/bdd_db")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.usuario_model import Usuario, RolUsuario
from app.models.cancha_model import Cancha
from app.models.partido_model import Partido
from app.models.notificacion_model import Notificacion
from app.models.torneo_model import Torneo
from app.models.partido_torneo import PartidoTorneo
from app.models.equipo_model import Equipo, equipo_jugadores

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    db = SessionLocal()
    try:
        # Find Miguel
        miguel = db.query(Usuario).filter(Usuario.email == "miguelgalvan@gmail.com").first()
        if not miguel:
            print("Miguel Galvan not found")
            return
            
        # Find "copa" tournament
        torneo = db.query(Torneo).filter(
            Torneo.nombre.ilike("%copa%"),
            Torneo.organizador_id == miguel.id
        ).first()
        
        if not torneo:
            print("Torneo 'copa' organizado por Miguel no encontrado")
            return
            
        print(f"Torneo encontrado: {torneo.nombre} (ID: {torneo.id})")
        
        # Get some players to add to the teams
        jugadores = db.query(Usuario).filter(Usuario.rol == "jugador").limit(4).all()
        
        nombres_equipos = ["Los Leones", "Real Bañil", "Sportivo Ganador", "Deportivo Empate"]
        
        for i, nombre in enumerate(nombres_equipos):
            # check if equipo exists
            equipo = db.query(Equipo).filter(Equipo.nombre == nombre).first()
            if not equipo:
                equipo = Equipo(nombre=nombre)
                # add one player to the team just in case
                if i < len(jugadores):
                    equipo.jugadores.append(jugadores[i])
                db.add(equipo)
                db.flush()
                
            if equipo not in torneo.equipos_inscriptos:
                torneo.equipos_inscriptos.append(equipo)
                print(f"Equipo '{nombre}' añadido al torneo.")
            else:
                print(f"Equipo '{nombre}' ya estaba en el torneo.")
                
        # update inscriptos count
        torneo.inscriptos = len(torneo.equipos_inscriptos)
        
        db.commit()
        print("Equipos añadidos exitosamente.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
