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
  const [isMatchTime, setIsMatchTime] = useState<boolean>(false)

  useEffect(() => {
    const [year, month, day] = fecha.split("-").map(Number)
    const [hours, minutes] = horario.split(":").map(Number)
    
    const fechaPartido = new Date(year, month - 1, day, hours, minutes, 0)

    const updateTimer = () => {
      const ahora = new Date()
      const diferencia = fechaPartido.getTime() - ahora.getTime()

      if (diferencia <= 0) {
        setIsMatchTime(true)
        setTimeLeft("¡A jugar!")
        return
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

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg border ${
      isMatchTime 
        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse" 
        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
    }`}>
      <Timer className="w-4 h-4" /> 
      <span>{isMatchTime ? timeLeft : `Faltan: ${timeLeft}`}</span>
    </div>
  )
}

export const CountdownTimer = dynamic(() => Promise.resolve(BaseCountdownTimer), {
  ssr: false
})