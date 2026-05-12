"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, Trophy, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthContext } from "@/components/auth-provider"
import { getUserProfile, type UserProfile } from "@/hooks/use-api"

export default function ProfilePage() {
  const { userId } = useAuthContext()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!userId) return

      try {
        const data = await getUserProfile(userId)
        setProfile(data)
      } catch (error) {
        console.error("Error al cargar el perfil:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [userId])

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
                  {profile?.edad} años • {profile?.genero}
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
              <CardTitle>Mis Partidos</CardTitle>
            </CardHeader>
            <CardContent className="py-8">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
