"use client"

const API_URL = typeof window !== "undefined" 
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : "https://6a0267f20d92f63dd253a56c.mockapi.io/"

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
          case "nombre":
            return "• El nombre no puede estar vacío."
          case "apellido":
            return "• El apellido no puede estar vacío."
          case "password":
            return "• La contraseña debe tener como mínimo 8 caracteres."
          case "email":
            return "• El email ingresado no es válido (ej: usuario@correo.com)."
          case "edad":
            return "• La edad debe ser un número válido."
          case "genero":
            return "• Tenés que seleccionar una opción de género."
          case "zona":
            return "• La zona de juego no puede estar vacía."
          default:
            return `• Por favor, revisá el campo: ${campo}.`
        }
      })
      throw new Error("Revisá los datos ingresados:\n\n" + messages.join("\n"))
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
