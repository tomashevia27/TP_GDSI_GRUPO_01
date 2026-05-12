"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Mail, CheckCircle2, AlertCircle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { confirmEmail, resendCode } from "@/hooks/use-api" // Ajusté el path para que sea consistente con tus otros archivos

export default function ConfirmPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const e = searchParams.get("email")
    if (e) setEmail(e)
  }, [searchParams])

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await confirmEmail(email, code)
      setMessage(res.mensaje)
      // Redirigir al login después de confirmar con un pequeño delay para mostrar éxito
      setTimeout(() => router.push('/login'), 1500)
    } catch (err: any) {
      setError(err.message || "Error al confirmar el código")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) return setError("Ingresá tu email para reenviar el código")
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await resendCode(email)
      setMessage(res.mensaje || "Código reenviado con éxito")
    } catch (err: any) {
      setError(err.message || "Error al reenviar código")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Verificá tu cuenta</CardTitle>
          <CardDescription>
            Ingresá el código que enviamos a <span className="font-semibold text-foreground">{email || "tu email"}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="font-bold text-sm">
                Código de confirmación
              </Label>
              <Input
                id="code"
                placeholder="Ej: 123456"
                onChange={(e) => setCode(e.target.value)}
                required
                className="bg-secondary border-border text-center text-lg tracking-[0.5em] font-mono"
                maxLength={6}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full font-bold" disabled={loading}>
                {loading ? "Confirmando..." : "Confirmar Cuenta"}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleResend} 
                disabled={loading}
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Reenviar código
              </Button>
            </div>
          </form>

          {/* Feedback de mensajes */}
          <div className="mt-6">
            {message && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm font-medium animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium animate-in fade-in zoom-in duration-300">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}