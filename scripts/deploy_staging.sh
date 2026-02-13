#!/bin/bash
set -e

echo "🚀 Starting Staging Deployment..."

# 1. Update Code
echo "📦 Pulling latest code..."
git pull origin main

# 2. Backend Setup
echo "🛠 Building Backend..."
npm install --production
# Run migrations (ensure DB exists)
npm run migrate

# 3. Frontend Setup
echo "🎨 Building Frontend..."
cd web
npm install --production
# Ensure NEXT_PUBLIC_API_BASE_URL is available at build time
# We assume .env.production.local or system env vars are set
npm run build
cd ..

# 4. Restart Services
echo "🔄 Reloading PM2..."
pm2 reload ecosystem.config.js --env staging

echo "✅ Deployment Complete!"
