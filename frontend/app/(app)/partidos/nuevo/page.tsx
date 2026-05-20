"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Info, ArrowLeft, Clock, DollarSign, Sun } from "lucide-react"
import Swal from "sweetalert2"
import { crearPartido } from "@/hooks/use-api"

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
  const [turnosDisponibles, setTurnosDisponibles] = useState<{ inicio: string; fin: string }[]>([])

  useEffect(() => {
    if (cancha) {
      const turnos = []
      const [aperturaH, aperturaM] = cancha.hora_apertura.split(":").map(Number)
      const [cierreH, cierreM] = cancha.hora_cierre.split(":").map(Number)
      const duracion = cancha.duracion_turno || 60
      
      let actual = new Date()
      actual.setHours(aperturaH, aperturaM, 0, 0)
      
      const fin = new Date()
      fin.setHours(cierreH, cierreM, 0, 0)
      
      while (actual < fin) {
        const inicioStr = actual.toTimeString().slice(0, 5)
        actual.setMinutes(actual.getMinutes() + duracion)
        const finStr = actual.toTimeString().slice(0, 5)
        
        if (actual <= fin) {
          turnos.push({ inicio: inicioStr, fin: finStr })
        }
      }
      setTurnosDisponibles(turnos)
    } else {
      setTurnosDisponibles([])
    }
    setHorario("")
  }, [cancha])

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
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [canchaId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cancha || !fecha || !horario || !tipo) {
      Swal.fire("Atención", "Por favor, elegí una cancha y completá todos los campos requeridos.", "warning")
      return
    }

    const now = new Date()
    const matchDate = new Date(`${fecha}T${horario}`)
    if (matchDate <= now) {
      Swal.fire("Atención", "La fecha y hora del partido deben ser en el futuro.", "warning")
      return
    }

    const cantidadJugadoresNum = cancha?.tamano ? cancha.tamano * 2 : 0;
    
    if (tipo === "abierto") {
      const cupos = Number(cuposDisponibles)
      if (!cupos || cupos < 1 || cupos >= cantidadJugadoresNum) {
        Swal.fire("Atención", `Para partidos abiertos, indicá cuántos lugares disponibles tenés (entre 1 y ${cantidadJugadoresNum - 1}).`, "warning")
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
        confirmButtonColor: "#16a34a",
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
      Swal.fire("Error", error.message || "No se pudo crear el partido", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  const modalidad = cancha?.tamano ? `Fútbol ${cancha.tamano}` : "N/A"
  const cantidadJugadores = cancha?.tamano ? cancha.tamano * 2 : "N/A"

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Crear Nuevo Partido</CardTitle>
          <p className="text-muted-foreground">Configurá los detalles de tu encuentro deportivo.</p>
        </CardHeader>
        <CardContent>
          
          {!canchaId && (
            <div className="space-y-2 mb-6">
              <Label htmlFor="canchaSelect">Seleccioná una Cancha *</Label>
              <select
                id="canchaSelect"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" /> {cancha.nombre}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {cancha.zona} - {cancha.direccion}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {cancha.hora_apertura} a {cancha.hora_cierre} hs ({cancha.duracion_turno || 60} min)
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Info className="h-4 w-4" />
                    Fútbol {cancha.tamano} • Superficie: {cancha.tipo_superficie}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sun className="h-4 w-4" />
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
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario">Turno *</Label>
                <select
                  id="horario"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={!cancha}
                >
                  <option value="" disabled>Seleccioná un turno</option>
                  {turnosDisponibles.map((turno) => (
                    <option key={turno.inicio} value={turno.inicio}>
                      De {turno.inicio} a {turno.fin} hs
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Modalidad
                  <span title="Se calcula según la cancha">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Label>
                <Input value={modalidad} readOnly className="bg-muted text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Cantidad Jugadores
                  <span title="Se calcula según la cancha">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Label>
                <Input value={cantidadJugadores.toString()} readOnly className="bg-muted text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Partido *</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="abierto">Abierto (Cualquiera puede unirse)</option>
                <option value="cerrado">Cerrado (Solo invitados)</option>
              </select>
            </div>

            {tipo === "abierto" && (
              <div className="space-y-2">
                <Label htmlFor="cupos">Lugares Disponibles (Cupos) *</Label>
                <Input
                  id="cupos"
                  type="number"
                  min="1"
                  max={cancha?.tamano ? (cancha.tamano * 2) - 1 : 1}
                  value={cuposDisponibles}
                  onChange={(e) => setCuposDisponibles(e.target.value)}
                  placeholder="Ej: 3 (si te faltan 3 jugadores)"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (Opcional)</Label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Aclaraciones, reglas, o cualquier info extra para los jugadores..."
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !cancha}>
              {isSubmitting ? "Procesando..." : "Confirmar y Pagar Seña"}
            </Button>
          </form>
        </CardContent>
      </Card>
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
