"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, Clock, Users, Tag, Info, CheckCircle2, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPartido, type PartidoData, getUserProfile, UserProfile, cancelarPartido, inscribirseAPartido, bajarseDePartido } from "@/hooks/use-api"
import Swal from "sweetalert2"
import { CountdownTimer } from "@/components/CountdownTimer"

const API_URL = "http://localhost:8000"

export default function PartidoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const partidoId = params.id as string

  const [partido, setPartido] = useState<PartidoData | null>(null)
  const [cancha, setCancha] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const pData = await getPartido(partidoId)
        setPartido(pData)

        // Luego de obtener el partido, buscamos los detalles de la cancha
        const res = await fetch(`${API_URL}/canchas/${pData.cancha_id}`)
        if (res.ok) {
          const cData = await res.json()
          setCancha(cData)
        }

        try {
          const user = await getUserProfile()
          setCurrentUser(user)
        } catch (e) {
          // No user logged in or error
        }
      } catch (error) {
        console.warn("Error al cargar detalles:", error)
        router.push("/profile")
      } finally {
        setIsLoading(false)
      }
    }

    if (partidoId) {
      loadData()
    }
  }, [partidoId, router])

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!partido) return null

  const formatearFecha = (fechaStr: string) => {
    const [year, month, day] = fechaStr.split("-")
    return `${day}/${month}/${year}`
  }

  const formatearHorarioTurno = (horarioStr: string, duracionMinutos: number = 60) => {
    const [h, m] = horarioStr.split(":");
    const date = new Date();
    date.setHours(parseInt(h), parseInt(m), 0);
    const startStr = `${h}:${m}hs`;
    date.setMinutes(date.getMinutes() + duracionMinutos);
    const endH = date.getHours().toString().padStart(2, '0');
    const endM = date.getMinutes().toString().padStart(2, '0');
    return `de ${startStr} a ${endH}:${endM}hs`;
  }

  const confirmedCount = partido.cantidad_jugadores - partido.cupos_disponibles
  const spotsLeft = partido.cupos_disponibles

  const isOrganizer = !!(currentUser && partido.organizador && currentUser.id === partido.organizador.id)
  const isJoined = !!(currentUser && partido.jugadores?.some(j => j.id === currentUser.id))
  const canEditOrCancel = isOrganizer && partido.estado?.toLowerCase() !== "cancelado"
  const canJoin = partido.tipo === "abierto" && partido.estado?.toLowerCase() !== "cancelado" && !isOrganizer && !isJoined && spotsLeft > 0
  const canLeave = partido.tipo === "abierto" && partido.estado?.toLowerCase() !== "cancelado" && !isOrganizer && isJoined

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: "¿Cancelar partido?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No, mantener"
    })

    if (result.isConfirmed) {
      setIsCancelling(true)
      try {
        await cancelarPartido(partido.id)
        Swal.fire("Cancelado", "El partido ha sido cancelado exitosamente.", "success")
        // Reload data
        const updated = await getPartido(partidoId)
        setPartido(updated)
      } catch (error: any) {
        Swal.fire("Error", error.message || "No se pudo cancelar el partido", "error")
      } finally {
        setIsCancelling(false)
      }
    }
  }

  const handleJoin = async () => {
    const result = await Swal.fire({
      title: "¿Confirmar inscripción?",
      text: "Vas a reservar tu lugar en este partido.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#F97316",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Sí, anotarme",
      cancelButtonText: "Cancelar"
    })

    if (result.isConfirmed) {
      setIsJoining(true)
      try {
        await inscribirseAPartido(partido.id)
        Swal.fire("Inscripto", "Tu lugar fue reservado correctamente.", "success")
        const updated = await getPartido(partidoId)
        setPartido(updated)
      } catch (error: any) {
        Swal.fire("Error", error.message || "No se pudo completar la inscripción", "error")
      } finally {
        setIsJoining(false)
      }
    }
  }

  const handleLeave = async () => {
    const result = await Swal.fire({
      title: "¿Darse de baja?",
      text: "Vas a cancelar tu inscripción a este partido.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Sí, darme de baja",
      cancelButtonText: "Cancelar"
    })

    if (result.isConfirmed) {
      setIsLeaving(true)
      try {
        await bajarseDePartido(partido.id)
        Swal.fire("Baja confirmada", "Te has dado de baja del partido correctamente.", "success")
        const updated = await getPartido(partidoId)
        setPartido(updated)
      } catch (error: any) {
        Swal.fire("Error", error.message || "No se pudo completar la baja", "error")
      } finally {
        setIsLeaving(false)
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Volver</span>
        </button>

        {canEditOrCancel && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/partidos/${partido.id}/editar`)}>
              Modificar datos del partido
            </Button>
            <Button variant="destructive" size="sm" disabled={isCancelling} onClick={handleCancel}>
              {isCancelling ? "Cancelando..." : "Cancelar Partido"}
            </Button>
          </div>
        )}
      </div>

      {/* Match header */}
      <div className="mb-6">
        <div className="flex items-center flex-wrap gap-3 mb-4">
          
          <span className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg tracking-wide">
            {partido.estado.toUpperCase()}
          </span>
          
          <span className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-semibold rounded-lg capitalize tracking-wide">
            {partido.tipo}
          </span>
          
          {partido.estado.toLowerCase() !== "cancelado" && (
            <CountdownTimer fecha={partido.fecha} horario={partido.horario} />
          )}
        </div>
  
  <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-balance">
    Partido de <span className="capitalize">{partido.modalidad}</span>
  </h1>
</div>

      {/* Key info cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Fecha</span>
          </div>
          <p className="font-semibold text-foreground">{formatearFecha(partido.fecha)}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Horario</span>
          </div>
          <p className="font-semibold text-foreground">{formatearHorarioTurno(partido.horario, 60)}</p>
        </div>
      </div>

      {/* Location */}
      <div className="bg-card rounded-xl p-4 border border-border mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            {cancha ? (
              <>
                <p className="font-semibold text-foreground">{cancha.nombre}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{cancha.zona} • {cancha.direccion}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Cancha #{partido.cancha_id}</p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {partido.descripcion && (
        <div className="bg-secondary/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Notas</p>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {partido.descripcion}
              </p>
            </div>
          </div>
        </div>
      )}

      {canJoin && (
        <div className="mb-6">
          <Button className="w-full sm:w-auto font-semibold" onClick={handleJoin} disabled={isJoining}>
            {isJoining ? "Anotándote..." : "Anotarme al partido"}
          </Button>
        </div>
      )}

      {canLeave && (
        <div className="mb-6">
          <Button variant="destructive" className="w-full sm:w-auto font-semibold" onClick={handleLeave} disabled={isLeaving}>
            {isLeaving ? "Procesando baja..." : "Darse de baja del partido"}
          </Button>
        </div>
      )}

      {/* Players list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-foreground">Jugadores</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                spotsLeft === 0 ? "text-accent" : "text-primary"
              }`}>
                {confirmedCount}/{partido.cantidad_jugadores}
              </span>
              {/* Progress ring */}
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-secondary"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${(confirmedCount / partido.cantidad_jugadores) * 75.4} 75.4`}
                    className={spotsLeft === 0 ? "text-accent" : "text-primary"}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {/* Creador del partido */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {partido.organizador?.foto_perfil ? (
                <img
                  src={partido.organizador.foto_perfil}
                  alt={`${partido.organizador.nombre} ${partido.organizador.apellido}`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="font-medium text-primary-foreground text-sm">
                    {partido.organizador ? partido.organizador.nombre.charAt(0) : "O"}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {partido.organizador ? `${partido.organizador.nombre} ${partido.organizador.apellido}` : "Organizador"}
                  </span>
                  <Crown className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-accent">Organizador</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent/10">
              <CheckCircle2 className="w-4 h-4 text-accent" />
            </div>
          </div>

          {/* Jugadores que se sumaron al partido */}
          {partido.jugadores?.map((jugador) => (
            <div key={`jugador-${jugador.id}`} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {jugador.foto_perfil ? (
                  <img
                    src={jugador.foto_perfil}
                    alt={`${jugador.nombre} ${jugador.apellido}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-medium text-primary text-sm">
                      {jugador.nombre.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">
                    {jugador.nombre} {jugador.apellido}
                  </span>
                  <p className="text-xs text-accent">Confirmado</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent/10">
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </div>
            </div>
          ))}
          
          {/* Amigos/Invitados del creador */}
          {Array.from({ length: Math.max(0, partido.cantidad_jugadores - partido.cupos_disponibles - 1 - (partido.jugadores?.length || 0)) }).map((_, i) => (
            <div key={`invitado-${i}`} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <span className="font-medium text-muted-foreground text-sm">J{i + 1}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Jugador Invitado {i + 1}</span>
                  <p className="text-xs text-accent">Confirmado</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent/10">
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </div>
            </div>
          ))}
          
          {/* Lugares disponibles (solo si es abierto) */}
          {partido.tipo === "abierto" && Array.from({ length: partido.cupos_disponibles }).map((_, i) => (
            <div key={`cupo-${i}`} className="flex items-center justify-between p-4 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center">
                  <span className="text-muted-foreground text-lg">?</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Lugar disponible</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
