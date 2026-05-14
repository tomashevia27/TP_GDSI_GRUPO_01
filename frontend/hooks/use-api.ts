"use client"

const API_URL = typeof window !== "undefined" 
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
): Promise<{ usuario_id: number }> {
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

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/usuarios/${userId}`)
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
  userId: string,
  userData: Partial<UserData>
): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/usuarios/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
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
  dias_operativos: string
  hora_apertura: string
  hora_cierre: string
  fotos?: string
  propietario_id: number
}

export async function crearCancha(canchaData: CanchaData) {
  const response = await fetch(`${API_URL}/canchas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
