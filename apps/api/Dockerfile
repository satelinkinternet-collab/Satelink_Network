FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy root package files for workspace setup
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies from root (handles workspaces)
RUN npm install --production --workspace=@satelink/api

# Copy API source
COPY apps/api/ ./apps/api/

# Change to api directory for runtime
WORKDIR /usr/src/app/apps/api

EXPOSE 8080

CMD ["node", "server.js"]
