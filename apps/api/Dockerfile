FROM node:20-slim AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies (using workspaces)
RUN npm install

# Copy source
COPY apps/api ./apps/api
COPY packages ./packages

WORKDIR /app/apps/api

# ── Stage 2: runtime ───────────────────────────────────────────────────────────
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app /app

WORKDIR /app/apps/api

EXPOSE 8080

CMD ["node", "server.js"]
