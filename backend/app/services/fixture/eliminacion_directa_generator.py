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

    def generar(self, torneo):

        equipos = list(torneo.equipos_inscriptos)

        cantidad = len(equipos)

        if cantidad not in self.FASE_INICIAL:
            raise DomainRuleError(
                "Cantidad de equipos inválida para eliminación directa"
            )

        shuffle(equipos)

        fase = self.FASE_INICIAL[cantidad]

        partidos = []

        for i in range(0, cantidad, 2):

            partidos.append(
                PartidoTorneo(
                    torneo_id=torneo.id,
                    equipo_local_id=equipos[i].id,
                    equipo_visitante_id=equipos[i + 1].id,
                    fase=fase,
                )
            )

        return partidos