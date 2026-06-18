"use client"

import React, { useEffect, useState } from "react"
import { useAuthContext } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Legend } from "recharts"
import { getMisCanchas, CanchaData, getKpis, KpiResumen, getReservasPorPeriodo, ReservasPorPeriodoRespuesta, getOcupacion, OcupacionRespuesta, getDistribucionTipo, DistribucionTipoRespuesta, getDistribucionModalidad, DistribucionModalidadRespuesta, getMapaCalor, MapaCalorRespuesta, getReservasPorDiaSemana, ReservasPorDiaSemanaRespuesta, getIngresos, IngresosRespuesta, getCancelaciones, CancelacionesRespuesta, getComparativaCanchas, ComparativaCanchasRespuesta } from "@/hooks/use-api"
import { format, startOfMonth, startOfWeek, subMonths, startOfYear, endOfMonth } from "date-fns"

const COLORS = ['#ea580c', '#c2410c', '#9a3412', '#7f1d1d', '#f97316'];

export default function EstadisticasPage() {
    const { role, isLoading: authLoading } = useAuthContext()
    const router = useRouter()

    const [canchas, setCanchas] = useState<CanchaData[]>([])
    const [selectedCancha, setSelectedCancha] = useState<string>("todas")
    const [dateRange, setDateRange] = useState<string>("mes") // "hoy", "semana", "mes"

    const [kpis, setKpis] = useState<KpiResumen | null>(null)
    const [reservasPeriodo, setReservasPeriodo] = useState<ReservasPorPeriodoRespuesta | null>(null)
    const [ocupacion, setOcupacion] = useState<OcupacionRespuesta | null>(null)
    const [distTipo, setDistTipo] = useState<DistribucionTipoRespuesta | null>(null)
    const [distModalidad, setDistModalidad] = useState<DistribucionModalidadRespuesta | null>(null)
    const [mapaCalor, setMapaCalor] = useState<MapaCalorRespuesta | null>(null)
    const [diasSemana, setDiasSemana] = useState<ReservasPorDiaSemanaRespuesta | null>(null)
    const [ingresos, setIngresos] = useState<IngresosRespuesta | null>(null)
    const [cancelaciones, setCancelaciones] = useState<CancelacionesRespuesta | null>(null)
    const [comparativa, setComparativa] = useState<ComparativaCanchasRespuesta | null>(null)
    const [canchasComparar, setCanchasComparar] = useState<number[]>([])

    useEffect(() => {
        if (canchas.length > 0 && canchasComparar.length === 0) {
            setCanchasComparar(canchas.map(c => c.id!))
        }
    }, [canchas, canchasComparar.length])

    const [loading, setLoading] = useState(true)

    const formatFechaCorto = (fecha: string) => {
        if (!fecha || !fecha.includes('-')) return fecha;
        const [yyyy, mm, dd] = fecha.split('-');
        return `${dd}-${mm}`;
    };

    useEffect(() => {
        if (!authLoading && role !== "admin") {
            router.push("/home")
        }
    }, [role, authLoading, router])

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const canchasData = await getMisCanchas()
                setCanchas(canchasData)
            } catch (e) {
                console.error("Error fetching canchas", e)
            }
        }
        if (role === "admin") {
            fetchInitialData()
        }
    }, [role])

    useEffect(() => {
        async function fetchDashboardData() {
            setLoading(true)
            try {
                let fechaDesde = ""
                let fechaHasta = format(new Date(), "yyyy-MM-dd")

                const hoy = new Date()
                if (dateRange === "hoy") {
                    fechaDesde = format(hoy, "yyyy-MM-dd")
                } else if (dateRange === "semana") {
                    fechaDesde = format(startOfWeek(hoy, { weekStartsOn: 1 }), "yyyy-MM-dd")
                } else if (dateRange === "mes") {
                    fechaDesde = format(startOfMonth(hoy), "yyyy-MM-dd")
                } else if (dateRange === "mes_pasado") {
                    const mesPasado = subMonths(hoy, 1)
                    fechaDesde = format(startOfMonth(mesPasado), "yyyy-MM-dd")
                    fechaHasta = format(endOfMonth(mesPasado), "yyyy-MM-dd")
                } else if (dateRange === "ultimos_3_meses") {
                    fechaDesde = format(subMonths(hoy, 3), "yyyy-MM-dd")
                } else if (dateRange === "este_ano") {
                    fechaDesde = format(startOfYear(hoy), "yyyy-MM-dd")
                }

                const canchaId = selectedCancha !== "todas" ? parseInt(selectedCancha) : undefined

                const [kpisData, reservasData, ocupacionData, tipoData, modalidadData, mapaData, diasData, ingresosData, cancelacionesData, comparativaData] = await Promise.all([
                    getKpis(canchaId),
                    getReservasPorPeriodo(fechaDesde, fechaHasta, canchaId),
                    getOcupacion(fechaDesde, fechaHasta, canchaId),
                    getDistribucionTipo(fechaDesde, fechaHasta, canchaId),
                    getDistribucionModalidad(fechaDesde, fechaHasta, canchaId),
                    getMapaCalor(fechaDesde, fechaHasta, canchaId),
                    getReservasPorDiaSemana(fechaDesde, fechaHasta, canchaId),
                    getIngresos(fechaDesde, fechaHasta, canchaId),
                    getCancelaciones(fechaDesde, fechaHasta, canchaId),
                    getComparativaCanchas(fechaDesde, fechaHasta)
                ])

                setKpis(kpisData)
                setReservasPeriodo(reservasData)
                setOcupacion(ocupacionData)
                setDistTipo(tipoData)
                setDistModalidad(modalidadData)
                setMapaCalor(mapaData)
                setDiasSemana(diasData)
                setIngresos(ingresosData)
                setCancelaciones(cancelacionesData)
                setComparativa(comparativaData)
            } catch (e) {
                console.error("Error fetching dashboard data", e)
            } finally {
                setLoading(false)
            }
        }

        if (role === "admin") {
            fetchDashboardData()
        }
    }, [selectedCancha, dateRange, role])

    if (authLoading || role !== "admin") return null

    const combinedData = reservasPeriodo?.datos.map((item, index) => ({
        fecha: item.fecha,
        cantidad: item.cantidad,
        tasa: ocupacion?.datos[index]?.tasa || 0
    })) || []

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard de Estadísticas</h1>
                    <p className="text-muted-foreground mt-1">Visualizá el rendimiento de tus canchas</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                    <Select value={selectedCancha} onValueChange={setSelectedCancha}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Todas mis canchas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas">Todas mis canchas</SelectItem>
                            {canchas.map(c => (
                                <SelectItem key={c.id} value={c.id!.toString()}>{c.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Este mes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hoy">Hoy</SelectItem>
                            <SelectItem value="semana">Esta semana</SelectItem>
                            <SelectItem value="mes">Este mes</SelectItem>
                            <SelectItem value="mes_pasado">Mes pasado</SelectItem>
                            <SelectItem value="ultimos_3_meses">Últimos 3 meses</SelectItem>
                            <SelectItem value="este_ano">Este año</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Reservas (Mes)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{kpis?.reservas_mes || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {kpis?.reservas_semana} esta semana, {kpis?.reservas_hoy} hoy
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Ocupación (Hoy)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{kpis?.tasa_ocupacion_hoy || 0}%</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Ingreso Estimado (Mes)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                    ${kpis?.ingreso_estimado_mes.toLocaleString('es-AR') || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Próxima Reserva</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {kpis?.proxima_reserva_fecha ? (
                                    <>
                                        <div className="text-lg font-bold">
                                            {kpis.proxima_reserva_fecha} - {kpis.proxima_reserva_horario}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">
                                            {kpis.proxima_reserva_cancha}
                                        </p>
                                    </>
                                ) : (
                                    <div className="text-lg font-bold text-muted-foreground">Sin reservas próximas</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Reservas y Ocupación combinados */}
                        <Card className="shadow-md lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Evolución de Reservas y Ocupación</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={combinedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" opacity={0.5} />
                                        <XAxis dataKey="fecha" tickFormatter={formatFechaCorto} />
                                        <YAxis yAxisId="left" allowDecimals={false} />
                                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                                        <RechartsTooltip 
                                            labelFormatter={(val) => `Fecha: ${formatFechaCorto(val)}`} 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="cantidad" name="Reservas" fill="#ea580c" radius={[4, 4, 0, 0]} />
                                        <Line yAxisId="right" type="monotone" dataKey="tasa" name="Ocupación %" stroke="#9f1239" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Mapa de Calor */}
                        <Card className="shadow-md lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Horarios Más y Menos Reservados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(() => {
                                    if (!mapaCalor?.datos || mapaCalor.datos.length === 0) return <p className="text-muted-foreground text-center py-8">Sin datos suficientes</p>;
                                    
                                    const horas = Array.from({length: 16}, (_, i) => `${(i+8).toString().padStart(2, '0')}:00`);
                                    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                                    const maxCantidad = Math.max(...mapaCalor.datos.map(d => d.cantidad), 1);
                                    
                                    const getIntensity = (dia_num: number, hora: string) => {
                                        const cell = mapaCalor.datos.find(d => d.dia_numero === dia_num && d.hora === hora);
                                        if (!cell || cell.cantidad === 0) return 'bg-slate-100 dark:bg-slate-800';
                                        
                                        const ratio = cell.cantidad / maxCantidad;
                                        if (ratio < 0.2) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-100';
                                        if (ratio < 0.5) return 'bg-orange-300 dark:bg-orange-700/60 text-orange-950 dark:text-orange-50';
                                        if (ratio < 0.8) return 'bg-orange-500 dark:bg-orange-600 text-white';
                                        return 'bg-orange-700 dark:bg-orange-500 text-white';
                                    }

                                    return (
                                        <div className="overflow-x-auto pb-4">
                                            <div className="min-w-[600px] grid grid-cols-[auto_repeat(7,1fr)] gap-1">
                                                <div className="text-xs font-semibold text-muted-foreground p-2 text-right">Hora \ Día</div>
                                                {dias.map(d => (
                                                    <div key={d} className="text-xs font-semibold text-center p-2 truncate">{d.substring(0,3)}</div>
                                                ))}
                                                
                                                {horas.map(hora => (
                                                    <React.Fragment key={hora}>
                                                        <div className="text-xs text-muted-foreground text-right p-2 border-r border-slate-200 dark:border-slate-800 flex items-center justify-end">
                                                            {hora}
                                                        </div>
                                                        {dias.map((d, i) => {
                                                            const intensityClass = getIntensity(i, hora);
                                                            const cellData = mapaCalor.datos.find(d => d.dia_numero === i && d.hora === hora);
                                                            return (
                                                                <div 
                                                                    key={`${d}-${hora}`} 
                                                                    className={`rounded flex items-center justify-center p-1 text-xs font-medium ${intensityClass} transition-colors hover:ring-2 hover:ring-primary cursor-pointer`}
                                                                    title={`${d} ${hora}: ${cellData?.cantidad || 0} reservas`}
                                                                >
                                                                    {cellData?.cantidad || ''}
                                                                </div>
                                                            )
                                                        })}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            
                                            <div className="flex items-center justify-end mt-4 gap-2 text-xs text-muted-foreground">
                                                Menos
                                                <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800"></div>
                                                <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/40"></div>
                                                <div className="w-4 h-4 rounded bg-orange-300 dark:bg-orange-700/60"></div>
                                                <div className="w-4 h-4 rounded bg-orange-500 dark:bg-orange-600"></div>
                                                <div className="w-4 h-4 rounded bg-orange-700 dark:bg-orange-500"></div>
                                                Más reservas
                                            </div>
                                        </div>
                                    )
                                })()}
                            </CardContent>
                        </Card>

                        {/* Distribución por Tipo */}
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Origen de Reservas</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                {(!distTipo?.datos || distTipo.datos.length === 0) ? (
                                    <p className="text-muted-foreground">Sin datos suficientes</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distTipo.datos}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="cantidad"
                                                nameKey="tipo"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {distTipo.datos.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Distribución por Modalidad */}
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Reservas por Modalidad</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                {(!distModalidad?.datos || distModalidad.datos.length === 0) ? (
                                    <p className="text-muted-foreground">Sin datos suficientes</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distModalidad.datos}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="cantidad"
                                                nameKey="modalidad"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {distModalidad.datos.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Cancelaciones vs Efectivas */}
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Efectividad de Reservas</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px] flex flex-col items-center justify-center relative">
                                {(!cancelaciones) ? (
                                    <p className="text-muted-foreground">Sin datos suficientes</p>
                                ) : (
                                    <>
                                        <div className="absolute top-4 right-4 text-right">
                                            <p className="text-sm text-muted-foreground">Tasa Cancelación</p>
                                            <p className="text-2xl font-bold text-red-600">{cancelaciones.tasa_cancelacion}%</p>
                                        </div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Efectivas', value: cancelaciones.total_efectivas },
                                                        { name: 'Canceladas', value: cancelaciones.total_cancelaciones }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                >
                                                    <Cell fill="#ea580c" /> {/* Naranja para efectivas */}
                                                    <Cell fill="#7f1d1d" /> {/* Rojo oscuro para canceladas */}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Días más activos */}
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Días de la Semana Más Activos</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={diasSemana?.datos || []} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#ccc" opacity={0.5} />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis dataKey="dia" type="category" width={80} tickFormatter={(val) => val.substring(0, 3)} />
                                        <RechartsTooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [`${value} reservas`, 'Cantidad']}
                                        />
                                        <Bar dataKey="cantidad" name="Reservas" fill="#c2410c" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Comparativa entre Canchas */}
                        {selectedCancha === "todas" && comparativa && comparativa.datos.length > 1 && (
                            <Card className="shadow-md lg:col-span-2">
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <CardTitle>Comparativa de Rendimiento por Cancha</CardTitle>
                                        <div className="flex flex-wrap gap-2">
                                            {canchas.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        if (canchasComparar.includes(c.id!)) {
                                                            if (canchasComparar.length > 1) {
                                                                setCanchasComparar(prev => prev.filter(id => id !== c.id))
                                                            }
                                                        } else {
                                                            setCanchasComparar(prev => [...prev, c.id!])
                                                        }
                                                    }}
                                                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                                        canchasComparar.includes(c.id!) 
                                                            ? 'bg-primary text-primary-foreground border-primary' 
                                                            : 'bg-transparent text-muted-foreground border-muted-foreground hover:border-primary'
                                                    }`}
                                                >
                                                    {c.nombre}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={comparativa.datos.filter(d => canchasComparar.includes(d.cancha_id))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" opacity={0.5} />
                                            <XAxis dataKey="nombre" />
                                            <YAxis allowDecimals={false} />
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: number) => [`${value} reservas`, 'Reservas']}
                                            />
                                            <Bar dataKey="reservas" name="Reservas" fill="#ea580c" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
