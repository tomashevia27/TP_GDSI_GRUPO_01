"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, Trophy, Pencil, Sun, Clock, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthContext } from "@/components/auth-provider"
import { getUserProfile, type UserProfile } from "@/hooks/use-api"

const API_URL = "http://localhost:8000"

export default function ProfilePage() {
  const { userId, role } = useAuthContext()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [canchas, setCanchas] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!userId) return

      try {
        const data = await getUserProfile(userId)
        setProfile(data)

        if (data.rol === "admin") {
           const res = await fetch(`${API_URL}/canchas`)
           if (res.ok) {
             const canchasData = await res.json()
             setCanchas(canchasData.filter((c: any) => String(c.propietario_id) === String(userId)))
           }
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
                  <p className="text-xl font-bold">12</p>
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
                    <Link href="/home">Buscar partidos</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
