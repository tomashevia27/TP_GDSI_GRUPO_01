"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useAuthContext } from "@/components/auth-provider"
import { loginUser } from "@/hooks/use-api"

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
        confirmButtonColor: "#FF6B4A",
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
      Swal.fire({
        title: "Error de acceso",
        text: error instanceof Error ? error.message : "No se pudo conectar con el servidor.",
        icon: "error",
        confirmButtonColor: "#FF6B4A",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-2xl shadow-primary/5 border border-border rounded-2xl">
        <CardContent className="p-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">T</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
              Bienvenido a TeamUp
            </h1>
            <p className="text-muted-foreground text-sm">
              Ingresá para organizar tus partidos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-0 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium text-sm">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input border-0 h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full font-semibold h-11"
              disabled={isLoading}
            >
              {isLoading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <p className="text-center mt-6 text-muted-foreground text-sm">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Registrate acá
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}