"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Filter,
  X,
  Plus,
  ChevronRight,
  Frown,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthContext } from "@/components/auth-provider"
import {
  getPartidosDisponibles,
  getUserProfile,
  getFiltrosDisponibles,
  type PartidoData,
  type UserProfile,
  type PartidoDisponibleFilters,
  type FiltrosDisponiblesData,
} from "@/hooks/use-api"




// Football SVG Component
function FootballIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.9" />
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" />
            <polygon points="12,7 14.5,11 12,15 9.5,11" fill="white" opacity="0.3" />
        </svg>
    )
}

export default function PartidosDisponiblesPage() {

  const [partidos, setPartidos] = useState<PartidoData[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [filtroZona, setFiltroZona] = useState<string>("")
  const [filtroModalidad, setFiltroModalidad] = useState<string>("")
  const [filtroFecha, setFiltroFecha] = useState<string>("")
  const [userZona, setUserZona] = useState<string>("")
  const [isUsingUserZone, setIsUsingUserZone] = useState(true)
  const [filtrosOpciones, setFiltrosOpciones] = useState<FiltrosDisponiblesData | null>(null)

  // Load user profile to get their zone
  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getUserProfile()
        setUserProfile(profile)
        if (profile.zona) {
          setUserZona(profile.zona)
          setFiltroZona(profile.zona) // auto-set filter to user's zone
        }
      } catch (e) {
        console.warn("Error al cargar perfil:", e)
      }
    }
    async function loadFiltros() {
      try {
        const opciones = await getFiltrosDisponibles()
        setFiltrosOpciones(opciones)
      } catch (e) {
        console.warn("Error al cargar filtros dinámicos:", e)
      }
    }
    loadProfile()
    loadFiltros()
  }, [])

  // Fetch partidos whenever filters change
  const fetchPartidos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters: PartidoDisponibleFilters = {}
      if (filtroZona) filters.zona = filtroZona
      if (filtroModalidad) filters.modalidad = filtroModalidad
      if (filtroFecha) filters.fecha = filtroFecha

      const data = await getPartidosDisponibles(filters)
      setPartidos(data)
    } catch (err: any) {
      console.warn("Error al cargar partidos:", err)
      setError(err.message || "No se pudieron cargar los partidos")
      setPartidos([])
    } finally {
      setIsLoading(false)
    }
  }, [filtroZona, filtroModalidad, filtroFecha])

  useEffect(() => {
    // Wait for the user's zone to load before fetching (to prioritize by zone)
    if (userZona || !isUsingUserZone) {
      fetchPartidos()
    }
  }, [fetchPartidos, userZona, isUsingUserZone])

  // When user manually changes zona filter away from their zone
  useEffect(() => {
    if (filtroZona !== userZona) {
      setIsUsingUserZone(false)
    }
  }, [filtroZona, userZona])

  const clearFilters = () => {
    setFiltroZona(userZona) // reset to user's zone
    setFiltroModalidad("")
    setFiltroFecha("")
    setIsUsingUserZone(true)
  }

  const hasActiveFilters = filtroZona !== userZona || filtroModalidad || filtroFecha

  const formatearFecha = (fechaStr: string) => {
    const [year, month, day] = fechaStr.split("-")
    return `${day}/${month}/${year}`
  }

  const formatearFechaRelativa = (fechaStr: string) => {
    const fecha = new Date(fechaStr + "T00:00:00")
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)
    const pasadoManana = new Date(hoy)
    pasadoManana.setDate(pasadoManana.getDate() + 2)

    if (fecha.getTime() === hoy.getTime()) return "Hoy"
    if (fecha.getTime() === manana.getTime()) return "Mañana"
    if (fecha.getTime() === pasadoManana.getTime()) return "Pasado mañana"

    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    return dias[fecha.getDay()] + " " + formatearFecha(fechaStr)
  }

  const formatearHorarioTurno = (
    horarioStr: string,
    duracionMinutos: number = 60
  ) => {
    const [h, m] = horarioStr.split(":")
    const date = new Date()
    date.setHours(parseInt(h), parseInt(m), 0)
    const startStr = `${h}:${m}`
    date.setMinutes(date.getMinutes() + duracionMinutos)
    const endH = date.getHours().toString().padStart(2, "0")
    const endM = date.getMinutes().toString().padStart(2, "0")
    return `${startStr} - ${endH}:${endM}`
  }

  // Group partidos by date for visual organization
  const partidosPorFecha = partidos.reduce(
    (acc, partido) => {
      const fecha = partido.fecha
      if (!acc[fecha]) acc[fecha] = []
      acc[fecha].push(partido)
      return acc
    },
    {} as Record<string, PartidoData[]>
  )

  const fechasOrdenadas = Object.keys(partidosPorFecha).sort()

  return (

    <div className="min-h-screen bg-background pb-12">
      {/* Hero Section */}
      <div className="relative h-[320px] sm:h-[400px] overflow-hidden">
          <Image
              src="/football-bg.jpg"
              alt="Campo de futbol"
              fill
              className="object-cover"
              priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/80 via-foreground/60 to-background" />

          {/* Floating football decorations */}
          <div className="absolute top-10 left-10 opacity-20 animate-float">
              <FootballIcon className="w-12 h-12 text-card" />
          </div>
          <div className="absolute top-20 right-20 opacity-15 animate-float-reverse">
              <FootballIcon className="w-8 h-8 text-card" />
          </div>
          <div className="absolute bottom-32 right-10 opacity-10 animate-float-slow">
              <FootballIcon className="w-16 h-16 text-card" />
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <h1 className="text-3xl sm:text-5xl font-bold text-card mb-4 drop-shadow-lg animate-slide-up text-balance">
                  Partidos Disponibles
              </h1>
              <p className="text-card/90 text-lg sm:text-xl max-w-2xl drop-shadow animate-slide-up animation-delay-100">
                  {isUsingUserZone && userZona
                    ? `Mostrando partidos cerca de ${userZona}`
                    : "Encontrá un partido abierto y sumate a jugar"}
              </p>
              
              <div className="mt-8 animate-slide-up animation-delay-200">
                <Button size="lg" className="font-semibold px-8" asChild>
                  <Link href="/partidos/nuevo">
                    <Plus className="mr-2 h-5 w-5" />
                    Crear Nuevo Partido
                  </Link>
                </Button>
              </div>
          </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        {/* Filter Bar */}

      <div className="bg-card rounded-2xl border border-border p-4 mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-primary rounded-full" />
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Always visible: quick zone indicator */}
        {!showFilters && isUsingUserZone && userZona && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>
              Filtrando por tu zona:{" "}
              <span className="font-medium text-foreground">{userZona}</span>
            </span>
            <button
              onClick={() => {
                setFiltroZona("")
                setIsUsingUserZone(false)
              }}
              className="text-primary hover:text-primary/80 text-xs underline"
            >
              Ver todas las zonas
            </button>
          </div>
        )}

        {/* Expanded filters */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-3 transition-all duration-300 ${showFilters
              ? "max-h-96 opacity-100 mt-3"
              : "max-h-0 opacity-0 overflow-hidden"
            }`}
        >
          {/* Zona */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Zona
            </label>
            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="flex h-10 w-full rounded-lg bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas las zonas</option>
              {(() => {
                const zonas = [...(filtrosOpciones?.zonas || [])]
                if (userZona && !zonas.find((z) => z.valor === userZona)) {
                  zonas.push({ valor: userZona, cantidad: 0 })
                }
                return zonas.map((zona) => (
                  <option key={zona.valor} value={zona.valor}>
                    {zona.valor}
                    {zona.valor === userZona ? " (tu zona)" : ""} ({zona.cantidad})
                  </option>
                ))
              })()}
            </select>
          </div>

          {/* Modalidad */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Modalidad
            </label>
            <select
              value={filtroModalidad}
              onChange={(e) => setFiltroModalidad(e.target.value)}
              className="flex h-10 w-full rounded-lg bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas las modalidades</option>
              {filtrosOpciones?.modalidades.map((mod) => (
                <option key={mod.valor} value={mod.valor}>
                  <span className="capitalize">{mod.valor}</span> ({mod.cantidad})
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha
            </label>
            <Input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="bg-input border-0 h-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">
              Buscando partidos disponibles...
            </p>
          </div>
        </div>
      ) : error ? (
        /* Error state */
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error al cargar partidos
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={fetchPartidos}>
            Reintentar
          </Button>
        </div>
      ) : partidos.length === 0 ? (
        /* Empty state */
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Frown className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            No hay partidos disponibles
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {isUsingUserZone && userZona
              ? `No encontramos partidos abiertos en ${userZona}. Probá cambiando los filtros o creá tu propio partido.`
              : "No encontramos partidos abiertos con los filtros seleccionados. Probá con otros filtros o creá tu propio partido."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowFilters(true)
                if (isUsingUserZone) {
                  setFiltroZona("")
                  setIsUsingUserZone(false)
                }
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Cambiar filtros
            </Button>
            <Button asChild>
              <Link href="/partidos/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Crear mi partido
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        /* Match cards grouped by date */
        <div className="space-y-8">
          {/* Results summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {partidos.length}
              </span>{" "}
              {partidos.length === 1 ? "partido disponible" : "partidos disponibles"}
            </p>
          </div>

          {fechasOrdenadas.map((fecha) => (
            <div key={fecha}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    {formatearFechaRelativa(fecha)}
                  </span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partidosPorFecha[fecha].map((partido) => {
                  const spotsLeft = partido.cupos_disponibles
                  const totalPlayers = partido.cantidad_jugadores
                  const confirmedCount = totalPlayers - spotsLeft
                  const spotsUrgent = spotsLeft <= 2

                  return (
                    <Link
                      key={partido.id}
                      href={`/partidos/${partido.id}`}
                    >
                      <div className="bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg group h-full overflow-hidden">
                        {/* Top accent bar */}
                        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />

                        <div className="p-5">
                          {/* Badge row */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-md capitalize">
                              {partido.modalidad}
                            </span>
                            {spotsUrgent && (
                              <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-md animate-pulse">
                                ¡Últimos lugares!
                              </span>
                            )}
                          </div>

                          {/* Cancha name */}
                          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                            {partido.cancha
                              ? partido.cancha.nombre
                              : `Cancha #${partido.cancha_id}`}
                          </h3>

                          {/* Address */}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {partido.cancha
                                ? `${partido.cancha.zona} • ${partido.cancha.direccion}`
                                : "Dirección no disponible"}
                            </span>
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-foreground font-medium">
                                {formatearHorarioTurno(partido.horario, partido.cancha?.duracion_turno || 60)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-foreground font-medium">
                                {formatearFecha(partido.fecha)}
                              </span>
                            </div>
                          </div>

                          {/* Footer with players */}
                          <div className="pt-3 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <div className="flex items-center gap-1.5">
                                {/* Mini progress bar */}
                                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${spotsUrgent
                                        ? "bg-destructive"
                                        : "bg-accent"
                                      }`}
                                    style={{
                                      width: `${(confirmedCount / totalPlayers) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`text-xs font-semibold ${spotsUrgent
                                      ? "text-destructive"
                                      : "text-muted-foreground"
                                    }`}
                                >
                                  {spotsLeft}{" "}
                                  {spotsLeft === 1 ? "lugar" : "lugares"}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  
      </div>
)
}
