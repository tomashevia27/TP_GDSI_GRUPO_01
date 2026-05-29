"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, Calendar } from "lucide-react"
import { reprogramarReserva, getTurnos, type TurnoSlot } from "@/hooks/use-api"
import Swal from "sweetalert2"

interface RescheduleReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partidoId: number
  canchaId: number
  canchaNombre: string
  fechaActual: string
  horarioActual: string
  onSuccess: () => void
}

export function RescheduleReservationDialog({
  open,
  onOpenChange,
  partidoId,
  canchaId,
  canchaNombre,
  fechaActual,
  horarioActual,
  onSuccess,
}: RescheduleReservationDialogProps) {
  const [nuevaFecha, setNuevaFecha] = useState(fechaActual)
  const [nuevoHorario, setNuevoHorario] = useState("")
  const [turnos, setTurnos] = useState<{ inicio: string; fin: string; estado: string }[]>([])
  const [isLoadingTurnos, setIsLoadingTurnos] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setNuevaFecha(fechaActual)
      setNuevoHorario("")
      setTurnos([])
    }
  }, [open, fechaActual])

  useEffect(() => {
    if (!open || !nuevaFecha || !canchaId) return

    setIsLoadingTurnos(true)
    setNuevoHorario("")

    getTurnos(canchaId, nuevaFecha, partidoId)
      .then((data) => {
        const turnosConFin = data.slots.map((s: TurnoSlot) => {
          const [h, m] = s.horario.split(":").map(Number)
          const d = new Date()
          d.setHours(h, m + 60, 0, 0)
          return {
            inicio: s.horario,
            fin: d.toTimeString().slice(0, 5),
            estado: s.estado,
          }
        })
        setTurnos(turnosConFin)
      })
      .catch((err) => {
        console.warn("Error al cargar turnos:", err)
        setTurnos([])
      })
      .finally(() => setIsLoadingTurnos(false))
  }, [open, nuevaFecha, canchaId, partidoId])

  const handleSubmit = async () => {
    if (!nuevoHorario) {
      Swal.fire({
        title: "Atención",
        text: "Seleccioná un turno para reprogramar.",
        icon: "warning",
        confirmButtonColor: "#FF6B4A",
      })
      return
    }

    const confirm = await Swal.fire({
      title: "¿Reprogramar reserva?",
      html: `La reserva se moverá al <b>${new Date(nuevaFecha + "T12:00:00").toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}</b> a las <b>${nuevoHorario} hs</b>.<br><br>Si la reserva pertenece a un jugador, será notificado del cambio.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, reprogramar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#FF6B4A",
    })

    if (!confirm.isConfirmed) return

    setIsSubmitting(true)
    try {
      await reprogramarReserva(partidoId, {
        fecha: nuevaFecha,
        horario: nuevoHorario,
      })

      await Swal.fire({
        title: "Reserva reprogramada",
        text: "El turno fue actualizado correctamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      Swal.fire({
        title: "Error",
        text: error.message || "No se pudo reprogramar la reserva",
        icon: "error",
        confirmButtonColor: "#FF6B4A",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprogramar reserva</DialogTitle>
          <DialogDescription>
            Seleccioná una nueva fecha y horario para esta reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-secondary/30 p-3 rounded-xl border border-border/50">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">Reserva actual</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {new Date(fechaActual + "T12:00:00").toLocaleDateString("es-AR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {horarioActual} hs
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-foreground font-medium">{canchaNombre}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nueva fecha</Label>
            <Input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="bg-input border-0 h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nuevo turno</Label>
            {isLoadingTurnos ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : turnos.length > 0 ? (
              <select
                value={nuevoHorario}
                onChange={(e) => setNuevoHorario(e.target.value)}
                className="flex h-11 w-full rounded-lg bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  Seleccioná un turno
                </option>
                {turnos.map((turno) => (
                  <option
                    key={turno.inicio}
                    value={turno.inicio}
                    disabled={turno.estado !== "disponible"}
                  >
                    De {turno.inicio} a {turno.fin} hs
                    {turno.estado === "ocupado" ? " (Ocupado)" : ""}
                    {turno.estado === "bloqueado" ? " (Bloqueado)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No hay turnos disponibles para esta fecha.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !nuevoHorario}
          >
            {isSubmitting ? "Reprogramando..." : "Confirmar reprogramación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
