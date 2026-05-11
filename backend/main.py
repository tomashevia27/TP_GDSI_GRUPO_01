from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .db import engine, Base, get_db
from .schemas import UsuarioRegistro, UsuarioLogin, UsuarioEdicion, UsuarioRespuesta
from .services import auth_service

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Team UP API")

# Configuración de CORS para que el Front pueda conectarse
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"mensaje": "El backend esta vivo"}


# US 1: Registro de Usuario
@app.post("/registro", response_model=UsuarioRespuesta)
def registrar_usuario(usuario: UsuarioRegistro, db: Session = Depends(get_db)):
    """Registra un nuevo usuario."""
    return auth_service.registrar(db, usuario)


# US 2: Inicio de Sesión
@app.post("/login")
def login(datos: UsuarioLogin, db: Session = Depends(get_db)):
    """Valida credenciales e inicia sesión."""
    return auth_service.login(db, datos)

# US 3: Editar Perfil
@app.put("/usuarios/{user_id}", response_model=UsuarioRespuesta)
def editar_perfil(user_id: int, datos: UsuarioEdicion, db: Session = Depends(get_db)):
    """Edita el perfil de un usuario."""
    return auth_service.editar_perfil(db, user_id, datos)


@app.get("/canchas")
def obtener_canchas():
    return [
        {"id": 1, "nombre": "Cancha 1", "tipo": "Fútbol 5", "precio_hora": 15000},
        {"id": 2, "nombre": "Cancha 2", "tipo": "Fútbol 7", "precio_hora": 22000},
        {"id": 3, "nombre": "Cancha Techada", "tipo": "Fútbol 5", "precio_hora": 18000}
    ]
