from abc import ABC, abstractmethod

class FixtureGenerator(ABC):

    @abstractmethod
    def generar(self, torneo):
        pass
