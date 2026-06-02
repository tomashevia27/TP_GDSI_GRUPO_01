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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reprogramar reserva</DialogTitle>
          <DialogDescription>
            Seleccioná una nueva fecha y horario para esta reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 shadow-sm">
            <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider font-semibold">Reserva actual</p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {new Date(fechaActual + "T12:00:00").toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">{horarioActual} hs</span>
                <span className="text-muted-foreground ml-1">•</span>
                <span className="text-muted-foreground">{canchaNombre}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border/60 pt-5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nueva fecha</Label>
            <Input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="bg-input h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nuevo turno</Label>
            {isLoadingTurnos ? (
              <div className="flex items-center justify-center py-4 bg-muted/30 rounded-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : turnos.length > 0 ? (
              <select
                value={nuevoHorario}
                onChange={(e) => setNuevoHorario(e.target.value)}
                className="flex h-11 w-full rounded-lg bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring border border-input"
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
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  No hay turnos disponibles.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !nuevoHorario}
            className="w-full sm:w-auto min-w-[140px]"
          >
            {isSubmitting ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
