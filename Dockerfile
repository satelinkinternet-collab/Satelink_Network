FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Dependencies required for native modules
RUN apk add --no-cache python3 make g++

# Copy root package files first
COPY package*.json ./

# Copy all workspace package.json files so npm ci resolves workspace deps
COPY apps/api/package*.json ./apps/api/
COPY apps/dashboard/package*.json ./apps/dashboard/

# Install all workspace dependencies (production only)
RUN npm config set fetch-retry-maxtimeout 600000
RUN npm config set fetch-retries 5
RUN npm config set fetch-timeout 600000
RUN npm ci --omit=dev

# Copy full source
COPY . .

# Remove dev/test files
RUN rm -rf tests script

FROM node:20-alpine AS release

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app ./

# Setup a non-root user
RUN addgroup -S satelink && adduser -S satelink -G satelink
RUN mkdir -p /usr/src/app/data && chown -R satelink:satelink /usr/src/app

USER satelink

EXPOSE 8080 8081
CMD ["npm", "run", "start"]
