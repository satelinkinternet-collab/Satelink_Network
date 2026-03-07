# API Surface Governance

The Satelink environment implements strict API surface governance measures to automatically index route boundaries, throttle simulation environments, and mandate defensive headers systematically.

## 1. Route Inventory (`/api/routes`)
At application start during `app.listen`, an automated boot-hook sweeps the `express-list-endpoints` layer to detect all statically defined routes (REST logic map).
- Running in `SIMULATION` mode securely returns this indexed route mapping (`GET /api/routes`).
- Running in `LIVE` mode automatically shields this endpoint returning robust `403 Forbidden` responses.

## 2. API Scope Rate Limiting
To ensure analytical simulation features or administration bypass paths are not excessively abused:
The `express-rate-limit` router natively shields: `/__test`, `/dev`, `/seed`, `/simulation`, `/admin-api/diagnostics`.
- In `SIMULATION`, a flexible **`120 requests/min` per IP** pool governs access.
- In `LIVE` mode, the ceiling is drastically throttled to **`30 requests/min` per IP** dropping deep analytical scanning. Business operation spaces natively escape these boundaries assuring zero platform revenue interference. 

## 3. Strict Security Response Headers
Global inbound requests traverse natively behind native `Helmet.js` profiles generating deterministic headers:
- `X-DNS-Prefetch-Control`
- `X-Download-Options`
- `X-Content-Type-Options: nosniff` 
- `X-Frame-Options: SAMEORIGIN` 
Additionally, inbound headers inject a custom sandboxed explicit Content Security Policy matching `Content-Security-Policy-Report-Only: default-src 'self'`.

## 4. Administrative Diagnostic Auditing
The `GET /admin-api/diagnostics/surface-audit` tracks environment bounds gracefully rendering mapped lists natively counting all namespace dependencies against their respective subdomains strictly obscuring explicit endpoints if operating against production ledgers.
