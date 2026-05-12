from fastapi import FastAPI, Depends, HTTPException
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
@app.post("/registro")
def registrar_usuario(usuario: UsuarioRegistro, db: Session = Depends(get_db)):
    """Registra un nuevo usuario y envía código de confirmación por email."""
    return auth_service.registrar(db, usuario)


# US 1b: Confirmar email
@app.post("/confirmar-email")
def confirmar_email(payload: dict, db: Session = Depends(get_db)):
    """Recibe JSON {"email":"...", "code":"..."} y confirma el email."""
    email = payload.get("email")
    code = payload.get("code")
    if not email or not code:
        raise HTTPException(status_code=422, detail="email y code son requeridos")
    return auth_service.confirmar_email(db, email, code)


# Reenviar código de confirmación
@app.post("/reenviar-codigo")
def reenviar_codigo(payload: dict, db: Session = Depends(get_db)):
    """Recibe JSON {"email":"..."} y reenvía el código de confirmación."""
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=422, detail="email es requerido")
    return auth_service.reenviar_codigo(db, email)


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

@app.get("/usuarios/{user_id}", response_model=UsuarioRespuesta)
def obtener_perfil(user_id: int, db: Session = Depends(get_db)):
    """Obtiene el perfil de un usuario."""
    from .repositories import usuario_repository
    from .services.auth_service import _usuario_a_respuesta
    usuario = usuario_repository.obtener_por_id(db, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _usuario_a_respuesta(usuario)


@app.get("/canchas")
def obtener_canchas():
    return [
        {"id": 1, "nombre": "Cancha 1", "tipo": "Fútbol 5", "precio_hora": 15000},
        {"id": 2, "nombre": "Cancha 2", "tipo": "Fútbol 7", "precio_hora": 22000},
        {"id": 3, "nombre": "Cancha Techada", "tipo": "Fútbol 5", "precio_hora": 18000}
    ]
