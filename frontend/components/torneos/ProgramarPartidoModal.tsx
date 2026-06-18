"use client"

import { useState, useEffect } from "react"
import { PartidoTorneoData, TorneoData, programarPartido, getCanchas, CanchaData } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import Swal from "sweetalert2"
import { Loader2, MapPin, Clock, Calendar, AlertCircle } from "lucide-react"

interface Props {
  partido: PartidoTorneoData | null
  torneo: TorneoData
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

/** Genera slots de horario cada 60 minutos dentro de la franja dada (excluye el límite superior) */
function generateTimeSlots(min: string, max: string): string[] {
  const slots: string[] = []
  const [minH] = min.split(":").map(Number)
  const [maxH] = max.split(":").map(Number)
  for (let h = minH; h < maxH; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`)
  }
  return slots
}

export function ProgramarPartidoModal({ partido, torneo, isOpen, onClose, onSuccess }: Props) {
  const [canchas, setCanchas] = useState<CanchaData[]>([])
  const [canchaId, setCanchaId] = useState<number | "">("")
  const [fecha, setFecha] = useState("")
  const [horario, setHorario] = useState("")
  const [isLoadingCanchas, setIsLoadingCanchas] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Calcular franja horaria del torneo
  const [horaMin, horaMax] = (() => {
    try {
      const [inicio, fin] = (torneo.franja_horaria || "08:00-22:00").split("-")
      return [inicio.trim(), fin.trim()]
    } catch {
      return ["08:00", "22:00"]
    }
  })()

  const timeSlots = generateTimeSlots(horaMin, horaMax)

  useEffect(() => {
    if (isOpen) {
      setCanchaId("")
      setFecha("")
      setHorario("")
      setErrorMsg("")
      loadCanchas()
    }
  }, [isOpen, partido])

  const loadCanchas = async () => {
    setIsLoadingCanchas(true)
    try {
      const all = await getCanchas()
      const filtradas = all.filter((c) => c.zona === torneo.zona)
      setCanchas(filtradas)
    } catch {
      setCanchas([])
    } finally {
      setIsLoadingCanchas(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    if (!partido || canchaId === "" || !fecha || !horario) return

    setIsSubmitting(true)
    try {
      await programarPartido(partido.id, {
        cancha_id: Number(canchaId),
        fecha,
        horario: horario.length === 5 ? `${horario}:00` : horario,
      })
      Swal.fire({
        title: "¡Partido programado!",
        text: "El partido fue agendado correctamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo programar el partido. Intentá nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!partido) return null

  const localName = partido.equipo_local?.nombre || partido.equipo_local?.nombre_equipo || "Local"
  const visitanteName = partido.equipo_visitante?.nombre || partido.equipo_visitante?.nombre_equipo || "Visitante"
  const fechaMin = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Programar Partido
          </DialogTitle>
          <DialogDescription>
            Elegí cancha, fecha y horario para{" "}
            <span className="font-semibold text-foreground">{localName}</span> vs{" "}
            <span className="font-semibold text-foreground">{visitanteName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Banner de error inline */}
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector de cancha */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Cancha <span className="text-muted-foreground text-xs ml-1">(zona: {torneo.zona})</span>
            </Label>
            {isLoadingCanchas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando canchas...
              </div>
            ) : canchas.length === 0 ? (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                No hay canchas disponibles en la zona <strong>{torneo.zona}</strong>.
              </div>
            ) : (
              <select
                required
                value={canchaId}
                onChange={(e) => { setCanchaId(e.target.value === "" ? "" : Number(e.target.value)); setErrorMsg("") }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccioná una cancha</option>
                {canchas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} — {c.direccion}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5" htmlFor="fecha-partido">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Fecha
            </Label>
            <input
              id="fecha-partido"
              type="date"
              required
              min={fechaMin}
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); setErrorMsg("") }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Horario – chips de selección */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Horario{" "}
              <span className="text-muted-foreground text-xs ml-1">
                (franja del torneo: {horaMin} – {horaMax})
              </span>
            </Label>

            {timeSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin horarios disponibles en esta franja.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => { setHorario(slot); setErrorMsg("") }}
                    className={`
                      py-2.5 px-1 rounded-lg border text-sm font-semibold transition-all select-none
                      ${horario === slot
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-foreground hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                      }
                    `}
                  >
                    {slot.slice(0, 2)}hs
                  </button>
                ))}
              </div>
            )}

            {horario && (
              <p className="text-xs text-muted-foreground mt-1">
                Horario seleccionado: <span className="font-semibold text-foreground">{horario}</span>
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || canchaId === "" || !fecha || !horario}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
