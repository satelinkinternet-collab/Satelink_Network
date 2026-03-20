FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Dependencies required for native modules
RUN apk add --no-cache python3 make g++

# Copy all workspace package manifests for npm workspace resolution
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/dashboard/package*.json ./apps/dashboard/
COPY apps/dashboard_archived/package*.json ./apps/dashboard_archived/
COPY apps/docs/package*.json ./apps/docs/
COPY apps/status/package*.json ./apps/status/
COPY services/reputation-engine/package*.json ./services/reputation-engine/
COPY services/revenue-engine/package*.json ./services/revenue-engine/
COPY services/scheduler/package*.json ./services/scheduler/
COPY services/workload-discovery/package*.json ./services/workload-discovery/
COPY packages/config/package*.json ./packages/config/
COPY packages/database/package*.json ./packages/database/
COPY packages/ui/package*.json ./packages/ui/
COPY agents/node-agent/package*.json ./agents/node-agent/

RUN npm install --omit=dev

COPY . .

# Remove unnecessary development files
RUN rm -rf tests script

FROM node:20-alpine AS release

WORKDIR /usr/src/app

# Install curl/wget for healthchecks
RUN apk add --no-cache curl

COPY --from=builder /usr/src/app ./

# Setup a non-root user
RUN addgroup -S satelink && adduser -S satelink -G satelink
RUN mkdir -p /usr/src/app/data && chown -R satelink:satelink /usr/src/app

USER satelink

EXPOSE 8080 8081
CMD ["npm", "run", "start"]
