"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Trophy, Calendar, Users, MapPin, AlignLeft, ArrowLeft, Loader2, Info, Shield, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTorneo, cancelarTorneo, TorneoData, JugadorSimple, getFixtureTorneo, bajarseDeTorneo, API_URL } from "@/hooks/use-api"
import { useAuthContext } from "@/components/auth-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FixtureTab } from "@/components/torneos/FixtureTab"
import { EstadisticasTab } from "@/components/torneos/EstadisticasTab"
import { TablaTab } from "@/components/torneos/TablaTab"
import Swal from "sweetalert2"

const DIAS_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function decodeDias(bitmask: number): string[] {
  return DIAS_LABELS.filter((_, i) => (bitmask >> i) & 1)
}


export default function TorneoDetallePage() {
    const { id } = useParams()
    const router = useRouter()
    const { role, userId } = useAuthContext()
    const [torneo, setTorneo] = useState<TorneoData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [isCancelling, setIsCancelling] = useState(false)
    const [isLeaving, setIsLeaving] = useState(false)
    const [partidosCount, setPartidosCount] = useState<{ jugados: number; total: number } | null>(null)
    const [campeon, setCampeon] = useState<any>(null)
    const [goleador, setGoleador] = useState<any>(null)
    const [vallaMenosVencida, setVallaMenosVencida] = useState<any>(null)

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

    useEffect(() => {
        if (!torneo) return
        async function fetchPartidos() {
            try {
                const data = await getFixtureTorneo(torneo!.id)
                const jugados = data.filter((p: any) => p.estado === 'finalizado').length
                setPartidosCount({ jugados, total: data.length })
            } catch {
                // silently fail
            }
        }
        
        async function fetchChampionData() {
            if (torneo!.estado === "Finalizado") {
                try {
                    const formato = (torneo!.formato || "").toLowerCase();
                    const esTodosContraTodos = formato === "todos_contra_todos" || formato === "todos contra todos" || formato === "liga";

                    const requests: Promise<any>[] = [
                        fetch(`${API_URL}/api/torneos/${torneo!.id}/estadisticas`).then(res => res.json()),
                        fetch(`${API_URL}/api/torneos/${torneo!.id}/top/vallas-invictas?limit=1`).then(res => res.ok ? res.json() : [])
                    ];

                    if (esTodosContraTodos) {
                        requests.push(fetch(`${API_URL}/api/torneos/${torneo!.id}/tabla-posiciones`).then(res => res.json()));
                    } else {
                        requests.push(getFixtureTorneo(torneo!.id).catch(() => []));
                    }

                    const results = await Promise.all(requests);
                    const stats = results[0];
                    const vallas = results[1];

                    if (esTodosContraTodos) {
                        const tabla = results[2];
                        if (tabla && tabla.length > 0) {
                            setCampeon(tabla[0]);
                        }
                    } else {
                        const fixture = results[2];
                        if (fixture && Array.isArray(fixture)) {
                            const partidoFinal = fixture.find((p: any) => p.fase === "final" && p.estado === "finalizado");
                            if (partidoFinal) {
                                const golesLocal = partidoFinal.goles_local ?? 0;
                                const golesVisitante = partidoFinal.goles_visitante ?? 0;
                                let campeonData = null;
                                if (golesLocal > golesVisitante) {
                                    campeonData = {
                                        equipo_nombre: partidoFinal.equipo_local?.nombre || partidoFinal.equipo_local?.nombre_equipo,
                                        equipo_id: partidoFinal.equipo_local?.id
                                    };
                                } else if (golesVisitante > golesLocal) {
                                    campeonData = {
                                        equipo_nombre: partidoFinal.equipo_visitante?.nombre || partidoFinal.equipo_visitante?.nombre_equipo,
                                        equipo_id: partidoFinal.equipo_visitante?.id
                                    };
                                }
                                if (campeonData) {
                                    setCampeon(campeonData);
                                }
                            }
                        }
                    }

                    if (stats && stats.jugadores && stats.jugadores.length > 0) {
                        const goleadores = [...stats.jugadores].sort((a, b) => b.goles - a.goles)
                        if (goleadores[0].goles > 0) {
                            setGoleador(goleadores[0])
                        }
                    }
                    if (vallas && vallas.length > 0) {
                        setVallaMenosVencida(vallas[0])
                    }
                } catch (e) {
                    // silently fail
                }
            }
        }

        fetchPartidos()
        fetchChampionData()
    }, [torneo])


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
        const result = await Swal.fire({
            title: "¿Cancelar torneo?",
            text: "Esta acción no se puede deshacer. Se notificará a todos los equipos inscriptos sobre la cancelación.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#EF4444",
            cancelButtonColor: "#6B7280",
            confirmButtonText: "Sí, cancelar torneo",
            cancelButtonText: "No, mantener"
        })

        if (result.isConfirmed) {
            setIsCancelling(true)
            try {
                await cancelarTorneo(torneo.id)
                setTorneo({ ...torneo, estado: "Cancelado" })
                await Swal.fire({
                    title: "Torneo cancelado",
                    text: "El torneo fue cancelado y se notificó a los equipos inscriptos.",
                    icon: "success",
                    timer: 2500,
                    showConfirmButton: false
                })
            } catch (err: any) {
                Swal.fire("Error", err.message || "No se pudo cancelar el torneo", "error")
            } finally {
                setIsCancelling(false)
            }
        }
    }

    const handleLeave = async () => {
        const result = await Swal.fire({
            title: "¿Darse de baja?",
            text: "Estás por dar de baja a tu equipo de este torneo.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#EF4444",
            cancelButtonColor: "#6B7280",
            confirmButtonText: "Sí, dar de baja",
            cancelButtonText: "Cancelar"
        })

        if (result.isConfirmed) {
            setIsLeaving(true)
            try {
                await bajarseDeTorneo(torneo.id)
                await Swal.fire({
                    title: "Inscripción cancelada",
                    text: "Inscripción cancelada con éxito. En las próximas horas la seña será reembolsada.",
                    icon: "success",
                    confirmButtonColor: "#FF6B4A"
                })
                const data = await getTorneo(Number(id))
                setTorneo(data)
            } catch (err: any) {
                Swal.fire("Error", err.message || "No se pudo dar de baja al equipo", "error")
            } finally {
                setIsLeaving(false)
            }
        }
    }

    const renderizarJugadores = (jugadoresRaw: string | JugadorSimple[]) => {
        // Si ya es un array de objetos (viene del backend con jugadores cargados)
        if (Array.isArray(jugadoresRaw)) {
            if (jugadoresRaw.length === 0) return null
            return (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {jugadoresRaw.map((j, i) => (
                        <span
                            key={i}
                            className="inline-block bg-muted text-muted-foreground text-[11px] font-medium px-2 py-0.5 rounded-md border border-border/60"
                        >
                            {j.nombre} {j.apellido}
                        </span>
                    ))}
                </div>
            )
        }
        // Si viene como string JSON
        try {
            const lista: { nombre: string; email?: string; dni?: string }[] = JSON.parse(jugadoresRaw)
            if (Array.isArray(lista)) {
                return (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {lista.map((j, i) => (
                            <span
                                key={i}
                                className="inline-block bg-muted text-muted-foreground text-[11px] font-medium px-2 py-0.5 rounded-md border border-border/60"
                                title={j.email ? `Email: ${j.email} | DNI: ${j.dni}` : undefined}
                            >
                                {j.nombre}
                            </span>
                        ))}
                    </div>
                )
            }
        } catch (e) {
        }
        return <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{jugadoresRaw}</p>
    }

    const cuposRestantes = torneo.max_equipos - torneo.equipos_inscriptos
    const estaAbierto = torneo.estado === "Abierto para inscripción"
    const hayCupos = cuposRestantes > 0

    const isUserEnrolled = torneo.equipos?.some(equipo => {
        if (Array.isArray(equipo.jugadores)) {
            return equipo.jugadores.some((j: any) => j.id === Number(userId))
        }
        try {
            const parsed = JSON.parse(equipo.jugadores)
            if (Array.isArray(parsed)) {
                return parsed.some((j: any) => j.id === Number(userId))
            }
        } catch (e) { }
        return false
    }) || false

    return (
        <div className="min-h-screen bg-background pb-12">
            {torneo.estado === "Finalizado" && campeon && (
                <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 border-b border-primary-foreground/10 shadow-2xl">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                    <div className="absolute inset-0 flex justify-center pointer-events-none overflow-hidden">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div 
                                key={i} 
                                className="animate-confetti absolute w-1.5 h-4 sm:w-2 sm:h-6 rounded-full"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `-${Math.random() * 20 + 10}px`,
                                    backgroundColor: ['#ffffff', '#f8fafc', '#e2e8f0', '#fbbf24'][Math.floor(Math.random() * 4)],
                                    animationDelay: `${Math.random() * 5}s`,
                                    animationDuration: `${Math.random() * 3 + 2}s`
                                }}
                            />
                        ))}
                    </div>
                    
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10 text-center">
                        <div className="inline-flex items-center justify-center p-5 bg-primary-foreground/20 backdrop-blur-md rounded-full mb-6 animate-trophy-glow shadow-[0_0_40px_rgba(255,255,255,0.2)] ring-4 ring-primary-foreground/30">
                            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-primary-foreground drop-shadow-md" />
                        </div>
                        
                        <h2 className="text-sm sm:text-lg font-bold text-primary-foreground/90 mb-3 tracking-[0.3em] uppercase">
                            ¡Tenemos Campeón!
                        </h2>
                        
                        <h1 className="text-5xl sm:text-7xl font-black text-primary-foreground mb-10 drop-shadow-xl animate-scale-in">
                            {campeon.equipo_nombre}
                        </h1>

                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                            {goleador && (
                                <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 rounded-2xl p-4 flex items-center gap-4 text-left shadow-xl hover:bg-primary-foreground/15 hover:border-primary-foreground/30 transition-all animate-scale-in animation-delay-200">
                                    <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                                        <span className="text-2xl drop-shadow-md">⚽</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-primary-foreground/70 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-0.5">Goleador del Torneo</div>
                                        <div className="text-primary-foreground font-bold text-base sm:text-lg leading-tight truncate">{goleador.usuario_nombre} {goleador.usuario_apellido}</div>
                                        <div className="text-primary-foreground/90 text-xs sm:text-sm font-medium mt-0.5">{goleador.goles} goles</div>
                                    </div>
                                </div>
                            )}

                            {vallaMenosVencida && (
                                <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 rounded-2xl p-4 flex items-center gap-4 text-left shadow-xl hover:bg-primary-foreground/15 hover:border-primary-foreground/30 transition-all animate-scale-in animation-delay-400">
                                    <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                                        <span className="text-2xl drop-shadow-md">🧤</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-primary-foreground/70 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-0.5">Valla Menos Vencida</div>
                                        <div className="text-primary-foreground font-bold text-base sm:text-lg leading-tight truncate">{vallaMenosVencida.equipo_nombre}</div>
                                        <div className="text-primary-foreground/90 text-xs sm:text-sm font-medium mt-0.5">{vallaMenosVencida.goles_recibidos} en contra</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                {estaAbierto ? (
                                    cuposRestantes <= 0 ? (
                                        <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            Completo
                                        </span>
                                    ) : (
                                        <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            Cupos disponibles
                                        </span>
                                    )
                                ) : (
                                    <span className={`text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-md
                                        ${torneo.estado === 'En curso' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                        }
                                    `}>
                                        {torneo.estado}
                                    </span>
                                )}
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
                                {torneo.franja_horaria && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <span>{torneo.franja_horaria.replace('-', ' – ')} hs</span>
                                    </div>
                                )}
                                {torneo.dias_operativos != null && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {decodeDias(torneo.dias_operativos).map(d => (
                                            <span key={d} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {partidosCount !== null && partidosCount.total > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-primary" />
                                        <span className="text-sm">
                                            <span className="font-semibold text-foreground">{partidosCount.jugados}</span>
                                            <span className="mx-1">/</span>
                                            <span className="font-semibold text-foreground">{partidosCount.total}</span>
                                            <span className="ml-1">partidos jugados</span>
                                        </span>
                                    </div>
                                )}
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

                            {role !== "admin" && (
                                <>
                                    {isUserEnrolled ? (
                                        estaAbierto && torneo.estado !== "En curso" ? (
                                            <Button 
                                                variant="destructive" 
                                                className="w-full" 
                                                size="lg" 
                                                onClick={handleLeave} 
                                                disabled={isLeaving}
                                            >
                                                {isLeaving ? "Saliendo..." : "Darse de baja"}
                                            </Button>
                                        ) : (
                                            <Button className="w-full" size="lg" disabled variant="secondary">
                                                Inscripto
                                            </Button>
                                        )
                                    ) : estaAbierto && hayCupos ? (
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <Tabs defaultValue="informacion" className="w-full">
                    <TabsList className={`grid w-full mb-8 ${torneo.formato === 'eliminacion_directa' || torneo.formato === 'Eliminación directa' ? 'grid-cols-4' : 'grid-cols-5'}`}>
                        <TabsTrigger value="informacion">Información</TabsTrigger>
                        <TabsTrigger value="equipos">Equipos</TabsTrigger>
                        <TabsTrigger value="fixture">Fixture</TabsTrigger>
                        {torneo.formato !== 'eliminacion_directa' && torneo.formato !== 'Eliminación directa' && <TabsTrigger value="tabla">Tabla</TabsTrigger>}
                        <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="informacion" className="space-y-8">
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

                        {/* Acciones de Organizador */}
                        {userId && torneo.organizador_id === Number(userId) && torneo.estado !== "Cancelado" && (
                            <div className="bg-card rounded-xl border border-border shadow-sm p-5 mt-6 flex flex-col gap-5">
                                <div>
                                    <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" />
                                        Administración
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Opciones de gestión del torneo.
                                    </p>
                                </div>

                                {estaAbierto && (
                                    <Link href={`/torneos/${torneo.id}/editar`} className="block w-full">
                                        <Button variant="outline" className="w-full">
                                            Editar Configuración
                                        </Button>
                                    </Link>
                                )}

                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-bold text-destructive mb-1.5 flex items-center gap-1.5 text-sm">
                                        <XCircle className="w-4 h-4" />
                                        Zona de peligro
                                    </h4>
                                    <p className="text-[13px] text-muted-foreground mb-3 leading-relaxed">
                                        Al cancelar el torneo, se cerrarán las inscripciones y se notificará a los equipos.
                                    </p>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={handleCancelar}
                                        disabled={isCancelling}
                                    >
                                        {isCancelling ? "Cancelando..." : "Cancelar Torneo"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="equipos" className="space-y-6">
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
                                                <p className="font-semibold text-sm text-foreground">{equipo.nombre_equipo}</p>
                                                {/* Renderizador dinámico en fila */}
                                                {renderizarJugadores(equipo.jugadores)}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <p className="text-sm">Todavía no hay equipos inscriptos.</p>
                                        {estaAbierto && hayCupos && role !== "admin" && (
                                            <p className="text-sm mt-1 font-medium text-primary">¡Sé el primero en anotarte!</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="fixture">
                        <FixtureTab torneo={torneo} isOrganizer={userId ? torneo.organizador_id === Number(userId) : false} />
                    </TabsContent>

                    {torneo.formato !== 'eliminacion_directa' && torneo.formato !== 'Eliminación directa' && (
                        <TabsContent value="tabla">
                            <TablaTab torneo={torneo} />
                        </TabsContent>
                    )}

            <TabsContent value="estadisticas">
                <EstadisticasTab torneo={torneo} />
            </TabsContent>
        </Tabs>
            </div >
        </div >
    )
}