from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import UsuarioRegistro, UsuarioLogin, UsuarioEdicion, UsuarioRespuesta

app = FastAPI(title="Team UP API")

# Configuración de CORS para que el Front pueda conectarse
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base de datos simulada (solo para el MVP)
usuarios_db = {}

@app.get("/")
def read_root():
    return {"mensaje": "El backend esta vivo"}

# Ruta extra de prueba para ver la base de datos
@app.get("/usuarios")
def obtener_usuarios():
    return usuarios_db

# US 1: Registro de Usuario
@app.post("/registro", response_model=UsuarioRespuesta)
def registrar_usuario(usuario: UsuarioRegistro):
    if usuario.email in usuarios_db:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    nuevo_id = len(usuarios_db) + 1
    usuarios_db[usuario.email] = {**usuario.dict(), "id": nuevo_id}
    return usuarios_db[usuario.email]

# US 2: Inicio de Sesión
@app.post("/login")
def login(datos: UsuarioLogin):
    user = usuarios_db.get(datos.email)
    if not user or user["password"] != datos.password:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"mensaje": "Login exitoso", "usuario_id": user["id"]}

# US 3: Editar Perfil
@app.put("/usuarios/{user_id}", response_model=UsuarioRespuesta)
def editar_perfil(user_id: int, datos: UsuarioEdicion):
    # Buscamos al usuario por ID en nuestra DB simulada
    for email, user in usuarios_db.items():
        if user["id"] == user_id:
            usuarios_db[email].update(datos.dict())
            return usuarios_db[email]
    
    raise HTTPException(status_code=404, detail="Usuario no encontrado")

@app.get("/canchas")
def obtener_canchas():
    return [
        {"id": 1, "nombre": "Cancha 1", "tipo": "Fútbol 5", "precio_hora": 15000},
        {"id": 2, "nombre": "Cancha 2", "tipo": "Fútbol 7", "precio_hora": 22000},
        {"id": 3, "nombre": "Cancha Techada", "tipo": "Fútbol 5", "precio_hora": 18000}
    ]
