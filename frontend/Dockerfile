# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml* ./

RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

RUN npm install -g pnpm && pnpm install --prod

EXPOSE 3000

CMD ["pnpm", "start"]