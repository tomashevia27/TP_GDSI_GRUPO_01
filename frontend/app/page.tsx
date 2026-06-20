"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
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
  CheckCircle2,
  Trophy,
  Zap,
  Shield,
  BarChart3,
  Bell
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

  function FootballIcon({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <circle cx="50" cy="50" r="48" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <path d="M50 2 L50 20 M50 80 L50 98 M2 50 L20 50 M80 50 L98 50" stroke="white" strokeWidth="2" opacity="0.3" />
        <polygon points="50,15 65,35 58,55 42,55 35,35" fill="white" opacity="0.2" />
        <circle cx="50" cy="50" r="10" fill="white" opacity="0.15" />
      </svg>
    )
  }

  // Animated Goal Net Pattern
  function GoalNetPattern() {
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="goalnet" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 0 L40 40 M40 0 L0 40" stroke="currentColor" strokeWidth="1" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#goalnet)" className="text-primary" />
      </svg>
    )
  }

  // Floating Football Element
  function FloatingBall({ className, delay = "0" }: { className?: string; delay?: string }) {
    return (
      <div className={`absolute ${className}`} style={{ animationDelay: delay }}>
        <FootballIcon className="w-full h-full text-primary/20" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
                <Image
                  src="/logo-partidoya.jpg"
                  alt="PartidoYa Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-xl text-foreground">PartidoYa</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#jugadores" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                Jugadores
              </Link>
              <Link href="#duenos" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                Dueños de Canchas
              </Link>
              <Link href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                Funciones
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="font-semibold" asChild>
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button size="sm" className="font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" asChild>
                <Link href="/register">Empezar</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 field-pattern" />
        <GoalNetPattern />

        {/* Floating Footballs */}
        <FloatingBall className="w-16 h-16 top-24 right-[15%] animate-float hidden lg:block" delay="0s" />
        <FloatingBall className="w-12 h-12 top-40 right-[8%] animate-float-reverse hidden lg:block" delay="1s" />
        <FloatingBall className="w-20 h-20 bottom-20 right-[20%] animate-float-slow hidden lg:block" delay="2s" />
        <FloatingBall className="w-10 h-10 top-32 left-[5%] animate-float hidden md:block" delay="0.5s" />
        <FloatingBall className="w-14 h-14 bottom-32 left-[10%] animate-float-reverse hidden md:block" delay="1.5s" />

        {/* Gradient Orbs */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] -z-10" />

        {/* CONTENEDOR PRINCIPAL: Cambiado a GRID para dividir en dos columnas en pantallas grandes */}
        <div className="max-w-6xl mx-auto relative grid lg:grid-cols-2 gap-12 items-center">

          {/* COLUMNA IZQUIERDA: Todo tu texto y botones actuales */}
          <div className="max-w-3xl">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8 backdrop-blur-sm animate-slide-up">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="text-sm font-semibold text-primary">+2,500 partidos armados este mes</span>
              <Trophy className="w-4 h-4 text-accent" />
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] tracking-tight text-balance animate-slide-up animation-delay-100">
              Juntate a jugar,{" "}
              <span className="relative">
                <span className="text-primary">sin vueltas</span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0 6 Q50 0, 100 6 T200 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-8 text-xl sm:text-2xl text-muted-foreground max-w-xl leading-relaxed text-pretty animate-slide-up animation-delay-200">
              Armá partidos de fútbol con amigos o encontrá gente para completar tu equipo.
              <span className="text-foreground font-semibold"> Simple y rápido.</span>
            </p>

            <div className="mt-12 flex flex-col sm:flex-row gap-4 animate-slide-up animation-delay-300">
              <Button size="lg" className="text-lg px-8 h-14 font-bold shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all duration-300 rounded-xl" asChild>
                <Link href="/register">
                  Crear cuenta gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg font-bold h-14 rounded-xl hover:bg-secondary/80 transition-all duration-300" asChild>
                <Link href="/login">
                  Ingresar a mi cuenta
                </Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-16 flex flex-wrap items-center gap-8 animate-slide-up animation-delay-400">
              <div className="flex -space-x-4">
                {[
                  "bg-primary",
                  "bg-accent",
                  "bg-primary/80",
                  "bg-accent/80",
                  "bg-primary/60"
                ].map((bg, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-full ${bg} border-3 border-background flex items-center justify-center shadow-lg transform hover:scale-110 hover:z-10 transition-all duration-300`}
                  >
                    <span className="text-sm font-bold text-white">
                      {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-l border-border pl-8">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent drop-shadow-sm" />
                  ))}
                </div>
                <p className="text-base text-muted-foreground font-medium">
                  <span className="text-foreground font-bold">+8,000</span> jugadores activos
                </p>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Suavizado perfecto sin mover la posición de los personajes */}
          <div
            className="relative w-full h-[350px] sm:h-[450px] lg:h-[550px] mt-8 lg:mt-0 flex items-center justify-center animate-slide-up animation-delay-200"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0) 100%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0) 100%)'
            }}
          >
            <Image
              src="/ver_centro1.png"
              alt="Deportes PartidoYa"
              fill
              priority
              className="object-contain object-center drop-shadow-[0_20px_50px_rgba(var(--primary),0.15)]"
            />
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-8 px-4 sm:px-6 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 100px, rgba(255,255,255,0.1) 100px, rgba(255,255,255,0.1) 200px)`
          }} />
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "8K+", label: "Jugadores", icon: Users },
              { number: "2.5K", label: "Partidos/mes", icon: Trophy },
              { number: "150+", label: "Canchas", icon: MapPin },
              { number: "4.9", label: "Calificación", icon: Star },
            ].map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className="w-5 h-5 opacity-80 group-hover:scale-110 transition-transform" />
                  <span className="text-3xl sm:text-4xl font-black">{stat.number}</span>
                </div>
                <p className="text-sm font-medium opacity-80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-4 sm:px-6 bg-secondary/50 relative overflow-hidden">
        <GoalNetPattern />
        <div className="max-w-6xl mx-auto space-y-32 relative">

          {/* Jugadores */}
          <div id="jugadores" className="scroll-mt-24">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary tracking-wider uppercase">Para Jugadores</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-foreground text-balance">
                Armá tu partido en 3 pasos
              </h2>
              <p className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto">
                Sin complicaciones. Sin apps de más. Todo lo que necesitás en un solo lugar.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
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
                  description: "Hacé el partido abierto para todos o cerrado solo para tu equipo."
                },
                {
                  step: "03",
                  icon: MapPin,
                  title: "A jugar",
                  description: "Los jugadores se anotan, y cuando está completo, solo queda ir a la cancha."
                }
              ].map((item, index) => (
                <div key={item.step} className="relative group">
                  {/* Connection line */}
                  {index < 2 && (
                    <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent z-0" />
                  )}

                  <div className="relative p-8 rounded-3xl bg-card shadow-lg shadow-primary/5 border border-border hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 h-full group-hover:-translate-y-2">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                        <item.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <span className="text-6xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">{item.step}</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dueños */}
          <div id="duenos" className="scroll-mt-24">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-4">
                <Shield className="w-4 h-4 text-accent" />
                <span className="text-sm font-bold text-accent tracking-wider uppercase">Para Dueños de Canchas</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-foreground text-balance">
                Gestioná tu complejo fácilmente
              </h2>
              <p className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto">
                Publicá tus canchas y multiplicá tus reservas sin esfuerzo.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {[
                {
                  step: "01",
                  icon: MapPin,
                  title: "Registrá tu complejo",
                  description: "Creá tu cuenta de dueño e indicá la ubicación de tu predio."
                },
                {
                  step: "02",
                  icon: CheckCircle2,
                  title: "Publicá tus canchas",
                  description: "Agregá tus canchas, fotos, detalles y definí los precios por turno."
                },
                {
                  step: "03",
                  icon: Users,
                  title: "Recibí reservas",
                  description: "Los jugadores reservan online y vos administras todo desde tu panel."
                },
                {
                  step: "04",
                  icon: BarChart3,
                  title: "Analizá métricas",
                  description: "Visualizá mapas de calor de ocupación para optimizar tus ingresos."
                }
              ].map((item, index) => (
                <div key={item.step} className="relative group">
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-accent/30 to-transparent z-0" />
                  )}

                  <div className="relative p-8 rounded-3xl bg-card shadow-lg shadow-accent/5 border border-border hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10 transition-all duration-500 h-full group-hover:-translate-y-2">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:scale-110 transition-all duration-300">
                        <item.icon className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors" />
                      </div>
                      <span className="text-6xl font-black text-accent/10 group-hover:text-accent/20 transition-colors">{item.step}</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] -z-10" />

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-stretch">
            <div className="flex flex-col">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6 w-fit">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">Funcionalidades</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black text-foreground text-balance leading-tight">
                Todo lo que necesitás para{" "}
                <span className="text-primary">organizar, jugar</span> y administrar
              </h2>
              <p className="mt-6 text-muted-foreground text-lg">
                Diseñado para jugadores y dueños de canchas. Resolvé todo desde una sola plataforma.
              </p>

              <div className="mt-12 flex flex-col justify-between flex-1 gap-6">
                {[
                  {
                    icon: Users,
                    title: "Gestión de jugadores y cupos",
                    description: "Controlá quién se anota, dejá lugares libres y evitá las bajas a último momento.",
                    color: "primary"
                  },
                  {
                    icon: Trophy,
                    title: "Torneos y Competiciones",
                    description: "Armá llaves de eliminación, fase de grupos y celebrá con el campeón.",
                    color: "accent"
                  },
                  {
                    icon: MapPin,
                    title: "Directorio de canchas",
                    description: "Encontrá complejos deportivos, filtrá por superficie e iluminación.",
                    color: "primary"
                  },
                  {
                    icon: BarChart3,
                    title: "Métricas de rendimiento",
                    description: "Revisá tus estadísticas como jugador y mapas de calor si sos dueño.",
                    color: "accent"
                  },
                  {
                    icon: Calendar,
                    title: "Panel integral de administración",
                    description: "Gestioná tu predio, agregá tus canchas y definí precios por turno fácilmente.",
                    color: "primary"
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-5 p-4 rounded-2xl hover:bg-secondary/50 transition-all duration-300 group cursor-default">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${feature.color === 'primary' ? 'bg-primary/10 group-hover:bg-primary' : 'bg-accent/10 group-hover:bg-accent'} flex items-center justify-center transition-all duration-300`}>
                      <feature.icon className={`w-7 h-7 ${feature.color === 'primary' ? 'text-primary group-hover:text-primary-foreground' : 'text-accent group-hover:text-accent-foreground'} transition-colors`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{feature.title}</h3>
                      <p className="text-muted-foreground mt-1 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Stacked UI Mockups */}
            {/* Right Column: Stacked UI Mockups */}
            <div className="relative flex flex-col gap-6 lg:gap-8 h-full justify-between">
              
              {/* Mockup 1: Torneos */}
              <div className="flex-1 bg-gradient-to-br from-accent/5 to-transparent rounded-[2rem] p-4 sm:p-6 shadow-2xl shadow-accent/5 border border-accent/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500 flex flex-col">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/20 rounded-full blur-[50px] group-hover:bg-accent/30 transition-all duration-500" />
                <div className="flex-1 bg-background/80 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-border shadow-inner relative z-10 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-bold text-lg text-foreground">Torneos Destacados</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-5 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-foreground">Copa de Verano</span>
                        <span className="text-xs font-black uppercase bg-accent text-accent-foreground px-2.5 py-1 rounded-full shadow-sm">Abierto</span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
                        <MapPin className="w-4 h-4" /> Palermo • Fútbol 5
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-accent/10">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-primary border-2 border-background flex items-center justify-center"><span className="text-[10px] text-white font-bold">A</span></div>
                          <div className="w-8 h-8 rounded-full bg-accent border-2 border-background flex items-center justify-center"><span className="text-[10px] text-white font-bold">B</span></div>
                          <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-background flex items-center justify-center"><span className="text-[10px] text-white font-bold">+8</span></div>
                        </div>
                        <span className="text-sm font-bold text-accent">¡Últimos 2 cupos!</span>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-card/50 rounded-xl border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-foreground">Torneo Relámpago</span>
                        <span className="text-xs font-black uppercase bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full shadow-sm">En Curso</span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
                        <MapPin className="w-4 h-4" /> Caballito • Fútbol 7
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <span className="text-sm font-medium text-foreground">Semifinales</span>
                        <span className="text-sm font-bold text-muted-foreground">16 Equipos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mockup 2: Canchas */}
              <div className="flex-1 bg-gradient-to-br from-primary/5 to-transparent rounded-[2rem] p-4 sm:p-6 shadow-2xl shadow-primary/5 border border-primary/10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500 flex flex-col">
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-[50px] group-hover:bg-primary/30 transition-all duration-500" />
                <div className="flex-1 bg-background/80 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-border shadow-inner relative z-10 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-bold text-lg text-foreground">Turnos Libres Hoy</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { name: "La Redonda Fútbol", time: "18:00 - 19:00", place: "Palermo", price: "$15.000", spots: 3 },
                      { name: "Sport Center", time: "20:00 - 21:00", place: "Caballito", price: "$18.000", spots: 2 },
                      { name: "Complejo El Gol", time: "22:00 - 23:00", place: "Belgrano", price: "$12.000", spots: 5 },
                    ].map((cancha, i) => (
                      <div key={i} className="p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-base font-bold text-foreground">{cancha.name}</span>
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-primary">{cancha.spots} libres</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-4 h-4" /> {cancha.time}
                          </span>
                          <span className="text-base font-black text-primary">{cancha.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 animate-float hidden lg:block z-20">
                <div className="w-full h-full bg-accent/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-accent/20">
                  <Trophy className="w-8 h-8 text-accent" />
                </div>
              </div>
              <div className="absolute top-[48%] -left-6 w-16 h-16 animate-float-reverse hidden lg:block z-20">
                <div className="w-full h-full bg-primary/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-primary/20">
                  <Star className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-[2.5rem] p-10 sm:p-16 text-center relative overflow-hidden shadow-2xl shadow-primary/30">
            {/* Football pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="footballPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                    <circle cx="30" cy="30" r="8" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#footballPattern)" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-8 backdrop-blur-sm">
                <Trophy className="w-5 h-5 text-accent" />
                <span className="text-sm font-bold text-primary-foreground">Unite a la comunidad</span>
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-primary-foreground text-balance mb-6 leading-tight">
                ¿Listo para tu próximo partido?
              </h2>
              <p className="text-primary-foreground/80 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
                Organizá, jugá y disfrutá del fútbol sin preocuparte por la logística.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="text-lg px-10 h-14 rounded-xl font-black shadow-xl hover:scale-105 transition-all duration-300" asChild>
                  <Link href="/register">
                    <FootballIcon className="w-5 h-5 mr-2" />
                    Registrarme gratis
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-10 h-14 rounded-xl font-bold bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
                  <Link href="/login">
                    Ya tengo cuenta
                  </Link>
                </Button>
              </div>
            </div>

            {/* Decorative footballs */}
            <FloatingBall className="w-24 h-24 -top-8 -right-8 animate-float opacity-20" />
            <FloatingBall className="w-16 h-16 -bottom-4 -left-4 animate-float-reverse opacity-20" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-primary/20">
                <Image
                  src="/logo-partidoya.jpg"
                  alt="PartidoYa Logo"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <span className="font-bold text-xl text-foreground">PartidoYa</span>
            </div>

            <div className="flex items-center gap-6">
              <Link href="#jugadores" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                Jugadores
              </Link>
              <Link href="#duenos" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                Canchas
              </Link>
              <Link href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                Funciones
              </Link>
            </div>

            <p className="text-sm text-muted-foreground text-center md:text-left flex items-center gap-2">
              © {new Date().getFullYear()} PartidoYa. Hecho con
              <span className="text-primary">pasión</span>
              por el fútbol.
              <FootballIcon className="w-4 h-4 text-primary" />
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
