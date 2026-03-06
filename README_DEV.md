# Satelink Developer Guide

This document provides instructions for running and testing the Satelink Node locally.

## UI Entrypoints

Satelink UI is served in two ways:
- **EJS Views**: Located in `./views`. These are server-side rendered pages for admin and operator views.
- **Next.js Web App**: Located in `./web`. A modern frontend application (can be run separately).
- **Static Assets**: Located in `./public` (CSS, JS, images).

## Manual E2E Steps

1. **Start the server**:
   ```bash
   ./scripts/dev.sh
   ```
2. **Verify API Health**:
   ```bash
   ./scripts/smoke.sh
   ```
3. **Open Browser**:
   - Landing Page: [http://localhost:8080/](http://localhost:8080/)
   - UI Dashboard: [http://localhost:8080/ui](http://localhost:8080/ui)
   - Health Check: [http://localhost:8080/health](http://localhost:8080/health)


## How to run API

Use the stable development start script:

```bash
./scripts/dev.sh
```

This will:
- Clean up any existing listeners on the default port (8080).
- Start the server in the background.
- Log output to `logs/dev.log`.

To specify a different port:
```bash
PORT=3000 ./scripts/dev.sh
```

## How to verify server alive

You can check the health endpoint:
```bash
curl -i http://localhost:8080/health
```
Expected response: `200 OK` with JSON `{ "ok": true }`.

Or the root landing route:
```bash
curl -i http://localhost:8080/
```
Expected response: `200 OK` with a plain text list of endpoints.

## How to list routes

To see all registered API endpoints at runtime:
```bash
node scripts/list_routes.mjs
```

## How to run E2E tests

### Automated Smoke Test
Run the smoke test to verify basic connectivity and health:
```bash
./scripts/smoke.sh
```

### Mocha E2E Tests
Run the full suite of Mocha E2E tests:
```bash
npm run test:e2e
```

## Common 404 vs server-down explanation

- **404 Not Found**: The server is running and responding, but the specific URL path or HTTP method you requested is not registered. Check `node scripts/list_routes.mjs` for available routes.
- **Connection Refused / Server Down**: The server is not running or is not listening on the expected port. Check if the process is running and look at `logs/dev.log` for any errors during startup.
