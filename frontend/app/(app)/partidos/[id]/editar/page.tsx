"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Info, ArrowLeft, Clock, DollarSign, Zap } from "lucide-react"
import Swal from "sweetalert2"
import { editarPartido, getPartido, type PartidoData, API_URL } from "@/hooks/use-api"

function EditarPartidoForm() {
  const router = useRouter()
  const params = useParams()
  const partidoId = params.id as string

  const [partido, setPartido] = useState<PartidoData | null>(null)
  const [cancha, setCancha] = useState<any>(null)
  const [originalTamano, setOriginalTamano] = useState<number | null>(null)
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
    async function fetchPartido() {
      try {
        const data = await getPartido(partidoId)
        setPartido(data)
        setFecha(data.fecha)
        setHorario(data.horario.substring(0, 5)) // "HH:MM"
        setTipo(data.tipo)
        if (data.cupos_disponibles !== undefined && data.cupos_disponibles !== null) {
          setCuposDisponibles(data.cupos_disponibles.toString())
        }
        setDescripcion(data.descripcion || "")

        const resCancha = await fetch(`${API_URL}/canchas/${data.cancha_id}`)
        if (resCancha.ok) {
          const canchaData = await resCancha.json()
          setCancha(canchaData)
          setOriginalTamano(canchaData.tamano)
        }

        const resTodasCanchas = await fetch(`${API_URL}/canchas`)
        if (resTodasCanchas.ok) {
          setTodasCanchas(await resTodasCanchas.json())
        }
      } catch (error) {
        Swal.fire("Error", "No se pudo cargar el partido", "error").then(() => router.back())
      } finally {
        setIsLoading(false)
      }
    }
    fetchPartido()
  }, [partidoId, router])

  useEffect(() => {
    if (cancha) {
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
          turnos.push({ inicio: inicioStr, fin: finStr })
        }
      }
      setTurnosDisponibles(turnos)
    } else {
      setTurnosDisponibles([])
    }
  }, [cancha])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cancha || !fecha || !horario || !tipo) {
      Swal.fire({ title: "Atención", text: "Por favor completá todos los campos requeridos.", icon: "warning", confirmButtonColor: "#FF6B4A" })
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
      await editarPartido(partidoId, {
        cancha_id: Number(cancha.id),
        fecha,
        horario,
        tipo,
        descripcion: descripcion || undefined,
        cupos_disponibles: tipo === "abierto" ? Number(cuposDisponibles) : undefined
      })

      Swal.fire({
        title: "¡Guardado!",
        text: "El partido fue actualizado.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        router.push(`/partidos/${partidoId}`)
      })
      
    } catch (error: any) {
      Swal.fire({ title: "Error", text: error.message || "No se pudo editar el partido", icon: "error", confirmButtonColor: "#FF6B4A" })
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
        <span className="text-sm font-medium">Volver al detalle</span>
      </button>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Editar Partido</h1>
            <p className="text-muted-foreground">Modificá los detalles de tu encuentro deportivo.</p>
          </div>

          <div className="space-y-2 mb-6">
            <Label htmlFor="canchaSelect" className="font-medium text-sm">Cancha *</Label>
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
              {todasCanchas
                .filter(c => originalTamano === null || c.tamano === originalTamano)
                .map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} - {c.zona}</option>
                ))}
            </select>
          </div>
          
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
                    <option key={turno.inicio} value={turno.inicio}>
                      De {turno.inicio} a {turno.fin} hs
                    </option>
                  ))}
                  {/* Fallback option if current time is not in available slots (e.g. past time or custom) */}
                  {!turnosDisponibles.some(t => t.inicio === horario) && horario && (
                     <option value={horario}>De {horario} hs</option>
                  )}
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
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function EditarPartidoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <EditarPartidoForm />
    </Suspense>
  )
}
