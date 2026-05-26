"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { registerUser, uploadImageToCloudinary } from "@/hooks/use-api"
import Swal from 'sweetalert2'
import { Camera, Trophy, Users } from "lucide-react"

function SportsIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 2.07c1.52.22 2.91.82 4.07 1.68l-1.28 1.76-2.79-.78V4.07zM11 4.07v1.66l-2.79.78-1.28-1.76c1.16-.86 2.55-1.46 4.07-1.68zM5.25 7.58l1.83.51L7.5 12l-2.42 2.42c-.98-1.45-1.52-3.17-1.52-5.02 0-.74.09-1.45.27-2.13l1.42.31zm.52 11.67l.65-2.12 3.22-.9L12 19.5l-2.46 2.46c-1.54-.37-2.94-1.14-4.07-2.19l.3-.52zM12 22c-.34 0-.68-.02-1.01-.05L12 19.5l1.01 2.45c-.33.03-.67.05-1.01.05zm6.77-3.27L14.7 16.2l-.78-3.63 3.58-2.45 2.93.81c.36 1.01.57 2.1.57 3.23 0 1.85-.54 3.57-1.46 5.02l-.77.55zm-1.34-12.15L16.15 8.3l-3.34 2.28H11.19l-3.34-2.28-1.28-1.72c1.37-1.17 3.08-1.88 4.93-2.02V6.5l.5.02.5-.02V4.56c1.85.14 3.56.85 4.93 2.02z"/>
    </svg>
  )
}

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
    rol: "jugador",
  })
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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
          Swal.fire({
            title: "Error de imagen",
            text: "Hubo un problema al subir tu foto de perfil. Por favor, intentá de nuevo.",
            icon: "error",
            confirmButtonColor: "#FF6B4A",
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
        rol: formData.rol,
        foto_perfil: fotoUrl,
      }
  
      await registerUser(userData)
      router.push(`/confirm?email=${encodeURIComponent(formData.email)}`)
    } catch (error) {
      Swal.fire({
        title: "No se pudo registrar",
        text: error instanceof Error ? error.message : "No se pudo conectar con el servidor.",
        icon: "error",
        confirmButtonColor: "#FF6B4A",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // CAMBIO: Forzamos fondo oscuro general y texto blanco
    <div className="min-h-screen flex relative overflow-hidden bg-zinc-950 text-white dark">
      {/* Elementos de fondo animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Lateral Izquierdo - Imagen de Héroe */}
      <div className="hidden lg:flex lg:w-[50%] relative">
        <Image
          src="/sports-hero.jpg"
          alt="Sports action"
          fill
          className="object-cover"
          priority
        />
        {/* Overlays modificados para fundirse a negro (zinc-950) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-zinc-950" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30" />
        
        {/* Logo */}
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <SportsIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black text-white drop-shadow-lg tracking-tight">
            Team<span className="text-primary">Up</span>
          </span>
        </div>

        {/* Texto del Héroe */}
        <div className="absolute bottom-6 left-6 right-6">
          <h2 className="text-3xl font-black text-white leading-tight drop-shadow-lg">
            Unite al deporte.
            <br />
            <span className="text-primary">Encontrá tu equipo.</span>
          </h2>
          <p className="text-white/70 mt-2 text-sm max-w-xs">
            La comunidad deportiva que te conecta con jugadores de todos los niveles.
          </p>
        </div>
      </div>

      {/* Lateral Derecho - Formulario */}
      {/* CAMBIO: bg-zinc-950 fijo */}
      <div className="w-full lg:w-[50%] flex items-center justify-center p-4 sm:p-6 bg-zinc-950 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo para Versión Móvil */}
          <div className="lg:hidden mb-4 flex items-center justify-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <SportsIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              Team<span className="text-primary">Up</span>
            </span>
          </div>

          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Crear Cuenta
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Completá tus datos y sumate a la cancha
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Foto de Perfil */}
            <div className="flex justify-center">
              <label htmlFor="foto" className="cursor-pointer group">
                {/* CAMBIO: bg-zinc-900 y borde adaptado */}
                <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-primary/40 hover:border-primary transition-all duration-300 overflow-hidden bg-zinc-900 flex items-center justify-center group-hover:scale-105">
                  {fotoPreview ? (
                    <Image src={fotoPreview} alt="Preview" fill className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5 text-zinc-400 group-hover:text-primary transition-colors">
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px]">Subir foto</span>
                    </div>
                  )}
                </div>
                <input id="foto" type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="nombre" className="text-xs text-zinc-300">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  placeholder="Tu nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 h-9 text-sm focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="apellido" className="text-xs text-zinc-300">Apellido</Label>
                <Input
                  id="apellido"
                  name="apellido"
                  placeholder="Tu apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 h-9 text-sm focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs text-zinc-300">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 h-9 text-sm focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs text-zinc-300">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="********"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 h-9 text-sm focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="edad" className="text-xs text-zinc-300">Edad</Label>
                <Input
                  id="edad"
                  name="edad"
                  type="number"
                  placeholder="25"
                  value={formData.edad}
                  onChange={handleChange}
                  required
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 h-9 text-sm focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="genero" className="text-xs text-zinc-300">Género</Label>
                <Select
                  value={formData.genero}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, genero: value }))}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white h-9 text-sm focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="zona" className="text-xs text-zinc-300">Zona</Label>
                <Input
                  id="zona"
                  name="zona"
                  placeholder="Palermo"
                  value={formData.zona}
                  onChange={handleChange}
                  required
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 h-9 text-sm focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rol" className="text-xs text-zinc-300">Rol</Label>
              <Select
                value={formData.rol}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, rol: value }))}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white h-9 text-sm focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="jugador">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Jugador</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span>Administrador</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full font-bold h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Registrando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <SportsIcon className="w-4 h-4" />
                  <span>Unirme a TeamUp</span>
                </div>
              )}
            </Button>
          </form>

          <p className="text-center text-zinc-400 text-xs mt-3">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline transition-colors">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
