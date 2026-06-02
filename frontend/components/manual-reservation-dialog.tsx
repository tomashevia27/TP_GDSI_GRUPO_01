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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cargar reserva manual</DialogTitle>
          <DialogDescription>
            Registrá un alquiler que acordaste por fuera de la plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</Label>
              <Input value={fecha} readOnly className="bg-muted/50 font-medium border-0 focus-visible:ring-0" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Horario</Label>
              <Input value={`${horario} hs`} readOnly className="bg-muted/50 font-medium border-0 focus-visible:ring-0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cancha</Label>
            <Input value={canchaNombre} readOnly className="bg-muted/50 font-medium border-0 focus-visible:ring-0" />
          </div>

          <div className="border-t border-border/60 pt-5 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Datos del cliente <span className="opacity-70 lowercase normal-case text-[11px]">(opcional)</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente-nombre" className="text-sm">Nombre</Label>
                <Input
                  id="cliente-nombre"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente-apellido" className="text-sm">Apellido</Label>
                <Input
                  id="cliente-apellido"
                  value={clienteApellido}
                  onChange={(e) => setClienteApellido(e.target.value)}
                  placeholder="Ej: Pérez"
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="cliente-telefono" className="text-sm">Teléfono</Label>
              <Input
                id="cliente-telefono"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="Ej: 11 1234-5678"
                className="bg-background"
              />
            </div>
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
            disabled={isSubmitting} 
            className="w-full sm:w-auto min-w-[140px]"
          >
            {isSubmitting ? "Guardando..." : "Confirmar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
