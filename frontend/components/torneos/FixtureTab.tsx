"use client"

import { useEffect, useState, Fragment } from "react"
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
  const p = partido as PartidoTorneoData
  const estaProgramado = !!p.fecha && !!p.horario
  const esFinalizado = p.estado === "finalizado"
  const fechaPasada = p.fecha ? p.fecha <= hoy : false
  const tieneEquipos = !!(p.equipo_local && p.equipo_visitante)
  const puedeCargarResultado =
    isOrganizer && estaProgramado && !esFinalizado && fechaPasada && tieneEquipos

  const localNombre = equipoNombre(p.equipo_local)
  const visitanteNombre = equipoNombre(p.equipo_visitante)
  
  const localGoles = p.goles_local ?? 0
  const visitanteGoles = p.goles_visitante ?? 0
  const localGana = esFinalizado && localGoles > visitanteGoles
  const visitanteGana = esFinalizado && visitanteGoles > localGoles

  // Map group names to specific tailwind colors for badges
  const groupColor = p.grupo ? {
    'A': 'bg-primary/20 text-primary border-primary/30',
    'B': 'bg-accent/20 text-accent border-accent/30',
    'C': 'bg-chart-3/20 text-chart-3 border-chart-3/30',
    'D': 'bg-chart-4/20 text-chart-4 border-chart-4/30',
    'E': 'bg-chart-5/20 text-chart-5 border-chart-5/30',
  }[p.grupo.toUpperCase()] || 'bg-secondary text-secondary-foreground border-border' : ''

  return (
    <div className={`border rounded-xl bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col overflow-hidden relative group ${esFinalizado ? 'border-primary/20' : ''}`}>
      {/* Accent Top Bar */}
      {esFinalizado && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />}
      {!esFinalizado && estaProgramado && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />}

      {/* Header: estado + fecha/hora + grupo */}
      <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {esFinalizado ? (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
              Finalizado
            </span>
          ) : estaProgramado ? (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 rounded-full">
              Programado
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">
              Próximamente
            </span>
          )}
          
          {p.grupo && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${groupColor}`}>
              Grupo {p.grupo}
            </span>
          )}
        </div>
        {estaProgramado && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0 group-hover:text-foreground transition-colors">
            <Clock className="h-3.5 w-3.5 text-primary/70" />
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
      <div className="px-4 py-5 flex items-center justify-between gap-3 relative">
        <div className={`flex-1 text-right min-w-0 ${localGana ? 'font-bold text-foreground scale-105' : 'font-medium text-foreground/80'} transition-transform origin-right`}>
          <div className="truncate text-sm sm:text-base flex items-center justify-end gap-2" title={localNombre}>
            {localGana && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            <span className="truncate">{localNombre}</span>
          </div>
        </div>
        
        <div className="flex-shrink-0 relative">
          {esFinalizado ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
              <span className={`text-lg sm:text-xl font-bold w-6 text-center text-foreground`}>{localGoles}</span>
              <span className="text-muted-foreground/50 text-sm">-</span>
              <span className={`text-lg sm:text-xl font-bold w-6 text-center text-foreground`}>{visitanteGoles}</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-muted rounded-full">
              <span className="font-bold text-muted-foreground text-xs uppercase tracking-widest">vs</span>
            </div>
          )}
        </div>

        <div className={`flex-1 text-left min-w-0 ${visitanteGana ? 'font-bold text-foreground scale-105' : 'font-medium text-foreground/80'} transition-transform origin-left`}>
          <div className="truncate text-sm sm:text-base flex items-center justify-start gap-2" title={visitanteNombre}>
            <span className="truncate">{visitanteNombre}</span>
            {visitanteGana && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
          </div>
        </div>
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
  partidos,
}: {
  torneoId: number
  isOrganizer: boolean
  torneo: TorneoData
  hoy: string
  onProgramar: (p: PartidoTorneoData) => void
  onResultado: (p: PartidoTorneoData) => void
  partidos: PartidoTorneoData[]
}) {
  const [fechas, setFechas] = useState<FechaFixtureData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getFixturePorFechas(torneoId)
      .then((r) => setFechas(r.fechas))
      .catch(() => setFechas([]))
      .finally(() => setIsLoading(false))
  }, [torneoId, partidos])

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
  partidos,
}: {
  torneoId: number
  isOrganizer: boolean
  hoy: string
  onProgramar: (p: PartidoTorneoData) => void
  onResultado: (p: PartidoTorneoData) => void
  partidos: PartidoTorneoData[]
}) {
  const [rondas, setRondas] = useState<RondaBracketData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getBracketTorneo(torneoId)
      .then((r) => setRondas(r.rondas))
      .catch(() => setRondas([]))
      .finally(() => setIsLoading(false))
  }, [torneoId, partidos])

  if (isLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
  if (rondas.length === 0) return null

  const RONDA_LABEL: Record<string, string> = {
    final: "Final",
    semifinal: "Semifinales",
    cuartos: "Cuartos de Final",
    octavos: "Octavos de Final",
    dieciseisavos: "Dieciseisavos de Final",
  }

  // De más partidos (primera ronda) a menos (final)
  const rondasOrdenadas = [...rondas].reverse()
  const maxMatches = Math.max(...rondasOrdenadas.map(r => r.partidos.length), 1)
  const CARD_SLOT = 180  // px por slot — totalHeight = espacio disponible para justify-around
  const totalHeight = maxMatches * CARD_SLOT

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-6">
        <GitFork className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-base">Llave del Torneo</h2>
      </div>

      <div className="overflow-x-auto pb-6">
        <div className="flex w-full min-w-max items-stretch">
          {rondasOrdenadas.map((ronda, ri) => {
            const rondaLabel = RONDA_LABEL[ronda.nombre.toLowerCase()] || ronda.nombre
            const isFinal = ri === rondasOrdenadas.length - 1

            return (
              <Fragment key={ronda.nombre}>
                {/* Columna de ronda */}
                <div className="flex flex-col flex-1 min-w-[220px]">
                  {/* Título de ronda */}
                  <div className={`
                    text-center text-[11px] font-bold uppercase tracking-widest mb-3 py-1.5 px-2 rounded-lg mx-1
                    ${isFinal ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/60 text-muted-foreground"}
                  `}>
                    {rondaLabel}
                  </div>

                  {/* Partidos — justify-around centra cada uno entre sus "hijos" */}
                  <div className="flex flex-col justify-around flex-1" style={{ minHeight: totalHeight }}>
                    {ronda.partidos.map((p) => {
                      const esFinalizado = p.estado === "finalizado"
                      const localNombre = equipoNombre(p.equipo_local)
                      const visitanteNombre = equipoNombre(p.equipo_visitante)
                      const localGana = esFinalizado && (p.goles_local ?? 0) > (p.goles_visitante ?? 0)
                      const visitanteGana = esFinalizado && (p.goles_visitante ?? 0) > (p.goles_local ?? 0)
                      const esTBD = localNombre === "TBD" || visitanteNombre === "TBD"

                      return (
                        <div
                          key={p.id}
                          className={`
                            border rounded-xl bg-card overflow-hidden mx-1 transition-all
                            ${esFinalizado ? "shadow-md border-green-200 dark:border-green-900/40" : "shadow-sm hover:shadow-md"}
                            ${isFinal ? "ring-2 ring-primary/20" : ""}
                          `}
                        >
                          {/* Fila equipo local */}
                          <div className={`flex items-center justify-between px-3 py-2.5 border-b transition-colors ${localGana ? "bg-primary/10 dark:bg-primary/15" : ""}`}>
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {localGana && <span className="text-amber-500 text-[10px] shrink-0">🏆</span>}
                              <span
                                className={`text-xs truncate ${localGana ? "font-bold text-primary" : esTBD ? "text-muted-foreground/50 italic" : "font-medium text-foreground"}`}
                                title={localNombre}
                              >
                                {localNombre}
                              </span>
                            </div>
                            {esFinalizado && (
                              <span className={`text-sm font-bold ml-2 min-w-[20px] text-right shrink-0 ${localGana ? "text-primary" : "text-muted-foreground"}`}>
                                {p.goles_local}
                              </span>
                            )}
                          </div>

                          {/* Fila equipo visitante */}
                          <div className={`flex items-center justify-between px-3 py-2.5 transition-colors ${visitanteGana ? "bg-primary/10 dark:bg-primary/15" : ""}`}>
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {visitanteGana && <span className="text-amber-500 text-[10px] shrink-0">🏆</span>}
                              <span
                                className={`text-xs truncate ${visitanteGana ? "font-bold text-primary" : esTBD ? "text-muted-foreground/50 italic" : "font-medium text-foreground"}`}
                                title={visitanteNombre}
                              >
                                {visitanteNombre}
                              </span>
                            </div>
                            {esFinalizado && (
                              <span className={`text-sm font-bold ml-2 min-w-[20px] text-right shrink-0 ${visitanteGana ? "text-primary" : "text-muted-foreground"}`}>
                                {p.goles_visitante}
                              </span>
                            )}
                          </div>

                          {/* Footer: fecha / estado */}
                          <div className="px-3 py-1.5 bg-muted/25 border-t flex items-center gap-1.5">
                            {esFinalizado ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                                ✓ Finalizado
                              </span>
                            ) : p.fecha ? (
                              <>
                                <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(p.fecha + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                                  {p.horario && ` · ${p.horario.slice(0, 5)}`}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Sin programar</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Conector visual entre rondas */}
                {!isFinal && (
                  <div className="flex flex-col shrink-0" style={{ width: 40, margin: "0 8px" }}>
                    <div className="mb-3 py-1.5 px-2 invisible">Title</div>
                    <div className="flex-1 flex flex-col justify-around" style={{ minHeight: totalHeight }}>
                      {Array.from({ length: Math.max(1, Math.floor(ronda.partidos.length / 2)) }).map((_, i) => (
                        <div key={i} className="flex-1 flex w-full opacity-50">
                          <svg width="40" height="100%" preserveAspectRatio="none" viewBox="0 0 40 100" className="text-border drop-shadow-sm">
                            <path d="M 0 25 C 20 25, 20 50, 40 50 M 0 75 C 20 75, 20 50, 40 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" className="animate-pulse-glow" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Fragment>
            )
          })}
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
              partidos={partidos}
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
            partidos={partidos}
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