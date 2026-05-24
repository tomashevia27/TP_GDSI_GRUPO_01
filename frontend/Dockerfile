# Etapa 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package*.json pnpm-lock.yaml* ./
RUN pnpm install
COPY . .
# Next.js generará la carpeta 'standalone' gracias a tu configuración
RUN pnpm run build

# Etapa 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiamos solo lo que Next.js generó en la carpeta standalone
# Esto es todo lo que necesita para correr, por eso es tan liviano
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]