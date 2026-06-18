from ...models.torneo_model import FormatoTorneo
from .eliminacion_directa_generator import (
    EliminacionDirectaGenerator
)
from .todos_contra_todos_generator import (
    TodosContraTodosGenerator
)
from .fase_grupos_generator import FaseGruposGenerator


class FixtureFactory:

    GENERATORS = {
        FormatoTorneo.eliminacion_directa: EliminacionDirectaGenerator,
        FormatoTorneo.todos_contra_todos: TodosContraTodosGenerator,
        FormatoTorneo.fase_grupos: FaseGruposGenerator,
    }

    @classmethod
    def crear(cls, formato):

        generator_class = cls.GENERATORS.get(formato)

        if not generator_class:
            raise ValueError(
                f"Formato {formato} no soportado"
            )

        return generator_class()