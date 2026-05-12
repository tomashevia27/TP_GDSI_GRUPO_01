"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { registerUser, uploadImageToCloudinary } from "@/hooks/use-api"
import Swal from 'sweetalert2'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    edad: "",
    genero: "Masculino",
    zona: "",
  })
  const [foto, setFoto] = useState<File | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
  
    try {
      let fotoUrl: string | undefined
  
      if (foto) {
        try {
          fotoUrl = await uploadImageToCloudinary(foto)
        } catch {
          // Alerta si falla la subida de imagen
          Swal.fire({
            title: "Error de imagen",
            text: "Hubo un problema al subir tu foto de perfil. Por favor, intentá de nuevo.",
            icon: "error",
            confirmButtonColor: "#00c2cb",
          })
          setIsLoading(false)
          return
        }
      }
  
      const userData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        password: formData.password,
        edad: parseInt(formData.edad),
        genero: formData.genero,
        zona: formData.zona,
        foto_perfil: fotoUrl,
      }
  
      const data = await registerUser(userData)
  
      // Alerta de éxito con el nombre del usuario
      await Swal.fire({
        title: "¡Bienvenido a TeamUp!",
        text: `Registro exitoso. ¡Hola ${data.nombre}!`,
        icon: "success",
        confirmButtonColor: "#00c2cb",
      })
  
      router.push("/login")
    } catch (error) {
      // Alerta de error (por ejemplo, si el email ya existe)
      Swal.fire({
        title: "No se pudo registrar",
        text: error instanceof Error ? error.message : "No se pudo conectar con el servidor.",
        icon: "error",
        confirmButtonColor: "#00c2cb",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl shadow-lg border-0">
        <CardContent className="p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">
              Crear Cuenta
            </h1>
            <p className="text-muted-foreground">Sumate a la comunidad</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="email" className="font-bold text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
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
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="zona" className="font-bold text-sm">
                  Zona
                </Label>
                <Input
                  id="zona"
                  name="zona"
                  placeholder="Ej: Palermo"
                  value={formData.zona}
                  onChange={handleChange}
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foto" className="font-bold text-sm">
                Foto de Perfil (Opcional)
              </Label>
              <Input
                id="foto"
                type="file"
                accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
                className="bg-secondary border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Registrando..." : "Registrarme"}
            </Button>
          </form>

          <p className="text-center mt-6 text-muted-foreground text-sm">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
