"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  ArrowRight,
  Star,
  Clock,
  CheckCircle2
} from "lucide-react"
import { useAuthContext } from "@/components/auth-provider"

export default function RootPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthContext()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !isLoading && isAuthenticated) {
      router.push("/home")
    }
  }, [isClient, isAuthenticated, isLoading, router])

  // No mostramos nada hasta saber el estado de auth para evitar parpadeos
  if (!isClient || isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-lg text-foreground">TeamUp</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cómo funciona
              </Link>
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Funciones
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Empezar</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-6">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium text-primary">+2,500 partidos armados este mes</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight text-balance">
              Juntate a jugar,{" "}
              <span className="text-primary">sin vueltas</span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed text-pretty">
              Armá partidos de fútbol con amigos o encontrá gente para completar tu equipo. 
              Simple, rápido y sin grupos de WhatsApp interminables.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-base px-8 font-semibold" asChild>
                <Link href="/register">
                  Crear cuenta gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base font-semibold" asChild>
                <Link href="/login">
                  Ingresar a mi cuenta
                </Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-secondary border-2 border-background flex items-center justify-center"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {String.fromCharCode(64 + i)}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  +8,000 jugadores activos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
              Armá tu partido en 3 pasos
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Sin complicaciones. Sin apps de más. Todo lo que necesitás en un solo lugar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Calendar,
                title: "Elegí una cancha",
                description: "Navegá por las canchas disponibles y reservá el horario que mejor te quede."
              },
              {
                step: "02",
                icon: Users,
                title: "Creá el partido",
                description: "Hacé el partido abierto para todos o cerrado solo para tus invitados."
              },
              {
                step: "03",
                icon: MapPin,
                title: "A jugar",
                description: "Los jugadores se anotan, y cuando está completo, solo queda ir a la cancha."
              }
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="p-8 rounded-3xl bg-card shadow-sm border border-border hover:border-primary/50 transition-all duration-300 h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-5xl font-bold text-muted/30">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
                Todo lo que necesitás para organizar y jugar
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Diseñado para jugadores y administradores. Resolvé todo desde una sola plataforma.
              </p>

              <div className="mt-10 space-y-6">
                {[
                  {
                    icon: Users,
                    title: "Gestión de jugadores y cupos",
                    description: "Controlá quién se anota, dejá lugares libres y evitá las bajas a último momento."
                  },
                  {
                    icon: MapPin,
                    title: "Directorio de canchas",
                    description: "Encontrá complejos deportivos, filtrá por superficie e iluminación."
                  },
                  {
                    icon: CheckCircle2,
                    title: "Historial y estadísticas",
                    description: "Revisá tus partidos jugados y organizados desde tu perfil."
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{feature.title}</h3>
                      <p className="text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock phone/app preview */}
            <div className="relative">
              <div className="aspect-[4/5] bg-secondary rounded-[2.5rem] p-6 shadow-2xl shadow-primary/10 border border-border/50">
                <div className="bg-background rounded-3xl h-full p-4 overflow-hidden border border-border shadow-inner">
                  <div className="flex items-center justify-between mb-6 pt-2 px-2">
                    <span className="font-bold text-lg text-foreground">Canchas Disponibles</span>
                  </div>
                  
                  {/* Mock match cards */}
                  <div className="space-y-4 px-2">
                    {[
                      { name: "La Redonda Fútbol", time: "18:00 - 23:00", place: "Palermo", price: "$15.000" },
                      { name: "Complejo El Gol", time: "10:00 - 22:00", place: "Belgrano", price: "$12.000" },
                      { name: "Sport Center", time: "09:00 - 00:00", place: "Caballito", price: "$18.000" },
                    ].map((cancha, i) => (
                      <div key={i} className="p-4 bg-card rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-base font-semibold text-foreground">{cancha.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                          <MapPin className="w-3.5 h-3.5" />
                          {cancha.place}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <span className="text-sm font-medium text-foreground">{cancha.time}</span>
                          <span className="text-sm font-bold text-primary">{cancha.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-4 -left-4 w-40 h-40 bg-accent/20 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-foreground rounded-[2.5rem] p-10 sm:p-16 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-background text-balance mb-6">
                ¿Listo para tu próximo partido?
              </h2>
              <p className="text-background/80 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
                Unite a la comunidad. Organizá, jugá y disfrutá del fútbol sin preocuparte por la logística.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="text-base px-8 h-14 rounded-xl font-bold" asChild>
                  <Link href="/register">
                    Registrarme gratis
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8 h-14 rounded-xl font-bold bg-transparent text-background border-background/20 hover:bg-background/10 hover:text-background" asChild>
                  <Link href="/login">
                    Ya tengo cuenta
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/30 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/30 rounded-full blur-[80px] pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-foreground">TeamUp</span>
            </div>
            
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} TeamUp. Hecho con pasión por el fútbol.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
