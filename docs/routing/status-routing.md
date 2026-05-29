# Status Page Routing

## Purpose

Redirect users from `satelink.network/status` to the dedicated status subdomain `status.satelink.network` where live network metrics are hosted.

## Routing Rules

| Source | Destination | Type | Condition |
|--------|-------------|------|-----------|
| `/status` | `https://status.satelink.network/` | 301 Permanent | Host != status.satelink.network |
| `/status/` | `https://status.satelink.network/` | 301 Permanent | Host != status.satelink.network |
| `/status/:path*` | `https://status.satelink.network/:path*` | 301 Permanent | Host != status.satelink.network |

## Configuration Locations

1. **Edge Level (Vercel):** `apps/web/vercel.json` - processed at CDN edge before app
2. **Framework Level (Next.js):** `apps/web/next.config.ts` - processed by Next.js

Both configurations are synchronized. The `missing` condition ensures redirects only apply on the main domain, preventing infinite loops when `status.satelink.network` serves the status page via rewrite.

## Behavior

- Query parameters are preserved: `/status?tab=rpc` → `status.satelink.network/?tab=rpc`
- Subpaths are preserved: `/status/nodes` → `status.satelink.network/nodes`
- HTTPS enforced in destination

## Related Files

- `apps/web/src/app/_status/page.tsx` - Status page React component (served on subdomain, protected route)
- `test/status_redirect.test.js` - Redirect test suite

## Owner

Infrastructure team. Contact: rbpradip@gmail.com

## Future Rules

- Do NOT add /status routes to main domain
- All status-related content should live under status.satelink.network
- If adding status subpaths, ensure they redirect correctly via the `:path*` rule
