"use client"

import { useState, useEffect } from "react"
import { Timer } from "lucide-react"
import dynamic from "next/dynamic"

interface CountdownTimerProps {
  fecha: string;
  horario: string;
}

function BaseCountdownTimer({ fecha, horario }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [timerStatus, setTimerStatus] = useState<'normal' | 'urgente' | 'partido'>('normal')

  useEffect(() => {
    const [year, month, day] = fecha.split("-").map(Number)
    const [hours, minutes] = horario.split(":").map(Number)
    const fechaPartido = new Date(year, month - 1, day, hours, minutes, 0)

    const updateTimer = () => {
      const ahora = new Date()
      const diferencia = fechaPartido.getTime() - ahora.getTime()

      if (diferencia <= 0) {
        setTimerStatus('partido')
        setTimeLeft("¡A jugar!")
        return
      }

      if (diferencia < 7200000) {
        setTimerStatus('urgente')
      } else {
        setTimerStatus('normal')
      }

      const d = Math.floor(diferencia / (1000 * 60 * 60 * 24))
      const h = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diferencia % (1000 * 60)) / 1000)

      let renderText = ""
      if (d > 0) renderText += `${d}d `
      renderText += `${h.toString().padStart(2, "0")}h `
      renderText += `${m.toString().padStart(2, "0")}m `
      renderText += `${s.toString().padStart(2, "0")}s`

      setTimeLeft(renderText)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [fecha, horario])

  const getStyles = () => {
    switch (timerStatus) {
      case 'partido':
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse"
      case 'urgente':
        return "bg-rose-500/10 text-rose-500 border-rose-500/20 font-extrabold animate-pulse"
      case 'normal':
      default:
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg border transition-colors duration-500 ${getStyles()}`}>
      <Timer className="w-4 h-4" />
      <span>{timerStatus === 'partido' ? timeLeft : `Faltan: ${timeLeft}`}</span>
    </div>
  )
}

export const CountdownTimer = dynamic(() => Promise.resolve(BaseCountdownTimer), {
  ssr: false
})