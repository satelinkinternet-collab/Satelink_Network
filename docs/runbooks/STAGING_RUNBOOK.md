# Staging Environment Runbook

## 1. Prerequisites
- **OS**: Ubuntu 22.04 LTS (Recommended) or macOS (Local Staging)
- **Node.js**: v18+
- **PM2**: `npm install -g pm2`
- **Nginx**: `sudo apt install nginx` (Linux) or `brew install nginx` (macOS)

## 2. Initial Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/satelinkinternet-collab/satelink-mvp.git
   cd satelink-mvp
   ```
2. Create Envs:
   ```bash
   cp .env.example .env
   cp web/.env.example web/.env.local
   ```
   *Edit `.env` and set `NODE_ENV=staging`.*

3. Install Global Tools:
   ```bash
   npm install -g pm2
   ```

## 3. Deployment
Run the automated script:
```bash
./scripts/deploy_staging.sh
```

## 4. Nginx Configuration
1. Test the config:
   ```bash
   nginx -t -c $(pwd)/nginx.staging.conf
   ```
2. (Linux) Link to enabled sites:
   ```bash
   sudo ln -s $(pwd)/nginx.staging.conf /etc/nginx/sites-enabled/satelink
   sudo systemctl reload nginx
   ```
3. (Local macOS) Run manually:
   ```bash
   nginx -c $(pwd)/nginx.staging.conf
   ```

## 5. Verification
- **Frontend**: http://localhost:8000
- **API**: http://localhost:8000/health
- **Swagger**: http://localhost:8000/api-docs
