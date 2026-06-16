from random import shuffle

from .fixture_generator import FixtureGenerator
from ...models.partido_torneo import (
    PartidoTorneo,
    FaseTorneo,
)


class TodosContraTodosGenerator(FixtureGenerator):

    def generar(self, torneo):
        equipos = list(torneo.equipos_inscriptos)
        shuffle(equipos)

        rondas_ida = _generar_rondas_round_robin(equipos)

        partidos = []

        for numero_fecha, emparejamientos in enumerate(rondas_ida, start=1):
            for local, visitante in emparejamientos:
                partidos.append(
                    PartidoTorneo(
                        torneo_id=torneo.id,
                        equipo_local_id=local.id,
                        equipo_visitante_id=visitante.id,
                        fase=FaseTorneo.liga,
                        numero_fecha=numero_fecha,
                    )
                )

        if torneo.ida_y_vuelta:
            offset = len(rondas_ida)
            for numero_fecha, emparejamientos in enumerate(rondas_ida, start=offset + 1):
                for local, visitante in emparejamientos:
                    partidos.append(
                        PartidoTorneo(
                            torneo_id=torneo.id,
                            equipo_local_id=visitante.id,
                            equipo_visitante_id=local.id,
                            fase=FaseTorneo.liga,
                            numero_fecha=numero_fecha,
                        )
                    )

        return partidos


def _generar_rondas_round_robin(equipos):
    """
    Algoritmo circle method para round-robin.
    """
    lista = list(equipos)
    if len(lista) % 2 != 0:
        lista.append(None)  # equipo fantasma para cantidad impar

    n = len(lista)
    rondas = []

    for ronda_idx in range(n - 1):
        emparejamientos = []
        for i in range(n // 2):
            local = lista[i]
            visitante = lista[n - 1 - i]
            if local is not None and visitante is not None:
                emparejamientos.append((local, visitante))
        rondas.append(emparejamientos)

        # Rotar: fijar el primero, rotar el resto en sentido horario
        lista = [lista[0]] + [lista[-1]] + lista[1:-1]

    return rondas