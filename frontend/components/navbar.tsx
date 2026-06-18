"use client"

import { Bell, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuthContext } from "@/components/auth-provider"
import { NotificationsPanel } from "@/components/notifications-panel"

interface NavbarProps {
  onLogout: () => void
}

export function Navbar({ onLogout }: NavbarProps) {
  const pathname = usePathname()
  const { role } = useAuthContext()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/home" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src="/logo-partidoya.jpg"
                alt="PartidoYa Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-semibold text-lg text-foreground">PartidoYa</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/home"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname === "/home"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Inicio
            </Link>
            {role !== "admin" && (
              <Link
                href="/partidos/disponibles"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  pathname?.startsWith("/partidos")
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Partidos
              </Link>
            )}
            {role === "admin" && (
              <Link
                href="/agenda"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  pathname?.startsWith("/agenda")
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Agenda
              </Link>
            )}
            {role === "admin" && (
              <Link
                href="/estadisticas"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  pathname?.startsWith("/estadisticas")
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Estadísticas
              </Link>
            )}
            <Link
              href="/canchas"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname?.startsWith("/canchas")
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Canchas
            </Link>
            <Link
              href="/torneos"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname?.startsWith("/torneos")
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Torneos
            </Link>
            <Link
              href="/profile"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname === "/profile" || pathname === "/profile/edit"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Mi Perfil
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsPanel />
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
