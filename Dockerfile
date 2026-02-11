# Multi-stage Dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server.js"]
