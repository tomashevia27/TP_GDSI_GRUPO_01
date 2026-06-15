from random import shuffle

from .fixture_generator import FixtureGenerator
from ...models.partido_torneo import (
    PartidoTorneo,
    FaseTorneo,
)
from ...core.exceptions import DomainRuleError


class EliminacionDirectaGenerator(FixtureGenerator):

    FASE_INICIAL = {
        4: FaseTorneo.semifinal,
        8: FaseTorneo.cuartos,
        16: FaseTorneo.octavos,
    }

    ORDEN_FASES = {
        FaseTorneo.octavos: FaseTorneo.cuartos,
        FaseTorneo.cuartos: FaseTorneo.semifinal,
        FaseTorneo.semifinal: FaseTorneo.final
    }

    def generar(self, torneo, equipos=None):
        if equipos is None:
            equipos = list(torneo.equipos_inscriptos)
            shuffle(equipos)
            
        cantidad = len(equipos)
        if cantidad not in self.FASE_INICIAL:
            raise DomainRuleError("Cantidad de equipos inválida")
        
        todos_los_partidos = []
        fase_actual = self.FASE_INICIAL[cantidad]
        partidos_ronda_anterior = []
        
        for i in range(0, cantidad, 2):
            p = PartidoTorneo(
                torneo_id=torneo.id,
                equipo_local_id=equipos[i].id if equipos[i] else None,
                equipo_visitante_id=equipos[i+1].id if equipos[i+1] else None,
                fase=fase_actual
            )
            todos_los_partidos.append(p)
            partidos_ronda_anterior.append(p)

        # 2. Crear las fases siguientes (cuartos, semis, final)
        while fase_actual != FaseTorneo.final:
            fase_siguiente = self.ORDEN_FASES[fase_actual]
            partidos_nueva_ronda = []
            
            for i in range(0, len(partidos_ronda_anterior), 2):
                padre_1 = partidos_ronda_anterior[i]
                padre_2 = partidos_ronda_anterior[i+1]
                
                nuevo_partido = PartidoTorneo(
                    torneo_id=torneo.id,
                    fase=fase_siguiente,
                    padre_local=padre_1,
                    padre_visitante=padre_2,
                    equipo_local_id=None, 
                    equipo_visitante_id=None
                )
                todos_los_partidos.append(nuevo_partido)
                partidos_nueva_ronda.append(nuevo_partido)
            
            partidos_ronda_anterior = partidos_nueva_ronda
            fase_actual = fase_siguiente
            
        return todos_los_partidos