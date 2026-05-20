# Datos de Prueba - Team UP

## Usuarios

| Nombre | Email | Contraseña | Rol |
|--------|-------|------------|-----|
| Martin Rodriguez | martinrodriguez@gmail.com | martinrodriguez | Jugador |
| Valeria Fernandez | valeriafernandez@gmail.com | valeriafernandez | Jugador |
| Santiago Gimenez | santiagogimenez@gmail.com | santiagogimenez | Jugador |
| Tomas Godoy | tomasgodoy@gmail.com | tomasgodoy | Jugador |
| Carlos Alvarez | carlosalvarez@gmail.com | carlosalvarez | Owner (Fútbol 7) |
| Miguel Galvan | miguelgalvan@gmail.com | miguelgalvan | Owner (Fútbol 11) |
| Laura Herrera | lauraherrera@gmail.com | lauraherrera | Owner (Fútbol 5) |

## Canchas

| Cancha | Modalidad | Dirección | Owner |
|--------|-----------|-----------|-------|
| La Canchita F5 | Fútbol 5 | Av. Garcia del Rio 2500, Saavedra | Laura Herrera |
| El Estadio F5 | Fútbol 5 | Monroe 3200, Saavedra | Laura Herrera |
| Sporting F5 | Fútbol 5 | Cuba 1800, Saavedra | Laura Herrera |
| La Grande F11 | Fútbol 11 | Av. Directorio 4500, Flores | Miguel Galvan |
| El Gigante F11 | Fútbol 11 | Pedernera 800, Flores | Miguel Galvan |
| Metrópolis F11 | Fútbol 11 | Cacique Arriola 1500, Flores | Miguel Galvan |
| La Seventh F7 | Fútbol 7 | Honduras 3500, Palermo | Carlos Alvarez |
| Club Social F7 | Fútbol 7 | Uriarte 1200, Palermo | Carlos Alvarez |
| Arena F7 | Fútbol 7 | Borges 2100, Palermo | Carlos Alvarez

---

## Instrucciones para ejecutar el script de carga de datos

### Ubicación del script

El script `cargar_datos.py` debe estar en la raíz del proyecto:
```
TP_GDSI_GRUPO_01/
├── backend/
│   ├── app/
│   ├── cargar_datos.py  ← aquí
│   └── ...
└── ...
```

### Cómo ejecutarlo

Al levantar el entorno con `docker compose up --build`, el script se copia automáticamente al contenedor. Para ejecutarlo directamente dentro del contenedor, abrí una terminal en la raíz del proyecto y ejecutá:

```bash
docker exec -it bdd_backend python cargar_datos.py
```

#### Solución de problemas comunes (segun Gemini)

* **Error `No such container: bdd_backend`**:
  Si Docker te dice que no encuentra el contenedor pero el entorno está levantado, puede deberse a un conflicto de **contextos de Docker** (habitual al usar Docker Desktop en Linux). Podés forzar el contexto por defecto usando:
  ```bash
  docker --context default exec -it bdd_backend python cargar_datos.py
  ```

* **Copiar cambios locales del script sin reconstruir la imagen**:
  Si realizás cambios en `cargar_datos.py` localmente y querés aplicarlos sin rehacer el build de Docker, copialo a la ruta de trabajo correcta del contenedor (`/app/backend/`):
  ```bash
  docker cp backend/cargar_datos.py bdd_backend:/app/backend/cargar_datos.py
  # O si tenés conflicto de contexto:
  docker --context default cp backend/cargar_datos.py bdd_backend:/app/backend/cargar_datos.py
  ```

**Nota:** El script es idempotente. Si ya existen los usuarios/canchas, los salta y no los duplica.