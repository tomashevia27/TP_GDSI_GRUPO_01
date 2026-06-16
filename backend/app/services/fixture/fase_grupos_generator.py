from random import shuffle

from ...core.exceptions import DomainRuleError

from .fixture_generator import FixtureGenerator
from .todos_contra_todos_generator import _generar_rondas_round_robin
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
    
    MINIMOS_EQUIPOS = {
        "semis": 4,
        "cuartos": 8,
        "octavos": 16,
    }

    def generar(self, torneo):
        equipos = list(torneo.equipos_inscriptos)
        cantidad = len(equipos)

        if torneo.fase_final not in self.GRUPOS_POR_FASE:
            raise DomainRuleError(
                "Fase final inválida"
            )

        if cantidad < self.MINIMOS_EQUIPOS[torneo.fase_final]:
            raise DomainRuleError(
                f"Para una fase final de {torneo.fase_final}, necesitas al menos {self.MINIMOS_EQUIPOS[torneo.fase_final]} equipos."
            )

        shuffle(equipos)

        cantidad_grupos = self.GRUPOS_POR_FASE[torneo.fase_final]

        grupos = [
            []
            for _ in range(cantidad_grupos)
        ]

        for i, equipo in enumerate(equipos):
            grupos[i % cantidad_grupos].append(equipo)

        partidos = []
        for indice_grupo, grupo in enumerate(grupos):
            nombre_grupo = self.NOMBRES_GRUPOS[indice_grupo]
            rondas = _generar_rondas_round_robin(grupo)

            for numero_fecha, emparejamientos in enumerate(rondas, start=1):
                for local, visitante in emparejamientos:
                    partidos.append(
                        PartidoTorneo(
                            torneo_id=torneo.id,
                            equipo_local_id=local.id,
                            equipo_visitante_id=visitante.id,
                            fase=FaseTorneo.grupos,
                            grupo=nombre_grupo,
                            numero_fecha=numero_fecha,
                        )
                    )

        return partidos