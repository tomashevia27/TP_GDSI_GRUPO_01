"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuthContext } from "@/components/auth-provider"
import {
  getUserProfile,
  updateUserProfile,
  uploadImageToCloudinary,
} from "@/hooks/use-api"

export default function EditProfilePage() {
  const router = useRouter()
  const { userId } = useAuthContext()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    edad: "",
    genero: "Masculino",
    zona: "",
    password: "",
  })
  const [foto, setFoto] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [notifPartidos, setNotifPartidos] = useState(true)
  const [notifMensajes, setNotifMensajes] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!userId) return

      try {
        const data = await getUserProfile(userId)
        setFormData({
          nombre: data.nombre,
          apellido: data.apellido,
          edad: String(data.edad),
          genero: data.genero,
          zona: data.zona,
          password: "",
        })
        const avatarUrl =
          data.foto_perfil ||
          `https://ui-avatars.com/api/?name=${data.nombre}+${data.apellido}&background=16a34a&color=fff&size=200`
        setAvatarPreview(avatarUrl)
      } catch (error) {
        console.error("Error al cargar el perfil:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [userId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFoto(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      alert("El nombre y apellido son obligatorios y no pueden quedar en blanco.")
      return
    }

    if (!formData.password) {
      alert("Debes ingresar tu contraseña (o una nueva) para confirmar los cambios.")
      return
    }

    if (!userId) return

    setIsSaving(true)

    try {
      let fotoUrl: string | undefined

      if (foto) {
        try {
          fotoUrl = await uploadImageToCloudinary(foto)
        } catch {
          alert("Error al subir la nueva foto de perfil.")
          setIsSaving(false)
          return
        }
      } else if (!avatarPreview.includes("ui-avatars.com")) {
        fotoUrl = avatarPreview
      }

      await updateUserProfile(userId, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        edad: parseInt(formData.edad),
        genero: formData.genero,
        zona: formData.zona,
        password: formData.password,
        foto_perfil: fotoUrl,
      })

      alert("¡Perfil actualizado correctamente!")
      router.push("/profile")
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Error de conexión al actualizar el perfil."
      )
    } finally {
      setIsSaving(false)
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver
                </Link>
              </Button>
              <CardTitle>Configuración del Perfil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-8">
            <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-3 gap-8">
                {/* Form Fields */}
                <div className="md:col-span-2 space-y-6">
                  <h3 className="font-bold text-lg">Datos Personales</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="font-bold text-sm">
                        Nombre
                      </Label>
                      <Input
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido" className="font-bold text-sm">
                        Apellido
                      </Label>
                      <Input
                        id="apellido"
                        name="apellido"
                        value={formData.apellido}
                        onChange={handleChange}
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edad" className="font-bold text-sm">
                        Edad
                      </Label>
                      <Input
                        id="edad"
                        name="edad"
                        type="number"
                        value={formData.edad}
                        onChange={handleChange}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="genero" className="font-bold text-sm">
                        Género
                      </Label>
                      <Select
                        value={formData.genero}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, genero: value }))
                        }
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Femenino">Femenino</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zona" className="font-bold text-sm">
                      Zona de juego
                    </Label>
                    <Input
                      id="zona"
                      name="zona"
                      value={formData.zona}
                      onChange={handleChange}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-bold text-sm">
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Oculta por seguridad (escribí para cambiar)"
                      value={formData.password}
                      onChange={handleChange}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="font-bold text-lg">
                      Preferencias de Notificación
                    </h3>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notif-partidos" className="cursor-pointer">
                        Recibir alertas de nuevos partidos en mi zona
                      </Label>
                      <Switch
                        id="notif-partidos"
                        checked={notifPartidos}
                        onCheckedChange={setNotifPartidos}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notif-mensajes" className="cursor-pointer">
                        Avisarme cuando me inviten a un equipo
                      </Label>
                      <Switch
                        id="notif-mensajes"
                        checked={notifMensajes}
                        onCheckedChange={setNotifMensajes}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="font-bold px-8"
                    disabled={isSaving}
                  >
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>

                {/* Avatar Section */}
                <div className="text-center border-l pl-8">
                  <h3 className="font-bold text-lg mb-4">Foto de Perfil</h3>
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-36 h-36 rounded-full object-cover border mx-auto mb-4"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="text-sm"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
