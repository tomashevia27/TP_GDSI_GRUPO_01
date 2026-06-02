# PartidoYa ⚽

**PartidoYa** es una plataforma para organizar partidos de fútbol. Permite gestionar canchas, armar equipos, coordinar horarios y notificar a los jugadores por mail.

---

## 🌐 Acceder a la aplicación

La aplicación está deployada y lista para usar:

| Servicio | URL |
|---|---|
| **Frontend** | [tp-gdsi-grupo-01.vercel.app/](https://tp-gdsi-grupo-01.vercel.app/) |
| **Backend API** | [teamup-backend-lq30.onrender.com](https://teamup-backend-lq30.onrender.com) |
| **Documentación API** | [teamup-backend-lq30.onrender.com/docs](https://teamup-backend-lq30.onrender.com/docs) |

> **Nota:** El backend corre en el tier gratuito de Render. Si estuvo inactivo, la primera request puede tardar ~30-60 segundos en responder (cold start). Las siguientes son instantáneas.

---

## 🐳 Correr localmente con Docker

### Requisitos

- [Docker](https://www.docker.com/) instalado y corriendo.

### Levantar todos los servicios

Desde la raíz del proyecto:

```bash
docker compose up --build
```

Esto levanta automáticamente:

| Servicio | URL local |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (FastAPI) | http://localhost:8000 |
| Base de datos (PostgreSQL) | localhost:5432 |
| PgAdmin | http://localhost:5050 |

### Detener los servicios

```bash
docker compose down
```

Para también borrar los volúmenes de datos:

```bash
docker compose down -v
```

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js + TailwindCSS |
| Backend | FastAPI + Python 3.11 |
| Base de datos | PostgreSQL 14 |
| Deploy frontend | Vercel |
| Deploy backend | Render |
