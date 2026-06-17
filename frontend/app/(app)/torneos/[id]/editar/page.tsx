"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    Trophy, Calendar, MapPin, Users, DollarSign,
    AlignLeft, Info, AlertCircle, ArrowLeft,
    RefreshCw, Layers, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { editarTorneo, getTorneo } from "@/hooks/use-api"
import Link from "next/link"
import Swal from "sweetalert2"

// ─── Constantes de opciones por formato ───────────────────────────────────────
const ED_OPCIONES = [2, 4, 8, 16, 32, 64]
const FG_POR_FASE: Record<string, number[]> = {
    semis:   [6, 8, 10],
    cuartos: [12, 16, 20],
    octavos: [24, 32, 40],
}
const DIAS = [
    { abbr: "Lun", full: "Lunes",     bit: 0 },
    { abbr: "Mar", full: "Martes",    bit: 1 },
    { abbr: "Mié", full: "Miércoles", bit: 2 },
    { abbr: "Jue", full: "Jueves",    bit: 3 },
    { abbr: "Vie", full: "Viernes",   bit: 4 },
    { abbr: "Sáb", full: "Sábado",   bit: 5 },
    { abbr: "Dom", full: "Domingo",   bit: 6 },
]

export default function EditarTorneoPage() {
    const { id } = useParams()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [errorMsg, setErrorMsg] = useState("")

    const [formData, setFormData] = useState({
        nombre: "",
        fecha_inicio: "",
        fecha_fin: "",
        formato: "eliminacion_directa",
        zona: "",
        // Días y horario (igual que canchas/nueva)
        dias_operativos: 31,   // Lun-Vie por defecto
        apertura_h: "",
        apertura_m: "00",
        cierre_h: "",
        cierre_m: "00",
        // Equipos
        max_equipos: 8,
        min_integrantes_por_equipo: 5,
        // Todos contra todos
        ida_y_vuelta: false,
        // Fase de grupos
        fase_final: "cuartos",
        // General
        costo_inscripcion: 0,
        descripcion: "",
        reglas: "",
    })

    useEffect(() => {
        async function fetchTorneo() {
            try {
                const data = await getTorneo(Number(id))
                
                // Extraer YYYY-MM-DD
                const fi = new Date(data.fecha_inicio).toISOString().split('T')[0]
                const ff = new Date(data.fecha_fin).toISOString().split('T')[0]
                
                const [apertura, cierre] = data.franja_horaria.split('-')
                const [ah, am] = apertura.split(':')
                const [ch, cm] = cierre.split(':')
                const REVERSE_FORMATO_MAP: Record<string, string> = {
                    "Eliminación directa": "eliminacion_directa",
                    "Fase de grupos": "fase_grupos",
                    "Todos contra todos": "todos_contra_todos"
                }

                setFormData({
                    nombre: data.nombre,
                    fecha_inicio: fi,
                    fecha_fin: ff,
                    formato: REVERSE_FORMATO_MAP[data.formato] || data.formato,
                    zona: data.zona,
                    dias_operativos: data.dias_operativos,
                    apertura_h: ah,
                    apertura_m: am,
                    cierre_h: ch,
                    cierre_m: cm,
                    max_equipos: data.max_equipos,
                    min_integrantes_por_equipo: data.min_integrantes_por_equipo,
                    ida_y_vuelta: data.ida_y_vuelta,
                    fase_final: data.fase_final || "cuartos",
                    costo_inscripcion: data.costo_inscripcion,
                    descripcion: data.descripcion || "",
                    reglas: data.reglas || "",
                })
            } catch (err: any) {
                setErrorMsg(err.message || "Error al cargar los datos del torneo")
            } finally {
                setIsFetching(false)
            }
        }
        fetchTorneo()
    }, [id])

    const handleFormatoChange = (nuevoFormato: string) => {
        setErrorMsg("")
        setFormData(prev => ({
            ...prev,
            formato: nuevoFormato,
            max_equipos: nuevoFormato === "eliminacion_directa" ? 8
                       : nuevoFormato === "fase_grupos"         ? 16
                       : 8,
            fase_final: "cuartos",
        }))
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target
        setErrorMsg("")
        let parsed: any = value
        if (type === "checkbox") {
            parsed = (e.target as HTMLInputElement).checked
        } else if (name === "max_equipos" || name === "min_integrantes_por_equipo" || name === "costo_inscripcion") {
            parsed = Number(value)
        }
        setFormData(prev => ({ ...prev, [name]: parsed }))
    }

    const handleFaseFinalChange = (fase: string) => {
        setErrorMsg("")
        setFormData(prev => ({
            ...prev,
            fase_final: fase,
            max_equipos: FG_POR_FASE[fase][0],
        }))
    }

    const toggleDia = (bit: number) =>
        setFormData(prev => ({ ...prev, dias_operativos: prev.dias_operativos ^ (1 << bit) }))

    const validateForm = () => {
        if (!formData.nombre.trim()) return "El nombre del torneo es obligatorio."
        if (!formData.fecha_inicio) return "La fecha de inicio es obligatoria."
        if (!formData.fecha_fin) return "La fecha de fin es obligatoria."
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
        const inicio = new Date(formData.fecha_inicio + "T00:00:00")
        const fin    = new Date(formData.fecha_fin    + "T00:00:00")
        if (inicio < hoy)  return "La fecha de inicio no puede estar en el pasado."
        if (fin <= inicio) return "La fecha de fin debe ser posterior a la fecha de inicio."
        if (!formData.zona.trim()) return "La zona es obligatoria."
        if (formData.dias_operativos === 0) return "Debe seleccionar al menos un día operativo."
        if (!formData.apertura_h || !formData.cierre_h) return "La franja horaria es obligatoria."
        const ah = formData.apertura_h.padStart(2, "0")
        const ch = formData.cierre_h.padStart(2, "0")
        if (`${ah}:${formData.apertura_m}` >= `${ch}:${formData.cierre_m}`)
            return "El horario de cierre debe ser posterior al de apertura."
        if (Number(formData.costo_inscripcion) < 0) return "El costo no puede ser negativo."
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const err = validateForm()
        if (err) { setErrorMsg(err); return }

        setIsLoading(true)
        const ah = formData.apertura_h.padStart(2, "0")
        const ch = formData.cierre_h.padStart(2, "0")
        const franja_horaria = `${ah}:${formData.apertura_m}-${ch}:${formData.cierre_m}`

        try {
            await editarTorneo(Number(id), {
                nombre:         formData.nombre,
                fecha_inicio:   new Date(formData.fecha_inicio + "T12:00:00").toISOString(),
                fecha_fin:      new Date(formData.fecha_fin    + "T12:00:00").toISOString(),
                formato:        formData.formato,
                zona:           formData.zona,
                dias_operativos: formData.dias_operativos,
                franja_horaria,
                max_equipos:    Number(formData.max_equipos),
                min_integrantes_por_equipo: Number(formData.min_integrantes_por_equipo),
                costo_inscripcion: Number(formData.costo_inscripcion),
                ida_y_vuelta:   formData.formato === "todos_contra_todos" ? formData.ida_y_vuelta : false,
                fase_final:     formData.formato === "fase_grupos" ? formData.fase_final : null,
                descripcion:    formData.descripcion,
                reglas:         formData.reglas,
            })
            await Swal.fire({
                title: "¡Torneo editado!",
                text: "Los cambios se han guardado correctamente.",
                icon: "success",
                timer: 2000,
                showConfirmButton: false,
            })
            router.push(`/torneos/${id}`)
        } catch (error: any) {
            setErrorMsg(error.message || "Error al editar el torneo.")
            setIsLoading(false)
        }
    }

    const inputClass = "w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
    const labelClass = "block text-sm font-medium mb-1.5 text-foreground"

    if (isFetching) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p>Cargando datos del torneo...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Header */}
            <div className="bg-primary/5 border-b border-border py-8">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <Link href={`/torneos/${id}`} className="inline-flex items-center text-sm text-primary hover:underline mb-6 font-medium">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Volver al Torneo
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-primary" />
                        Editar Torneo
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Modificá los datos del torneo. Los cambios se reflejarán instantáneamente.
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
                <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-8">

                    {errorMsg && (
                        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm font-medium whitespace-pre-line">{errorMsg}</p>
                        </div>
                    )}

                    {/* ── Sección 1: Info básica ── */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                            <Info className="w-5 h-5 text-primary" /> Información Básica
                        </h3>

                        <div>
                            <label className={labelClass}>Nombre del Torneo *</label>
                            <input
                                type="text" name="nombre" value={formData.nombre}
                                onChange={handleChange}
                                placeholder="Ej: Copa de Verano 2026"
                                className={inputClass} required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Fecha de Inicio *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input type="date" name="fecha_inicio" value={formData.fecha_inicio}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                        required />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Fecha de Fin *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input type="date" name="fecha_fin" value={formData.fecha_fin}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                        required />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Sección 2: Ubicación, días y horario ── */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" /> Ubicación y Horario
                        </h3>

                        {/* Zona */}
                        <div>
                            <label className={labelClass}>Zona / Barrio *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text" name="zona" value={formData.zona}
                                    onChange={handleChange}
                                    placeholder="Ej: Palermo, Caballito, Villa Urquiza..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    required
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                                La cancha específica se asigna al generar el fixture.
                            </p>
                        </div>

                        {/* Días operativos — idéntico a canchas/nueva */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className={labelClass + " mb-0"}>Días operativos *</label>
                                <div className="flex gap-2 flex-wrap justify-end">
                                    {[
                                        { label: "Lun – Vie",      value: 31  },
                                        { label: "Fin de semana",  value: 96  },
                                        { label: "Todos los días", value: 127 },
                                        { label: "Limpiar",        value: 0   },
                                    ].map(({ label, value }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, dias_operativos: value }))}
                                            className="px-3 py-1.5 text-[13px] rounded-lg border border-border bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {DIAS.map(d => {
                                    const active = (formData.dias_operativos >> d.bit) & 1
                                    return (
                                        <button
                                            key={d.bit}
                                            type="button"
                                            onClick={() => toggleDia(d.bit)}
                                            className={`w-[72px] h-[72px] rounded-xl border flex flex-col items-center justify-center gap-[2px] transition-all select-none ${
                                                active
                                                    ? "bg-primary/10 border-primary border-[1.5px]"
                                                    : "bg-background border-border hover:bg-secondary hover:border-primary/50"
                                            }`}
                                        >
                                            <span className={`text-[13px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{d.abbr}</span>
                                            <span className={`text-[11px] ${active ? "text-primary/80" : "text-muted-foreground"}`}>{d.full}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Franja horaria — idéntico a canchas/nueva */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={labelClass}>Apertura (24hs) *</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        name="apertura_h" type="number" min="0" max="23"
                                        placeholder="HH" value={formData.apertura_h}
                                        onChange={handleChange}
                                        className="flex h-11 w-[80px] rounded-lg bg-input border-0 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <span className="font-bold text-muted-foreground">:</span>
                                    <select name="apertura_m" value={formData.apertura_m}
                                        onChange={handleChange}
                                        className="flex h-11 w-[80px] rounded-lg bg-input border-0 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring">
                                        <option value="00">00</option>
                                        <option value="15">15</option>
                                        <option value="30">30</option>
                                        <option value="45">45</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={labelClass}>Cierre (24hs) *</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        name="cierre_h" type="number" min="0" max="23"
                                        placeholder="HH" value={formData.cierre_h}
                                        onChange={handleChange}
                                        className="flex h-11 w-[80px] rounded-lg bg-input border-0 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <span className="font-bold text-muted-foreground">:</span>
                                    <select name="cierre_m" value={formData.cierre_m}
                                        onChange={handleChange}
                                        className="flex h-11 w-[80px] rounded-lg bg-input border-0 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring">
                                        <option value="00">00</option>
                                        <option value="15">15</option>
                                        <option value="30">30</option>
                                        <option value="45">45</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Sección 3: Formato y configuración ── */}
                    <section className="space-y-5">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" /> Formato y Configuración
                        </h3>

                        <div>
                            <label className={labelClass}>Formato del Torneo *</label>
                            <select
                                name="formato" value={formData.formato}
                                onChange={e => handleFormatoChange(e.target.value)}
                                className={inputClass}
                            >
                                <option value="eliminacion_directa">Eliminación Directa</option>
                                <option value="fase_grupos">Fase de Grupos + Eliminación</option>
                                <option value="todos_contra_todos">Todos contra Todos</option>
                            </select>
                        </div>

                        {/* Eliminación directa */}
                        {formData.formato === "eliminacion_directa" && (
                            <div>
                                <label className={labelClass}>Cantidad de Equipos *</label>
                                <select name="max_equipos" value={formData.max_equipos} onChange={handleChange} className={inputClass}>
                                    {ED_OPCIONES.map(n => (
                                        <option key={n} value={n}>{n} equipos</option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground mt-1.5">
                                    Debe ser potencia de 2 para el cuadro de eliminación.
                                </p>
                            </div>
                        )}

                        {/* Fase de grupos */}
                        {formData.formato === "fase_grupos" && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Fase de eliminación final *</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(["semis", "cuartos", "octavos"] as const).map(fase => (
                                            <button
                                                key={fase}
                                                type="button"
                                                onClick={() => handleFaseFinalChange(fase)}
                                                className={`py-3 px-2 rounded-xl border text-sm font-medium transition-all ${
                                                    formData.fase_final === fase
                                                        ? "bg-primary/10 border-primary border-[1.5px] text-primary"
                                                        : "bg-background border-border text-muted-foreground hover:bg-secondary hover:border-primary/50"
                                                }`}
                                            >
                                                {fase === "semis"   && "Semifinales"}
                                                {fase === "cuartos" && "Cuartos de final"}
                                                {fase === "octavos" && "Octavos de final"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Cantidad de Equipos *</label>
                                    <select name="max_equipos" value={formData.max_equipos} onChange={handleChange} className={inputClass}>
                                        {FG_POR_FASE[formData.fase_final]?.map(n => (
                                            <option key={n} value={n}>{n} equipos</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Todos contra todos */}
                        {formData.formato === "todos_contra_todos" && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Cantidad de Equipos (4–30) *</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="number" name="max_equipos" min="4" max="30"
                                            value={formData.max_equipos} onChange={handleChange}
                                            onWheel={e => e.currentTarget.blur()}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                {/* Toggle ida y vuelta */}
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div
                                        onClick={() => setFormData(p => ({ ...p, ida_y_vuelta: !p.ida_y_vuelta }))}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${formData.ida_y_vuelta ? "bg-primary" : "bg-muted"}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formData.ida_y_vuelta ? "translate-x-5" : ""}`} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium flex items-center gap-1.5">
                                            <RefreshCw className="w-4 h-4 text-primary" /> Ida y vuelta
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Cada par de equipos se enfrenta dos veces
                                        </span>
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Modalidad + Costo — siempre visibles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Modalidad *</label>
                                <select name="min_integrantes_por_equipo" value={formData.min_integrantes_por_equipo} onChange={handleChange} className={inputClass}>
                                    <option value={5}>Fútbol 5</option>
                                    <option value={7}>Fútbol 7</option>
                                    <option value={9}>Fútbol 9</option>
                                    <option value={11}>Fútbol 11</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Costo por Equipo (ARS) *</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="number" inputMode="numeric" name="costo_inscripcion"
                                        min="0" step="1" value={formData.costo_inscripcion}
                                        onChange={handleChange} placeholder="Ej: 5000"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Sección 4: Detalles opcionales ── */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                            <AlignLeft className="w-5 h-5 text-primary" /> Detalles Opcionales
                        </h3>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Descripción general</label>
                            <textarea name="descripcion" value={formData.descripcion} onChange={handleChange}
                                rows={3} placeholder="Premios, duración, info útil..."
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none resize-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Reglas específicas</label>
                            <textarea name="reglas" value={formData.reglas} onChange={handleChange}
                                rows={3} placeholder="Ej: Solo calzado de sintético, sin plancha..."
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none resize-none" />
                        </div>
                    </section>

                    {/* Acciones */}
                    <div className="pt-4 border-t border-border flex justify-end gap-3">
                        <Link href={`/torneos/${id}`}>
                            <Button type="button" variant="outline" disabled={isLoading}>Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={isLoading} className="min-w-[150px]">
                            {isLoading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}