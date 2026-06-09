"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Calendar, MapPin, Users, DollarSign, AlignLeft, Info, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { crearTorneo, getCanchas, CanchaData } from "@/hooks/use-api"
import Link from "next/link"
import Swal from "sweetalert2"

export default function CrearTorneoPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    const [canchas, setCanchas] = useState<CanchaData[]>([])

    useEffect(() => {
        getCanchas().then(data => setCanchas(data)).catch(console.error)
    }, [])

    const [formData, setFormData] = useState({
        nombre: "",
        fecha_inicio: "",
        fecha_fin: "",
        formato: "Eliminación directa",
        cancha_id: "",
        max_equipos: 4,
        costo_inscripcion: 0,
        descripcion: "",
        reglas: ""
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setErrorMsg("") 

        if (name === "formato") {
            let nuevosEquipos = formData.max_equipos

            if (value === "Fase de grupos + 8avos de final") {
                nuevosEquipos = 16
            } else if (value === "Fase de grupos + 16avos de final") {
                nuevosEquipos = 32
            }

            setFormData(prev => ({
                ...prev,
                formato: value,
                max_equipos: nuevosEquipos
            }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
    }

    const esFormatoFijo = 
        formData.formato === "Fase de grupos + 8avos de final" || 
        formData.formato === "Fase de grupos + 16avos de final"

    const validateForm = () => {
        if (!formData.nombre.trim()) return "El nombre del torneo es obligatorio."
        if (!formData.fecha_inicio) return "La fecha de inicio es obligatoria."
        if (!formData.fecha_fin) return "La fecha de fin es obligatoria."
        
        const fechaElegida = new Date(formData.fecha_inicio)
        const fechaFin = new Date(formData.fecha_fin)
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        
        const fechaElegidaLocal = new Date(fechaElegida.getTime() + fechaElegida.getTimezoneOffset() * 60000)
        const fechaFinLocal = new Date(fechaFin.getTime() + fechaFin.getTimezoneOffset() * 60000)

        if (fechaElegidaLocal < hoy) {
            return "La fecha de inicio no puede estar en el pasado."
        }
        if (fechaFinLocal <= fechaElegidaLocal) {
            return "La fecha de fin debe ser posterior a la fecha de inicio."
        }
        
        if (!formData.cancha_id) return "Debe seleccionar una cancha."
        if (Number(formData.max_equipos) < 2) return "El número máximo de equipos debe ser al menos 2."
        if (Number(formData.costo_inscripcion) < 0) return "El costo de inscripción no puede ser negativo."

        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const error = validateForm()
        if (error) {
            setErrorMsg(error)
            return
        }

        setIsLoading(true)
        try {
            await crearTorneo({
                nombre: formData.nombre,
                fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
                fecha_fin: new Date(formData.fecha_fin).toISOString(),
                formato: formData.formato,
                cancha_id: Number(formData.cancha_id),
                max_equipos: Number(formData.max_equipos),
                costo_inscripcion: Number(formData.costo_inscripcion),
                descripcion: formData.descripcion,
                reglas: formData.reglas
            })
            await Swal.fire({
                title: "¡Torneo creado con éxito!",
                text: "El torneo fue publicado y ya está disponible en tu lista.",
                icon: "success",
                timer: 2000,
                showConfirmButton: false
            })
            router.push("/torneos")
        } catch (error: any) {
            // Si el botón se quedaba trabado, ahora vuelve a su estado normal y te muestra el error real
            setErrorMsg(error.message || "Error al crear el torneo. Por favor, intentá nuevamente.")
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Header */}
            <div className="bg-primary/5 border-b border-border py-8">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <Link href="/torneos" className="inline-flex items-center text-sm text-primary hover:underline mb-6 font-medium">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Volver a Torneos
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-primary" />
                        Crear Nuevo Torneo
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Completá los datos para publicar tu torneo y empezar a recibir inscripciones.
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
                <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm font-medium whitespace-pre-line">{errorMsg}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Información Básica */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary" />
                                Información Básica
                            </h3>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground">
                                    Nombre del Torneo *
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    placeholder="Ej: Copa de Verano 2026"
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                                        Fecha de Inicio *
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="date"
                                            name="fecha_inicio"
                                            value={formData.fecha_inicio}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                                        Fecha de Fin *
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="date"
                                            name="fecha_fin"
                                            value={formData.fecha_fin}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                                        Cancha *
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
                                        <select
                                            name="cancha_id"
                                            value={formData.cancha_id}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none appearance-none"
                                            required
                                        >
                                            <option value="" disabled>Seleccioná una cancha...</option>
                                            {canchas.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre} (F{c.tamano}) - {c.zona}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Configuración */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Formato y Configuración
                            </h3>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground">
                                    Formato del Torneo *
                                </label>
                                <select
                                    name="formato"
                                    value={formData.formato}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                >
                                    <option value="Eliminación directa">Eliminación directa</option>
                                    <option value="Fase de grupos">Fase de grupos</option>
                                    <option value="Todos contra todos">Todos contra todos</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                                        Máximo de Equipos *
                                    </label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="number"
                                            name="max_equipos"
                                            min="2"
                                            value={formData.max_equipos}
                                            onChange={handleChange}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            disabled={esFormatoFijo}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none ${
                                                esFormatoFijo ? "opacity-60 bg-muted cursor-not-allowed" : ""
                                            }`}
                                            required
                                        />
                                    </div>
                                   {/*  {esFormatoFijo && (
                                        <p className="text-[11px] text-primary mt-1 font-medium">
                                            Fijo para la estructura del formato.
                                        </p>
                                    )} */}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                                        Costo por Equipo (ARS) *
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            name="costo_inscripcion"
                                            min="0"
                                            step="1"
                                            value={formData.costo_inscripcion}
                                            onChange={handleChange}
                                            placeholder="Ej: 5000"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detalles Opcionales */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                                <AlignLeft className="w-5 h-5 text-primary" />
                                Detalles Opcionales
                            </h3>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground text-muted-foreground">
                                    Descripción general
                                </label>
                                <textarea
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Agregá detalles sobre premios, duración, u otra info útil..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground text-muted-foreground">
                                    Reglas específicas
                                </label>
                                <textarea
                                    name="reglas"
                                    value={formData.reglas}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Ej: Solo calzado de sintético, sin plancha..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3">
                        <Link href="/torneos">
                            <Button type="button" variant="outline" disabled={isLoading}>
                                Cancelar
                            </Button>
                        </Link>
                        <Button type="submit" disabled={isLoading} className="min-w-[150px]">
                            {isLoading ? "Creando..." : "Publicar Torneo"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}