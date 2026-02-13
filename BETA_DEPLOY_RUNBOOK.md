# Beta Deployment Runbook

**Goal:** Step-by-step guide to run Satelink locally (Mac) or deploy to VPS (Ubuntu).
**Status:** Beta Staging (HTTP Only for initial connectivity).

---

## 🛑 STOP & READ
- **Local (Mac):** DO NOT run `pm2`, `nginx`, or `apt`. Use `node` and `npm`.
- **VPS (Ubuntu):** Use `pm2` and `nginx` for stability.
- **Root access:** VPS commands assume you can `sudo`.

---

## 🟢 SECTION 1: LOCAL TEST (macOS)
*Run these on your laptop to verify code before deploying.*

### 1. Start Backend
Open Terminal 1:
```zsh
# Go to project root
cd "$(pwd)" 

# Install dependencies if needed
npm install

# Start API Server (Runs on port 8080)
# Uses "dev" mode (includes seed endpoints)
node server.js
```

### 2. Verify Backend
Open Terminal 2:
```zsh
# Check Health
curl -s http://localhost:8080/health
# Expected: {"ok":true, "service":"satelink", ...}
```

### 3. Start Frontend
In Terminal 2:
```zsh
cd web
npm install
# Start Next.js (Runs on port 3000)
npm run dev
```

### 4. Verify Frontend
Open Browser: [http://localhost:3000/health-ui](http://localhost:3000/health-ui)
*Shows "UI OK", Timestamp, and API Base URL.*

---

## 🔵 SECTION 2: VPS DEPLOYMENT (Ubuntu)
*Run these on your server. Replace `YOUR.VPS.IP.ADDRESS` with actual IP.*

### A. Access Server
```bash
# From your Mac
ssh ubuntu@YOUR.VPS.IP.ADDRESS
```

### B. Install System Dependencies
```bash
sudo apt update
sudo apt install -y git nginx curl
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Install PM2 (Process Manager)
sudo npm i -g pm2 pm2-logrotate
```

### C. Clone Code
```bash
git clone https://github.com/satelinkinternet-collab/Satelink_Network.git satelink
cd satelink
```

### D. Configure Backend (Production)
```bash
# Create production .env
cat > .env << 'EOF'
NODE_ENV=production
HOST=0.0.0.0
PORT=8080
# GENERATE A REAL SECRET!
JWT_SECRET=production_secret_change_me_immediately_to_32_chars
EOF
```

### E. Start Backend
```bash
npm install --production
# Start with PM2
pm2 start server.js --name satelink-api
pm2 save
```

### F. Build & Start Frontend
```bash
cd web
npm install --production

# Create production build env
cat > .env.production << 'EOF'
# Point to Nginx reverse proxy (Same domain/IP)
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_APP_ENV=staging
EOF

# Build Next.js
npm run build

# Start with PM2
pm2 start npm --name satelink-web -- start -- -p 3000
pm2 save
```

### G. Configure Nginx (Reverse Proxy)
*Maps port 80 -> Frontend (3000) and /api -> Backend (8080)*

```bash
sudo tee /etc/nginx/sites-available/satelink << 'EOF'
server {
  listen 80;
  server_name _;  # Accepts any IP/Domain

  # Backend: Proxy /api/ requests to Port 8080
  # Example: /api/me -> http://localhost:8080/me
  location /api/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_buffering off;
  }

  # Backend: SSE Stream
  location /stream/ {
    proxy_pass http://127.0.0.1:8080/stream/;
    proxy_set_header Host $host;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_cache off;
  }

  # Frontend: Next.js
  location / {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
EOF

# Enable Site
sudo ln -sf /etc/nginx/sites-available/satelink /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🟡 SECTION 3: VERIFICATION
*Run these commands to confirm success.*

### On VPS (Check internal routing)
```bash
# Check Processes
pm2 list

# Check Nginx Config
sudo nginx -t

# Check Backend Internal
curl -s http://127.0.0.1:8080/health
```

### On Local Mac (Check external access)
*Replace `YOUR.VPS.IP.ADDRESS` with the server IP.*
```bash
# Check API via Nginx
curl -s http://YOUR.VPS.IP.ADDRESS/api/health

# Check UI load
curl -I http://YOUR.VPS.IP.ADDRESS/
```
