"use client"

import { useEffect, useState } from "react"
import { TorneoData, getTopJugadores, TopJugadorData, getVallasInvictas, VallaInvictaData } from "@/hooks/use-api"
import { Loader2, Goal, ShieldCheck, Trophy, Medal, ChevronDown, ChevronUp } from "lucide-react"

interface Props {
  torneo: TorneoData
}

export function EstadisticasTab({ torneo }: Props) {
  const [goleadores, setGoleadores] = useState<TopJugadorData[]>([])
  const [vallas, setVallas] = useState<VallaInvictaData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAllGoleadores, setShowAllGoleadores] = useState(false)
  const [showAllVallas, setShowAllVallas] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [g, v] = await Promise.all([
          getTopJugadores(torneo.id, "goleadores", 50).catch(() => []),
          getVallasInvictas(torneo.id, 50).catch(() => []),
        ])
        setGoleadores(g)
        // Ordenar de menor a mayor goles recibidos
        const vallasSorted = [...v].sort((a, b) => (a.goles_recibidos ?? 0) - (b.goles_recibidos ?? 0))
        setVallas(vallasSorted)
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [torneo.id])

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    )
  }



  return (
    <div className="space-y-8">
      {/* Tabla de Goleadores */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-muted/30 px-5 py-4 border-b flex items-center gap-2">
          <Goal className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Tabla de Goleadores</h3>
        </div>

        {goleadores.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No hay goles registrados aún. Las estadísticas se actualizan tras cada partido.
          </div>
        ) : (
          <div className="pb-4">
            {goleadores.length > 0 && torneo.estado === "Finalizado" && (
              <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between mx-4 mt-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl shrink-0">🥇</div>
                  <div className="min-w-0">
                    <p className="text-xs text-primary font-bold uppercase tracking-widest">Máximo Goleador</p>
                    <p className="text-lg sm:text-xl font-black text-foreground truncate">{goleadores[0].usuario_nombre} {goleadores[0].usuario_apellido}</p>
                    <p className="text-sm text-muted-foreground truncate">{goleadores[0].equipo_nombre}</p>
                  </div>
                </div>
                <div className="text-center shrink-0 ml-4">
                  <p className="text-3xl sm:text-4xl font-black text-primary">{goleadores[0].valor}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Goles</p>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-[11px] uppercase font-semibold text-muted-foreground border-y tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">Pos</th>
                    <th className="px-4 py-3">Jugador</th>
                    <th className="px-4 py-3">Equipo</th>
                    <th className="px-4 py-3 text-center">⚽ Goles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(showAllGoleadores ? goleadores : goleadores.slice(0, 10)).map((jugador, i) => {
                    return (
                      <tr
                        key={`${jugador.usuario_id}-${jugador.equipo_id}`}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-center">
                          <span className="text-muted-foreground font-medium text-xs">{i + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">
                            {jugador.usuario_nombre} {jugador.usuario_apellido}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">
                            {jugador.equipo_nombre}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-base text-foreground">{jugador.valor}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {goleadores.length > 10 && (
              <button
                onClick={() => setShowAllGoleadores(!showAllGoleadores)}
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors border-t border-border"
              >
                {showAllGoleadores ? (
                  <>Ver menos <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Ver más ({goleadores.length - 10}) <ChevronDown className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabla de Valla Menos Vencida */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-muted/30 px-5 py-4 border-b flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Valla Menos Vencida</h3>
        </div>

        {vallas.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Las estadísticas de valla menos vencida estarán disponibles una vez que haya partidos finalizados.
          </div>
        ) : (
          <div className="pb-4">
            {vallas.length > 0 && torneo.estado === "Finalizado" && (
              <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between mx-4 mt-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl shrink-0">🧤</div>
                  <div className="min-w-0">
                    <p className="text-xs text-primary font-bold uppercase tracking-widest">Valla Menos Vencida</p>
                    <p className="text-lg sm:text-xl font-black text-foreground truncate">{vallas[0].equipo_nombre}</p>
                  </div>
                </div>
                <div className="text-center shrink-0 ml-4">
                  <p className="text-3xl sm:text-4xl font-black text-primary">{vallas[0].goles_recibidos}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">En Contra</p>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-[11px] uppercase font-semibold text-muted-foreground border-y tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">Pos</th>
                    <th className="px-4 py-3">Equipo</th>
                    <th className="px-4 py-3 text-center">🧤 Goles Recibidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(showAllVallas ? vallas : vallas.slice(0, 10)).map((v, i) => {
                    return (
                      <tr key={v.equipo_id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-center text-muted-foreground font-medium text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{v.equipo_nombre}</td>
                        <td className="px-4 py-3 text-center font-bold text-foreground">{v.goles_recibidos}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {vallas.length > 10 && (
              <button
                onClick={() => setShowAllVallas(!showAllVallas)}
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors border-t border-border"
              >
                {showAllVallas ? (
                  <>Ver menos <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Ver más ({vallas.length - 10}) <ChevronDown className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
