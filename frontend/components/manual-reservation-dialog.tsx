"use client"

import { useState } from "react"
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
import { crearReservaManual, type AgendaSlot } from "@/hooks/use-api"
import Swal from "sweetalert2"

interface ManualReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canchaId: number
  canchaNombre: string
  fecha: string
  horario: string
  onSuccess: () => void
}

export function ManualReservationDialog({
  open,
  onOpenChange,
  canchaId,
  canchaNombre,
  fecha,
  horario,
  onSuccess,
}: ManualReservationDialogProps) {
  const [clienteNombre, setClienteNombre] = useState("")
  const [clienteApellido, setClienteApellido] = useState("")
  const [clienteTelefono, setClienteTelefono] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await crearReservaManual({
        cancha_id: canchaId,
        fecha,
        horario,
        cliente_nombre: clienteNombre.trim() || undefined,
        cliente_apellido: clienteApellido.trim() || undefined,
        cliente_telefono: clienteTelefono.trim() || undefined,
      })

      await Swal.fire({
        title: "Reserva cargada",
        text: "El turno fue marcado como ocupado correctamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      Swal.fire({
        title: "Error",
        text: error.message || "No se pudo cargar la reserva",
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
          <DialogTitle>Cargar reserva manual</DialogTitle>
          <DialogDescription>
            Registrá un alquiler que acordaste por fuera de la plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <Input value={fecha} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Horario</Label>
              <Input value={`${horario} hs`} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cancha</Label>
            <Input value={canchaNombre} readOnly className="bg-muted" />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Datos del cliente (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cliente-nombre">Nombre</Label>
                <Input
                  id="cliente-nombre"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cliente-apellido">Apellido</Label>
                <Input
                  id="cliente-apellido"
                  value={clienteApellido}
                  onChange={(e) => setClienteApellido(e.target.value)}
                  placeholder="Ej: Pérez"
                />
              </div>
            </div>
            <div className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label htmlFor="cliente-telefono">Teléfono</Label>
                <Input
                  id="cliente-telefono"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej: 11 1234-5678"
                />
              </div>
            </div>
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
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Confirmar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
