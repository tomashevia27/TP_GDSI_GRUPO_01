from random import shuffle

from .fixture_generator import FixtureGenerator
from ...models.partido_torneo import (
    PartidoTorneo,
    FaseTorneo,
    EstadoPartidoTorneo,
)
from ...core.exceptions import DomainRuleError


class EliminacionDirectaGenerator(FixtureGenerator):

    FASE_INICIAL = {
        2: FaseTorneo.final,
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
        if cantidad < 2:
            raise DomainRuleError("Se necesitan al menos 2 equipos.")

        potencia = 1
        while potencia < cantidad:
            potencia *= 2

        if potencia not in self.FASE_INICIAL:
            raise DomainRuleError("Cantidad de equipos no es una potencia de 2.")

        slots = equipos + [None] * (potencia - cantidad)
        todos_los_partidos = []
        fase_actual = self.FASE_INICIAL[potencia]
        partidos_ronda_anterior = []
        
        for i in range(0, len(slots), 2):
            local = slots[i]
            visitante = slots[i + 1]
            p = PartidoTorneo(
                torneo_id=torneo.id,
                equipo_local_id=local.id if local else None,
                equipo_visitante_id=visitante.id if visitante else None,
                fase=fase_actual
            )
            # Bye: uno de los dos equipos es None → resolución automática 3-0
            if local is None and visitante is not None:
                p.goles_local = 0
                p.goles_visitante = 3
                p.estado = EstadoPartidoTorneo.finalizado
            elif visitante is None and local is not None:
                p.goles_local = 3
                p.goles_visitante = 0
                p.estado = EstadoPartidoTorneo.finalizado
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

                # Si alguno de los padres ya fue resuelto como bye, propagar el ganador
                if padre_1.estado == EstadoPartidoTorneo.finalizado:
                    nuevo_partido.equipo_local_id = _ganador_id(padre_1)
                if padre_2.estado == EstadoPartidoTorneo.finalizado:
                    nuevo_partido.equipo_visitante_id = _ganador_id(padre_2)

                todos_los_partidos.append(nuevo_partido)
                partidos_nueva_ronda.append(nuevo_partido)
            
            partidos_ronda_anterior = partidos_nueva_ronda
            fase_actual = fase_siguiente
            
        return todos_los_partidos


def _ganador_id(partido: PartidoTorneo) -> int | None:
    """Devuelve el id del equipo ganador de un partido ya finalizado."""
    if partido.goles_local is None or partido.goles_visitante is None:
        return None
    if partido.goles_local > partido.goles_visitante:
        return partido.equipo_local_id
    if partido.goles_visitante > partido.goles_local:
        return partido.equipo_visitante_id
    return None  # empate (no debería ocurrir en eliminación directa)