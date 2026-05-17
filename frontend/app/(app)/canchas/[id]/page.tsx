"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Clock, Sun, DollarSign, CheckCircle, XCircle, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthContext } from "@/components/auth-provider"
import { eliminarCancha } from "@/hooks/use-api"
import Swal from 'sweetalert2'

const API_URL = "http://localhost:8000"

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
                console.error("Error fetching cancha:", error)
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
            <div className="container mx-auto px-4 py-8">
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
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
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
                    icon: "error"
                })
            }
        }
    }
    if (!cancha) return null
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" asChild>
                    <Link href="/canchas">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a canchas
                    </Link>
                </Button>

                {isOwner && (
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/canchas/${cancha.id}/editar`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                            </Link>
                        </Button>
                        <Button variant="destructive" onClick={handleEliminar}>
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
                            className="w-full rounded-lg object-cover"
                        />
                    ) : (
                        <div className="w-full aspect-video bg-secondary rounded-lg flex items-center justify-center">
                            <Sun className="h-24 w-24 text-muted-foreground" />
                        </div>
                    )}
                </div>
                {/* Info */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{cancha.nombre}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-5 w-5" />
                            {cancha.zona} • {cancha.direccion}
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Detalles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Tipo de superficie</p>
                                    <p className="font-medium">{cancha.tipo_superficie}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Tamaño</p>
                                    <p className="font-medium">Fútbol {cancha.tamano}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Iluminación</p>
                                    <div className="flex items-center gap-2">
                                        {cancha.iluminacion ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <span>{cancha.iluminacion ? "Sí" : "No"}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Estado</p>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${cancha.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {cancha.activa ? "Activa" : "Inactiva"}
                                    </span>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                    <Clock className="h-4 w-4" />
                                    <span>Horario</span>
                                </div>
                                <p className="font-medium">{cancha.hora_apertura} - {cancha.hora_cierre}</p>
                                <p className="text-sm text-muted-foreground">{cancha.dias_operativos_texto}</p>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                    <DollarSign className="h-4 w-4" />
                                    <span>Precio por turno</span>
                                </div>
                                <p className="text-2xl font-bold text-primary">
                                    {formatearPrecio(cancha.precio_por_turno)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Button className="w-full" size="lg">
                        Reservar turno
                    </Button>
                </div>
            </div>
        </div>
    )
}