"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  XCircle,
  UserPlus,
  UserMinus,
  CalendarX,
  CalendarCog,
  Building2,
  ArrowRightLeft,
  BellOff,
} from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificacionData } from "@/hooks/use-api"

function getTimeAgo(fechaStr: string): string {
  const fecha = new Date(fechaStr)
  const ahora = new Date()
  const diffMs = ahora.getTime() - fecha.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMin < 1) return "Ahora"
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHrs < 24) return `Hace ${diffHrs}h`
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
}

function getNotificationIcon(tipo: string) {
  const iconProps = { className: "h-4 w-4 shrink-0" }

  switch (tipo) {
    case "partido_cancelado":
      return <CalendarX {...iconProps} className="h-4 w-4 shrink-0 text-red-500" />
    case "partido_editado":
      return <CalendarCog {...iconProps} className="h-4 w-4 shrink-0 text-amber-500" />
    case "jugador_inscripto":
      return <UserPlus {...iconProps} className="h-4 w-4 shrink-0 text-emerald-500" />
    case "jugador_baja":
      return <UserMinus {...iconProps} className="h-4 w-4 shrink-0 text-orange-500" />
    case "reserva_cancha":
      return <Building2 {...iconProps} className="h-4 w-4 shrink-0 text-blue-500" />
    case "cancelacion_cancha":
      return <XCircle {...iconProps} className="h-4 w-4 shrink-0 text-red-500" />
    case "cambio_cancha_perdida":
      return <ArrowRightLeft {...iconProps} className="h-4 w-4 shrink-0 text-orange-500" />
    case "cambio_cancha_ganada":
      return <ArrowRightLeft {...iconProps} className="h-4 w-4 shrink-0 text-emerald-500" />
    default:
      return <Bell {...iconProps} className="h-4 w-4 shrink-0 text-muted-foreground" />
  }
}

interface NotificationItemProps {
  notificacion: NotificacionData
  onRead: (id: number) => void
  onDelete: (id: number) => void
  onClick: (notificacion: NotificacionData) => void
}

function NotificationItem({
  notificacion,
  onRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  return (
    <div
      className={`
        group relative flex items-start gap-3 px-4 py-3 cursor-pointer
        transition-all duration-200 hover:bg-muted/50
        ${!notificacion.leida ? "bg-primary/[0.04]" : ""}
      `}
      onClick={() => onClick(notificacion)}
    >
      {/* Indicador de no leída */}
      {!notificacion.leida && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
      )}

      {/* Ícono */}
      <div className="mt-0.5">{getNotificationIcon(notificacion.tipo)}</div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={`text-sm leading-snug ${!notificacion.leida ? "font-medium text-foreground" : "text-muted-foreground"}`}>
          {notificacion.mensaje}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {getTimeAgo(notificacion.fecha_creacion)}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notificacion.leida && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRead(notificacion.id)
            }}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Marcar como leída"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notificacion.id)
          }}
          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  const {
    notificaciones,
    unreadCount,
    isLoading,
    fetchNotificaciones,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  } = useNotifications()

  // Cargar notificaciones al abrir
  useEffect(() => {
    if (isOpen) {
      fetchNotificaciones()
    }
  }, [isOpen, fetchNotificaciones])

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Cerrar con Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  function handleNotificationClick(notificacion: NotificacionData) {
    if (!notificacion.leida) {
      markAsRead(notificacion.id)
    }
    if (notificacion.partido_id) {
      setIsOpen(false)
      router.push(`/partidos/${notificacion.partido_id}`)
    }
  }

  return (
    <div className="relative">
      {/* Botón campanita */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-muted-foreground hover:text-foreground transition-colors p-2"
        title="Notificaciones"
        id="notifications-bell"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <>
          {/* Overlay transparente para mobile */}
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsOpen(false)} />

          <div
            ref={panelRef}
            className={`
              absolute right-0 top-full mt-2 z-50
              w-[360px] max-h-[480px]
              bg-popover border border-border rounded-xl shadow-xl
              flex flex-col
              animate-in fade-in-0 slide-in-from-top-2 duration-200
              overflow-hidden
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Leer Todas</span>
                  </button>
                )}
                {notificaciones.length > 0 && (
                  <button
                    onClick={deleteAll}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/10"
                    title="Eliminar todas"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted ml-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <BellOff className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No tenés notificaciones
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Te avisaremos cuando pase algo importante
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notificaciones.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notificacion={notif}
                      onRead={markAsRead}
                      onDelete={deleteNotification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer con conteo */}
            {notificaciones.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  {unreadCount > 0
                    ? `${unreadCount} sin leer`
                    : "Todas leídas"}
                  {" · "}
                  {notificaciones.length} {notificaciones.length === 1 ? "notificación" : "notificaciones"}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
