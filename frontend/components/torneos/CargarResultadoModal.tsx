"use client"

import { useState, useEffect } from "react"
import { PartidoTorneoData, cargarResultadoPartido } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Swal from "sweetalert2"
import { Loader2 } from "lucide-react"

interface Props {
  partido: PartidoTorneoData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type PlayerStats = {
  usuario_id: number;
  equipo_id: number;
  goles: number;
  amarillas: number;
  rojas: number;
}

export function CargarResultadoModal({ partido, isOpen, onClose, onSuccess }: Props) {
  const [golesLocal, setGolesLocal] = useState<number | "">("")
  const [golesVisitante, setGolesVisitante] = useState<number | "">("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Clave compuesta "equipoId_usuarioId" para distinguir stats por equipo
  const [stats, setStats] = useState<Record<string, PlayerStats>>({})

  // Limpiar estados cuando se abre un nuevo partido
  useEffect(() => {
    if (isOpen) {
      setGolesLocal("")
      setGolesVisitante("")
      setStats({})
    }
  }, [isOpen, partido])

  const statKey = (equipoId: number, usuarioId: number) => `${equipoId}_${usuarioId}`

  const updateStat = (usuario_id: number, equipo_id: number, field: keyof PlayerStats, value: number) => {
    setStats(prev => {
      const key = statKey(equipo_id, usuario_id)
      const current = prev[key] || { usuario_id, equipo_id, goles: 0, amarillas: 0, rojas: 0 };
      return {
        ...prev,
        [key]: { ...current, [field]: value }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partido || golesLocal === "" || golesVisitante === "") return
    if (!partido.equipo_local || !partido.equipo_visitante) return

    if (Number(golesLocal) < 0 || Number(golesVisitante) < 0) {
      Swal.fire("Error", "Los goles no pueden ser negativos", "error")
      return
    }

    const localId = partido.equipo_local.id
    const visitanteId = partido.equipo_visitante.id

    const golesLocalAsignados = Object.values(stats)
      .filter(s => s.equipo_id === localId)
      .reduce((acc, s) => acc + s.goles, 0);

    const golesVisitanteAsignados = Object.values(stats)
      .filter(s => s.equipo_id === visitanteId)
      .reduce((acc, s) => acc + s.goles, 0);

    if (golesLocalAsignados !== Number(golesLocal)) {
      Swal.fire("Atención", `Los goles asignados a los jugadores locales (${golesLocalAsignados}) no coinciden con el resultado final local (${golesLocal}).`, "warning")
      return
    }

    if (golesVisitanteAsignados !== Number(golesVisitante)) {
      Swal.fire("Atención", `Los goles asignados a los jugadores visitantes (${golesVisitanteAsignados}) no coinciden con el resultado final visitante (${golesVisitante}).`, "warning")
      return
    }

    setIsSubmitting(true)
    try {
      const estadisticasPayload = Object.values(stats).filter(s => s.goles > 0 || s.amarillas > 0 || s.rojas > 0);
      
      await cargarResultadoPartido(partido.id, {
        goles_local: Number(golesLocal),
        goles_visitante: Number(golesVisitante),
        estadisticas_jugadores: estadisticasPayload
      })

      Swal.fire({
        title: "¡Resultado guardado!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      Swal.fire("Error", err.message || "No se pudo guardar el resultado", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPlayerRow = (jugador: any, equipoId: number) => {
    // Usa clave compuesta para que los stats sean independientes por equipo
    const key = statKey(equipoId, jugador.id)
    const pStat = stats[key] || { goles: 0, amarillas: 0, rojas: 0 };
    return (
      <div key={`${equipoId}-${jugador.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/30 px-2 rounded transition-colors">
        <span className="text-sm font-medium truncate flex-1" title={`${jugador.nombre} ${jugador.apellido}`}>{jugador.nombre} {jugador.apellido}</span>
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1" title="Goles">
            <span className="text-xs">⚽</span>
            <Input type="number" min="0" value={pStat.goles === 0 ? "" : pStat.goles} placeholder="0" className="w-12 h-8 text-center px-1" 
              onChange={(e) => updateStat(jugador.id, equipoId, 'goles', e.target.value === "" ? 0 : Number(e.target.value))} />
          </div>
          <div className="flex flex-col items-center gap-1" title="Tarjetas Amarillas">
            <span className="text-xs">🟨</span>
            <Input type="number" min="0" value={pStat.amarillas === 0 ? "" : pStat.amarillas} placeholder="0" className="w-12 h-8 text-center px-1" 
              onChange={(e) => updateStat(jugador.id, equipoId, 'amarillas', e.target.value === "" ? 0 : Number(e.target.value))} />
          </div>
          <div className="flex flex-col items-center gap-1" title="Tarjetas Rojas">
            <span className="text-xs">🟥</span>
            <Input type="number" min="0" value={pStat.rojas === 0 ? "" : pStat.rojas} placeholder="0" className="w-12 h-8 text-center px-1" 
              onChange={(e) => updateStat(jugador.id, equipoId, 'rojas', e.target.value === "" ? 0 : Number(e.target.value))} />
          </div>
        </div>
      </div>
    )
  }

  if (!partido) return null

  const localName = partido.equipo_local?.nombre || partido.equipo_local?.nombre_equipo || "Local"
  const visitanteName = partido.equipo_visitante?.nombre || partido.equipo_visitante?.nombre_equipo || "Visitante"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Cargar Resultado</DialogTitle>
          <DialogDescription>
            Ingresá los goles globales y las estadísticas individuales por jugador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden mt-2">
          {/* Resultado Global */}
          <div className="flex justify-between items-center gap-4 bg-muted/30 p-4 rounded-xl border mb-6">
            <div className="flex flex-col items-center space-y-2 flex-1">
              <Label className="text-center font-bold text-lg truncate w-full" title={localName}>{localName}</Label>
              <Input 
                type="number" 
                min="0" 
                required 
                value={golesLocal}
                onChange={(e) => setGolesLocal(e.target.value !== "" ? Number(e.target.value) : "")}
                className="text-center text-4xl h-16 w-24 font-bold"
              />
            </div>
            <div className="text-3xl font-bold text-muted-foreground">-</div>
            <div className="flex flex-col items-center space-y-2 flex-1">
              <Label className="text-center font-bold text-lg truncate w-full" title={visitanteName}>{visitanteName}</Label>
              <Input 
                type="number" 
                min="0" 
                required 
                value={golesVisitante}
                onChange={(e) => setGolesVisitante(e.target.value !== "" ? Number(e.target.value) : "")}
                className="text-center text-4xl h-16 w-24 font-bold"
              />
            </div>
          </div>
          
          {/* Estadísticas Individuales con Tabs */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="font-bold mb-2">Estadísticas de Jugadores</h3>
            <Tabs defaultValue="local" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="local" className="truncate">{localName}</TabsTrigger>
                <TabsTrigger value="visitante" className="truncate">{visitanteName}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="local" className="flex-1 overflow-y-auto pr-2 mt-2 border rounded-md p-2">
                {(partido.equipo_local?.jugadores?.length ?? 0) > 0 ? (
                  partido.equipo_local!.jugadores.map((j: any) => renderPlayerRow(j, partido.equipo_local!.id))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay jugadores registrados</p>
                )}
              </TabsContent>
              
              <TabsContent value="visitante" className="flex-1 overflow-y-auto pr-2 mt-2 border rounded-md p-2">
                {(partido.equipo_visitante?.jugadores?.length ?? 0) > 0 ? (
                  partido.equipo_visitante!.jugadores.map((j: any) => renderPlayerRow(j, partido.equipo_visitante!.id))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay jugadores registrados</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter className="mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || golesLocal === "" || golesVisitante === ""}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Resultado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
