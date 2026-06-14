from .fixture_generator import FixtureGenerator
from ...models.partido_torneo import (
    PartidoTorneo,
    FaseTorneo,
)

class TodosContraTodosGenerator(FixtureGenerator):

    def generar(self, torneo):

        equipos = list(torneo.equipos_inscriptos)

        partidos = []

        for i in range(len(equipos)):
            for j in range(i + 1, len(equipos)):

                local = equipos[i]
                visitante = equipos[j]


                partidos.append(
                    PartidoTorneo(
                        torneo_id=torneo.id,
                        equipo_local_id=local.id,
                        equipo_visitante_id=visitante.id,
                        fase=FaseTorneo.liga,
                    )
                )

                if torneo.ida_y_vuelta:

                    partidos.append(
                        PartidoTorneo(
                            torneo_id=torneo.id,
                            equipo_local_id=visitante.id,
                            equipo_visitante_id=local.id,
                            fase=FaseTorneo.liga,
                        )
                    )
    
        return partidos