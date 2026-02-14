---
name: satelink_ops
description: Operational capabilities for the Satelink Network MVP (Deployment, Monitoring, Management)
---

# Satelink Operations Skill

This skill allows Antigravity agents to perform operational tasks on the Satelink Network MVP, including deployment, health checks, and administrative actions.

## 1. Deployment (`deploy`)

**Description**: Deploys the Satelink backend and frontend to the staging environment.

**Usage**:
```bash
./scripts/deploy.sh
```

**Verification**:
- Check `pm2 status` to ensure `satelink-api` and `satelink-web` are online.
- `curl http://localhost:8080/health` should return `{"ok":true}`.

## 2. Monitoring (`monitor`)

**Description**: Checks system health and retrieves recent logs.

**Capabilities**:

### Check Health
```bash
./scripts/monitor.sh
```

### View Logs (Backend)
```bash
pm2 logs satelink-api --lines 50 --nostream
```

### View Logs (Frontend)
```bash
pm2 logs satelink-web --lines 50 --nostream
```

## 3. Management (`manage`)

**Description**: Administrative tasks for the Satelink Network.

### Mint Admin Token (Dev/Staging Only)
Generates a Super Admin JWT for API access.
```bash
curl -s -X POST http://localhost:8080/__test/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xadmin_super", "role":"admin_super"}'
```

### Run Smoke Tests
Executes the full Beta Smoke Test suite to verify system integrity.
```bash
./BETA_SMOKE_TEST_REV.sh
```
