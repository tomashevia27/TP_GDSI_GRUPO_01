"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, MapPin, Clock, Sun, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthContext } from "@/components/auth-provider"

const API_URL = "http://localhost:8000"

interface Cancha {
  id: number
  nombre: string
  tipo_superficie: string
  tamano: number
  iluminacion: boolean
  zona: string
  direccion: string
  precio_por_turno: number
  dias_operativos_texto: string
  hora_apertura: string
  hora_cierre: string
  fotos: string | null
  activa: boolean
}

export default function HomePage() {
  const { role } = useAuthContext()
  const [canchas, setCanchas] = useState<Cancha[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    async function fetchCanchas() {
      try {
        const res = await fetch(`${API_URL}/canchas/disponibles`)
        if (res.ok) {
          const data = await res.json()
          setCanchas(data)
        }
      } catch (error) {
        console.error("Error fetching canchas:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCanchas()
  }, [])
  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(precio)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Canchas Disponibles</h1>
        <div className="flex gap-4">
          {role === "admin" && (
            <Button variant="outline" className="font-bold" asChild>
              <Link href="/canchas/nueva">
                <MapPin className="mr-2 h-4 w-4" />
                Crear Cancha
              </Link>
            </Button>
          )}
          <Button className="font-bold">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Partido
          </Button>
        </div>

      </div>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : canchas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-lg">
              No hay canchas disponibles en este momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {canchas.map((cancha) => (
            <Link key={cancha.id} href={`/canchas/${cancha.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                {cancha.fotos ? (
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                    <img
                      src={cancha.fotos}
                      alt={cancha.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-secondary rounded-t-lg flex items-center justify-center">
                    <Sun className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{cancha.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {cancha.zona} • {cancha.direccion}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {cancha.hora_apertura} - {cancha.hora_cierre}
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-primary pt-2">
                      <DollarSign className="h-4 w-4" />
                      {formatearPrecio(cancha.precio_por_turno)} / turno
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}