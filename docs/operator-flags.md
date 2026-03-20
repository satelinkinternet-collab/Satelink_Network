# Operator Flags & Readiness Gate

The Satelink Network provides operational guardrails to prevent accidental exposure of unsafe simulation endpoints in live environments and to quickly toggle safe-zone features.

## Feature Flags
These flags can be configured in your environment (`.env` or shell export) to disable specific operational namespaces. By default, all flags are `false`.

| Flag Name | Default | Meaning |
|---|---|---|
| `FLAG_DISABLE_RPC` | `false` | When `true`, disables the `/rpc` mock listener and responds with `503 Service Unavailable`. |
| `FLAG_DISABLE_ADMIN_DIAGNOSTICS` | `false` | When `true`, disables non-vital endpoints under `/admin-api/diagnostics/*` (e.g. `surface-audit`). |
| `FLAG_DISABLE_SIMULATION_ROUTES` | `false` | When `true`, disables the entire `/simulation/*` router and `/api/routes`. |
| `FLAG_READONLY_MODE` | `false` | When `true`, prevents any state-mutating requests (`POST`, `PUT`, `DELETE`) across the safe-zone modules. |

### Examples

**Disable the RPC Stub:**
```bash
export FLAG_DISABLE_RPC=true
node server.js
```

**Disable Admin Diagnostics:**
```bash
export FLAG_DISABLE_ADMIN_DIAGNOSTICS=true
node server.js
```

**Enable Read-Only Mode:**
```bash
export FLAG_READONLY_MODE=true
# Prevents POST/PUT/DELETE to /simulation, /rpc, and diagnostic namespaces
node server.js
```

## Readiness Gate `readiness_gate.js`

To verify the safety and setup of your active node process, you can execute the readiness gate script. It securely assays health, headers, live blocks, and feature flag behavior without dispatching modifications or requiring auth credentials.

**Usage:**
```bash
API_BASE_URL=http://localhost:8080 node scripts/readiness_gate.js
```

**Expected Output (Simulation Example):**
```
=========================================
 Satelink Readiness Gate: http://localhost:8080
=========================================

[INFO] MODE: Detected SIMULATION Mode

[CHECK] Healthz -> GET /healthz
  └─ [PASS] Healthz
[CHECK] Runtime Info -> GET /api/runtime-info
  └─ [PASS] Runtime Info
[CHECK] Security Headers -> GET /api/mode
  └─ [PASS] Security Headers
...
=========================================
 [PASS] Readiness Gate Cleared
```
