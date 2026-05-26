"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, Trophy, Pencil, Zap, Clock, DollarSign, Calendar, Star, Users, ChevronRight, Edit3, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/components/auth-provider"
import { getUserProfile, getMisPartidos, getMisCanchas, type UserProfile, type PartidoData } from "@/hooks/use-api"

const API_URL = "http://localhost:8000"

export default function ProfilePage() {
  const { userId, role } = useAuthContext()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [canchas, setCanchas] = useState<any[]>([])
  const [misPartidos, setMisPartidos] = useState<{ organizados: PartidoData[], inscritos: PartidoData[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!userId) return

      try {
        const data = await getUserProfile()
        setProfile(data)

          if (data.rol === "admin") {
            const canchasData = await getMisCanchas()
            setCanchas(canchasData)
        } else if (data.rol === "jugador") {
           const partidosData = await getMisPartidos()
           setMisPartidos(partidosData)
        }
      } catch (error) {
        console.warn("Error al cargar el perfil:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [userId])

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

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  const avatarUrl =
    profile?.foto_perfil ||
    `https://ui-avatars.com/api/?name=${profile?.nombre}+${profile?.apellido}&background=FF6B4A&color=fff&size=200`

  // Separar y ordenar partidos si es jugador
  let proximos: PartidoData[] = []
  let pasados: PartidoData[] = []

  if (profile?.rol === "jugador" && misPartidos) {
    // Usamos Map para evitar duplicados si es organizador e inscrito a la vez
    const partidosMap = new Map<number, PartidoData>()
    misPartidos.organizados.forEach(p => partidosMap.set(p.id, p))
    misPartidos.inscritos.forEach(p => partidosMap.set(p.id, p))
    
    const todosLosPartidos = Array.from(partidosMap.values())
    const now = new Date()

    proximos = todosLosPartidos.filter(p => {
      const matchDate = new Date(`${p.fecha}T${p.horario}`)
      return matchDate >= now
    }).sort((a, b) => new Date(`${a.fecha}T${a.horario}`).getTime() - new Date(`${b.fecha}T${b.horario}`).getTime())

    pasados = todosLosPartidos.filter(p => {
      const matchDate = new Date(`${p.fecha}T${p.horario}`)
      return matchDate < now
    }).sort((a, b) => new Date(`${b.fecha}T${b.horario}`).getTime() - new Date(`${a.fecha}T${a.horario}`).getTime())
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
        <div className="relative">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
          />
          <Link href="/profile/edit" className="absolute bottom-0 right-0 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <Edit3 className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
        
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-foreground">
            {profile?.nombre} {profile?.apellido}
          </h1>
          <p className="text-muted-foreground mt-1 capitalize">{profile?.edad} años • {profile?.genero} • {profile?.rol}</p>
          
          <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {profile?.zona}, Argentina
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {profile?.rol !== "admin" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{proximos.length + pasados.length}</p>
            <p className="text-xs text-muted-foreground">Partidos</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{proximos.length}</p>
            <p className="text-xs text-muted-foreground">Próximos</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{pasados.length}</p>
            <p className="text-xs text-muted-foreground">Jugados</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">4.8</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>
      )}

      {/* Content based on role */}
      {profile?.rol === "admin" ? (
        /* Admin: Mis Canchas */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Mis Canchas</h2>
            <Button size="sm" asChild>
              <Link href="/canchas/nueva">Crear Cancha</Link>
            </Button>
          </div>

          {canchas.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center bg-secondary/30">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">
                Todavía no creaste ninguna cancha
              </h3>
              <p className="text-muted-foreground mb-6">
                Comenzá a administrar tu predio agregando tu primera cancha.
              </p>
              <Button asChild>
                <Link href="/canchas/nueva">Crear Cancha</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {canchas.map((cancha) => (
                <Link key={cancha.id} href={`/canchas/${cancha.id}`}>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all group mb-3">
                    <div className="flex items-center gap-4">
                      {cancha.fotos ? (
                        <img src={cancha.fotos} alt={cancha.nombre} className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-secondary to-muted rounded-xl flex items-center justify-center">
                          <Zap className="h-6 w-6 text-primary/40" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {cancha.nombre}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {cancha.zona} • {cancha.direccion}
                        </div>
                        <p className="text-sm font-semibold text-primary mt-1">
                          {formatearPrecio(cancha.precio_por_turno)} / Turno
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Jugador: Mis Partidos */
        <div className="space-y-8">
          {proximos.length === 0 && pasados.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center bg-secondary/30">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">
                Todavía no jugaste ningún partido
              </h3>
              <p className="text-muted-foreground mb-6">
                Acá vas a ver tu historial de encuentros, estadísticas y
                resultados de los torneos en los que participes.
              </p>
              <Button asChild>
                <Link href="/home">Buscar canchas disponibles</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Próximos partidos */}
              {proximos.length > 0 && (
                <div>
                  <h2 className="font-semibold text-foreground mb-4">Próximos Partidos</h2>
                  <div className="space-y-3">
                    {proximos.map(partido => (
                      <Link key={partido.id} href={`/partidos/${partido.id}`}>
                        <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all group mb-3">
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors capitalize">
                              {partido.modalidad}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatearFecha(partido.fecha)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatearHorarioTurno(partido.horario, 60)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {partido.cancha ? partido.cancha.nombre : `Cancha #${partido.cancha_id}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-lg capitalize ${
                              partido.estado.toLowerCase() === "cancelado"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-accent/10 text-accent"
                            }`}>
                              {partido.estado}
                            </span>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Partidos pasados */}
              {pasados.length > 0 && (
                <div>
                  <h2 className="font-semibold text-foreground mb-4">Partidos Pasados</h2>
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {pasados.map((partido, index) => (
                      <Link key={partido.id} href={`/partidos/${partido.id}`}>
                        <div className={`flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors ${
                          index !== pasados.length - 1 ? "border-b border-border" : ""
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                              <Trophy className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground capitalize">{partido.modalidad}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatearFecha(partido.fecha)} - {formatearHorarioTurno(partido.horario, 60)}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-lg capitalize ${
                            partido.estado.toLowerCase() === "cancelado"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-secondary text-muted-foreground"
                          }`}>
                            {partido.estado}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/profile/edit">Editar Perfil</Link>
        </Button>
      </div>
    </div>
  )
}
