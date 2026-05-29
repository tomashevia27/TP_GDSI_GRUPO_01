"use client"

export const API_URL = typeof window !== "undefined" 
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : "http://localhost:8000"

const CLOUD_NAME = "dzsrgcgq6"
const UPLOAD_PRESET = "TeamUp_preset"

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
}

function getAccessToken(): string {
  const token = sessionStorage.getItem("teamup_auth_access_token")
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

  // Leemos el JSON una sola vez aquí
  const data = await response.json()

  if (!response.ok) {
    // Si FastAPI devuelve errores de validación (Pydantic), data.detail es un Array
    if (Array.isArray(data.detail)) {
      throw new Error("Por favor, ingresá un formato de email válido.")
    }
    
    // Aquí es donde atrapamos el "Email o contraseña incorrectos" del backend
    // Lanzamos el error para que el 'catch' del LoginPage lo capture
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

export async function confirmEmail(email: string, code: string): Promise<{ mensaje: string }>{
  const response = await fetch(`${API_URL}/confirmar-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || data.mensaje || "Error al confirmar email")
  return data
}

export async function resendCode(email: string): Promise<{ mensaje: string }>{
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

export async function inscribirseAPartido(partidoId: string | number): Promise<PartidoData> {
  const response = await fetch(`${API_URL}/partidos/${partidoId}/inscribirse`, {
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
  partido_id?: number
  cliente_nombre?: string
  cliente_telefono?: string
  organizador_nombre?: string
  es_manual?: boolean
}

export interface AgendaData {
  cancha: CanchaData & { id: number }
  fecha: string
  slots: AgendaSlot[]
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
