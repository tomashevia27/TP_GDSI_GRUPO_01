
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .core.exceptions import DomainRuleError, DomainPermissionError, DomainNotFoundError

from .routers import auth, canchas, users, partidos, notificaciones, reservas, torneos
from .core.db import engine, Base

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

@app.exception_handler(DomainRuleError)
async def domain_rule_exception_handler(request: Request, exc: DomainRuleError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )

@app.exception_handler(DomainPermissionError)
async def domain_permission_exception_handler(request: Request, exc: DomainPermissionError):
    return JSONResponse(
        status_code=403,
        content={"detail": str(exc)},
    )

@app.exception_handler(DomainNotFoundError)
async def domain_not_found_exception_handler(request: Request, exc: DomainNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)},
    )


# Incluir routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(canchas.router)
app.include_router(partidos.router)
app.include_router(notificaciones.router)
app.include_router(reservas.router)
app.include_router(torneos.router)