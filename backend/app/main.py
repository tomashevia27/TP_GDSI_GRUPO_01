
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, canchas, users, partidos, notificaciones
from .db import engine, Base

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Team UP API")

# Configuración de CORS para que el Front pueda conectarse
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, we should restrict this to our frontend domain (Vercel)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"mensaje": "El backend esta vivo"}

# Incluir routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(canchas.router)
app.include_router(partidos.router)
app.include_router(notificaciones.router)