# TP_GDSI_GRUPO_01

## 🐳 Con Docker Compose (Recomendado)

Todo corre en contenedores: **Postgres + Backend + Frontend + PgAdmin**

```bash
docker compose up --build
```

Endpoints útiles:

- **Frontend**: http://127.0.0.1:3000/ ⭐
- **API Backend**: http://127.0.0.1:8000/
- **Swagger/Docs**: http://127.0.0.1:8000/docs
- **PgAdmin**: http://127.0.0.1:5050/

### Credenciales BD (en PgAdmin):

- **Host**: `postgres`
- **Port**: `5432`
- **Database**: `bdd_db`
- **User**: `admin`
- **Password**: `admin123`

---

## 💻 Local (sin Docker)

### Backend

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Launch application
uvicorn backend.main:app --reload
```

API disponible en http://127.0.0.1:8000/

### Frontend

Sirve el HTML con tu editor o un servidor local:

```bash
cd frontend
python3 -m http.server 3000
```

Frontend disponible en http://127.0.0.1:3000/

---

## 🏗️ Arquitectura

```
main.py (rutas thin)
  ↓ delega a
services/ (lógica de negocio)
  ↓ delega a
repositories/ (acceso a datos)
  ↓ usa
db.py (sesión, engine)
```

- **main.py**: Solo orquestación de rutas y dependencias
- **services/**: Lógica de negocio (validaciones, reglas)
- **repositories/**: Acceso a datos (queries, commits)
- **models.py**: Definiciones SQLAlchemy de tablas
- **db.py**: Configuración de BD y sesiones