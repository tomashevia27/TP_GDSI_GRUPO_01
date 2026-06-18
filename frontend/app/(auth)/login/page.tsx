"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthContext } from "@/components/auth-provider"
import { loginUser } from "@/hooks/use-api"
import { Loader2, Mail, Lock, Trophy } from "lucide-react"

import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthContext()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      Swal.fire({
        title: "Atención",
        text: "El email y la contraseña son requeridos.",
        icon: "warning",
        confirmButtonColor: "#FF6B4A", // Mantiene tu color naranja original
      })
      return
    }

    setIsLoading(true)

    try {
      const data = await loginUser(email, password)

      login(String(data.usuario_id), data.rol, data.access_token)

      await Swal.fire({
        title: "¡Bienvenido!",
        text: "Inicio de sesión exitoso.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      })

      router.push("/home")

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "No se pudo conectar con el servidor."
      
      if (errorMsg === "La cuenta no está activa aún") {
        Swal.fire({
          title: "Cuenta inactiva",
          text: "Tu cuenta no está activa. ¿Querés ingresar el código de verificación o pedir que te lo reenvíen?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#FF6B4A",
          cancelButtonColor: "#6b7280",
          confirmButtonText: "Ir a verificar",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) {
            router.push(`/confirm?email=${encodeURIComponent(email)}`)
          }
        })
      } else {
        Swal.fire({
          title: "Error de acceso",
          text: errorMsg,
          icon: "error",
          confirmButtonColor: "#FF6B4A",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/football-bg.jpg"
          alt="Futbol"
          fill
          className="object-cover"
          priority
        />
        {/* Light overlay for readability */}
        <div className="absolute inset-0 bg-white/85" />
        {/* Subtle red gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-20 w-24 h-24 border-2 border-primary/20 rounded-full animate-float hidden lg:block" />
      <div className="absolute bottom-32 right-32 w-16 h-16 bg-primary/10 rounded-full animate-float hidden lg:block" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 right-20 w-12 h-12 border-2 border-primary/15 rounded-lg rotate-45 animate-float hidden lg:block" style={{ animationDelay: '0.5s' }} />

      {/* Login Card - Centered */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 p-8">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-3 mb-6 hover:opacity-80 transition-opacity">
            <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg shadow-primary/25 animate-pulse-glow">
              <Image
                src="/logo-partidoya.jpg"
                alt="PartidoYa Logo"
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-3xl font-bold text-gray-900">PartidoYa</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Bienvenido de nuevo
            </h1>
            <p className="text-gray-500 text-sm">
              Ingresa tus datos para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-semibold text-base rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              ¿No tenés cuenta?{" "}
              <Link
                href="/register"
                className="text-primary font-semibold hover:underline transition-colors"
              >
                Registrate acá
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-gray-600 text-sm mt-6 font-medium">
          Tu equipo te espera. Volvé a la acción.
        </p>
      </div>
    </div>
  )
}
