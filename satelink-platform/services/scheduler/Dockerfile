FROM node:18-alpine
WORKDIR /app

# Copy root workspace and config
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig*.json ./

# Copy packages
COPY packages/config ./packages/config
COPY packages/database ./packages/database

# Copy Scheduler service
COPY services/scheduler ./services/scheduler

# Install dependencies and build
RUN npm install
RUN npm run db:generate
RUN npm run build --workspace=@satelink/scheduler

CMD ["npm", "run", "start", "--workspace=@satelink/scheduler"]
