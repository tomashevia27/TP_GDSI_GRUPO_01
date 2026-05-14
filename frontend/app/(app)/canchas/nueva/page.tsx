"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuthContext } from "@/components/auth-provider"
import { crearCancha, uploadImageToCloudinary } from "@/hooks/use-api"
import Swal from 'sweetalert2'

export default function NuevaCanchaPage() {
  const router = useRouter()
  const { userId } = useAuthContext()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_superficie: "",
    tamano: "",
    iluminacion: false,
    zona: "",
    direccion: "",
    precio_por_turno: "",
    dias_operativos: 31,
    apertura_h: "",
    apertura_m: "",
    cierre_h: "",
    cierre_m: "",
  })
  const [foto, setFoto] = useState<File | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validaciones
    const { nombre, tipo_superficie, tamano, zona, direccion, precio_por_turno, dias_operativos, apertura_h, apertura_m, cierre_h, cierre_m } = formData

    if (!nombre || !tipo_superficie || !tamano || !zona || !direccion || !precio_por_turno || !dias_operativos || !apertura_h || !apertura_m || !cierre_h || !cierre_m) {
      Swal.fire({
        title: "Atención",
        text: "Todos los campos obligatorios deben estar completos.",
        icon: "warning",
        confirmButtonColor: "#00c2cb",
      })
      return
    }

    const precio = parseFloat(precio_por_turno)
    if (isNaN(precio) || precio <= 0) {
      Swal.fire({
        title: "Atención",
        text: "El precio por turno debe ser mayor a cero.",
        icon: "warning",
        confirmButtonColor: "#00c2cb",
      })
      return
    }

    const hora_apertura = `${apertura_h.padStart(2, '0')}:${apertura_m.padStart(2, '0')}`
    const hora_cierre = `${cierre_h.padStart(2, '0')}:${cierre_m.padStart(2, '0')}`

    if (hora_cierre <= hora_apertura) {
      Swal.fire({
        title: "Atención",
        text: "La hora de cierre debe ser posterior a la de apertura.",
        icon: "warning",
        confirmButtonColor: "#00c2cb",
      })
      return
    }

    setIsLoading(true)

    try {
      let fotoUrl: string | undefined

      if (foto) {
        try {
          fotoUrl = await uploadImageToCloudinary(foto)
        } catch {
          Swal.fire({
            title: "Error de imagen",
            text: "Hubo un problema al subir la foto de la cancha. Por favor, intentá de nuevo.",
            icon: "error",
            confirmButtonColor: "#00c2cb",
          })
          setIsLoading(false)
          return
        }
      }

      await crearCancha({
        nombre,
        tipo_superficie,
        tamano: parseInt(tamano),
        iluminacion: formData.iluminacion,
        zona,
        direccion,
        precio_por_turno: precio,
        dias_operativos,
        hora_apertura,
        hora_cierre,
        fotos: fotoUrl,
        propietario_id: userId ? parseInt(userId) : 1 // Fallback para pruebas
      })

      await Swal.fire({
        title: "¡Éxito!",
        text: "La cancha ha sido creada y ya está disponible.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      })

      router.push("/home")

    } catch (error) {
      Swal.fire({
        title: "No se pudo crear",
        text: error instanceof Error ? error.message : "Error al procesar la solicitud.",
        icon: "error",
        confirmButtonColor: "#00c2cb",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card className="shadow-lg border-0">
        <CardContent className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Crear Nueva Cancha
            </h1>
            <p className="text-muted-foreground">Publicá tu cancha para que los jugadores la encuentren</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="font-bold text-sm">Nombre de la cancha *</Label>
                <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_superficie" className="font-bold text-sm">Tipo de superficie *</Label>
                <Select value={formData.tipo_superficie} onValueChange={(v) => setFormData(p => ({ ...p, tipo_superficie: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sintético">Sintético</SelectItem>
                    <SelectItem value="Natural">Natural</SelectItem>
                    <SelectItem value="Cemento">Cemento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tamano" className="font-bold text-sm">Tamaño (jugadores) *</Label>
                <Select value={formData.tamano} onValueChange={(v) => setFormData(p => ({ ...p, tamano: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Fútbol 5</SelectItem>
                    <SelectItem value="7">Fútbol 7</SelectItem>
                    <SelectItem value="9">Fútbol 9</SelectItem>
                    <SelectItem value="11">Fútbol 11</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_por_turno" className="font-bold text-sm">Precio por turno ($) *</Label>
                <Input id="precio_por_turno" name="precio_por_turno" type="number" min="0" step="100" value={formData.precio_por_turno} onChange={handleChange} className="bg-secondary border-border" />
              </div>
              <div className="flex items-center justify-center space-x-2 pt-6">
                <Switch
                  id="iluminacion"
                  checked={formData.iluminacion}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, iluminacion: checked }))}
                />
                <Label htmlFor="iluminacion" className="font-bold text-sm">Tiene iluminación</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zona" className="font-bold text-sm">Zona/Barrio *</Label>
                <Input id="zona" name="zona" value={formData.zona} onChange={handleChange} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion" className="font-bold text-sm">Dirección exacta *</Label>
                <Input id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} className="bg-secondary border-border" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-sm">Días operativos *</Label>
                <div className="flex gap-2">
                  <button type="button" className="px-3 py-1.5 text-[13px] rounded-md border border-border bg-secondary text-muted-foreground hover:bg-background hover:text-foreground hover:border-primary transition-all" onClick={() => setFormData(p => ({ ...p, dias_operativos: 31 }))}>Lun – Vie</button>
                  <button type="button" className="px-3 py-1.5 text-[13px] rounded-md border border-border bg-secondary text-muted-foreground hover:bg-background hover:text-foreground hover:border-primary transition-all" onClick={() => setFormData(p => ({ ...p, dias_operativos: 96 }))}>Fin de semana</button>
                  <button type="button" className="px-3 py-1.5 text-[13px] rounded-md border border-border bg-secondary text-muted-foreground hover:bg-background hover:text-foreground hover:border-primary transition-all" onClick={() => setFormData(p => ({ ...p, dias_operativos: 127 }))}>Todos los días</button>
                  <button type="button" className="px-3 py-1.5 text-[13px] rounded-md border border-border bg-secondary text-muted-foreground hover:bg-background hover:text-foreground hover:border-primary transition-all" onClick={() => setFormData(p => ({ ...p, dias_operativos: 0 }))}>Limpiar</button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { abbr: 'Lun', full: 'Lunes', bit: 0 },
                  { abbr: 'Mar', full: 'Martes', bit: 1 },
                  { abbr: 'Mié', full: 'Miércoles', bit: 2 },
                  { abbr: 'Jue', full: 'Jueves', bit: 3 },
                  { abbr: 'Vie', full: 'Viernes', bit: 4 },
                  { abbr: 'Sáb', full: 'Sábado', bit: 5 },
                  { abbr: 'Dom', full: 'Domingo', bit: 6 },
                ].map(d => {
                  const active = (formData.dias_operativos >> d.bit) & 1;
                  return (
                    <button
                      key={d.bit}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, dias_operativos: p.dias_operativos ^ (1 << d.bit) }))}
                      className={`w-[72px] h-[72px] rounded-lg border flex flex-col items-center justify-center gap-[2px] transition-all select-none ${active ? 'bg-[#EEEDFE] border-[#534AB7] border-[1.5px]' : 'bg-background border-border hover:bg-secondary hover:border-primary'}`}
                    >
                      <span className={`text-[13px] font-medium ${active ? 'text-[#3C3489]' : 'text-muted-foreground'}`}>{d.abbr}</span>
                      <span className={`text-[11px] ${active ? 'text-[#534AB7]' : 'text-muted-foreground'}`}>{d.full}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-sm">Apertura (24hs) *</Label>
                <div className="flex items-center space-x-2">
                  <Input name="apertura_h" type="number" min="0" max="23" placeholder="HH" value={formData.apertura_h} onChange={handleChange} className="bg-secondary border-border text-center" />
                  <span className="font-bold">:</span>
                  <Input name="apertura_m" type="number" min="0" max="59" placeholder="MM" value={formData.apertura_m} onChange={handleChange} className="bg-secondary border-border text-center" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">Cierre (24hs) *</Label>
                <div className="flex items-center space-x-2">
                  <Input name="cierre_h" type="number" min="0" max="23" placeholder="HH" value={formData.cierre_h} onChange={handleChange} className="bg-secondary border-border text-center" />
                  <span className="font-bold">:</span>
                  <Input name="cierre_m" type="number" min="0" max="59" placeholder="MM" value={formData.cierre_m} onChange={handleChange} className="bg-secondary border-border text-center" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fotos" className="font-bold text-sm">Foto de la Cancha (Opcional)</Label>
              <Input
                id="fotos"
                type="file"
                accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
                className="bg-secondary border-border"
              />
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Cancha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
