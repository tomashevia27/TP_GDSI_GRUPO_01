"use client"

import { useEffect, useState } from "react"
import { TorneoData, getTablaPosiciones, getTopJugadores, TablaPosicionData, TopJugadorData } from "@/hooks/use-api"
import { Loader2, Trophy } from "lucide-react"

interface Props {
  torneo: TorneoData
}

export function EstadisticasTab({ torneo }: Props) {
  const [tabla, setTabla] = useState<TablaPosicionData[]>([])
  const [goleadores, setGoleadores] = useState<TopJugadorData[]>([])
  const [amarillas, setAmarillas] = useState<TopJugadorData[]>([])
  const [rojas, setRojas] = useState<TopJugadorData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [t, g, a, r] = await Promise.all([
          getTablaPosiciones(torneo.id).catch(() => []),
          getTopJugadores(torneo.id, "goleadores").catch(() => []),
          getTopJugadores(torneo.id, "amarillas").catch(() => []),
          getTopJugadores(torneo.id, "rojas").catch(() => [])
        ])
        setTabla(t)
        setGoleadores(g)
        setAmarillas(a)
        setRojas(r)
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [torneo.id])

  if (isLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  if (tabla.length === 0 && goleadores.length === 0 && amarillas.length === 0 && rojas.length === 0) {
    return (
      <div className="py-12 text-center border rounded-xl bg-card">
        <Trophy className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">No hay datos aún</h3>
        <p className="text-muted-foreground">Las estadísticas estarán disponibles cuando se jueguen partidos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Tabla de Posiciones */}
      {tabla.length > 0 && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/30 p-4 border-b">
            <h3 className="font-bold text-lg">Tabla de Posiciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Pos</th>
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
                {tabla.map((fila, i) => (
                  <tr key={fila.equipo_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-bold">{fila.equipo_nombre}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{fila.pts}</td>
                    <td className="px-4 py-3 text-center">{fila.pj}</td>
                    <td className="px-4 py-3 text-center">{fila.pg}</td>
                    <td className="px-4 py-3 text-center">{fila.pe}</td>
                    <td className="px-4 py-3 text-center">{fila.pp}</td>
                    <td className="px-4 py-3 text-center">{fila.gf}</td>
                    <td className="px-4 py-3 text-center">{fila.gc}</td>
                    <td className="px-4 py-3 text-center">{fila.dg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tops */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TopList titulo="Goleadores" data={goleadores} unit="goles" />
        <TopList titulo="Tarjetas Amarillas" data={amarillas} unit="amarillas" />
        <TopList titulo="Tarjetas Rojas" data={rojas} unit="rojas" />
      </div>
    </div>
  )
}

function TopList({ titulo, data, unit }: { titulo: string, data: TopJugadorData[], unit: string }) {
  if (data.length === 0) return null
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="bg-muted/30 p-4 border-b">
        <h3 className="font-bold">{titulo}</h3>
      </div>
      <ul className="divide-y divide-border">
        {data.map((jugador, i) => (
          <li key={jugador.usuario_id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-muted-foreground w-4">{i + 1}</span>
              <div>
                <p className="font-semibold text-sm">{jugador.usuario_nombre} {jugador.usuario_apellido}</p>
                <p className="text-xs text-muted-foreground">{jugador.equipo_nombre}</p>
              </div>
            </div>
            <span className="font-bold bg-muted px-2 py-1 rounded text-xs">{jugador.valor} {unit}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
