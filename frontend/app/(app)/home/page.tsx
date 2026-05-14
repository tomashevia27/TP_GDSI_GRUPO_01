"use client"

import Link from "next/link"
import { Plus, Calendar, Search, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard de Inicio</h1>
        <div className="flex gap-4">
          <Button variant="outline" className="font-bold" asChild>
            <Link href="/canchas/nueva">
              <MapPin className="mr-2 h-4 w-4" />
              Crear Cancha
            </Link>
          </Button>
          <Button className="font-bold">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Partido
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
            Próximos eventos disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-secondary/50">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              No hay partidos cerca tuyo por ahora
            </h2>
            <p className="text-muted-foreground">
              Usá el buscador o creá un nuevo partido para invitar jugadores.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
