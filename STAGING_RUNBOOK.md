# Staging Deployment Runbook

**Goal:** setup a fresh Ubuntu VPS for Satelink Beta.

## 1. Provisioning (Ubuntu 22.04 LTS)

### Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential
```

### Install Node.js 20+ (via NVM)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
npm install -g pm2
```

## 2. Code Setup

### Clone Repository
```bash
# Setup directory
sudo mkdir -p /var/www/satelink
sudo chown -R $USER:$USER /var/www/satelink
git clone https://github.com/satelinkinternet-collab/satelink-mvp.git /var/www/satelink
cd /var/www/satelink
```

### Environment Configuration
```bash
# Copy template
cp .env.staging.example .env

# EDIT THE VARIABLES
nano .env
# 1. Set JWT_SECRET (use `openssl rand -hex 32`)
# 2. Set DATABASE_URL=file:/var/www/satelink/satelink.db
# 3. Set NEXT_PUBLIC_API_BASE_URL=https://your-domain.com
```

## 3. Deployment

### First Run
```bash
# Make script executable
chmod +x scripts/deploy_staging.sh

# Run full deploy (Install path, build web, start pm2)
./scripts/deploy_staging.sh
```

### Verify PM2
```bash
pm2 status
# Should show:
# satelink-api    online
# satelink-web    online
```

## 4. Network & SSL

### Configure Nginx
```bash
# Copy config
sudo cp nginx_staging.conf /etc/nginx/sites-available/satelink

# Link
sudo ln -s /etc/nginx/sites-available/satelink /etc/nginx/sites-enabled/

# Test syntax
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Enable SSL (Certbot)
```bash
# Follow interactive prompts to enable HTTPS for your domain
sudo certbot --nginx -d your-domain.com
```

## 5. Maintenance

### Update Code
```bash
cd /var/www/satelink
./scripts/deploy_staging.sh
```

### Check Logs
```bash
pm2 logs satelink-api
pm2 logs satelink-web
```
