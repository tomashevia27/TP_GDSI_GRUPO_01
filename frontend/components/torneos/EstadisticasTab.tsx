"use client"

import { useEffect, useState } from "react"
import { TorneoData, getTopJugadores, TopJugadorData, getVallasInvictas, VallaInvictaData } from "@/hooks/use-api"
import { Loader2, Goal, ShieldCheck } from "lucide-react"

interface Props {
  torneo: TorneoData
}

export function EstadisticasTab({ torneo }: Props) {
  const [goleadores, setGoleadores] = useState<TopJugadorData[]>([])
  const [vallas, setVallas] = useState<VallaInvictaData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [g, v] = await Promise.all([
          getTopJugadores(torneo.id, "goleadores", 50).catch(() => []),
          getVallasInvictas(torneo.id, 50).catch(() => []),
        ])
        setGoleadores(g)
        // Ordenar de menor a mayor goles recibidos
        const vallasSorted = [...v].sort((a, b) => (a.partidos_invicto ?? 0) - (b.partidos_invicto ?? 0))
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-[11px] uppercase font-semibold text-muted-foreground border-b tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">Pos</th>
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3">Equipo</th>
                  <th className="px-4 py-3 text-center">⚽ Goles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {goleadores.map((jugador, i) => (
                  <tr
                    key={`${jugador.usuario_id}-${jugador.equipo_id}`}
                    className={`transition-colors ${
                      i === 0 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      {i === 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          1
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium text-xs">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-semibold ${i === 0 ? "text-primary" : "text-foreground"}`}>
                        {jugador.usuario_nombre} {jugador.usuario_apellido}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {jugador.equipo_nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-lg text-primary">{jugador.valor}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-[11px] uppercase font-semibold text-muted-foreground border-b tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">Pos</th>
                  <th className="px-4 py-3">Equipo</th>
                  <th className="px-4 py-3 text-center">🧤 Goles Recibidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vallas.map((v, i) => (
                  <tr key={v.equipo_id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-center text-muted-foreground font-medium text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{v.equipo_nombre}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{v.partidos_invicto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
