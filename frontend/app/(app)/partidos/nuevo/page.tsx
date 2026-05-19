"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Info, ArrowLeft } from "lucide-react"
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
          
          {!canchaId ? (
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
          ) : cancha && (
            <div className="bg-secondary/50 p-4 rounded-lg mb-6 border">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Cancha Seleccionada
              </h3>
              <p className="text-sm"><strong>{cancha.nombre}</strong></p>
              <p className="text-sm text-muted-foreground">{cancha.zona} - {cancha.direccion}</p>
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
                <Label htmlFor="horario">Horario *</Label>
                <Input
                  id="horario"
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  required
                />
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
