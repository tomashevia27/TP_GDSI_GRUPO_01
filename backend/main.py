from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import engine, Base
from .routers import auth, users, canchas

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

# Incluir routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(canchas.router)
