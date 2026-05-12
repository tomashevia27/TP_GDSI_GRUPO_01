"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavbarProps {
  onLogout: () => void
}

export function Navbar({ onLogout }: NavbarProps) {
  const pathname = usePathname()

  return (
    <nav className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link 
            href="/home" 
            className="text-2xl font-bold text-primary tracking-tight"
          >
            TeamUp ⚽
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/home"
              className={cn(
                "font-semibold transition-colors hover:text-primary",
                pathname === "/home" 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              Inicio
            </Link>
            <Link
              href="/profile"
              className={cn(
                "font-semibold transition-colors hover:text-primary",
                pathname === "/profile" || pathname === "/profile/edit"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Mi Perfil
            </Link>
            <button
              className="relative text-muted-foreground hover:text-primary transition-colors"
              title="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="font-bold rounded-full px-4 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
