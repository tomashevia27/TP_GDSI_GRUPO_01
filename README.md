# TP_GDSI_GRUPO_01

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Launch application
uvicorn backend.main:app --reload

# Finally, search http://127.0.0.1:8000/ in your browser and play a little with each available endpoint.
# You can see them at http://127.0.0.1:8000/docs and also try them with 'Try it out' button.
```

## Run with Docker Compose

Desde la raíz del proyecto:

```bash
docker compose up --build
```

Eso levanta el backend, PostgreSQL, pgAdmin y el frontend.

Para detener todo y borrar los contenedores:

```bash
docker compose down
```

Si también querés borrar los volúmenes de datos:

```bash
docker compose down -v
```

## Dependences 

Instalarse Node.js

Correr esto para descargarse nvm 
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Despues de eso, cerrar la terminal y volver a abrirla. Ahi correr esto:
```bash
source ~/.bashrc
```

Ahora si descargamos Node.js y pnpm
```bash
# Instala la última versión estable de Node.js
nvm install --lts

# Verifica que se instaló bien
node -v

# Activa corepack (que trae pnpm incluido de forma nativa en Node)
corepack enable

# Verifica pnpm
pnpm -v
```
Entrar a la carpeta de frontend y levantar el dev
Esto levanta npm para el front, tiene que estar el back en el puerto 8000 (si hay problemas con el Next.js chequear si el CORS esta configurado para permitir consultas del dev server (suele ser este `http://localhost:3000` ))
```bash
pnpm dev
```