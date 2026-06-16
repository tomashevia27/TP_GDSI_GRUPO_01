"use client"

import { useEffect, useState } from "react"
import { PartidoTorneoData, generarFixture, getFixtureTorneo, TorneoData } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { CargarResultadoModal } from "./CargarResultadoModal"
import { ProgramarPartidoModal } from "./ProgramarPartidoModal"
import { Loader2, Calendar, Trophy, Clock } from "lucide-react"
import Swal from "sweetalert2"

interface Props {
  torneo: TorneoData
  isOrganizer: boolean
}

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

  const abrirProgramar = (partido: PartidoTorneoData) => {
    setSelectedPartido(partido)
    setModalProgramar(true)
  }

  const abrirResultado = (partido: PartidoTorneoData) => {
    setSelectedPartido(partido)
    setModalResultado(true)
  }

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    )
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
            {isGenerating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando...</>
            ) : (
              "Generar Fixture"
            )}
          </Button>
        )}
      </div>
    )
  }

  // Agrupar partidos por fase
  const partidosPorFase = partidos.reduce((acc, p) => {
    if (!acc[p.fase]) acc[p.fase] = []
    acc[p.fase].push(p)
    return acc
  }, {} as Record<string, PartidoTorneoData[]>)

  const FASE_LABELS: Record<string, string> = {
    liga: "Liga",
    grupos: "Fase de Grupos",
    dieciseisavos: "Dieciseisavos de Final",
    octavos: "Octavos de Final",
    cuartos: "Cuartos de Final",
    semifinal: "Semifinales",
    final: "Final",
  }

  return (
    <div className="space-y-10">
      {Object.entries(partidosPorFase).map(([fase, lista]) => (
        <div key={fase}>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-border" />
            <h3 className="font-bold text-base uppercase tracking-widest text-muted-foreground px-2">
              {FASE_LABELS[fase] || fase.replace(/_/g, " ")}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lista.map((p) => {
              const estaProgramado = !!p.fecha && !!p.horario
              const esFinalizado = p.estado === "finalizado"
              const fechaPasada = p.fecha ? p.fecha <= hoy : false
              const puedeCargarResultado =
                isOrganizer && estaProgramado && !esFinalizado && fechaPasada && p.equipo_local && p.equipo_visitante

              return (
                <div
                  key={p.id}
                  className="border rounded-xl bg-card shadow-sm flex flex-col overflow-hidden"
                >
                  {/* Header de estado */}
                  <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {p.grupo && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Grupo {p.grupo}
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

                    {/* Fecha y hora */}
                    {estaProgramado && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
                    <span className="font-bold text-sm flex-1 truncate" title={p.equipo_local?.nombre || p.equipo_local?.nombre_equipo}>
                      {p.equipo_local?.nombre || p.equipo_local?.nombre_equipo || "TBD"}
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

                    <span className="font-bold text-sm flex-1 truncate text-right" title={p.equipo_visitante?.nombre || p.equipo_visitante?.nombre_equipo}>
                      {p.equipo_visitante?.nombre || p.equipo_visitante?.nombre_equipo || "TBD"}
                    </span>
                  </div>

                  {/* Botones del organizador */}
                  {isOrganizer && !esFinalizado && p.equipo_local && p.equipo_visitante && (
                    <div className="px-4 pb-4 flex gap-2">
                      {!estaProgramado && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => abrirProgramar(p)}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Programar
                        </Button>
                      )}
                      {estaProgramado && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => abrirProgramar(p)}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Reprogramar
                        </Button>
                      )}
                      <Button
                        variant={puedeCargarResultado ? "default" : "secondary"}
                        size="sm"
                        className="flex-1 gap-1.5"
                        disabled={!puedeCargarResultado}
                        onClick={() => puedeCargarResultado && abrirResultado(p)}
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
            })}
          </div>
        </div>
      ))}

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
