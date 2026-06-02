"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Clock, Zap, DollarSign, Search, Filter, Trophy, Users, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/components/auth-provider"
import { getMisCanchas, API_URL } from "@/hooks/use-api"

interface Cancha {
    id: number
    nombre: string
    tipo_superficie: string
    tamano: number
    iluminacion: boolean
    zona: string
    direccion: string
    precio_por_turno: number
    dias_operativos_texto: string
    hora_apertura: string
    hora_cierre: string
    fotos: string | null
    activa: boolean
}

// Football SVG Component
function FootballIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.9" />
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" />
            <polygon points="12,7 14.5,11 12,15 9.5,11" fill="white" opacity="0.3" />
        </svg>
    )
}

export default function CanchasPage() {
    const [canchas, setCanchas] = useState<Cancha[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const { role } = useAuthContext()
    const router = useRouter()

    useEffect(() => {
        async function fetchCanchas() {
            try {
                if (role === "admin") {
                    const data = await getMisCanchas()
                    setCanchas(data)
                } else {
                    const res = await fetch(`${API_URL}/canchas/disponibles`)
                    if (res.ok) {
                        const data = await res.json()
                        setCanchas(data)
                    }
                }
            } catch (error) {
                console.warn("Error fetching canchas:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchCanchas()
    }, [role])

    const formatearPrecio = (precio: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
        }).format(precio)
    }

    const filteredCanchas = canchas.filter(cancha =>
        cancha.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cancha.zona.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="flex items-center justify-center min-h-[600px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <FootballIcon className="w-16 h-16 text-primary animate-bounce" />
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                        </div>
                        <p className="text-muted-foreground animate-pulse">Cargando canchas...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="relative h-[320px] sm:h-[400px] overflow-hidden">
                <Image
                    src="/hero-canchas.jpg"
                    alt="Campo de futbol"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-background" />

                {/* Floating football decorations */}
                <div className="absolute top-10 left-10 opacity-20 animate-float">
                    <FootballIcon className="w-12 h-12 text-card" />
                </div>
                <div className="absolute top-20 right-20 opacity-15 animate-float-reverse">
                    <FootballIcon className="w-8 h-8 text-card" />
                </div>
                <div className="absolute bottom-32 right-10 opacity-10 animate-float-slow">
                    <FootballIcon className="w-16 h-16 text-card" />
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <div className="flex items-center gap-3 mb-4 animate-slide-up">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-2xl">
                            <Image
                                src="/logo-teamup.jpg"
                                alt="TeamUp Logo"
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className="text-card font-bold text-2xl drop-shadow-lg">TeamUp</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold text-card mb-4 drop-shadow-lg animate-slide-up animation-delay-100 text-balance">
                        {role === "admin" ? "Mis Canchas" : "Canchas Disponibles"}
                    </h1>
                    <p className="text-card/90 text-lg sm:text-xl max-w-2xl drop-shadow animate-slide-up animation-delay-200">
                        {role === "admin" ? "Gestioná y editá los complejos que tenés registrados" : "Encontrá la cancha perfecta para tu próximo partido"}
                    </p>

                    {/* Stats row */}
                    <div className="flex gap-8 mt-8 animate-slide-up animation-delay-300">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-card">
                                <Trophy className="w-5 h-5 text-primary" />
                                <span className="text-2xl font-bold">{canchas.length}+</span>
                            </div>
                            <span className="text-card/70 text-sm">Canchas</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-card">
                                <Users className="w-5 h-5 text-primary" />
                                <span className="text-2xl font-bold">500+</span>
                            </div>
                            <span className="text-card/70 text-sm">Jugadores</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-card">
                                <Star className="w-5 h-5 text-primary" />
                                <span className="text-2xl font-bold">4.8</span>
                            </div>
                            <span className="text-card/70 text-sm">Rating</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Section */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
                <div className="bg-card rounded-2xl border border-border shadow-xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o zona..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>
                        <Button variant="outline" className="flex items-center gap-2 px-6 py-3 h-auto">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {filteredCanchas.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-12 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MapPin className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            No se encontraron canchas
                        </h3>
                        <p className="text-muted-foreground text-lg">
                            {searchTerm ? "Probá con otros términos de búsqueda" : "No hay canchas registradas en este momento."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{filteredCanchas.length}</span> canchas encontradas
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCanchas.map((cancha, index) => (
                                <Link key={cancha.id} href={`/canchas/${cancha.id}`}>
                                    <div
                                        className="bg-card rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 group h-full overflow-hidden hover:-translate-y-1 animate-slide-up"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        {cancha.fotos ? (
                                            <div className="aspect-video w-full overflow-hidden relative">
                                                <img
                                                    src={cancha.fotos}
                                                    alt={cancha.nombre}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                {cancha.iluminacion && (
                                                    <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        Iluminada
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="aspect-video w-full bg-gradient-to-br from-primary/10 via-secondary to-muted flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 opacity-10">
                                                    <div className="absolute top-4 left-4">
                                                        <FootballIcon className="w-8 h-8 text-primary animate-float" />
                                                    </div>
                                                    <div className="absolute bottom-4 right-4">
                                                        <FootballIcon className="w-6 h-6 text-primary animate-float-reverse" />
                                                    </div>
                                                </div>
                                                <div className="w-20 h-20 bg-card/80 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                    <FootballIcon className="h-10 w-10 text-primary" />
                                                </div>
                                                {cancha.iluminacion && (
                                                    <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        Iluminada
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                                    {cancha.nombre}
                                                </h3>
                                                <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                                                    <Star className="w-3 h-3 fill-current" />
                                                    <span className="text-xs font-medium">4.8</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2.5 text-sm">
                                                <div className="flex items-center gap-2.5 text-muted-foreground">
                                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                                        <MapPin className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span className="truncate">{cancha.zona} - {cancha.direccion}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-muted-foreground">
                                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span>{cancha.hora_apertura} - {cancha.hora_cierre}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-muted-foreground">
                                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                                        <Users className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span>Fútbol {cancha.tamano} • {cancha.tipo_superficie}</span>
                                                </div>
                                            </div>
                                            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                                                <div>
                                                    <span className="text-2xl font-bold text-primary">
                                                        {formatearPrecio(cancha.precio_por_turno)}
                                                    </span>
                                                    <span className="text-muted-foreground text-sm ml-1">/turno</span>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                                    onClick={(e) => {
                                                        if (role === "admin") {
                                                            e.preventDefault()
                                                            router.push(`/canchas/${cancha.id}/editar`)
                                                        }
                                                    }}
                                                >
                                                    {role === "admin" ? "Editar" : "Reservar"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* CTA Section (Visible solo si no es Admin para mejorar UX) */}
            {role !== "admin" && (
                <div className="bg-gradient-to-r from-primary to-primary/80 py-16 mt-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 left-[10%] animate-float">
                            <FootballIcon className="w-20 h-20 text-card" />
                        </div>
                        <div className="absolute bottom-10 right-[15%] animate-float-reverse">
                            <FootballIcon className="w-16 h-16 text-card" />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-slow">
                            <FootballIcon className="w-32 h-32 text-card" />
                        </div>
                    </div>
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4 text-balance">
                            ¿Tenés una cancha?
                        </h2>
                        <p className="text-primary-foreground/90 text-lg mb-8 max-w-2xl mx-auto">
                            Sumá tu cancha a TeamUp y llegá a miles de jugadores que buscan dónde jugar
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}