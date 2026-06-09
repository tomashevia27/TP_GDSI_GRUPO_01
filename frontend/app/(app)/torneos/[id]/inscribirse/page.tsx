"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft, Loader2, AlertCircle, Users, Shield, Image as ImageIcon, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTorneo, inscribirEquipo, TorneoData } from "@/hooks/use-api"
import Swal from "sweetalert2"

interface Jugador {
    nombre: string;
    email: string;
}

export default function InscripcionTorneoPage() {
    const { id } = useParams()
    const router = useRouter()
    const [torneo, setTorneo] = useState<TorneoData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    const [nombreEquipo, setNombreEquipo] = useState("")
    const [escudo, setEscudo] = useState("")
    const [jugadores, setJugadores] = useState<Jugador[]>([
        { nombre: "", email: ""} // Arranca con un casillero vacío para el primer jugador
    ])

    useEffect(() => {
        async function fetchTorneo() {
            try {
                const data = await getTorneo(Number(id))
                setTorneo(data)
                
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

    // Maneja cambios en Nombre del Equipo y Escudo
    const handleLimpiarError = () => {
        if (errorMsg && torneo && torneo.estado === "Abierto para inscripción" && torneo.equipos_inscriptos < torneo.max_equipos) {
            setErrorMsg("")
        }
    }

    // Funciones para gestionar el array de jugadores
    const handleJugadorChange = (index: number, field: keyof Jugador, value: string) => {
        handleLimpiarError()
        setJugadores(prev => {
            const nuevos = [...prev]
            nuevos[index] = { ...nuevos[index], [field]: value }
            return nuevos
        })
    }

    const agregarJugador = () => {
        if (alcanzoMaximoJugadores) return 
        setJugadores(prev => [...prev, { nombre: "", email: ""}])
    }

    const eliminarJugador = (index: number) => {
        if (jugadores.length === 1) return;
        setJugadores(prev => prev.filter((_, i) => i !== index))
    }

    const validateForm = () => {
        if (!nombreEquipo.trim()) return "El nombre del equipo es obligatorio."
        
        if (jugadores.length === 0 || !jugadores[0].nombre.trim()) {
            return "Debés ingresar al menos al capitán o primer jugador."
        }

        for (let i = 0; i < jugadores.length; i++) {
            const j = jugadores[i];
            if (!j.nombre.trim() || !j.email.trim()) {
                return `Por favor, completa todos los datos del jugador número ${i + 1}.`
            }
        }
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

        // Confirmación previa
        const precioFormateado = new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
        }).format(torneo.costo_inscripcion)

        const confirmacion = await Swal.fire({
            title: "¿Confirmar inscripción?",
            html: `Estás por anotar tu equipo en <strong>${torneo.nombre}</strong>.<br/>Costo de inscripción: <strong>${precioFormateado}</strong>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#FF6B4A",
            cancelButtonColor: "#6B7280",
            confirmButtonText: "Sí, inscribirme",
            cancelButtonText: "Revisar datos"
        })

        if (!confirmacion.isConfirmed) return

        setIsSubmitting(true)
        try {
            const payload = {
                nombre_equipo: nombreEquipo,
                escudo: escudo,
                jugadores: JSON.stringify(jugadores)
            }

            await inscribirEquipo(torneo.id, payload)

            await Swal.fire({
                title: "¡Equipo inscripto!",
                text: `Tu equipo fue anotado exitosamente en ${torneo.nombre}.`,
                icon: "success",
                timer: 2500,
                showConfirmButton: false
            })

            router.push(`/torneos/${torneo.id}`)
        } catch (error: any) {
            Swal.fire("Error", error.message || "Error al inscribir el equipo.", "error")
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
    const minJugadoresRequeridos = torneo!.min_integrantes_por_equipo
    const maxJugadoresPermitidos = torneo!.min_integrantes_por_equipo * 2
    const alcanzoMaximoJugadores = jugadores.length >= maxJugadoresPermitidos

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
                        {/* Nombre de Equipo */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Nombre del Equipo *
                            </label>
                            <input
                                type="text"
                                value={nombreEquipo}
                                onChange={(e) => { setNombreEquipo(e.target.value); handleLimpiarError(); }}
                                placeholder="Ej: Los Galácticos"
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                required
                            />
                        </div>

                        {/* AGREGADOR DE JUGADORES */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" />
                                    Lista de Jugadores ({jugadores.length} / mín. {minJugadoresRequeridos} &mdash; máx. {maxJugadoresPermitidos}) *
                                </label>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={agregarJugador}
                                    disabled={alcanzoMaximoJugadores}
                                    className="gap-1.5 h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Añadir Jugador
                                </Button>
                            </div>
                            
                            <p className="text-xs text-muted-foreground -mt-2">
                                {alcanzoMaximoJugadores 
                                    ? `Alcanzaste el límite máximo de ${maxJugadoresPermitidos} jugadores permitidos para este torneo.` 
                                    : "Cargá los datos correspondientes de cada integrante de la plantilla."
                                }
                            </p>
                            
                            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                                {jugadores.map((jugador, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row gap-2 bg-muted/40 p-3 rounded-xl border border-border items-center relative group">
                                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 bg-background border border-border text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground shadow-sm">
                                            {index + 1}
                                        </div>
                                        
                                        <div className="w-full sm:flex-1 pl-2">
                                            <input
                                                type="text"
                                                placeholder="Nombre y Apellido"
                                                value={jugador.nombre}
                                                onChange={(e) => handleJugadorChange(index, "nombre", e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary"
                                                required
                                            />
                                        </div>

                                        <div className="w-full sm:flex-1">
                                            <input
                                                type="email"
                                                placeholder="Email"
                                                value={jugador.email}
                                                onChange={(e) => handleJugadorChange(index, "email", e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary"
                                                required
                                            />
                                        </div>

                                        {jugadores.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => eliminarJugador(index)}
                                                className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors sm:self-center self-end"
                                                title="Eliminar jugador"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Escudo */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-primary" />
                                Escudo del Equipo (Opcional)
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">Podés pegar una URL con el logo de tu equipo.</p>
                            <input
                                type="url"
                                value={escudo}
                                onChange={(e) => { setEscudo(e.target.value); handleLimpiarError(); }}
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