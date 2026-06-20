"use client"

import { useEffect, useState } from "react"
import { TorneoData, getTablaPosiciones, TablaPosicionData } from "@/hooks/use-api"
import { Loader2, Trophy, TrendingUp } from "lucide-react"

interface Props {
  torneo: TorneoData
}

export function TablaTab({ torneo }: Props) {
  const [tabla, setTabla] = useState<TablaPosicionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTablaPosiciones(torneo.id)
        setTabla(data)
      } catch {
        setTabla([])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [torneo.id])

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  if (tabla.length === 0) {
    return (
      <div className="py-16 text-center border rounded-xl bg-card">
        <TrendingUp className="h-12 w-12 text-muted-foreground opacity-40 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">Tabla no disponible</h3>
        <p className="text-muted-foreground text-sm">
          La tabla de posiciones estará disponible una vez que el fixture sea generado.
        </p>
      </div>
    )
  }

  // Agrupar por grupo
  const porGrupo = tabla.reduce((acc, fila) => {
    const g = fila.grupo || "GENERAL"
    if (!acc[g]) acc[g] = []
    acc[g].push(fila)
    return acc
  }, {} as Record<string, typeof tabla>)

  const grupos = Object.keys(porGrupo).sort()

  return (
    <div className="space-y-8">
      {grupos.map((g) => (
        <div key={g} className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/30 px-5 py-4 border-b flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">
              {g === "GENERAL" ? "Tabla General de Posiciones" : `Grupo ${g}`}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-[11px] uppercase font-semibold text-muted-foreground border-b tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">Pos</th>
                  <th className="px-4 py-3">Equipo</th>
                  <th className="px-4 py-3 text-center">Pts</th>
                  <th className="px-4 py-3 text-center">PJ</th>
                  <th className="px-4 py-3 text-center">PG</th>
                  <th className="px-4 py-3 text-center">PE</th>
                  <th className="px-4 py-3 text-center">PP</th>
                  <th className="px-4 py-3 text-center">GF</th>
                  <th className="px-4 py-3 text-center">GC</th>
                  <th className="px-4 py-3 text-center">DG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {porGrupo[g].map((fila, i) => {
                  const clasifica = i < 2
                  const maxPts = porGrupo[g][0]?.pts || 1
                  const progressPct = maxPts > 0 ? (fila.pts / maxPts) * 100 : 0

                  return (
                    <tr
                      key={fila.equipo_id}
                      className={`transition-colors relative group ${
                        clasifica
                          ? "bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-muted/40 border-l-4 border-l-transparent"
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <span className={clasifica ? "text-primary font-bold text-sm" : "text-muted-foreground font-medium text-xs"}>{i + 1}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`font-semibold ${clasifica ? "text-primary text-base" : "text-foreground"}`}>
                            {fila.equipo_nombre}
                          </span>
                          {/* Barra de progreso de puntos */}
                          <div className="h-1 w-24 bg-muted overflow-hidden rounded-full mt-1">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${clasifica ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/60'}`} 
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-base ${clasifica ? 'text-primary' : 'text-foreground'}`}>{fila.pts}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{fila.pj}</td>
                      <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">{fila.pg}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{fila.pe}</td>
                      <td className="px-4 py-3 text-center text-red-500 dark:text-red-400 font-medium">{fila.pp}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{fila.gf}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{fila.gc}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            fila.dg > 0
                              ? "text-green-600 dark:text-green-400 font-semibold"
                              : fila.dg < 0
                              ? "text-red-500 dark:text-red-400 font-semibold"
                              : "text-muted-foreground"
                          }
                        >
                          {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <div className="px-5 py-3 bg-muted/20 border-t flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
            <span><strong>Pts</strong> = Puntos</span>
            <span><strong>PJ</strong> = Partidos jugados</span>
            <span><strong>PG</strong> = Ganados</span>
            <span><strong>PE</strong> = Empatados</span>
            <span><strong>PP</strong> = Perdidos</span>
            <span><strong>GF/GC</strong> = Goles a favor/en contra</span>
            <span><strong>DG</strong> = Diferencia de goles</span>
          </div>
        </div>
      ))}
    </div>
  )
}
