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

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthContext()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      alert("El email y la contraseña son requeridos.")
      return
    }

    setIsLoading(true)

    try {
      const data = await loginUser(email, password)
      login(String(data.usuario_id))
      alert("¡Inicio de sesión exitoso!")
      router.push("/home")
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo conectar con el servidor.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardContent className="p-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary tracking-tight mb-2">
              TeamUp
            </h1>
            <p className="text-muted-foreground">
              Gestioná tus partidos y torneos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-sm">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Ingresando..." : "Ingresar a la plataforma"}
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
