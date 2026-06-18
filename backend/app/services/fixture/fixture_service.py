from .fixture_factory import FixtureFactory


class FixtureService:

    @staticmethod
    def generar(torneo):

        generator = FixtureFactory.crear(
            torneo.formato
        )

        return generator.generar(torneo)
    