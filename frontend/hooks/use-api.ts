"use client"

export const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000")

const CLOUD_NAME = "dzsrgcgq6"
const UPLOAD_PRESET = "PartidoYa_preset"

export interface UserData {
  nombre: string
  apellido: string
  email?: string
  password?: string
  edad: number
  genero: string
  zona: string
  rol: string
  foto_perfil?: string
}

export interface UserProfile extends UserData {
  id: number
  partidos_a_favor?: number
}

export interface PartidosAFavorData {
  cantidad: number
  tiene: boolean
}

function getAccessToken(): string {
  const token = sessionStorage.getItem("partidoya_auth_access_token")
  if (!token) {
    throw new Error("No hay una sesión activa")
  }
  return token
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", UPLOAD_PRESET)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error("Error al subir la imagen a Cloudinary")
  }

  const data = await response.json()
  return data.secure_url
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ usuario_id: number; rol: string; access_token: string; token_type: string }> {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      throw new Error("Por favor, ingresá un formato de email válido.")
    }
    throw new Error(data.detail || "Error al iniciar sesión")
  }

  return data
}

export async function registerUser(userData: UserData): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/registro`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })

  const data = await response.json()

  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      const messages = data.detail.map((err: { loc: string[] }) => {
        const campo = err.loc[err.loc.length - 1]
        switch (campo) {
          case "nombre": return "• El nombre no puede estar vacío."
          case "apellido": return "• El apellido no puede estar vacío."
          case "password": return "• La contraseña debe tener como mínimo 8 caracteres."
          case "email": return "• El email ingresado no es válido."
          case "edad": return "• La edad debe ser un número válido."
          case "genero": return "• Tenés que seleccionar una opción de género."
          case "zona": return "• La zona de juego no puede estar vacía."
          case "rol": return "• Debe seleccionarse un rol."
          default: return `• Por favor, revisá el campo: ${campo}.`
        }
      })

      throw new Error("Revisá los datos ingresados: " + messages.join("\n"))
    }
    throw new Error(data.detail || "Error al registrarse")
  }

  return data
}

export async function getUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/usuarios/me`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar el perfil")
  }

  return data
}

export async function getPartidosAFavor(): Promise<PartidosAFavorData> {
  const response = await fetch(`${API_URL}/partidos/partidos-a-favor`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar los partidos a favor")
  }

  return data
}

export async function confirmEmail(email: string, code: string): Promise<{ mensaje: string }> {
  const response = await fetch(`${API_URL}/confirmar-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || data.mensaje || "Error al confirmar email")
  return data
}

export async function resendCode(email: string): Promise<{ mensaje: string }> {
  const response = await fetch(`${API_URL}/reenviar-codigo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || data.mensaje || "Error al reenviar código")
  return data
}

export async function updateUserProfile(
  userData: Partial<UserData>
): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/usuarios/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(userData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || "Error al actualizar el perfil")
  }

  return data
}

export interface CanchaData {
  id?: number
  nombre: string
  tipo_superficie: string
  tamano: number
  iluminacion: boolean
  zona: string
  direccion: string
  precio_por_turno: number
  dias_operativos: number
  hora_apertura: string
  hora_cierre: string
  duracion_turno?: number
  fotos?: string
}

export async function crearCancha(canchaData: CanchaData) {
  const response = await fetch(`${API_URL}/canchas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(canchaData),
  })

  const data = await response.json()

  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      throw new Error("Revisá los datos ingresados.")
    }
    throw new Error(data.detail || "Error al crear la cancha")
  }

  return data
}

export async function actualizarCancha(canchaId: number | string, canchaData: Partial<CanchaData>) {
  const response = await fetch(`${API_URL}/canchas/${canchaId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(canchaData),
  })

  const data = await response.json()

  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      throw new Error("Revisá los datos ingresados.")
    }
    throw new Error(data.detail || "Error al actualizar la cancha")
  }

  return data
}

export async function eliminarCancha(canchaId: number | string) {
  const response = await fetch(`${API_URL}/canchas/${canchaId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || "Error al eliminar la cancha")
  }

  return data
}

export interface PartidoCreateData {
  cancha_id: number;
  fecha: string;
  horario: string;
  tipo: string;
  descripcion?: string;
  cupos_disponibles?: number;
  use_partido_a_favor?: boolean;
  partidos_a_favor_a_usar?: number;
}

export interface PartidoData {
  id: number;
  cancha_id: number;
  fecha: string;
  horario: string;
  modalidad: string;
  tipo: string;
  cantidad_jugadores: number;
  cupos_disponibles: number;
  descripcion?: string;
  estado: string;
  cancha?: {
    id: number;
    nombre: string;
    zona: string;
    direccion: string;
    duracion_turno?: number;
  };
  organizador?: UserProfile;
  jugadores?: UserProfile[];
}

export async function getMisPartidos() {
  const response = await fetch(`${API_URL}/partidos/mis-partidos`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar partidos")
  }
  return data
}

export async function getMisCanchas() {
  const response = await fetch(`${API_URL}/canchas/me`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar mis canchas")
  }
  return data
}

export async function getCanchas(): Promise<CanchaData[]> {
  const response = await fetch(`${API_URL}/canchas`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar las canchas")
  }
  return data
}

export async function getPartido(partidoId: string | number): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/partidos/${partidoId}`)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar el partido")
  }
  return data
}

export async function crearPartido(partidoData: PartidoCreateData): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/partidos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(partidoData),
  })
  const data = await response.json()
  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      throw new Error("Revisá los datos ingresados.")
    }
    throw new Error(data.detail || "Error al crear el partido")
  }
  return data
}

export async function cancelarPartido(partidoId: string | number): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/partidos/${partidoId}/cancelar`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cancelar el partido")
  }
  return data
}

export async function inscribirseAPartido(
  partidoId: string | number,
  usePartidoAFavor: boolean = false
): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/partidos/${partidoId}/inscribirse?use_partido_a_favor=${usePartidoAFavor ? "true" : "false"}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al inscribirse al partido")
  }
  return data
}

export async function bajarseDePartido(partidoId: string | number): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/partidos/${partidoId}/bajarse`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al darse de baja del partido")
  }
  return data
}

export async function editarPartido(partidoId: string | number, partidoData: PartidoCreateData): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/partidos/${partidoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(partidoData),
  })
  const data = await response.json()
  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      throw new Error("Revisá los datos ingresados.")
    }
    throw new Error(data.detail || "Error al editar el partido")
  }
  return data
}

// ─────────────────────────────────────────────
// US 7: Ver partidos disponibles
// ─────────────────────────────────────────────

export interface PartidoDisponibleFilters {
  zona?: string;
  modalidad?: string;
  fecha?: string;
}

export async function getPartidosDisponibles(filters?: PartidoDisponibleFilters): Promise<PartidoData[]> {
  const params = new URLSearchParams()
  if (filters?.zona) params.set("zona", filters.zona)
  if (filters?.modalidad) params.set("modalidad", filters.modalidad)
  if (filters?.fecha) params.set("fecha", filters.fecha)

  const queryString = params.toString()
  const url = `${API_URL}/partidos/disponibles${queryString ? `?${queryString}` : ""}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar partidos disponibles")
  }
  return data
}

export interface FiltroOpcion {
  valor: string;
  cantidad: number;
}

export interface FiltrosDisponiblesData {
  zonas: FiltroOpcion[];
  modalidades: FiltroOpcion[];
}

export async function getFiltrosDisponibles(): Promise<FiltrosDisponiblesData> {
  const response = await fetch(`${API_URL}/partidos/filtros`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar opciones de filtros");
  }
  return data;
}

// ─────────────────────────────────────────────
// Notificaciones internas
// ─────────────────────────────────────────────

export interface NotificacionData {
  id: number;
  tipo: string;
  mensaje: string;
  partido_id?: number | null;
  leida: boolean;
  fecha_creacion: string;
}

export interface NotificacionesListado {
  notificaciones: NotificacionData[];
  total_no_leidas: number;
}

export interface ConteoNoLeidas {
  total_no_leidas: number;
}

export async function getNotificaciones(
  soloNoLeidas: boolean = false,
  limit: number = 50,
  offset: number = 0
): Promise<NotificacionesListado> {
  const params = new URLSearchParams()
  if (soloNoLeidas) params.set("solo_no_leidas", "true")
  params.set("limit", String(limit))
  params.set("offset", String(offset))

  const queryString = params.toString()
  const response = await fetch(`${API_URL}/notificaciones?${queryString}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar notificaciones")
  }
  return data
}

export async function getConteoNoLeidas(): Promise<ConteoNoLeidas> {
  const response = await fetch(`${API_URL}/notificaciones/no-leidas/count`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al obtener conteo de notificaciones")
  }
  return data
}

export async function marcarNotificacionLeida(notificacionId: number): Promise<NotificacionData> {
  const response = await fetch(`${API_URL}/notificaciones/${notificacionId}/leer`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al marcar notificación como leída")
  }
  return data
}

export async function marcarTodasLeidas(): Promise<{ mensaje: string }> {
  const response = await fetch(`${API_URL}/notificaciones/leer-todas`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al marcar notificaciones como leídas")
  }
  return data
}

export async function eliminarNotificacion(notificacionId: number): Promise<{ mensaje: string }> {
  const response = await fetch(`${API_URL}/notificaciones/${notificacionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al eliminar notificación")
  }
  return data
}

export async function eliminarTodasNotificaciones(): Promise<{ mensaje: string }> {
  const response = await fetch(`${API_URL}/notificaciones`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al eliminar notificaciones")
  }
  return data
}

// ─────────────────────────────────────────────
// US Sprint 4: Agenda y Reserva Manual
// ─────────────────────────────────────────────

export interface AgendaSlot {
  horario: string
  estado: "disponible" | "ocupado" | "bloqueado"
  partido_id?: number | null
  cliente_nombre?: string | null
  cliente_apellido?: string | null
  cliente_telefono?: string | null
  organizador_nombre?: string | null
  organizador_apellido?: string | null
  es_reserva_manual?: boolean
}

export interface AgendaData {
  cancha: CanchaData & { id: number }
  fecha: string
  slots: AgendaSlot[]
}

export interface TurnoSlot {
  horario: string
  estado: "disponible" | "ocupado" | "bloqueado"
}

export interface TurnosRespuesta {
  cancha_id: number
  fecha: string
  slots: TurnoSlot[]
}

export async function getTurnos(canchaId: number | string, fecha: string, excluirPartidoId?: number): Promise<TurnosRespuesta> {
  let url = `${API_URL}/canchas/${canchaId}/turnos?fecha=${fecha}`
  if (excluirPartidoId !== undefined) {
    url += `&excluir_partido_id=${excluirPartidoId}`
  }
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar los turnos")
  }
  return data
}

export async function getAgenda(canchaId: number | string, fecha: string): Promise<AgendaData> {
  const response = await fetch(`${API_URL}/canchas/${canchaId}/agenda?fecha=${fecha}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cargar la agenda")
  }
  return data
}

export interface ReservaManualData {
  cancha_id: number
  fecha: string
  horario: string
  cliente_nombre?: string
  cliente_apellido?: string
  cliente_telefono?: string
}

export async function crearReservaManual(reservaData: ReservaManualData): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/reservas/manual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(reservaData),
  })
  const data = await response.json()
  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      throw new Error("Revisá los datos ingresados.")
    }
    throw new Error(data.detail || "Error al crear la reserva manual")
  }
  return data
}

export async function bloquearTurno(data: ReservaManualData): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/reservas/bloquear`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    if (Array.isArray(result.detail)) {
      throw new Error("Revisá los datos ingresados.")
    }
    throw new Error(result.detail || "Error al bloquear el turno")
  }
  return result
}

export async function desbloquearTurno(partidoId: number): Promise<{ mensaje: string }> {
  const response = await fetch(`${API_URL}/reservas/bloquear/${partidoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al desbloquear el turno")
  }
  return data
}

export async function cancelarReservaDueno(partidoId: number): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/reservas/${partidoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Error al cancelar la reserva")
  }
  return data
}

export interface ReprogramarReservaData {
  fecha: string
  horario: string
  cancha_id?: number
}

export async function reprogramarReserva(
  partidoId: number,
  data: ReprogramarReservaData
): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/reservas/${partidoId}/reprogramar`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    if (Array.isArray(result.detail)) {
      throw new Error("Revisá los datos ingresados.")
    }
    throw new Error(result.detail || "Error al reprogramar la reserva")
  }
  return result
}

// ─────────────────────────────────────────────
// US 5: Torneos 
// ─────────────────────────────────────────────

export interface TorneoCreateData {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  formato: string
  zona: string
  dias_operativos: number        // bitmask 7 días
  franja_horaria: string        // "HH:MM-HH:MM"
  min_integrantes_por_equipo: number  // 5 | 7 | 9 | 11
  max_equipos: number
  costo_inscripcion: number
  ida_y_vuelta: boolean          // solo todos_contra_todos
  fase_final?: string | null     // "semis" | "cuartos" | "octavos" (fase_grupos)
  descripcion?: string
  reglas?: string
}

export interface JugadorSimple {
  id: number
  nombre: string
  apellido: string
  email?: string
}

export type TorneoUpdateData = Partial<TorneoCreateData>

export interface EquipoInscripto {
  id: number
  nombre?: string
  nombre_equipo?: string
  jugadores: string | JugadorSimple[]
  escudo?: string
}

export interface TorneoData {
  id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  formato: string
  zona: string
  dias_operativos: number
  franja_horaria: string
  min_integrantes_por_equipo: number
  max_equipos: number
  costo_inscripcion: number
  ida_y_vuelta: boolean
  fase_final?: string | null
  descripcion?: string
  reglas?: string
  estado: string
  organizador_id: number
  equipos_inscriptos: number
  equipos?: EquipoInscripto[]
  lugar: string
}

export async function editarTorneo(torneoId: string | number, torneoData: TorneoUpdateData): Promise<TorneoData> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(torneoData),
  })
  const data = await response.json()
  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      const msgs = data.detail.map((e: any) => e.loc.join('.') + ': ' + e.msg).join(', ')
      throw new Error("Revisá los datos ingresados: " + msgs)
    }
    throw new Error(data.detail || "Error al editar el torneo")
  }
  return data
}

export interface TorneoMisActividades {
  id: number
  nombre: string
  fecha_inicio: string
  formato: string
  estado: string
  rol: "Organizador" | "Jugador"
  lugar: string
  costo_inscripcion: number
  max_equipos: number
  equipos_inscriptos: number
}

export interface MisTorneosResponse {
  proximos: TorneoMisActividades[]
  en_curso: TorneoMisActividades[]
  finalizados: TorneoMisActividades[]
  cancelados: TorneoMisActividades[]
}

export interface InscripcionData {
  nombre_equipo: string
  jugadores: string // String JSON stringificado
  escudo?: string
}

const ESTADO_MAP: Record<string, string> = {
  "abierto": "Abierto para inscripción",
  "en_curso": "En curso",
  "finalizado": "Finalizado",
  "cancelado": "Cancelado",
}
const FORMATO_MAP: Record<string, string> = {
  "eliminacion_directa": "Eliminación directa",
  "fase_grupos": "Fase de grupos",
  "fase_grupos_8avos": "Fase de grupos + 8vos",
  "fase_grupos_16avos": "Fase de grupos + 16vos",
  "todos_contra_todos": "Todos contra todos",
}

function normalizarTorneo(t: any): TorneoData {
  const equiposArray = Array.isArray(t.equipos_inscriptos)
    ? t.equipos_inscriptos.map((eq: any) => ({
      id: eq.id,
      nombre_equipo: eq.nombre || eq.nombre_equipo,
      jugadores: eq.jugadores || "[]",
      escudo: eq.escudo
    }))
    : (t.equipos || []);
  const inscriptosCount = Array.isArray(t.equipos_inscriptos) ? t.equipos_inscriptos.length : (t.inscriptos ?? t.equipos_inscriptos ?? 0);

  return {
    ...t,
    estado: ESTADO_MAP[t.estado] ?? t.estado,
    formato: FORMATO_MAP[t.formato] ?? t.formato,
    costo_inscripcion: Number(t.costo_inscripcion ?? 0),
    equipos_inscriptos: inscriptosCount,
    equipos: equiposArray,
    max_equipos: t.max_equipos ?? (inscriptosCount + (t.cupos_restantes || 0)),
    cupos_restantes: t.cupos_restantes ?? (t.max_equipos ? t.max_equipos - inscriptosCount : 0),
  }
}

export async function crearTorneo(data: TorneoCreateData): Promise<TorneoData> {
  const response = await fetch(`${API_URL}/api/torneos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()
  if (!response.ok) {
    if (Array.isArray(result.detail)) {
      const erroresCampos = result.detail
        .map((err: any) => `• ${err.msg}`)
        .join("\n")
      throw new Error("Errores de validación:\n" + erroresCampos)
    }
    throw new Error(result.detail || "Error al crear el torneo")
  }
  return result
}

export async function getTorneosDisponibles(): Promise<TorneoData[]> {
  const response = await fetch(`${API_URL}/api/torneos/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al cargar torneos abiertos")
  return (data as any[]).map(normalizarTorneo)
}

export async function getMisTorneos(): Promise<TorneoData[]> {
  const response = await fetch(`${API_URL}/api/torneos/mis-torneos`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })

  const data: MisTorneosResponse = await response.json()
  if (!response.ok) throw new Error((data as any).detail || "Error al cargar mis torneos")

  const proximos = (data.proximos || []).map(t => normalizarTorneo({ ...t, rol_usuario: t.rol }))
  const enCurso = (data.en_curso || []).map(t => normalizarTorneo({ ...t, rol_usuario: t.rol }))
  const finalizados = (data.finalizados || []).map(t => normalizarTorneo({ ...t, rol_usuario: t.rol }))
  const cancelados = (data.cancelados || []).map(t => normalizarTorneo({ ...t, rol_usuario: t.rol }))

  return [...proximos, ...enCurso, ...finalizados, ...cancelados]
}

export async function getTorneo(id: number): Promise<TorneoData> {
  const response = await fetch(`${API_URL}/api/torneos/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Torneo no encontrado")
  return normalizarTorneo(data)
}

export async function inscribirEquipo(torneoId: number, data: InscripcionData): Promise<any> {
  const jugadoresParseados: { nombre: string; email: string }[] = JSON.parse(data.jugadores)
  const emails = jugadoresParseados.map(j => j.email)

  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/inscripciones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({
      nombre: data.nombre_equipo,
      jugadores_emails: emails,
      escudo: data.escudo || ""
    }),
  })

  const result = await response.json()
  if (!response.ok) {
    if (Array.isArray(result.detail)) {
      throw new Error("Revisá los datos cargados en la plantilla del equipo.")
    }
    throw new Error(result.detail || "Error al inscribir el equipo.")
  }
  return result
}

export async function cancelarTorneo(torneoId: number): Promise<TorneoData> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/cancelar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al cancelar el torneo")
  return data
}

export interface PartidoTorneoData {
  id: number
  torneo_id: number
  equipo_local_id?: number
  equipo_visitante_id?: number
  equipo_local?: {
    id: number
    nombre?: string
    nombre_equipo?: string
    escudo?: string
    jugadores: JugadorSimple[]
  }
  equipo_visitante?: {
    id: number
    nombre?: string
    nombre_equipo?: string
    escudo?: string
    jugadores: JugadorSimple[]
  }
  goles_local?: number
  goles_visitante?: number
  estado: string
  fecha?: string
  horario?: string
  cancha_id?: number
  fase: string
  grupo?: string
  numero_fecha?: number
  partido_padre_local_id?: number
  partido_padre_visitante_id?: number
}

// ─── Fixture por fechas ───────────────────────────────────────────────────────

export interface PartidoBracketData {
  id: number
  equipo_local?: { id: number; nombre?: string; nombre_equipo?: string }
  equipo_visitante?: { id: number; nombre?: string; nombre_equipo?: string }
  goles_local?: number
  goles_visitante?: number
  estado: string
  fecha?: string
  partido_padre_local_id?: number
  partido_padre_visitante_id?: number
}

export interface FechaFixtureData {
  numero: number
  partidos: PartidoBracketData[]
}

export interface FixtureResponse {
  fechas: FechaFixtureData[]
}

export interface RondaBracketData {
  nombre: string
  partidos: PartidoBracketData[]
}

export interface BracketResponse {
  rondas: RondaBracketData[]
}

export async function getFixturePorFechas(torneoId: number): Promise<FixtureResponse> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/fixture`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al cargar fixture por fechas")
  return data
}

export async function getBracketTorneo(torneoId: number): Promise<BracketResponse> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/bracket`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al cargar bracket")
  return data
}

export interface CargarResultadoData {
  goles_local: number
  goles_visitante: number
  estadisticas_jugadores: {
    usuario_id: number
    equipo_id: number
    goles: number
    amarillas: number
    rojas: number
  }[]
}

export interface EstadisticaJugadorTorneoData {
  usuario_id: number
  usuario_nombre: string
  usuario_apellido: string
  equipo_id: number
  equipo_nombre: string
  goles: number
  amarillas: number
  rojas: number
}

export interface EstadisticaEquipoTorneoData {
  equipo_id: number
  equipo_nombre: string
  goles: number
  amarillas: number
  rojas: number
}

export interface EstadisticasTorneoData {
  jugadores: EstadisticaJugadorTorneoData[]
  equipos: EstadisticaEquipoTorneoData[]
}

export interface TopJugadorData {
  usuario_id: number
  usuario_nombre: string
  usuario_apellido: string
  equipo_id: number
  equipo_nombre: string
  valor: number
}

export interface TablaPosicionData {
  equipo_id: number
  equipo_nombre: string
  pts: number
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
}

export async function generarFixture(torneoId: number): Promise<PartidoTorneoData[]> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/fixture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al generar fixture")
  return data
}

export async function getFixtureTorneo(torneoId: number): Promise<PartidoTorneoData[]> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/partidos`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al cargar fixture")
  return data
}

export async function cargarResultadoPartido(partidoId: number, payload: CargarResultadoData): Promise<PartidoTorneoData> {
  const response = await fetch(`${API_URL}/api/torneos/partidos/${partidoId}/resultado`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(payload)
  })
  const data = await response.json()
  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      throw new Error(data.detail[0]?.msg || "Error de validación")
    }
    throw new Error(data.detail || "Error al cargar resultado")
  }
  return data
}

export async function getEstadisticasTorneo(torneoId: number): Promise<EstadisticasTorneoData> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/estadisticas`, {
    method: "GET",
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al cargar estadísticas")
  return data
}

export async function getTopJugadores(torneoId: number, tipo: "goleadores" | "amarillas" | "rojas", limit: number = 10): Promise<TopJugadorData[]> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/top/${tipo}?limit=${limit}`, {
    method: "GET",
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || `Error al cargar top de ${tipo}`)
  return data
}

export async function getTablaPosiciones(torneoId: number): Promise<TablaPosicionData[]> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/tabla-posiciones`, {
    method: "GET",
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al cargar tabla de posiciones")
  return data
}

export interface VallaInvictaData {
  equipo_id: number
  equipo_nombre: string
  partidos_invicto: number
}

export async function getVallasInvictas(torneoId: number, limit: number = 10): Promise<VallaInvictaData[]> {
  const response = await fetch(`${API_URL}/api/torneos/${torneoId}/top/vallas-invictas?limit=${limit}`, {
    method: "GET",
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || "Error al cargar vallas invictas")
  return data
}

export interface ProgramarPartidoData {
  cancha_id: number
  fecha: string   // "YYYY-MM-DD"
  horario: string // "HH:MM:SS"
}

export async function programarPartido(partidoId: number, payload: ProgramarPartidoData): Promise<PartidoTorneoData> {
  const response = await fetch(`${API_URL}/api/torneos/partidos/${partidoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) {
    if (Array.isArray(data.detail)) {
      throw new Error(data.detail[0]?.msg || "Error de validación")
    }
    throw new Error(data.detail || "Error al programar el partido")
  }
  return data
}

/* 

// ─────────────────────────────────────────────
// US: Torneos (MOCK PARA FRONTEND ACTUALIZADO)
// ─────────────────────────────────────────────

export interface TorneoCreateData {
  nombre: string
  fecha_inicio: string
  formato: string
  lugar: string
  max_equipos: number
  max_integrantes_por_equipo: number
  costo_inscripcion: number
  descripcion?: string
  reglas?: string
}

export interface EquipoInscripto {
  id: number
  nombre_equipo: string
  jugadores: string // Sigue siendo string porque el backend recibe/almacena el JSON stringificado
  escudo?: string
}

export interface TorneoData extends TorneoCreateData {
  id: number
  estado: string // "Abierto para inscripción", "En curso", "Finalizado", "Cancelado"
  organizador_id: number
  equipos_inscriptos: number
  equipos?: EquipoInscripto[]
  max_integrantes_por_equipo: number
  rol_usuario?: "Organizador" | "Jugador"
}

// Almacenamiento en memoria para simular backend
let mockTorneos: TorneoData[] = [
  {
    id: 1,
    nombre: "Torneo de Verano 2026",
    fecha_inicio: "2026-07-01",
    formato: "Fase de grupos + eliminación",
    lugar: "Cancha Central",
    max_equipos: 16,
    max_integrantes_por_equipo: 5,
    costo_inscripcion: 5000,
    descripcion: "El mejor torneo del verano con grandes premios.",
    reglas: "Fútbol 5. Se aplican reglas FIFA.",
    estado: "Abierto para inscripción",
    organizador_id: 2, 
    equipos_inscriptos: 1, // Ajustado a los dos equipos mockeados abajo
    equipos: [
        { 
          id: 101, 
          nombre_equipo: "Los Pumas", 
          jugadores: JSON.stringify([
            { nombre: "Juan Pérez", email: "juan@pumas.com", dni: "38123456" },
            { nombre: "Pedro Gómez", email: "pedro@pumas.com", dni: "39123456" },
            { nombre: "Pablo Ruiz", email: "pablo@pumas.com", dni: "40123456" },
            { nombre: "Leo Ruiz", email: "leo@pumas.com", dni: "40223456" },
            { nombre: "Cristobal Almada", email: "quito@pumas.com", dni: "43323456" }
          ])
        }
    ],
    rol_usuario: "Jugador" 
  },
  {
    id: 2,
    nombre: "Liga de Invierno",
    fecha_inicio: "2026-06-01",
    formato: "Todos contra todos",
    lugar: "Complejo Norte",
    max_equipos: 10,
    costo_inscripcion: 8000,
    estado: "En curso",
    organizador_id: 1, 
    equipos_inscriptos: 10,
    equipos: [],
    max_integrantes_por_equipo: 5,
    rol_usuario: "Organizador"
  },
  {
    id: 3,
    nombre: "Copa Relámpago",
    fecha_inicio: "2025-12-01",
    formato: "Eliminación directa",
    lugar: "Polideportivo Sur",
    max_equipos: 8,
    costo_inscripcion: 3000,
    estado: "Finalizado",
    organizador_id: 1, 
    equipos_inscriptos: 8,
    equipos: [],
    max_integrantes_por_equipo: 5,
    rol_usuario: "Organizador"
  }
]

export async function crearTorneo(data: TorneoCreateData): Promise<TorneoData> {
  const token = getAccessToken()
  if (!token) throw new Error("No autenticado")

  const formatoMap: Record<string, string> = {
    "Eliminación directa": "eliminacion_directa",
    "Fase de grupos + eliminación": "fase_grupos",
    "Todos contra todos": "todos_contra_todos"
  }

  const payload = {
    ...data,
    formato: formatoMap[data.formato] || data.formato
  }

  const response = await fetch(`${API_URL}/api/torneos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (!response.ok) {
    if (Array.isArray(result.detail)) {
      throw new Error(result.detail[0]?.msg || "Error de validación")
    }
    throw new Error(result.detail || "Error al crear el torneo")
  }

  const estadoMap: Record<string, string> = {
    "abierto": "Abierto para inscripción",
    "en_curso": "En curso",
    "finalizado": "Finalizado",
    "cancelado": "Cancelado"
  }
  
  const torneoFrontend: TorneoData = {
    ...data,
    id: result.id,
    estado: estadoMap[result.estado] || "Abierto para inscripción",
    organizador_id: result.organizador_id,
    equipos_inscriptos: 0,
    equipos: [],
    rol_usuario: "Organizador"
  }
  
  mockTorneos.push(torneoFrontend)
  return torneoFrontend
}

export async function getTorneosDisponibles(): Promise<TorneoData[]> {
  await new Promise(resolve => setTimeout(resolve, 500))
  getAccessToken()
  return mockTorneos.filter(t => t.estado === "Abierto para inscripción")
}

export async function getMisTorneos(): Promise<TorneoData[]> {
  await new Promise(resolve => setTimeout(resolve, 500))
  getAccessToken()
  return mockTorneos.filter(t => t.organizador_id === 1 || t.rol_usuario === "Jugador" || t.rol_usuario === "Organizador")
}

export async function getTorneo(id: number): Promise<TorneoData> {
  await new Promise(resolve => setTimeout(resolve, 500))
  getAccessToken()
  const torneo = mockTorneos.find(t => t.id === id)
  if (!torneo) throw new Error("Torneo no encontrado")
  return torneo
}

export interface InscripcionData {
  nombre_equipo: string
  jugadores: string // Recibe el string del JSON mandado por el formulario dinámico
  escudo?: string
}

export async function inscribirEquipo(torneoId: number, data: InscripcionData): Promise<TorneoData> {
  await new Promise(resolve => setTimeout(resolve, 500))
  getAccessToken()
  
  const torneoIndex = mockTorneos.findIndex(t => t.id === torneoId)
  if (torneoIndex === -1) throw new Error("Torneo no encontrado")
  
  const torneo = mockTorneos[torneoIndex]
  if (torneo.equipos_inscriptos >= torneo.max_equipos) {
    throw new Error("El torneo ya no tiene cupos disponibles.")
  }

  // Creamos el nuevo registro del equipo inscripto
  const nuevoEquipo: EquipoInscripto = {
    id: Date.now(),
    nombre_equipo: data.nombre_equipo,
    jugadores: data.jugadores, // Mantiene el JSON stringificado listo para la UI
    escudo: data.escudo
  }
  
  torneo.equipos = torneo.equipos || []
  torneo.equipos.push(nuevoEquipo)
  torneo.equipos_inscriptos += 1
  torneo.rol_usuario = "Jugador"

  return torneo
}

export async function cancelarTorneo(torneoId: number): Promise<TorneoData> {
  await new Promise(resolve => setTimeout(resolve, 500))
  getAccessToken()
  
  const torneoIndex = mockTorneos.findIndex(t => t.id === torneoId)
  if (torneoIndex === -1) throw new Error("Torneo no encontrado")
  
  const torneo = mockTorneos[torneoIndex]
  if (torneo.organizador_id !== 1 && torneo.rol_usuario !== "Organizador") {
      throw new Error("No tenés permisos para cancelar este torneo.")
  }

  torneo.estado = "Cancelado"
  return torneo
} */

// ─────────────────────────────────────────────
// US 36: Estadísticas / Métricas del Dashboard
// ─────────────────────────────────────────────

export interface KpiResumen {
  reservas_hoy: number
  reservas_semana: number
  reservas_mes: number
  tasa_ocupacion_hoy: number
  ingreso_estimado_mes: number
  proxima_reserva_fecha: string | null
  proxima_reserva_horario: string | null
  proxima_reserva_cancha: string | null
}

export interface ReservasDiarias {
  fecha: string
  cantidad: number
}

export interface ReservasPorPeriodoRespuesta {
  datos: ReservasDiarias[]
  total: number
}

export interface ReservasPorDiaSemana {
  dia: string
  dia_numero: number
  cantidad: number
}

export interface ReservasPorDiaSemanaRespuesta {
  datos: ReservasPorDiaSemana[]
}

export interface ReservasPorHora {
  hora: string
  cantidad: number
}

export interface ReservasPorHoraRespuesta {
  datos: ReservasPorHora[]
}

export interface MapaCalorCelda {
  dia: string
  dia_numero: number
  hora: string
  cantidad: number
}

export interface MapaCalorRespuesta {
  datos: MapaCalorCelda[]
}

export interface OcupacionDiaria {
  fecha: string
  tasa: number
}

export interface OcupacionRespuesta {
  tasa_promedio: number
  datos: OcupacionDiaria[]
}

export interface CancelacionesRespuesta {
  total_reservas: number
  total_cancelaciones: number
  total_efectivas: number
  tasa_cancelacion: number
}

export interface TipoReservaItem {
  tipo: string
  cantidad: number
}

export interface DistribucionTipoRespuesta {
  datos: TipoReservaItem[]
}

export interface ModalidadItem {
  modalidad: string
  cantidad: number
}

export interface DistribucionModalidadRespuesta {
  datos: ModalidadItem[]
}

export interface CanchaEstadistica {
  cancha_id: number
  nombre: string
  reservas: number
  ingreso_estimado: number
  tasa_ocupacion: number
}

export interface ComparativaCanchasRespuesta {
  datos: CanchaEstadistica[]
}

export interface IngresoDiario {
  fecha: string
  ingreso: number
}

export interface IngresosRespuesta {
  ingreso_total: number
  ingreso_promedio_diario: number
  datos: IngresoDiario[]
}

function buildEstadisticaParams(
  fechaDesde?: string,
  fechaHasta?: string,
  canchaId?: number
): string {
  const params = new URLSearchParams()
  if (fechaDesde) params.set("fecha_desde", fechaDesde)
  if (fechaHasta) params.set("fecha_hasta", fechaHasta)
  if (canchaId) params.set("cancha_id", String(canchaId))
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

async function fetchEstadistica<T>(endpoint: string, params: string): Promise<T> {
  const response = await fetch(`${API_URL}/estadisticas/${endpoint}${params}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || `Error al cargar ${endpoint}`)
  }
  return data
}

export async function getKpis(canchaId?: number): Promise<KpiResumen> {
  const params = canchaId ? `?cancha_id=${canchaId}` : ""
  return fetchEstadistica<KpiResumen>("kpis", params)
}

export async function getReservasPorPeriodo(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<ReservasPorPeriodoRespuesta> {
  return fetchEstadistica("reservas-periodo", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}

export async function getReservasPorDiaSemana(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<ReservasPorDiaSemanaRespuesta> {
  return fetchEstadistica("reservas-dia-semana", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}

export async function getReservasPorHora(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<ReservasPorHoraRespuesta> {
  return fetchEstadistica("reservas-hora", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}

export async function getMapaCalor(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<MapaCalorRespuesta> {
  return fetchEstadistica("mapa-calor", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}

export async function getOcupacion(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<OcupacionRespuesta> {
  return fetchEstadistica("ocupacion", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}

export async function getCancelaciones(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<CancelacionesRespuesta> {
  return fetchEstadistica("cancelaciones", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}

export async function getDistribucionTipo(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<DistribucionTipoRespuesta> {
  return fetchEstadistica("distribucion-tipo", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}

export async function getDistribucionModalidad(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<DistribucionModalidadRespuesta> {
  return fetchEstadistica("distribucion-modalidad", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}

export async function getComparativaCanchas(
  fechaDesde?: string, fechaHasta?: string
): Promise<ComparativaCanchasRespuesta> {
  const params = new URLSearchParams()
  if (fechaDesde) params.set("fecha_desde", fechaDesde)
  if (fechaHasta) params.set("fecha_hasta", fechaHasta)
  const qs = params.toString()
  return fetchEstadistica("comparativa-canchas", qs ? `?${qs}` : "")
}

export async function getIngresos(
  fechaDesde?: string, fechaHasta?: string, canchaId?: number
): Promise<IngresosRespuesta> {
  return fetchEstadistica("ingresos", buildEstadisticaParams(fechaDesde, fechaHasta, canchaId))
}
