"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  MapPin,
  Clock,
  Calendar,
  Users,
  ChevronRight,
  Frown,
  Filter,
  X,
  SlidersHorizontal,
  Zap,
  DollarSign,
  Sun,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthContext } from "@/components/auth-provider"
import {
  getMisCanchas,
  getPartidosDisponibles,
  getUserProfile,
  getFiltrosDisponibles,
  getTorneosDisponibles,
  getMisTorneos,
  type PartidoData,
  type UserProfile,
  type PartidoDisponibleFilters,
  type FiltrosDisponiblesData,
  type TorneoData
} from "@/hooks/use-api"
import { Trophy } from "lucide-react"

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

function FootballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.9" />
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" />
      <polygon points="12,7 14.5,11 12,15 9.5,11" fill="white" opacity="0.3" />
    </svg>
  )
}

// Zonas disponibles en el sistema
const ZONAS = [
  "Caballito",
  "Belgrano",
  "Almagro",
  "Villa Crespo",
  "Palermo",
  "Flores",
  "Saavedra",
  "Núñez",
  "Villa Urquiza",
  "Devoto",
  "Liniers",
  "Boedo",
  "San Telmo",
  "La Boca",
  "Barracas",
]

const MODALIDADES = ["futbol 5", "futbol 7", "futbol 9", "futbol 11"]

export default function HomePage() {
  const { role } = useAuthContext()
  const router = useRouter()

  // Admin state
  const [canchas, setCanchas] = useState<Cancha[]>([])
  const [adminTorneos, setAdminTorneos] = useState<TorneoData[]>([])

  // Jugador state
  const [partidos, setPartidos] = useState<PartidoData[]>([])
  const [torneos, setTorneos] = useState<TorneoData[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userZona, setUserZona] = useState<string>("")
  const [isUsingUserZone, setIsUsingUserZone] = useState(true)

  // Filter states (jugador)
  const [showFilters, setShowFilters] = useState(false)
  const [filtroZona, setFiltroZona] = useState<string>("")
  const [filtroModalidad, setFiltroModalidad] = useState<string>("")
  const [filtroFecha, setFiltroFecha] = useState<string>("")
  const [filtrosOpciones, setFiltrosOpciones] = useState<FiltrosDisponiblesData | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  // Load user profile (for jugador zone auto-filter)
  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getUserProfile()
        setUserProfile(profile)
        if (profile.zona) {
          setUserZona(profile.zona)
          setFiltroZona(profile.zona)
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
    async function fetchTorneos() {
      try {
        const data = await getTorneosDisponibles()
        setTorneos(data)
      } catch (e) {
        console.warn("Error al cargar torneos:", e)
      }
    }
    if (role === "jugador") {
      loadProfile()
      loadFiltros()
      fetchTorneos()
    }
  }, [role])

  // Fetch partidos for jugador
  const fetchPartidos = useCallback(async () => {
    setIsLoading(true)
    try {
      const filters: PartidoDisponibleFilters = {}
      if (filtroZona) filters.zona = filtroZona
      if (filtroModalidad) filters.modalidad = filtroModalidad
      if (filtroFecha) filters.fecha = filtroFecha

      const data = await getPartidosDisponibles(filters)
      setPartidos(data)
    } catch (err: any) {
      console.warn("Error al cargar partidos:", err)
      setPartidos([])
    } finally {
      setIsLoading(false)
    }
  }, [filtroZona, filtroModalidad, filtroFecha])

  // Fetch canchas for admin
  useEffect(() => {
    async function fetchCanchasYTorneos() {
      try {
        if (role === "admin") {
          const [canchasData, torneosData] = await Promise.all([
            getMisCanchas(),
            getMisTorneos()
          ])
          setCanchas(canchasData)
          setAdminTorneos(torneosData)
        }
      } catch (error) {
        console.warn("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    if (role === "admin") {
      fetchCanchasYTorneos()
    }
  }, [role])

  // Fetch partidos when jugador zone is ready or filters change
  useEffect(() => {
    if (role === "jugador" && (userZona || !isUsingUserZone)) {
      fetchPartidos()
    }
  }, [fetchPartidos, userZona, isUsingUserZone, role])

  useEffect(() => {
    if (filtroZona !== userZona) {
      setIsUsingUserZone(false)
    }
  }, [filtroZona, userZona])

  const clearFilters = () => {
    setFiltroZona(userZona)
    setFiltroModalidad("")
    setFiltroFecha("")
    setIsUsingUserZone(true)
  }

  const hasActiveFilters =
    filtroZona !== userZona || filtroModalidad || filtroFecha

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(precio)
  }

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

  // Group partidos by date
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

  // ─── ADMIN VIEW ──────────────────────────────────────────
  if (role === "admin") {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Mis Canchas
            </h1>
            <p className="text-muted-foreground mt-1">
              Administrá y gestioná tus espacios
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="font-semibold" asChild>
              <Link href="/agenda">
                <Calendar className="mr-2 h-4 w-4" />
                Mi Agenda
              </Link>
            </Button>
            <Button className="font-semibold" asChild>
              <Link href="/canchas/nueva">
                <Plus className="mr-2 h-4 w-4" />
                Crear Cancha
              </Link>
            </Button>
          </div>
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
              Todavia no tenés canchas creadas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canchas.map((cancha, index) => (
              <Link key={cancha.id} href={`/canchas/${cancha.id}`}>
                <div
                    className="bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 group h-full overflow-hidden hover:-translate-y-1 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    {cancha.fotos ? (
                        <div className="aspect-video w-full overflow-hidden relative">
                            <img
                                src={cancha.fotos}
                                alt={cancha.nombre}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {cancha.iluminacion && (
                                <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Iluminada
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="aspect-video w-full bg-gradient-to-br from-primary/10 via-secondary to-muted flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-4 left-4">
                                    <FootballIcon className="w-8 h-8 text-primary animate-float" />
                                </div>
                                <div className="absolute bottom-4 right-4">
                                    <FootballIcon className="w-6 h-6 text-primary animate-float-reverse" />
                                </div>
                            </div>
                            <div className="w-20 h-20 bg-card/80 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <FootballIcon className="h-10 w-10 text-primary" />
                            </div>
                            {cancha.iluminacion && (
                                <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Iluminada
                                </div>
                            )}
                        </div>
                    )}
                    <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {cancha.nombre}
                            </h3>
                            <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                                <Star className="w-3 h-3 fill-current" />
                                <span className="text-xs font-medium">4.8</span>
                            </div>
                        </div>
                        <div className="space-y-2.5 text-sm">
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                    <MapPin className="h-4 w-4 text-primary" />
                                </div>
                                <span className="truncate">{cancha.zona} - {cancha.direccion}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                    <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <span>{cancha.hora_apertura} - {cancha.hora_cierre}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                    <Users className="h-4 w-4 text-primary" />
                                </div>
                                <span>Fútbol {cancha.tamano} • {cancha.tipo_superficie}</span>
                            </div>
                        </div>
                        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                            <div>
                                <span className="text-2xl font-bold text-primary">
                                    {formatearPrecio(cancha.precio_por_turno)}
                                </span>
                                <span className="text-muted-foreground text-sm ml-1">/turno</span>
                            </div>
                            <Button 
                                size="sm" 
                                className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                onClick={(e) => {
                                    e.preventDefault()
                                    router.push(`/canchas/${cancha.id}/editar`)
                                }}
                            >
                                Editar
                            </Button>
                        </div>
                    </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* SECCIÓN DE TORNEOS DEL ADMIN */}
        {!isLoading && adminTorneos.length > 0 && (
          <div className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                  <Trophy className="h-7 w-7 text-primary" />
                  Mis Torneos
                </h2>
                <p className="text-muted-foreground mt-1">
                  Torneos que estás organizando
                </p>
              </div>
              <Button variant="outline" className="font-semibold" asChild>
                <Link href="/torneos">
                  Ver todos
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminTorneos.slice(0, 3).map((torneo) => (
                  <Link key={torneo.id} href={`/torneos/${torneo.id}`}>
                      <div className="bg-card rounded-2xl border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden h-full flex flex-col cursor-pointer group">
                          <div className="bg-gradient-to-br from-primary/10 via-secondary to-muted p-6 flex items-center justify-center border-b border-border relative">
                              <Trophy className="h-12 w-12 text-primary drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                              <div className="flex items-start justify-between gap-2 mb-3">
                                  <h3 className="font-bold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                      {torneo.nombre}
                                  </h3>
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
                                      {torneo.estado}
                                  </span>
                              </div>
                              <div className="space-y-3 text-sm text-muted-foreground mb-4">
                                  <div className="flex items-center gap-2.5">
                                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                                      <span>Inicio: {new Date(torneo.fecha_inicio).toLocaleDateString('es-AR')}</span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                                      <span className="truncate">{torneo.lugar}</span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                      <Users className="h-4 w-4 text-primary shrink-0" />
                                      <span>{torneo.equipos_inscriptos} / {torneo.max_equipos} Equipos</span>
                                  </div>
                              </div>
                              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                  <div>
                                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Inscripción</p>
                                      <span className="text-lg font-bold text-foreground">
                                          {formatearPrecio(torneo.costo_inscripcion)}
                                      </span>
                                  </div>
                                  <Button 
                                      variant="ghost" 
                                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                                  >
                                      Detalle
                                  </Button>
                              </div>
                          </div>
                      </div>
                  </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── JUGADOR VIEW: PARTIDOS DISPONIBLES ─────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Partidos Disponibles
          </h1>
          <p className="text-muted-foreground mt-1">
            {isUsingUserZone && userZona
              ? `Mostrando partidos cerca de ${userZona}`
              : "Encontrá un partido abierto y sumate"}
          </p>
        </div>
        <Button className="font-semibold" asChild>
          <Link href="/partidos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Partido
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-6">
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

        {/* Quick zone indicator when filters collapsed */}
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
      ) : partidos.length === 0 ? (
        /* Empty state - friendly message */
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {partidos.length}
              </span>{" "}
              {partidos.length === 1
                ? "partido disponible"
                : "partidos disponibles"}
            </p>
          </div>

          {fechasOrdenadas.map((fecha) => (
            <div key={fecha}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    {formatearFechaRelativa(fecha)}
                  </span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partidosPorFecha[fecha].map((partido) => {
                  const spotsLeft = partido.cupos_disponibles
                  const totalPlayers = partido.cantidad_jugadores
                  const confirmedCount = totalPlayers - spotsLeft
                  const spotsUrgent = spotsLeft <= 2

                  return (
                    <Link key={partido.id} href={`/partidos/${partido.id}`}>
                      <div className="bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg group h-full overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
                        <div className="p-5">
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

                          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                            {partido.cancha
                              ? partido.cancha.nombre
                              : `Cancha #${partido.cancha_id}`}
                          </h3>

                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {partido.cancha
                                ? `${partido.cancha.zona} • ${partido.cancha.direccion}`
                                : "Dirección no disponible"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-foreground font-medium">
                                {formatearHorarioTurno(partido.horario, 60)}
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

                          <div className="pt-3 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <div className="flex items-center gap-1.5">
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

      {/* SECCIÓN DE TORNEOS */}
      {!isLoading && torneos.length > 0 && (
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                <Trophy className="h-7 w-7 text-primary" />
                Torneos Disponibles
              </h2>
              <p className="text-muted-foreground mt-1">
                Competí con tu equipo y ganá premios
              </p>
            </div>
            <Button variant="outline" className="font-semibold" asChild>
              <Link href="/torneos">
                Ver todos
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {torneos.slice(0, 3).map((torneo) => (
                <Link key={torneo.id} href={`/torneos/${torneo.id}`}>
                    <div className="bg-card rounded-2xl border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden h-full flex flex-col cursor-pointer group">
                        <div className="bg-gradient-to-br from-primary/10 via-secondary to-muted p-6 flex items-center justify-center border-b border-border relative">
                            <Trophy className="h-12 w-12 text-primary drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <h3 className="font-bold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                    {torneo.nombre}
                                </h3>
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
                                    Abierto
                                </span>
                            </div>
                            <div className="space-y-3 text-sm text-muted-foreground mb-4">
                                <div className="flex items-center gap-2.5">
                                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                                    <span>Inicio: {new Date(torneo.fecha_inicio).toLocaleDateString('es-AR')}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                                    <span className="truncate">{torneo.lugar}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Users className="h-4 w-4 text-primary shrink-0" />
                                    <span>{torneo.equipos_inscriptos} / {torneo.max_equipos} Equipos</span>
                                </div>
                            </div>
                            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Inscripción</p>
                                    <span className="text-lg font-bold text-foreground">
                                        {formatearPrecio(torneo.costo_inscripcion)}
                                    </span>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                                >
                                    Detalle
                                </Button>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}