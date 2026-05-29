"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Info, ArrowLeft, Clock, DollarSign, Zap } from "lucide-react"
import Swal from "sweetalert2"
import { crearPartido, getTurnos } from "@/hooks/use-api"

const API_URL = "http://localhost:8000"

function NuevoPartidoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const canchaId = searchParams.get("canchaId")

  const [cancha, setCancha] = useState<any>(null)
  const [todasCanchas, setTodasCanchas] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [fecha, setFecha] = useState("")
  const [horario, setHorario] = useState("")
  const [tipo, setTipo] = useState("abierto")
  const [cuposDisponibles, setCuposDisponibles] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [turnosDisponibles, setTurnosDisponibles] = useState<{ inicio: string; fin: string; estado: string }[]>([])

  useEffect(() => {
    if (!cancha) {
      setTurnosDisponibles([])
      setHorario("")
      return
    }

    if (fecha) {
      getTurnos(cancha.id, fecha)
        .then(data => {
          const duracion = cancha.duracion_turno || 60
          const turnos = data.slots.map(s => {
            const [h, m] = s.horario.split(":").map(Number)
            const d = new Date()
            d.setHours(h, m + duracion, 0, 0)
            return { inicio: s.horario, fin: d.toTimeString().slice(0, 5), estado: s.estado }
          })
          setTurnosDisponibles(turnos)
        })
        .catch(err => console.warn("Error al cargar turnos:", err))
    } else {
      const turnos = []
      const [aperturaH, aperturaM] = cancha.hora_apertura.split(":").map(Number)
      const [cierreH, cierreM] = cancha.hora_cierre.split(":").map(Number)
      const duracion = 60
      
      let actual = new Date()
      actual.setHours(aperturaH, aperturaM, 0, 0)
      
      const fin = new Date()
      fin.setHours(cierreH, cierreM, 0, 0)
      
      while (actual < fin) {
        const inicioStr = actual.toTimeString().slice(0, 5)
        actual.setMinutes(actual.getMinutes() + duracion)
        const finStr = actual.toTimeString().slice(0, 5)
        
        if (actual <= fin) {
          turnos.push({ inicio: inicioStr, fin: finStr, estado: "disponible" })
        }
      }
      setTurnosDisponibles(turnos)
    }
    setHorario("")
  }, [cancha, fecha])

  useEffect(() => {
    async function fetchData() {
      try {
        if (canchaId) {
          const res = await fetch(`${API_URL}/canchas/${canchaId}`)
          if (res.ok) {
            const data = await res.json()
            setCancha(data)
          } else {
            Swal.fire("Error", "Cancha no encontrada", "error").then(() => router.push("/home"))
          }
        } else {
          // Traer todas las canchas para que elija en el select
          const res = await fetch(`${API_URL}/canchas/disponibles`) // O `/canchas` dependiendo de las rutas activas
          const canchasDisponibles = res.ok ? await res.json() : []
          // Por si el backend no tiene ruta `/disponibles`, intentamos `/canchas`
          if (canchasDisponibles.detail === "Not Found" || !res.ok) {
            const resAll = await fetch(`${API_URL}/canchas`)
            if (resAll.ok) {
              setTodasCanchas(await resAll.json())
            }
          } else {
            setTodasCanchas(canchasDisponibles)
          }
        }
      } catch (error) {
        console.warn("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [canchaId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cancha || !fecha || !horario || !tipo) {
      Swal.fire({ title: "Atención", text: "Por favor, elegí una cancha y completá todos los campos requeridos.", icon: "warning", confirmButtonColor: "#FF6B4A" })
      return
    }

    const now = new Date()
    const matchDate = new Date(`${fecha}T${horario}`)
    if (matchDate <= now) {
      Swal.fire({ title: "Atención", text: "La fecha y hora del partido deben ser en el futuro.", icon: "warning", confirmButtonColor: "#FF6B4A" })
      return
    }

    const cantidadJugadoresNum = cancha?.tamano ? cancha.tamano * 2 : 0;
    
    if (tipo === "abierto") {
      const cupos = Number(cuposDisponibles)
      if (!cupos || cupos < 1 || cupos >= cantidadJugadoresNum) {
        Swal.fire({ title: "Atención", text: `Para partidos abiertos, indicá cuántos lugares disponibles tenés (entre 1 y ${cantidadJugadoresNum - 1}).`, icon: "warning", confirmButtonColor: "#FF6B4A" })
        return
      }
    }

    setIsSubmitting(true)
    try {
      await crearPartido({
        cancha_id: Number(cancha.id),
        fecha,
        horario,
        tipo,
        descripcion: descripcion || undefined,
        cupos_disponibles: tipo === "abierto" ? Number(cuposDisponibles) : undefined
      })

      await Swal.fire({
        title: "¡Reserva iniciada!",
        text: "Serás redirigido a la pasarela de pago para abonar la seña de la cancha.",
        icon: "success",
        confirmButtonColor: "#FF6B4A",
        confirmButtonText: "Proceder al pago"
      })

      Swal.fire({
        title: "¡Pago exitoso!",
        text: "El partido fue creado y la cancha está reservada.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        router.push("/profile")
      })
      
    } catch (error: any) {
      console.error("Error al crear el partido:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  const modalidad = cancha?.tamano ? `Fútbol ${cancha.tamano}` : "N/A"
  const cantidadJugadores = cancha?.tamano ? cancha.tamano * 2 : "N/A"

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Volver</span>
      </button>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Crear Nuevo Partido</h1>
            <p className="text-muted-foreground">Configurá los detalles de tu encuentro deportivo.</p>
          </div>
          
          {!canchaId && (
            <div className="space-y-2 mb-6">
              <Label htmlFor="canchaSelect" className="font-medium text-sm">Seleccioná una Cancha *</Label>
              <select
                id="canchaSelect"
                className="flex h-11 w-full rounded-lg bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={cancha?.id || ""}
                onChange={(e) => {
                  const selected = todasCanchas.find((c: any) => c.id === Number(e.target.value))
                  setCancha(selected || null)
                }}
                required
              >
                <option value="" disabled>Elegí una cancha disponible</option>
                {todasCanchas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} - {c.zona}</option>
                ))}
              </select>
            </div>
          )}
          
          {cancha && (
            <div className="bg-secondary/30 p-6 rounded-xl mb-6 border border-border/50">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-primary">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                {cancha.nombre}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {cancha.zona} - {cancha.direccion}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {cancha.hora_apertura} a {cancha.hora_cierre} hs (60 min)
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Info className="h-4 w-4" />
                    Fútbol {cancha.tamano} • Superficie: <span className="capitalize">{cancha.tipo_superficie}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      {cancha.iluminacion ? "Con iluminación" : "Sin iluminación"}
                    </div>
                    <div className="font-bold text-primary flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${cancha.precio_por_turno}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha" className="font-medium text-sm">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="bg-input border-0 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario" className="font-medium text-sm">Turno *</Label>
                <select
                  id="horario"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="flex h-11 w-full rounded-lg bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={!cancha}
                >
                  <option value="" disabled>Seleccioná un turno</option>
                  {turnosDisponibles.map((turno) => (
                    <option key={turno.inicio} value={turno.inicio} disabled={turno.estado !== "disponible"}>
                      De {turno.inicio} a {turno.fin} hs
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-medium text-sm">
                  Modalidad
                  <span title="Se calcula según la cancha">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Label>
                <Input value={modalidad} readOnly className="bg-muted text-muted-foreground h-11" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-medium text-sm">
                  Cantidad Jugadores
                  <span title="Se calcula según la cancha">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Label>
                <Input value={cantidadJugadores.toString()} readOnly className="bg-muted text-muted-foreground h-11" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo" className="font-medium text-sm">Tipo de Partido *</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="flex h-11 w-full rounded-lg bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="abierto">Abierto (Cualquiera puede unirse)</option>
                <option value="cerrado">Cerrado (Solo invitados)</option>
              </select>
            </div>

            {tipo === "abierto" && (
              <div className="space-y-2">
                <Label htmlFor="cupos" className="font-medium text-sm">Lugares Disponibles (Cupos) *</Label>
                <Input
                  id="cupos"
                  type="number"
                  min="1"
                  max={cancha?.tamano ? (cancha.tamano * 2) - 1 : 1}
                  value={cuposDisponibles}
                  onChange={(e) => setCuposDisponibles(e.target.value)}
                  placeholder="Ej: 3 (si te faltan 3 jugadores)"
                  required
                  className="bg-input border-0 h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-medium text-sm">Descripción (Opcional)</Label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="flex min-h-[80px] w-full rounded-lg bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Aclaraciones, reglas, o cualquier info extra para los jugadores..."
              />
            </div>

            <Button type="submit" className="w-full font-semibold h-11" disabled={isSubmitting || !cancha}>
              {isSubmitting ? "Procesando..." : "Confirmar y Pagar Seña"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function NuevoPartidoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <NuevoPartidoForm />
    </Suspense>
  )
}
