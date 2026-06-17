"use client"

import { useEffect, useState } from "react"
import {
  PartidoTorneoData,
  PartidoBracketData,
  FechaFixtureData,
  RondaBracketData,
  generarFixture,
  getFixtureTorneo,
  getFixturePorFechas,
  getBracketTorneo,
  TorneoData,
} from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { CargarResultadoModal } from "./CargarResultadoModal"
import { ProgramarPartidoModal } from "./ProgramarPartidoModal"
import { Loader2, Calendar, Trophy, Clock, GitFork } from "lucide-react"
import Swal from "sweetalert2"

interface Props {
  torneo: TorneoData
  isOrganizer: boolean
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const FASE_LABELS: Record<string, string> = {
  liga: "Liga",
  grupos: "Fase de Grupos",
  dieciseisavos: "Dieciseisavos de Final",
  octavos: "Octavos de Final",
  cuartos: "Cuartos de Final",
  semifinal: "Semifinales",
  final: "Final",
}

function equipoNombre(e?: { nombre?: string; nombre_equipo?: string } | null) {
  return e?.nombre || e?.nombre_equipo || "TBD"
}

// ─── Mini-card de partido (reutilizable) ─────────────────────────────────────

function PartidoCard({
  partido,
  isOrganizer,
  hoy,
  onProgramar,
  onResultado,
  // Si viene de PartidoTorneoData (con jugadores, etc)
  full,
}: {
  partido: PartidoBracketData | PartidoTorneoData
  isOrganizer: boolean
  hoy: string
  onProgramar: (p: PartidoTorneoData) => void
  onResultado: (p: PartidoTorneoData) => void
  full?: boolean
}) {
  const p = partido as PartidoTorneoData // PartidoBracketData es compatible en los campos que usamos
  const estaProgramado = !!p.fecha && !!p.horario
  const esFinalizado = p.estado === "finalizado"
  const fechaPasada = p.fecha ? p.fecha <= hoy : false
  const tieneEquipos = !!(p.equipo_local && p.equipo_visitante)
  const puedeCargarResultado =
    isOrganizer && estaProgramado && !esFinalizado && fechaPasada && tieneEquipos

  const localNombre = equipoNombre(p.equipo_local)
  const visitanteNombre = equipoNombre(p.equipo_visitante)

  return (
    <div className="border rounded-xl bg-card shadow-sm flex flex-col overflow-hidden">
      {/* Header: estado + fecha/hora */}
      <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {(p as any).grupo && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Grupo {(p as any).grupo}
            </span>
          )}
          {esFinalizado ? (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
              Finalizado
            </span>
          ) : estaProgramado ? (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
              Programado
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              PRÓXIMAMENTE
            </span>
          )}
        </div>
        {estaProgramado && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            <span>
              {new Date(p.fecha + "T00:00:00").toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "short",
              })}{" "}
              {p.horario?.slice(0, 5)}
            </span>
          </div>
        )}
      </div>

      {/* Equipos y resultado */}
      <div className="px-4 py-4 flex items-center justify-between gap-2">
        <span className="font-bold text-sm flex-1 truncate" title={localNombre}>
          {localNombre}
        </span>
        <div className="flex-shrink-0 px-3 py-1.5 bg-muted rounded-lg text-center min-w-[60px]">
          {esFinalizado ? (
            <span className="font-bold text-lg text-foreground">
              {p.goles_local} – {p.goles_visitante}
            </span>
          ) : (
            <span className="font-bold text-primary text-sm">vs</span>
          )}
        </div>
        <span className="font-bold text-sm flex-1 truncate text-right" title={visitanteNombre}>
          {visitanteNombre}
        </span>
      </div>

      {/* Botones organizador */}
      {isOrganizer && !esFinalizado && tieneEquipos && (
        <div className="px-4 pb-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => onProgramar(p)}
          >
            <Calendar className="h-3.5 w-3.5" />
            {estaProgramado ? "Reprogramar" : "Programar"}
          </Button>
          <Button
            variant={puedeCargarResultado ? "default" : "secondary"}
            size="sm"
            className="flex-1 gap-1.5"
            disabled={!puedeCargarResultado}
            onClick={() => puedeCargarResultado && onResultado(p)}
            title={
              !estaProgramado
                ? "Primero programá el partido"
                : !fechaPasada
                  ? "El partido aún no se ha jugado"
                  : ""
            }
          >
            Cargar Resultado
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Vista de Fechas (liga / grupos con numero_fecha) ───────────────────────

function FixturePorFechas({
  torneoId,
  isOrganizer,
  torneo,
  hoy,
  onProgramar,
  onResultado,
}: {
  torneoId: number
  isOrganizer: boolean
  torneo: TorneoData
  hoy: string
  onProgramar: (p: PartidoTorneoData) => void
  onResultado: (p: PartidoTorneoData) => void
}) {
  const [fechas, setFechas] = useState<FechaFixtureData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getFixturePorFechas(torneoId)
      .then((r) => setFechas(r.fechas))
      .catch(() => setFechas([]))
      .finally(() => setIsLoading(false))
  }, [torneoId])

  if (isLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  if (fechas.length === 0) return null // el padre ya maneja el empty state

  return (
    <div className="space-y-8">
      {fechas.map((fecha) => (
        <div key={fecha.numero}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground px-2">
              Fecha {fecha.numero}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fecha.partidos.map((p) => (
              <PartidoCard
                key={p.id}
                partido={p}
                isOrganizer={isOrganizer}
                hoy={hoy}
                onProgramar={onProgramar}
                onResultado={onResultado}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Vista por fase (sin numero_fecha, fallback) ─────────────────────────────

function FixturePorFase({
  partidos,
  isOrganizer,
  hoy,
  onProgramar,
  onResultado,
}: {
  partidos: PartidoTorneoData[]
  isOrganizer: boolean
  hoy: string
  onProgramar: (p: PartidoTorneoData) => void
  onResultado: (p: PartidoTorneoData) => void
}) {
  const ORDEN_FASES = ["liga", "grupos", "dieciseisavos", "octavos", "cuartos", "semifinal", "final"]

  const porFase = partidos.reduce((acc, p) => {
    if (!acc[p.fase]) acc[p.fase] = []
    acc[p.fase].push(p)
    return acc
  }, {} as Record<string, PartidoTorneoData[]>)

  const fasesOrdenadas = ORDEN_FASES.filter((f) => porFase[f])

  return (
    <div className="space-y-10">
      {fasesOrdenadas.map((fase) => (
        <div key={fase}>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-border" />
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground px-2">
              {FASE_LABELS[fase] || fase}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {porFase[fase].map((p) => (
              <PartidoCard
                key={p.id}
                partido={p}
                isOrganizer={isOrganizer}
                hoy={hoy}
                onProgramar={onProgramar}
                onResultado={onResultado}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Vista de Bracket (eliminación directa) ───────────────────────────────────

function BracketView({
  torneoId,
  isOrganizer,
  hoy,
  onProgramar,
  onResultado,
}: {
  torneoId: number
  isOrganizer: boolean
  hoy: string
  onProgramar: (p: PartidoTorneoData) => void
  onResultado: (p: PartidoTorneoData) => void
}) {
  const [rondas, setRondas] = useState<RondaBracketData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getBracketTorneo(torneoId)
      .then((r) => setRondas(r.rondas))
      .catch(() => setRondas([]))
      .finally(() => setIsLoading(false))
  }, [torneoId])

  if (isLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
  if (rondas.length === 0) return null

  const RONDA_LABEL: Record<string, string> = {
    final: "Final",
    semifinal: "Semifinales",
    cuartos: "Cuartos de Final",
    octavos: "Octavos de Final",
    dieciseisavos: "Dieciseisavos de Final",
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-6">
        <GitFork className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-base">Llave del Torneo</h2>
      </div>

      {/* Bracket horizontal: columnas por ronda */}
      <div className="overflow-x-auto pb-4">
        <div
          className="flex gap-6 min-w-max"
          style={{ alignItems: "flex-start" }}
        >
          {/* Las rondas vienen ordenadas de la más grande a la final */}
          {[...rondas].reverse().map((ronda, ri) => (
            <div key={ronda.nombre} className="flex flex-col gap-4 min-w-[200px]">
              {/* Título de ronda */}
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center pb-1 border-b">
                {RONDA_LABEL[ronda.nombre.toLowerCase()] || ronda.nombre}
              </div>

              {/* Partidos de esta ronda, centrados verticalmente entre sus padres */}
              <div
                className="flex flex-col gap-3"
                style={{
                  // Dar espacio proporcional al número de partidos para alinear con la ronda anterior
                  paddingTop: ri === 0 ? 0 : `${(Math.pow(2, ri) - 1) * 36}px`,
                  gap: `${Math.pow(2, ri + 1) * 36}px`,
                }}
              >
                {ronda.partidos.map((p) => {
                  const esFinalizado = p.estado === "finalizado"
                  const localNombre = equipoNombre(p.equipo_local)
                  const visitanteNombre = equipoNombre(p.equipo_visitante)

                  return (
                    <div
                      key={p.id}
                      className="border rounded-lg bg-card shadow-sm overflow-hidden"
                    >
                      {/* Equipo local */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 border-b ${esFinalizado && (p.goles_local ?? 0) > (p.goles_visitante ?? 0)
                            ? "bg-primary/10 font-bold"
                            : ""
                          }`}
                      >
                        <span className="text-xs truncate flex-1" title={localNombre}>
                          {localNombre}
                        </span>
                        <span className="text-xs font-bold text-primary ml-2 w-4 text-right">
                          {esFinalizado ? p.goles_local : ""}
                        </span>
                      </div>
                      {/* Equipo visitante */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 ${esFinalizado && (p.goles_visitante ?? 0) > (p.goles_local ?? 0)
                            ? "bg-primary/10 font-bold"
                            : ""
                          }`}
                      >
                        <span className="text-xs truncate flex-1" title={visitanteNombre}>
                          {visitanteNombre}
                        </span>
                        <span className="text-xs font-bold text-primary ml-2 w-4 text-right">
                          {esFinalizado ? p.goles_visitante : ""}
                        </span>
                      </div>

                      {/* Fecha si está programado */}
                      {p.fecha && (
                        <div className="px-3 py-1 bg-muted/30 text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(p.fecha + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FixtureTab({ torneo, isOrganizer }: Props) {
  const [partidos, setPartidos] = useState<PartidoTorneoData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedPartido, setSelectedPartido] = useState<PartidoTorneoData | null>(null)
  const [modalResultado, setModalResultado] = useState(false)
  const [modalProgramar, setModalProgramar] = useState(false)

  const hoy = new Date().toISOString().split("T")[0]

  const loadFixture = async () => {
    try {
      const data = await getFixtureTorneo(torneo.id)
      setPartidos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFixture()
  }, [torneo.id])

  const handleGenerar = async () => {
    setIsGenerating(true)
    try {
      const data = await generarFixture(torneo.id)
      setPartidos(data)
      Swal.fire("¡Fixture generado!", "Los partidos fueron creados correctamente.", "success")
    } catch (e: any) {
      Swal.fire("Error", e.message || "No se pudo generar el fixture", "error")
    } finally {
      setIsGenerating(false)
    }
  }

  const abrirProgramar = (p: PartidoTorneoData) => { setSelectedPartido(p); setModalProgramar(true) }
  const abrirResultado = (p: PartidoTorneoData) => { setSelectedPartido(p); setModalResultado(true) }

  if (isLoading) {
    return <div className="py-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
  }

  if (partidos.length === 0) {
    return (
      <div className="py-16 text-center border rounded-xl bg-card">
        <Trophy className="h-12 w-12 text-muted-foreground opacity-40 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">El fixture aún no está generado</h3>
        <p className="text-muted-foreground mb-6">
          Los partidos se programarán cuando el organizador lo decida.
        </p>
        {isOrganizer && torneo.estado === "Abierto para inscripción" && (
          <Button onClick={handleGenerar} disabled={isGenerating}>
            {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando...</> : "Generar Fixture"}
          </Button>
        )}
      </div>
    )
  }

  // Separar fases de liga/grupos (con numero_fecha) de las eliminatorias
  const fasesConFecha = ["liga", "grupos"]
  const fasesEliminatorias = ["dieciseisavos", "octavos", "cuartos", "semifinal", "final"]

  const tienePartidosConFecha = partidos.some(
    (p) => fasesConFecha.includes(p.fase) && p.numero_fecha !== undefined && p.numero_fecha !== null
  )
  const tienePartidosFase = partidos.some((p) => fasesConFecha.includes(p.fase))
  const tieneEliminatorias = partidos.some((p) => fasesEliminatorias.includes(p.fase))

  // Partidos de fases de liga/grupos sin numero_fecha (fallback)
  const partidosSinFecha = partidos.filter(
    (p) => fasesConFecha.includes(p.fase) && !p.numero_fecha
  )

  return (
    <div className="space-y-2">
      {/* ── Sección liga/grupos ── */}
      {tienePartidosFase && (
        <section>
          {tienePartidosConFecha ? (
            // Usa el nuevo endpoint /fixture agrupado por fecha
            <FixturePorFechas
              torneoId={torneo.id}
              isOrganizer={isOrganizer}
              torneo={torneo}
              hoy={hoy}
              onProgramar={abrirProgramar}
              onResultado={abrirResultado}
            />
          ) : (
            // Fallback: agrupa por fase (partidos sin numero_fecha)
            <FixturePorFase
              partidos={partidosSinFecha.length > 0 ? partidosSinFecha : partidos.filter(p => fasesConFecha.includes(p.fase))}
              isOrganizer={isOrganizer}
              hoy={hoy}
              onProgramar={abrirProgramar}
              onResultado={abrirResultado}
            />
          )}
        </section>
      )}

      {/* ── Sección eliminatorias (lista por fase + bracket) ── */}
      {tieneEliminatorias && (
        <section>
          {/* Lista de partidos eliminatorios por fase */}
          <FixturePorFase
            partidos={partidos.filter((p) => fasesEliminatorias.includes(p.fase))}
            isOrganizer={isOrganizer}
            hoy={hoy}
            onProgramar={abrirProgramar}
            onResultado={abrirResultado}
          />

          {/* Bracket visual */}
          <BracketView
            torneoId={torneo.id}
            isOrganizer={isOrganizer}
            hoy={hoy}
            onProgramar={abrirProgramar}
            onResultado={abrirResultado}
          />
        </section>
      )}

      {/* Modales */}
      <CargarResultadoModal
        isOpen={modalResultado}
        partido={selectedPartido}
        onClose={() => { setModalResultado(false); setSelectedPartido(null) }}
        onSuccess={loadFixture}
      />
      <ProgramarPartidoModal
        isOpen={modalProgramar}
        partido={selectedPartido}
        torneo={torneo}
        onClose={() => { setModalProgramar(false); setSelectedPartido(null) }}
        onSuccess={loadFixture}
      />
    </div>
  )
}
