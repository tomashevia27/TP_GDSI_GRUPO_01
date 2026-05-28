"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Clock, Zap, DollarSign, CheckCircle, XCircle, Pencil, Trash, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/components/auth-provider"
import { eliminarCancha, API_URL } from "@/hooks/use-api"
import Swal from 'sweetalert2'

interface Cancha {
    id: number
    nombre: string
    tipo_superficie: string
    tamano: number
    iluminacion: boolean
    zona: string
    direccion: string
    precio_por_turno: number
    dias_operativos: number
    dias_operativos_texto: string
    hora_apertura: string
    hora_cierre: string
    fotos: string | null
    activa: boolean
    propietario_id: number
}
export default function CanchaDetallePage() {
    const params = useParams()
    const router = useRouter()
    const { userId, role } = useAuthContext()
    const [cancha, setCancha] = useState<Cancha | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const canchaId = params.id
    useEffect(() => {
        async function fetchCancha() {
            try {
                const res = await fetch(`${API_URL}/canchas/${canchaId}`)
                if (res.ok) {
                    const data = await res.json()
                    setCancha(data)
                } else {
                    router.push("/canchas")
                }
            } catch (error) {
                console.warn("Error fetching cancha:", error)
            } finally {
                setIsLoading(false)
            }
        }
        if (canchaId) {
            fetchCancha()
        }
    }, [canchaId, router])
    const formatearPrecio = (precio: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
        }).format(precio)
    }
    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            </div>
        )
    }

    const isOwner = role === "admin" && String(userId) === String(cancha?.propietario_id)

    const handleEliminar = async () => {
        const result = await Swal.fire({
            title: "¿Estás seguro?",
            text: "Esta acción no se puede deshacer. La cancha se eliminará permanentemente y dejará de estar disponible.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#FF6B4A",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar"
        })

        if (result.isConfirmed) {
            try {
                await eliminarCancha(canchaId as string)
                await Swal.fire(
                    "¡Eliminada!",
                    "La cancha ha sido eliminada exitosamente.",
                    "success"
                )
                router.push("/profile")
            } catch (error: any) {
                Swal.fire({
                    title: "No se puede eliminar",
                    text: error.message || "Existen compromisos pendientes o ocurrió un error.",
                    icon: "error",
                    confirmButtonColor: "#FF6B4A",
                })
            }
        }
    }
    if (!cancha) return null
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <Link href="/canchas" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Volver a Canchas</span>
                </Link>

                {isOwner && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/canchas/${cancha.id}/editar`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                            </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleEliminar}>
                            <Trash className="h-4 w-4 mr-2" />
                            Eliminar
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Imagen */}
                <div>
                    {cancha.fotos ? (
                        <img
                            src={cancha.fotos}
                            alt={cancha.nombre}
                            className="w-full rounded-2xl object-cover shadow-lg"
                        />
                    ) : (
                        <div className="w-full aspect-video bg-gradient-to-br from-secondary to-muted rounded-2xl flex items-center justify-center">
                            <div className="w-20 h-20 bg-background/50 rounded-2xl flex items-center justify-center">
                                <Zap className="h-10 w-10 text-primary/40" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${cancha.activa ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
                                {cancha.activa ? "Activa" : "Inactiva"}
                            </span>
                            <span className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg">
                                Fútbol {cancha.tamano}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{cancha.nombre}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{cancha.zona} • {cancha.direccion}</span>
                        </div>
                    </div>

                    {/* Key info cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card rounded-xl p-4 border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <span className="text-xs font-medium uppercase tracking-wide">Superficie</span>
                            </div>
                            <p className="font-semibold text-foreground capitalize">{cancha.tipo_superficie}</p>
                        </div>
                        <div className="bg-card rounded-xl p-4 border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <span className="text-xs font-medium uppercase tracking-wide">Iluminación</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {cancha.iluminacion ? (
                                    <CheckCircle className="h-4 w-4 text-accent" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <span className="font-semibold text-foreground">{cancha.iluminacion ? "Sí" : "No"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Horario */}
                    <div className="bg-card rounded-xl p-4 border border-border">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{cancha.hora_apertura} - {cancha.hora_cierre}</p>
                                <p className="text-sm text-muted-foreground">Turnos de 60 minutos</p>
                                <p className="text-sm text-muted-foreground mt-1">{cancha.dias_operativos_texto}</p>
                            </div>
                        </div>
                    </div>

                    {/* Precio */}
                    <div className="bg-secondary/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Precio por turno</p>
                                <p className="text-2xl font-bold text-foreground">{formatearPrecio(cancha.precio_por_turno)}</p>
                            </div>
                            <span className="text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-full">
                                Seña al reservar
                            </span>
                        </div>
                    </div>

                    {role === "jugador" && (
                        <Link href={`/partidos/nuevo?canchaId=${canchaId}`} className="block">
                            <Button className="w-full font-semibold" size="lg">
                                Reservar Turno
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}