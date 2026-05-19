"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, Trophy, Pencil, Sun, Clock, DollarSign, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        console.error("Error al cargar el perfil:", error)
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  const avatarUrl =
    profile?.foto_perfil ||
    `https://ui-avatars.com/api/?name=${profile?.nombre}+${profile?.apellido}&background=16a34a&color=fff&size=200`

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
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="text-center">
            <CardContent className="pt-8 pb-6">
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-36 h-36 rounded-full object-cover border-4 border-primary mx-auto mb-4"
              />
              <h2 className="text-xl font-bold mb-1">
                {profile?.nombre} {profile?.apellido}
              </h2>
              <p className="text-muted-foreground mb-4 flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                {profile?.zona}, Argentina
              </p>

              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <p className="text-xl font-bold">{proximos.length + pasados.length}</p>
                  <p className="text-sm text-muted-foreground">Partidos</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">4.8</p>
                  <p className="text-sm text-muted-foreground">Rating</p>
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-4 text-left text-sm mb-4">
                <p className="font-bold mb-1">Datos:</p>
                <p className="text-muted-foreground">
                  {profile?.edad} años • {profile?.genero} • tipo de cuenta: {profile?.rol}
                </p>
              </div>

              <Button variant="outline" asChild className="w-full font-bold">
                <Link href="/profile/edit">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="border-b">
              <CardTitle>{profile?.rol === "admin" ? "Mis Canchas" : "Mis Partidos"}</CardTitle>
            </CardHeader>
            <CardContent className="py-8">
              {profile?.rol === "admin" ? (
                canchas.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-secondary/50">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold mb-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                )
              ) : (
                proximos.length === 0 && pasados.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-secondary/50">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold mb-2">
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
                  <div className="space-y-8">
                    {proximos.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold mb-4 text-primary">Próximos Partidos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {proximos.map(partido => (
                            <Link key={partido.id} href={`/partidos/${partido.id}`}>
                              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-lg capitalize">{partido.modalidad}</span>
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                      {partido.estado}
                                    </span>
                                  </div>
                                  <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      {formatearFecha(partido.fecha)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      {partido.horario} hs
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      {partido.cancha ? partido.cancha.nombre : `Cancha #${partido.cancha_id}`}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {pasados.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold mb-4 text-muted-foreground">Partidos Pasados</h3>
                        <div className="grid grid-cols-1 gap-4 opacity-75">
                          {pasados.map(partido => (
                            <Link key={partido.id} href={`/partidos/${partido.id}`}>
                              <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
                                <CardContent className="p-4 flex justify-between items-center">
                                  <div>
                                    <div className="font-bold capitalize">{partido.modalidad}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatearFecha(partido.fecha)} a las {partido.horario} hs
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold px-2 py-1 bg-secondary rounded-full">
                                    {partido.estado}
                                  </span>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
