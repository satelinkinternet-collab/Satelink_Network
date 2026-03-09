FROM node:18-alpine
WORKDIR /app

# Copy root workspace and config
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig*.json ./

# Copy packages
COPY packages/config ./packages/config
COPY packages/database ./packages/database

# Copy API app
COPY apps/api ./apps/api

# Install dependencies and build
RUN npm install
RUN npm run db:generate
RUN npm run build --workspace=@satelink/api

EXPOSE 4000
CMD ["npm", "run", "start", "--workspace=@satelink/api"]
