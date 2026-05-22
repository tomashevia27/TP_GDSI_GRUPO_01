"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, MapPin, Clock, Sun, DollarSign, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/components/auth-provider"
import { getMisCanchas } from "@/hooks/use-api"

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
        if (role === "admin") {
          const data = await getMisCanchas()
          setCanchas(data)
        } else {
          const res = await fetch(`${API_URL}/canchas/disponibles`)
          if (res.ok) {
            const data = await res.json()
            setCanchas(data)
          }
        }
      } catch (error) {
        console.warn("Error fetching canchas:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCanchas()
  }, [role])
  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(precio)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {role === "admin" ? "Mis Canchas" : "Canchas Disponibles"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === "admin" 
              ? "Administrá y gestioná tus espacios" 
              : "Encontrá la cancha perfecta para tu partido"}
          </p>
        </div>
        {role === "admin" ? (
          <Button className="font-semibold" asChild>
            <Link href="/canchas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Crear Cancha
            </Link>
          </Button>
        ) : (
          <Button className="font-semibold" asChild>
            <Link href="/partidos/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Partido
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : canchas.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">
            {role === "admin"
              ? "Todavia no tenés canchas creadas."
              : "No hay canchas disponibles en este momento."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {canchas.map((cancha) => (
            <Link key={cancha.id} href={`/canchas/${cancha.id}`}>
              <div className="bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg group h-full overflow-hidden">
                {cancha.fotos ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={cancha.fotos}
                      alt={cancha.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                    <div className="w-16 h-16 bg-background/50 rounded-2xl flex items-center justify-center">
                      <Zap className="h-8 w-8 text-primary/40" />
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-3">
                    {cancha.nombre}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{cancha.zona} • {cancha.direccion}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      {cancha.hora_apertura} - {cancha.hora_cierre} (60 min)
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {formatearPrecio(cancha.precio_por_turno)}
                    </span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                      por turno
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}