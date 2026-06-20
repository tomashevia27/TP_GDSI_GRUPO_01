from fastapi import APIRouter, Depends, status, HTTPException
from typing import List
from sqlalchemy.orm import Session

from ..core.db import engine
from ..core.dependencies import get_current_user, get_db
from ..schemas.torneo_schemas import MisTorneosResponse, TorneoCreate, TorneoUpdate, TorneoResponse, TorneoListado, TorneoDetalleResponse
from ..schemas.usuario_schemas import UsuarioRespuesta
from ..models.usuario_model import Usuario
from ..services import torneo_service, partido_torneo_service
from ..repositories import torneo_repository
from ..schemas.equipo_schemas import InscripcionEquipoCreate, EquipoResponse
from ..schemas.partido_torneo_schemas import (
    PartidoTorneoResponse,
    ProgramarPartidoRequest,
    CargarResultadoRequest,
    EstadisticasTorneoResponse,
    BracketResponse,
    FixtureResponse,
)
from ..schemas.partido_torneo_schemas import TopJugadorResponse, TablaPosicionResponse, VallaInvictaResponse
from ..models.partido_torneo import PartidoTorneo
 

router = APIRouter(
    prefix="/api/torneos",
    tags=["Torneos"]
)


@router.post("/", response_model=TorneoResponse, status_code=status.HTTP_201_CREATED)
def crear_torneo(
    torneo_in: TorneoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crea un nuevo torneo. 
    Queda asociado al usuario creador (organizador) y con estado Abierto para inscripción.
    """
    return torneo_service.crear_torneo(db, torneo_in, current_user.id)
    

@router.patch("/{torneo_id}", response_model=TorneoResponse)
def editar_torneo(
    torneo_id: int,
    torneo_in: TorneoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Edita la configuración de un torneo que aún no comenzó (estado abierto).
    """
    return torneo_service.editar_torneo(db, torneo_id, torneo_in, current_user.id)



@router.get("/", response_model=List[TorneoListado])
def listar_torneos_abiertos(db: Session = Depends(get_db)):
    """Lista torneos que están abiertos para inscripción."""
    return torneo_service.listar_torneos_abiertos(db)


@router.get("/mis-torneos", response_model=MisTorneosResponse)
def obtener_mis_torneos(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return torneo_service.listar_mis_torneos(db, current_user.id)

@router.get("/{torneo_id}", response_model=TorneoDetalleResponse)
def obtener_torneo(
    torneo_id: int,
    db: Session = Depends(get_db)
):
    torneo = torneo_repository.obtener_por_id(db, torneo_id)
    if not torneo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Torneo no encontrado")

    return torneo


@router.post("/{torneo_id}/inscripciones", response_model=EquipoResponse, status_code=status.HTTP_201_CREATED)
def inscribir_equipo_a_torneo(
    torneo_id: int,
    inscripcion_in: InscripcionEquipoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Inscribe un nuevo equipo con sus jugadores a un torneo específico.
    """
    return torneo_service.inscribir_equipo(db, torneo_id, inscripcion_in, current_user.id)

@router.delete("/{torneo_id}/inscripciones", response_model=TorneoResponse)
def bajar_equipo_de_torneo(
    torneo_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Da de baja al equipo del usuario del torneo.
    """
    return torneo_service.bajar_equipo(db, torneo_id, current_user.id)

@router.post("/{torneo_id}/cancelar", response_model=TorneoResponse)
def cancelar_torneo(
    torneo_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return torneo_service.cancelar_torneo(db, torneo_id, current_user.id)

@router.post(
    "/{torneo_id}/fixture",
    response_model=list[PartidoTorneoResponse]
)
def generar_fixture(
    torneo_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return torneo_service.generar_fixture(
        db,
        torneo_id,
        current_user.id
    )

@router.get(
    "/{torneo_id}/partidos",
    response_model=list[PartidoTorneoResponse]
)
def obtener_partidos_torneo(
    torneo_id: int,
    db: Session = Depends(get_db)
):
    return partido_torneo_service.obtener_partidos_torneo(db, torneo_id)

@router.put("/partidos/{partido_id}", response_model=PartidoTorneoResponse)
def programar_partido_torneo(
    partido_id: int,
    data: ProgramarPartidoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return partido_torneo_service.programar_partido(db, partido_id, data, current_user.id)

@router.post("/partidos/{partido_id}/resultado", response_model=PartidoTorneoResponse)
def cargar_resultado_partido_torneo(
    partido_id: int,
    data: CargarResultadoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return partido_torneo_service.cargar_resultado_partido(db, partido_id, data)


@router.get("/{torneo_id}/estadisticas", response_model=EstadisticasTorneoResponse)
def obtener_estadisticas_torneo(
    torneo_id: int,
    db: Session = Depends(get_db),
):
    return partido_torneo_service.obtener_estadisticas_torneo(db, torneo_id)

@router.get("/{torneo_id}/top/goleadores", response_model=list[TopJugadorResponse])
def obtener_top_goleadores(torneo_id: int, limit: int = 10, db: Session = Depends(get_db)):
    return partido_torneo_service.top_jugadores_por_goles(db, torneo_id, limit)


@router.get("/{torneo_id}/top/amarillas", response_model=list[TopJugadorResponse])
def obtener_top_amarillas(torneo_id: int, limit: int = 10, db: Session = Depends(get_db)):
    return partido_torneo_service.top_jugadores_por_amarillas(db, torneo_id, limit)


@router.get("/{torneo_id}/top/rojas", response_model=list[TopJugadorResponse])
def obtener_top_rojas(torneo_id: int, limit: int = 10, db: Session = Depends(get_db)):
    return partido_torneo_service.top_jugadores_por_rojas(db, torneo_id, limit)

@router.get("/{torneo_id}/top/vallas-invictas", response_model=list[VallaInvictaResponse])
def obtener_vallas_invictas(torneo_id: int, limit: int = 10, db: Session = Depends(get_db)):
    return partido_torneo_service.top_equipos_vallas_invictas(db, torneo_id, limit)


@router.get("/{torneo_id}/tabla-posiciones", response_model=list[TablaPosicionResponse])
def obtener_tabla_posiciones(torneo_id: int, db: Session = Depends(get_db)):
    return partido_torneo_service.tabla_posiciones_torneo(db, torneo_id)


@router.get("/{torneo_id}/jugador/{usuario_id}/estadisticas", response_model=list["PlayerStatPerMatchResponse"])
def obtener_estadisticas_jugador_en_torneo(torneo_id: int, usuario_id: int, db: Session = Depends(get_db)):
    return partido_torneo_service.estadisticas_jugador_por_torneo(db, torneo_id, usuario_id)

@router.get("/{torneo_id}/bracket", response_model=BracketResponse)
def get_bracket(torneo_id: int, db: Session = Depends(get_db)):
    return partido_torneo_service.obtener_bracket_torneo(db, torneo_id)

@router.get("/{torneo_id}/fixture", response_model=FixtureResponse)
def obtener_fixture(torneo_id: int, db: Session = Depends(get_db)):
    return partido_torneo_service.obtener_fixture_por_fechas(db, torneo_id)