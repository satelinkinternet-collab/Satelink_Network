#!/bin/bash
set -e

echo "🚀 Starting Staging Deployment..."

# 1. Pull latest code
echo "📦 Pulling latest changes..."
git pull origin main

# 2. Install Backend Deps
echo "🔧 Installing Backend Dependencies..."
npm ci

# 3. Install & Build Frontend
echo "🎨 Building Frontend..."
cd web
npm ci
npm run build
cd ..

# 4. Reload PM2
echo "🔄 Reloading PM2 Processes..."
pm2 reload ecosystem.config.cjs --env staging || pm2 start ecosystem.config.cjs --env staging

echo "✅ Deployment Complete!"
pm2 status
