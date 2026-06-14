from random import shuffle

from ...core.exceptions import DomainRuleError

from .fixture_generator import FixtureGenerator
from ...models.partido_torneo import (
    PartidoTorneo,
    FaseTorneo,
)


class FaseGruposGenerator(FixtureGenerator):

    GRUPOS_POR_FASE = {
        "semis": 2,
        "cuartos": 4,
        "octavos": 8,
    }

    NOMBRES_GRUPOS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    
    EQUIPOS_VALIDOS = {
        "semis": {6, 8, 10},
        "cuartos": {12, 16, 20},
        "octavos": {24, 32, 40},
    }

    def generar(self, torneo):
        equipos = list(torneo.equipos_inscriptos)

        if torneo.fase_final not in self.GRUPOS_POR_FASE:
            raise DomainRuleError(
                "Fase final inválida"
            )

        cantidad = len(equipos)

        if cantidad not in self.EQUIPOS_VALIDOS[torneo.fase_final]:
            raise DomainRuleError(
                "Cantidad de equipos inválida para la fase final seleccionada"
            )

        shuffle(equipos)

        cantidad_grupos = self.GRUPOS_POR_FASE[
            torneo.fase_final
        ]

        grupos = [
            []
            for _ in range(cantidad_grupos)
        ]

        for i, equipo in enumerate(equipos):
            grupos[i % cantidad_grupos].append(equipo)

        partidos = []
        for indice_grupo, grupo in enumerate(grupos):
            nombre_grupo = self.NOMBRES_GRUPOS[indice_grupo]
            for i in range(len(grupo)):
                for j in range(i + 1, len(grupo)):
                    partidos.append(
                        PartidoTorneo(
                            torneo_id=torneo.id,
                            equipo_local_id=grupo[i].id,
                            equipo_visitante_id=grupo[j].id,
                            fase=FaseTorneo.grupos,
                            grupo=nombre_grupo,
                        )
                    )

        return partidos