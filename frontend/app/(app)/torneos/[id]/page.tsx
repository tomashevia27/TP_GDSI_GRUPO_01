"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Trophy, Calendar, Users, MapPin, DollarSign, AlignLeft, ArrowLeft, Loader2, Info, Shield, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTorneo, cancelarTorneo, TorneoData } from "@/hooks/use-api"

export default function TorneoDetallePage() {
    const { id } = useParams()
    const router = useRouter()
    const [torneo, setTorneo] = useState<TorneoData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        async function fetchTorneo() {
            try {
                const data = await getTorneo(Number(id))
                setTorneo(data)
            } catch (err: any) {
                setError(err.message || "Torneo no encontrado")
            } finally {
                setIsLoading(false)
            }
        }
        fetchTorneo()
    }, [id])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p>Cargando detalles del torneo...</p>
            </div>
        )
    }

    if (error || !torneo) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="bg-card p-8 rounded-2xl border border-border text-center max-w-md w-full shadow-sm">
                    <Trophy className="h-16 w-16 text-muted-foreground opacity-50 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Ups, algo salió mal</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Link href="/torneos">
                        <Button>Volver a Torneos</Button>
                    </Link>
                </div>
            </div>
        )
    }

    const formatearPrecio = (precio: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
        }).format(precio)
    }

    const handleCancelar = async () => {
        if (!confirm("¿Estás seguro de que querés cancelar este torneo? Esta acción no se puede deshacer y notificará a todos los inscriptos.")) return
        
        try {
            await cancelarTorneo(torneo.id)
            setTorneo({ ...torneo, estado: "Cancelado" })
            alert("El torneo ha sido cancelado exitosamente.")
        } catch (err: any) {
            alert(err.message || "Error al cancelar el torneo")
        }
    }

    const cuposRestantes = torneo.max_equipos - torneo.equipos_inscriptos
    const estaAbierto = torneo.estado === "Abierto para inscripción"
    const hayCupos = cuposRestantes > 0

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Header Hero */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <Link href="/torneos" className="inline-flex items-center text-sm text-primary hover:underline mb-6 font-medium">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Volver a Torneos
                    </Link>
                    
                    <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-md
                                    ${estaAbierto ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      torneo.estado === 'En curso' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                    }
                                `}>
                                    {torneo.estado}
                                </span>
                                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border">
                                    {torneo.formato}
                                </span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                                {torneo.nombre}
                            </h1>
                            <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    <span>Inicio: {new Date(torneo.fecha_inicio).toLocaleDateString('es-AR')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    <span>{torneo.lugar}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Box de Inscripción en Header */}
                        <div className="bg-card p-5 rounded-xl border border-border shadow-md min-w-[280px]">
                            <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Valor de Inscripción</div>
                            <div className="text-3xl font-bold text-foreground mb-4">
                                {formatearPrecio(torneo.costo_inscripcion)}
                                <span className="text-sm font-normal text-muted-foreground"> / equipo</span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-4 text-sm">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{cuposRestantes} cupos disponibles de {torneo.max_equipos}</span>
                            </div>
                            
                            {estaAbierto && hayCupos ? (
                                <Link href={`/torneos/${torneo.id}/inscribirse`} className="block w-full">
                                    <Button className="w-full" size="lg">
                                        Anotar a mi equipo
                                    </Button>
                                </Link>
                            ) : (
                                <Button className="w-full" size="lg" disabled variant="secondary">
                                    {!estaAbierto ? "Inscripción Cerrada" : "Torneo Lleno"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Columna principal (Detalles) */}
                    <div className="md:col-span-2 space-y-8">
                        
                        {/* Descripción */}
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                                <AlignLeft className="w-5 h-5 text-primary" />
                                Detalles del Torneo
                            </h3>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {torneo.descripcion || "No hay descripción disponible para este torneo."}
                            </p>
                        </section>

                        {/* Reglas */}
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                                <Info className="w-5 h-5 text-primary" />
                                Reglas Específicas
                            </h3>
                            <div className="bg-muted/50 p-6 rounded-xl border border-border">
                                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                                    {torneo.reglas || "El torneo se rige bajo las reglas estándar. Consultá con la organización para más información."}
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Columna lateral (Equipos Inscriptos) */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-border bg-muted/30">
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    Equipos Inscriptos
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {torneo.equipos_inscriptos} de {torneo.max_equipos} equipos
                                </p>
                            </div>
                            
                            <div className="p-0">
                                {torneo.equipos && torneo.equipos.length > 0 ? (
                                    <ul className="divide-y divide-border">
                                        {torneo.equipos.map(equipo => (
                                            <li key={equipo.id} className="p-4 hover:bg-muted/50 transition-colors">
                                                <p className="font-medium text-foreground">{equipo.nombre_equipo}</p>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1" title={equipo.jugadores}>
                                                    Plantel: {equipo.jugadores}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <p className="text-sm">Todavía no hay equipos inscriptos.</p>
                                        {estaAbierto && hayCupos && (
                                            <p className="text-sm mt-1 font-medium text-primary">¡Sé el primero en anotarte!</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Acciones de Organizador */}
                        {torneo.rol_usuario === "Organizador" && torneo.estado !== "Cancelado" && (
                            <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-5 mt-6">
                                <h3 className="font-bold text-destructive mb-2 flex items-center gap-2">
                                    <XCircle className="w-5 h-5" />
                                    Zona de Peligro
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Al cancelar el torneo, se cerrarán las inscripciones y se notificará a los equipos.
                                </p>
                                <Button 
                                    variant="destructive" 
                                    className="w-full" 
                                    onClick={handleCancelar}
                                >
                                    Cancelar Torneo
                                </Button>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
