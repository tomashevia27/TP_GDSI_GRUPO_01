"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft, Loader2, AlertCircle, Users, Shield, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTorneo, inscribirEquipo, TorneoData, InscripcionData } from "@/hooks/use-api"

export default function InscripcionTorneoPage() {
    const { id } = useParams()
    const router = useRouter()
    const [torneo, setTorneo] = useState<TorneoData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    const [formData, setFormData] = useState<InscripcionData>({
        nombre_equipo: "",
        jugadores: "",
        escudo: ""
    })

    useEffect(() => {
        async function fetchTorneo() {
            try {
                const data = await getTorneo(Number(id))
                setTorneo(data)
                
                // Pre-validaciones
                if (data.estado !== "Abierto para inscripción") {
                    setErrorMsg("Este torneo no está abierto para nuevas inscripciones.")
                } else if (data.equipos_inscriptos >= data.max_equipos) {
                    setErrorMsg("Este torneo ya completó su cupo máximo de equipos.")
                }
            } catch (err: any) {
                setErrorMsg(err.message || "Torneo no encontrado")
            } finally {
                setIsLoading(false)
            }
        }
        fetchTorneo()
    }, [id])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errorMsg && torneo && torneo.estado === "Abierto para inscripción" && torneo.equipos_inscriptos < torneo.max_equipos) {
            setErrorMsg("") // clear validation errors on edit, only if not blocked
        }
    }

    const validateForm = () => {
        if (!formData.nombre_equipo.trim()) return "El nombre del equipo es obligatorio."
        if (!formData.jugadores.trim()) return "Debés ingresar la lista de jugadores."
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!torneo) return

        const error = validateForm()
        if (error) {
            setErrorMsg(error)
            return
        }

        setIsSubmitting(true)
        try {
            await inscribirEquipo(torneo.id, formData)
            // Redirigir al detalle del torneo
            router.push(`/torneos/${torneo.id}`)
        } catch (error: any) {
            setErrorMsg(error.message || "Error al inscribir el equipo.")
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p>Cargando información del torneo...</p>
            </div>
        )
    }

    if (!torneo && errorMsg) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="bg-card p-8 rounded-2xl border border-border text-center max-w-md w-full shadow-sm">
                    <AlertCircle className="h-16 w-16 text-destructive opacity-80 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Error</h2>
                    <p className="text-muted-foreground mb-6">{errorMsg}</p>
                    <Link href="/torneos">
                        <Button>Ir a Torneos</Button>
                    </Link>
                </div>
            </div>
        )
    }

    const bloqueado = !!errorMsg && (torneo?.estado !== "Abierto para inscripción" || (torneo && torneo.equipos_inscriptos >= torneo.max_equipos));

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Header */}
            <div className="bg-primary/5 border-b border-border py-8">
                <div className="max-w-2xl mx-auto px-4 sm:px-6">
                    <Link href={`/torneos/${id}`} className="inline-flex items-center text-sm text-primary hover:underline mb-6 font-medium">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Volver al Detalle
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        Inscribir Equipo
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Estás anotando a tu equipo en el torneo <strong className="text-foreground">{torneo?.nombre}</strong>.
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-8">
                <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{errorMsg}</p>
                        </div>
                    )}

                    <fieldset disabled={bloqueado} className={`space-y-6 ${bloqueado ? 'opacity-70' : ''}`}>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Nombre del Equipo *
                            </label>
                            <input
                                type="text"
                                name="nombre_equipo"
                                value={formData.nombre_equipo}
                                onChange={handleChange}
                                placeholder="Ej: Los Galácticos"
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                Jugadores *
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">Ingresá los nombres, emails o DNIs de los jugadores que van a participar.</p>
                            <textarea
                                name="jugadores"
                                value={formData.jugadores}
                                onChange={handleChange}
                                rows={5}
                                placeholder="1. Juan Pérez (Capitán)&#10;2. Lionel Messi&#10;3. Emiliano Martínez..."
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none resize-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-primary" />
                                Escudo del Equipo (Opcional)
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">Podés pegar una URL con el logo de tu equipo.</p>
                            <input
                                type="url"
                                name="escudo"
                                value={formData.escudo}
                                onChange={handleChange}
                                placeholder="https://ejemplo.com/mi-escudo.png"
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                            />
                        </div>

                        {/* Totales */}
                        <div className="bg-muted p-4 rounded-xl border border-border flex items-center justify-between mt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">Costo de inscripción</p>
                                <p className="text-lg font-bold text-foreground">
                                    {torneo && new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(torneo.costo_inscripcion)}
                                </p>
                            </div>
                            <Trophy className="w-8 h-8 text-muted-foreground/30" />
                        </div>

                        <div className="pt-6 border-t border-border flex justify-end gap-3">
                            <Link href={`/torneos/${id}`}>
                                <Button type="button" variant="outline" disabled={isSubmitting}>
                                    Cancelar
                                </Button>
                            </Link>
                            <Button type="submit" disabled={isSubmitting || bloqueado} className="min-w-[150px]">
                                {isSubmitting ? "Enviando..." : "Confirmar Inscripción"}
                            </Button>
                        </div>
                    </fieldset>
                </form>
            </div>
        </div>
    )
}
