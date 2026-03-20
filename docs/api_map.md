# Satelink API Map

## Authentication

| Method | Path | Auth | Handler | Description |
|--------|------|------|---------|-------------|
| POST | `/auth/challenge` | None | auth_controller | Request nonce for wallet signing |
| POST | `/auth/verify` | None | auth_controller | Verify signature, issue JWT |
| GET | `/auth/me` | JWT | auth_controller | Return current user info |
| POST | `/auth/refresh` | None | auth_controller | Rotate access token |
| POST | `/auth/logout` | None | auth_controller | Clear session |
| POST | `/auth/nonce` | None | auth_controller | Alias → /auth/challenge |
| POST | `/auth/start` | None | auth_controller | Alias → /auth/challenge |
| POST | `/auth/finish` | None | auth_controller | Alias → /auth/verify |

### Legacy Auth (backward compat)
| Method | Path | Auth | Handler | Description |
|--------|------|------|---------|-------------|
| POST | `/auth/embedded/start` | None | auth_embedded | Legacy nonce request |
| POST | `/auth/embedded/finish` | None | auth_embedded | Legacy signature verify |
| POST | `/auth/builder/challenge` | None | builder_auth | Builder nonce request |
| POST | `/auth/builder/verify` | None | builder_auth | Builder signature verify |
| POST | `/auth/builder/logout` | None | builder_auth | Builder session clear |
| GET | `/me` | JWT | auth_v2 | Legacy user info |
| POST | `/login` | None | auth_v2 | Legacy login |

## Health & Metrics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Basic health check |
| GET | `/health/queue` | None | Job queue health |
| GET | `/metrics` | None | Prometheus metrics |
| GET | `/metrics/json` | None | JSON metrics for dashboard |

## Public Routes (No Auth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/network/*` | None | Network stats, node list |
| GET | `/api/marketplace/*` | None | Marketplace listings |
| GET | `/api/status/*` | None | Platform status |
| GET | `/api/partners/*` | None | Partner directory |
| GET | `/api/economics/summary` | None | Revenue split summary |
| GET | `/settlement/mode` | None | Settlement mode (live/simulated) |

## Node Operator Routes

| Prefix | Auth | Description |
|--------|------|-------------|
| `/v1/node/*` | Optional JWT | Node registration, heartbeat, jobs |
| `/node/*` | JWT | Node operator API |
| `/api/node/*` | JWT | Node operator API (alias) |
| `/v1/node/lifecycle/*` | JWT | Node lifecycle management |

## Builder Routes

| Prefix | Auth | Description |
|--------|------|-------------|
| `/builder-api/*` | JWT + builder | Builder project management |
| `/api/builder/*` | JWT + builder | Builder API (alias) |

## Distributor & Enterprise Routes

| Prefix | Auth | Description |
|--------|------|-------------|
| `/dist-api/*` | JWT | Distributor API |
| `/ent-api/*` | JWT + enterprise | Enterprise API |

## Workload Routes

| Prefix | Auth | Description |
|--------|------|-------------|
| `/v1/jobs/*` | API key | Job submission |
| `/v1/workload/rpc/*` | API key | RPC relay |
| `/v1/webhook/*` | API key | Webhook delivery |
| `/v1/ai/*` | API key | AI inference |
| `/v1/automation/*` | API key | Job automation |
| `/v1/gateway/*` | API key | Gateway layer |

## Admin Routes

All admin routes require `JWT + admin_super/admin_ops` role.

| Prefix | Description |
|--------|-------------|
| `/api/admin/revenue/*` | Revenue analytics |
| `/api/admin/reputation/*` | Node reputation |
| `/api/admin/lifecycle/*` | Node lifecycle admin |
| `/api/admin/network/*` | Network management |
| `/api/admin/partners/*` | Partner management |
| `/api/admin/launch/*` | Launch controls |
| `/api/admin/ledger/*` | Revenue ledger |
| `/api/admin/economics/*` | Economics management |
| `/api/admin/forensics/*` | Security forensics |
| `/api/admin/growth/*` | Growth metrics |
| `/api/admin/sla/*` | SLA monitoring |
| `/api/admin/autonomous/*` | Autonomous systems |
| `/api/admin/workloads/*` | Workload management |
| `/api/admin/genesis/*` | Genesis node engine |
| `/api/admin/flywheel/*` | Demand flywheel |
| `/api/admin/settlement/*` | Settlement management |
| `/api/admin/nodes` | Node list (convenience alias) |
| `/api/admin/*` | Control room (72+ routes) |

All `/api/admin/*` routes are mirrored at `/admin/*` for backward compatibility.

## Other

| Prefix | Auth | Description |
|--------|------|-------------|
| `/pair/*` | JWT | Device pairing |
| `/support/*` | JWT | Support tickets |
| `/stream/*` | JWT | Server-sent events |
| `/rpc/*` | API key | RPC proxy |
| `/beta/*` | None | Beta program |
| `/v1/*` | Various | Growth, futures, ops |
