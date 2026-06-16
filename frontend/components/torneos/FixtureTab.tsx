"use client"

import { useEffect, useState } from "react"
import { PartidoTorneoData, generarFixture, getFixtureTorneo, TorneoData } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { CargarResultadoModal } from "./CargarResultadoModal"
import { Loader2 } from "lucide-react"
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
      Swal.fire("Éxito", "Fixture generado correctamente", "success")
    } catch (e: any) {
      Swal.fire("Error", e.message || "No se pudo generar", "error")
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  if (partidos.length === 0) {
    return (
      <div className="py-12 text-center border rounded-xl bg-card">
        <h3 className="text-lg font-bold mb-2">El fixture aún no está generado</h3>
        <p className="text-muted-foreground mb-6">Los partidos se programarán cuando el organizador lo decida.</p>
        {isOrganizer && torneo.estado === "Abierto para inscripción" && (
           <Button onClick={handleGenerar} disabled={isGenerating}>
             {isGenerating ? "Generando..." : "Generar Fixture"}
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

  return (
    <div className="space-y-8">
      {Object.entries(partidosPorFase).map(([fase, lista]) => (
        <div key={fase}>
          <h3 className="font-bold text-xl mb-4 capitalize border-b pb-2">{fase.replace("_", " ")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lista.map(p => (
              <div key={p.id} className="border p-4 rounded-xl bg-card shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">{p.grupo ? `Grupo ${p.grupo}` : p.estado}</span>
                  {p.fecha && <span className="text-xs">{p.fecha} {p.horario}</span>}
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="truncate flex-1">{p.equipo_local?.nombre || p.equipo_local?.nombre_equipo || "TBD"}</span>
                  <div className="px-4 text-primary bg-muted rounded-md py-1">
                    {p.estado === "finalizado" ? `${p.goles_local} - ${p.goles_visitante}` : "vs"}
                  </div>
                  <span className="truncate flex-1 text-right">{p.equipo_visitante?.nombre || p.equipo_visitante?.nombre_equipo || "TBD"}</span>
                </div>
                {isOrganizer && p.estado === "pendiente" && p.equipo_local && p.equipo_visitante && (
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setSelectedPartido(p)}>
                    Cargar Resultado
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <CargarResultadoModal 
        isOpen={!!selectedPartido}
        partido={selectedPartido}
        onClose={() => setSelectedPartido(null)}
        onSuccess={loadFixture}
      />
    </div>
  )
}
