"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, Clock, Users, Tag, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPartido, type PartidoData } from "@/hooks/use-api"

const API_URL = "http://localhost:8000"

export default function PartidoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const partidoId = params.id as string

  const [partido, setPartido] = useState<PartidoData | null>(null)
  const [cancha, setCancha] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      } catch (error) {
        console.error("Error al cargar detalles:", error)
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
      <div className="container mx-auto px-4 py-8">
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <Card>
        <CardHeader className="bg-primary/5 border-b pb-6">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                Partido de <span className="capitalize">{partido.modalidad}</span>
              </CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span className="capitalize">{partido.tipo}</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
              {partido.estado.toUpperCase()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Fecha</h4>
                  <p className="text-muted-foreground">{formatearFecha(partido.fecha)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Horario</h4>
                  <p className="text-muted-foreground">{partido.horario} hs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Lugares Disponibles</h4>
                  {partido.tipo === "abierto" ? (
                    <p className="text-muted-foreground">Faltan {partido.cupos_disponibles} de {partido.cantidad_jugadores} Jugadores</p>
                  ) : (
                    <p className="text-muted-foreground">Partido Cerrado (Cupo Completo)</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6 border-l pl-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">Ubicación</h4>
                  {cancha ? (
                    <>
                      <p className="font-medium text-primary">{cancha.nombre}</p>
                      <p className="text-sm text-muted-foreground">{cancha.zona}</p>
                      <p className="text-sm text-muted-foreground">{cancha.direccion}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Cancha #{partido.cancha_id}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {partido.descripcion && (
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Descripción / Notas</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                    {partido.descripcion}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div className="w-full">
                <h4 className="font-semibold mb-3">Jugadores Inscriptos</h4>
                <div className="grid gap-2">
                  {/* Creador del partido */}
                  <div className="flex items-center p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <span className="font-medium text-sm text-primary">
                      Creador: {partido.organizador ? `${partido.organizador.nombre} ${partido.organizador.apellido}` : "Organizador"}
                    </span>
                  </div>
                  
                  {/* Amigos/Invitados del creador */}
                  {Array.from({ length: Math.max(0, partido.cantidad_jugadores - partido.cupos_disponibles - 1) }).map((_, i) => (
                    <div key={i} className="flex items-center p-3 bg-secondary/30 rounded-lg border">
                      <span className="text-sm text-muted-foreground">Jugador Invitado {i + 1}</span>
                    </div>
                  ))}
                  
                  {/* Lugares disponibles (solo si es abierto) */}
                  {partido.tipo === "abierto" && Array.from({ length: partido.cupos_disponibles }).map((_, i) => (
                    <div key={`cupo-${i}`} className="flex items-center p-3 border border-dashed rounded-lg bg-background">
                      <span className="text-sm text-muted-foreground italic">Lugar disponible</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
