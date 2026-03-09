FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Dependencies required for native modules (e.g. better-sqlite3)
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Removing unnecessary development files in final build if any
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
