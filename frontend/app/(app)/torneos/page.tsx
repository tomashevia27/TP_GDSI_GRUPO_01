"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Trophy, Calendar, Users, MapPin, Plus, Loader2, UserCheck, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTorneosDisponibles, getMisTorneos, TorneoData } from "@/hooks/use-api"
import { useAuthContext } from "@/components/auth-provider"

type MisTorneosCategory = "Próximos" | "En curso" | "Finalizados" | "Cancelados"

export default function TorneosPage() {
    const [activeTab, setActiveTab] = useState<"disponibles" | "mis-torneos">("disponibles")
    const [misTorneosCategory, setMisTorneosCategory] = useState<MisTorneosCategory>("Próximos")
    const [misTorneosRole, setMisTorneosRole] = useState<"Todos" | "Organizados" | "Inscriptos">("Todos")
    const [torneos, setTorneos] = useState<TorneoData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { role } = useAuthContext()

    useEffect(() => {
        if (role === "admin" && activeTab === "disponibles") {
            setActiveTab("mis-torneos")
        }
    }, [role])

    useEffect(() => {
        let isCurrent = true;
        async function fetchTorneos() {
            setIsLoading(true)
            try {
                if (activeTab === "disponibles") {
                    const data = await getTorneosDisponibles()
                    if (isCurrent) setTorneos(data)
                } else {
                    const data = await getMisTorneos()
                    if (isCurrent) setTorneos(data)
                }
            } catch (error) {
                console.error("Error fetching torneos:", error)
            } finally {
                if (isCurrent) setIsLoading(false)
            }
        }
        fetchTorneos()
        return () => { isCurrent = false; }
    }, [activeTab])

    const formatearPrecio = (precio: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
        }).format(precio)
    }

    // Filtrado local para "Mis Torneos"
    const torneosAMostrar = activeTab === "disponibles" 
        ? torneos 
        : torneos.filter(t => {
            if (role === "admin" && t.rol_usuario !== "Organizador") return false;
            
            if (role === "jugador") {
                if (misTorneosRole === "Organizados" && t.rol_usuario !== "Organizador") return false;
                if (misTorneosRole === "Inscriptos" && t.rol_usuario === "Organizador") return false;
            }

            if (misTorneosCategory === "Próximos") return t.estado === "Abierto para inscripción"
            if (misTorneosCategory === "En curso") return t.estado === "En curso"
            if (misTorneosCategory === "Finalizados") return t.estado === "Finalizado"
            if (misTorneosCategory === "Cancelados") return t.estado === "Cancelado"
            return true
        })

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="relative h-[320px] sm:h-[400px] overflow-hidden">
                <Image
                    src="/sports-hero.jpg"
                    alt="Torneos"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-foreground/80 via-foreground/60 to-background" />

                <div className="absolute top-10 left-10 opacity-20 animate-float">
                    <Trophy className="w-12 h-12 text-card" />
                </div>
                <div className="absolute top-20 right-20 opacity-15 animate-float-reverse">
                    <Trophy className="w-8 h-8 text-card" />
                </div>
                <div className="absolute bottom-32 right-10 opacity-10 animate-float-slow">
                    <Trophy className="w-16 h-16 text-card" />
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <h1 className="text-3xl sm:text-5xl font-bold text-card mb-4 drop-shadow-lg animate-slide-up text-balance">
                        {role === "admin" ? "Mis Torneos" : "Torneos"}
                    </h1>
                    <p className="text-card/90 text-lg sm:text-xl max-w-2xl drop-shadow animate-slide-up animation-delay-100">
                        {role === "admin" 
                            ? "Gestioná y organizá todos tus torneos creados desde un solo lugar."
                            : "Explorá competencias abiertas, anotá a tu equipo, o creá y organizá tu propio torneo."}
                    </p>
                    
                    <div className="mt-8 animate-slide-up animation-delay-200">
                        <Button size="lg" className="font-semibold px-8" asChild>
                            <Link href="/torneos/nuevo">
                                <Plus className="mr-2 h-5 w-5" />
                                Crear Torneo
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs & Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 pb-8">
                {/* Custom Tabs */}
                {role !== "admin" && (
                    <div className="bg-card rounded-2xl border border-border shadow-xl p-2 mb-6">
                    <div className="flex border-b border-border px-4">
                        <button
                            onClick={() => setActiveTab("disponibles")}
                            className={`px-6 py-3 font-medium text-sm transition-all relative ${
                                activeTab === "disponibles" 
                                    ? "text-primary" 
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Torneos Disponibles
                            {activeTab === "disponibles" && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("mis-torneos")}
                            className={`px-6 py-3 font-medium text-sm transition-all relative ${
                                activeTab === "mis-torneos" 
                                    ? "text-primary" 
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Mis Torneos
                            {activeTab === "mis-torneos" && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                            )}
                        </button>
                    </div>
                  </div>
                )}

                {/* Sub-tabs for Mis Torneos */}
                {activeTab === "mis-torneos" && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                        <div className="flex gap-2 bg-muted p-1.5 rounded-lg inline-flex w-fit">
                            {(["Próximos", "En curso", "Finalizados", "Cancelados"] as MisTorneosCategory[]).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setMisTorneosCategory(cat)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                        misTorneosCategory === cat 
                                            ? "bg-background text-foreground shadow-sm" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        
                        {role === "jugador" && (
                            <div className="flex gap-2 bg-muted p-1.5 rounded-lg inline-flex w-fit">
                                {(["Todos", "Organizados", "Inscriptos"] as const).map(rolCat => (
                                    <button
                                        key={rolCat}
                                        onClick={() => setMisTorneosRole(rolCat)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                            misTorneosRole === rolCat 
                                                ? "bg-background text-foreground shadow-sm border border-border/50" 
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {rolCat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p>Cargando torneos...</p>
                    </div>
                ) : torneosAMostrar.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trophy className="h-10 w-10 text-primary opacity-50" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            {activeTab === "disponibles" 
                                ? "No hay torneos disponibles en este momento"
                                : `No tenés torneos en la categoría "${misTorneosCategory}"`}
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            {activeTab === "disponibles" 
                                ? "Volvé a revisar más tarde para ver nuevas competencias."
                                : "Anotá a tu equipo en los torneos disponibles o creá uno nuevo."}
                        </p>
                        {activeTab === "mis-torneos" && (
                            <Link href="/torneos/nuevo">
                                <Button variant="outline">Organizar Torneo</Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {torneosAMostrar.map((torneo) => (
                            <Link key={torneo.id} href={`/torneos/${torneo.id}`}>
                                <div className="bg-card rounded-2xl border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden h-full flex flex-col cursor-pointer group">
                                    <div className="bg-gradient-to-br from-primary/10 via-secondary to-muted p-6 flex items-center justify-center border-b border-border relative">
                                        <Trophy className="h-16 w-16 text-primary drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                                        
                                        {/* Badge de rol (solo en "mis-torneos") */}
                                        {activeTab === "mis-torneos" && torneo.rol_usuario && (
                                            <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm
                                                ${torneo.rol_usuario === "Organizador" 
                                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                                                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                                }
                                            `}>
                                                {torneo.rol_usuario === "Organizador" ? <Settings className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                                {torneo.rol_usuario}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <h3 className="font-bold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                                {torneo.nombre}
                                            </h3>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded shrink-0
                                                ${torneo.estado === 'Abierto para inscripción' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                  torneo.estado === 'En curso' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                }
                                            `}>
                                                {torneo.estado === 'Abierto para inscripción' ? 'Abierto' : torneo.estado}
                                            </span>
                                        </div>
                                        <div className="space-y-3 text-sm text-muted-foreground mb-4">
                                            <div className="flex items-center gap-2.5">
                                                <Calendar className="h-4 w-4 text-primary shrink-0" />
                                                <span>Inicio: {new Date(torneo.fecha_inicio).toLocaleDateString('es-AR')}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <MapPin className="h-4 w-4 text-primary shrink-0" />
                                                <span className="truncate">{torneo.lugar}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <Users className="h-4 w-4 text-primary shrink-0" />
                                                <span>{torneo.equipos_inscriptos} / {torneo.max_equipos} Equipos</span>
                                            </div>
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Inscripción</p>
                                                <span className="text-lg font-bold text-foreground">
                                                    {formatearPrecio(torneo.costo_inscripcion)}
                                                </span>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                                            >
                                                Ver Detalle
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
