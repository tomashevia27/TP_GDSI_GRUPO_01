"use client"

import { useEffect, useState } from "react"
import { Calendar, MapPin, Clock, Users, ChevronRight, Lock, Unlock, Ban, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthContext } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import {
  getMisCanchas,
  getAgenda,
  bloquearTurno,
  desbloquearTurno,
  cancelarReservaDueno,
  type AgendaData,
  type AgendaSlot,
} from "@/hooks/use-api"
import { ManualReservationDialog } from "@/components/manual-reservation-dialog"
import { RescheduleReservationDialog } from "@/components/reschedule-reservation-dialog"
import Swal from "sweetalert2"

interface Cancha {
  id: number
  nombre: string
  tipo_superficie: string
  tamano: number
  zona: string
  direccion: string
  hora_apertura: string
  hora_cierre: string
  precio_por_turno: number
}

export default function AgendaPage() {
  const { role } = useAuthContext()
  const router = useRouter()

  const [canchas, setCanchas] = useState<Cancha[]>([])
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<number | "">("")
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0])
  const [agenda, setAgenda] = useState<AgendaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [slotSeleccionado, setSlotSeleccionado] = useState<AgendaSlot | null>(null)

  const [reprogramarDialogOpen, setReprogramarDialogOpen] = useState(false)
  const [slotReprogramar, setSlotReprogramar] = useState<AgendaSlot | null>(null)

  useEffect(() => {
    if (role !== "admin") {
      router.push("/home")
    }
  }, [role, router])

  useEffect(() => {
    async function fetchCanchas() {
      try {
        const data = await getMisCanchas()
        setCanchas(data)
        if (data.length > 0) {
          setCanchaSeleccionada(data[0].id)
        }
      } catch (e) {
        console.warn("Error al cargar canchas:", e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCanchas()
  }, [])

  useEffect(() => {
    if (!canchaSeleccionada || !fecha) return

    async function fetchAgenda() {
      setIsLoadingAgenda(true)
      try {
        const data = await getAgenda(canchaSeleccionada, fecha)
        setAgenda(data)
      } catch (e) {
        console.warn("Error al cargar agenda:", e)
        setAgenda(null)
      } finally {
        setIsLoadingAgenda(false)
      }
    }

    fetchAgenda()
  }, [canchaSeleccionada, fecha])

  const canchaActual = canchas.find((c) => c.id === canchaSeleccionada)

  const handleSlotClick = (slot: AgendaSlot) => {
    if (slot.estado !== "disponible") return
    setSlotSeleccionado(slot)
    setDialogOpen(true)
  }

  const handleBloquear = async (slot: AgendaSlot) => {
    const confirm = await Swal.fire({
      title: "¿Bloquear turno?",
      text: "El turno dejará de estar disponible para reservas.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, bloquear",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#FF6B4A",
    })
    if (!confirm.isConfirmed) return
    try {
      await bloquearTurno({
        cancha_id: Number(canchaSeleccionada),
        fecha,
        horario: slot.horario,
      })
      await Swal.fire({
        title: "Turno bloqueado",
        text: "El turno fue bloqueado y no estará disponible para reservas.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      })
      recargarAgenda()
    } catch (error: any) {
      Swal.fire({
        title: "Error",
        text: error.message || "No se pudo bloquear el turno",
        icon: "error",
        confirmButtonColor: "#FF6B4A",
      })
    }
  }

  const handleDesbloquear = async (slot: AgendaSlot) => {
    if (!slot.partido_id) return
    const confirm = await Swal.fire({
      title: "¿Desbloquear turno?",
      text: "El turno volverá a estar disponible para reservas.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, desbloquear",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#FF6B4A",
    })
    if (!confirm.isConfirmed) return
    try {
      await desbloquearTurno(slot.partido_id)
      await Swal.fire({
        title: "Turno desbloqueado",
        text: "El turno vuelve a estar disponible.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      })
      recargarAgenda()
    } catch (error: any) {
      Swal.fire({
        title: "Error",
        text: error.message || "No se pudo desbloquear el turno",
        icon: "error",
        confirmButtonColor: "#FF6B4A",
      })
    }
  }

  const handleCancelarReserva = async (slot: AgendaSlot) => {
    if (!slot.partido_id) return
    const confirm = await Swal.fire({
      title: "¿Cancelar esta reserva?",
      text: "El turno volverá a estar disponible. Si la reserva es de un jugador, será notificado.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar reserva",
      cancelButtonText: "No, mantener",
      confirmButtonColor: "#EF4444",
    })
    if (!confirm.isConfirmed) return
    try {
      await cancelarReservaDueno(slot.partido_id)
      await Swal.fire({
        title: "Reserva cancelada",
        text: "El turno fue liberado exitosamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      })
      recargarAgenda()
    } catch (error: any) {
      Swal.fire({
        title: "Error",
        text: error.message || "No se pudo cancelar la reserva",
        icon: "error",
        confirmButtonColor: "#FF6B4A",
      })
    }
  }

  const handleReprogramar = (slot: AgendaSlot) => {
    setSlotReprogramar(slot)
    setReprogramarDialogOpen(true)
  }

  const recargarAgenda = () => {
    if (canchaSeleccionada && fecha) {
      getAgenda(canchaSeleccionada, fecha)
        .then((data) => setAgenda(data))
        .catch(() => {})
    }
  }

  const handleReservaExitosa = () => {
    recargarAgenda()
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Mi Agenda
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestioná los turnos de tus canchas y cargá reservas manuales
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cancha
            </label>
            <select
              value={canchaSeleccionada}
              onChange={(e) => setCanchaSeleccionada(Number(e.target.value))}
              className="flex h-11 w-full rounded-lg bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                Seleccioná una cancha
              </option>
              {canchas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} - {c.zona}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha
            </label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-input border-0 h-11"
            />
          </div>
        </div>

        {canchaActual && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {canchaActual.zona} - {canchaActual.direccion}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {canchaActual.hora_apertura} a {canchaActual.hora_cierre} hs
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Fútbol {canchaActual.tamano}
            </div>
          </div>
        )}
      </div>

      {isLoadingAgenda ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : agenda && agenda.slots.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Turnos del{" "}
              {new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <span className="text-xs text-muted-foreground">
              {agenda.slots.filter((s) => s.estado === "disponible").length} disponibles
              {" · "}
              {agenda.slots.filter((s) => s.estado === "ocupado").length} ocupados
              {" · "}
              {agenda.slots.filter((s) => s.estado === "bloqueado").length} bloqueados
            </span>
          </div>

          <div className="divide-y divide-border">
            {agenda.slots.map((slot) => (
              <div
                key={slot.horario}
                className="w-full flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-[100px] shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {slot.horario} hs
                    </span>
                  </div>

                  {slot.estado === "disponible" && (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Disponible
                      </span>
                      <div className="flex gap-1.5 ml-auto shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSlotClick(slot)}
                          className="text-xs h-8"
                        >
                          Reservar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBloquear(slot)}
                          className="text-xs h-8 text-muted-foreground"
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Bloquear
                        </Button>
                      </div>
                    </>
                  )}

                  {slot.estado === "ocupado" && (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Ocupado
                      </span>
                      <span className="text-sm text-foreground truncate">
                        {slot.es_reserva_manual
                          ? ((slot.cliente_nombre || "") + (slot.cliente_apellido ? " " + slot.cliente_apellido : "")).trim() || "Sin nombre"
                          : ((slot.organizador_nombre || "") + (slot.organizador_apellido ? " " + slot.organizador_apellido : "")).trim() || "Sin nombre"
                        }
                      </span>
                      {slot.es_reserva_manual && slot.cliente_telefono && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          Tel: {slot.cliente_telefono}
                        </span>
                      )}
                      {slot.es_reserva_manual ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">
                          Reserva manual
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">
                          Reserva de jugador
                        </span>
                      )}
                      <div className="flex gap-1.5 ml-auto shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReprogramar(slot)}
                          className="text-xs h-8"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Reprogramar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelarReserva(slot)}
                          className="text-xs h-8"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}

                  {slot.estado === "bloqueado" && (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600 shrink-0">
                        <Ban className="h-3 w-3" />
                        Bloqueado
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDesbloquear(slot)}
                        className="text-xs h-8 ml-auto shrink-0"
                      >
                        <Unlock className="h-3 w-3 mr-1" />
                        Desbloquear
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : agenda && agenda.slots.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">
            No hay turnos disponibles para esta cancha en la fecha seleccionada.
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Revisá los días y horarios operativos de la cancha.
          </p>
        </div>
      ) : null}

      {slotSeleccionado && (
        <ManualReservationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          canchaId={Number(canchaSeleccionada)}
          canchaNombre={canchaActual?.nombre || ""}
          fecha={fecha}
          horario={slotSeleccionado.horario}
          onSuccess={handleReservaExitosa}
        />
      )}

      {slotReprogramar && slotReprogramar.partido_id && (
        <RescheduleReservationDialog
          open={reprogramarDialogOpen}
          onOpenChange={setReprogramarDialogOpen}
          partidoId={slotReprogramar.partido_id}
          canchaId={Number(canchaSeleccionada)}
          canchaNombre={canchaActual?.nombre || ""}
          fechaActual={fecha}
          horarioActual={slotReprogramar.horario}
          onSuccess={recargarAgenda}
        />
      )}
    </div>
  )
}
