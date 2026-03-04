import type { NextConfig } from "next";

// When running inside Docker, Next.js (server-side) must reach the API via
// the Docker service alias "api", not "localhost".
// INTERNAL_API_URL is injected by docker-compose; falls back to localhost for
// plain `next dev` outside Docker.
const API_BASE =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // General API catch-all
      { source: "/api/:path*", destination: `${API_BASE}/:path*` },
      // Auth
      { source: "/auth/:path*", destination: `${API_BASE}/auth/:path*` },
      // User settings
      { source: "/me/:path*", destination: `${API_BASE}/me/:path*` },
      // Admin API (NOT admin pages — those are frontend)
      { source: "/admin-api/:path*", destination: `${API_BASE}/admin-api/:path*` },
      // Admin control proxy (frontend /admin-ctrl/* → backend /admin/*)
      { source: "/admin-ctrl/:path*", destination: `${API_BASE}/admin/:path*` },
      // Dashboard API
      { source: "/dashboard/:path*", destination: `${API_BASE}/dashboard/:path*` },
      // Node API
      { source: "/node-api/:path*", destination: `${API_BASE}/node-api/:path*` },
      // Builder API
      { source: "/builder-api/:path*", destination: `${API_BASE}/builder-api/:path*` },
      // Distributor API
      { source: "/dist-api/:path*", destination: `${API_BASE}/dist-api/:path*` },
      // Enterprise API
      { source: "/ent-api/:path*", destination: `${API_BASE}/ent-api/:path*` },
      // SSE Stream
      { source: "/stream/:path*", destination: `${API_BASE}/stream/:path*` },
      // Pairing
      { source: "/pair/:path*", destination: `${API_BASE}/pair/:path*` },
      // Support
      { source: "/support/:path*", destination: `${API_BASE}/support/:path*` },
      // Beta
      { source: "/beta/:path*", destination: `${API_BASE}/beta/:path*` },
      // Health
      { source: "/health", destination: `${API_BASE}/health` },
      // Test routes (dev only)
      { source: "/__test/:path*", destination: `${API_BASE}/__test/:path*` },
      // Webhooks
      { source: "/webhooks/:path*", destination: `${API_BASE}/webhooks/:path*` },
      // Network stats
      { source: "/network-stats/:path*", destination: `${API_BASE}/network-stats/:path*` },
      // Partners
      { source: "/partners/:path*", destination: `${API_BASE}/partners/:path*` },
      // Admin sub-APIs
      { source: "/admin/economics/:path*", destination: `${API_BASE}/admin/economics/:path*` },
      { source: "/admin/autonomous/:path*", destination: `${API_BASE}/admin/autonomous/:path*` },
      { source: "/admin/forensics/:path*", destination: `${API_BASE}/admin/forensics/:path*` },
      { source: "/admin/control/:path*", destination: `${API_BASE}/admin/control/:path*` },
      { source: "/admin/partners/:path*", destination: `${API_BASE}/admin/partners/:path*` },
      { source: "/admin/network/:path*", destination: `${API_BASE}/admin/network/:path*` },
      // Partner portal
      { source: "/partner/:path*", destination: `${API_BASE}/partner/:path*` },
      // Operations
      { source: "/operations/:path*", destination: `${API_BASE}/operations/:path*` },
      // Ledger
      { source: "/ledger/:path*", destination: `${API_BASE}/ledger/:path*` },
      // Heartbeat
      { source: "/heartbeat", destination: `${API_BASE}/heartbeat` },
      // API docs
      { source: "/api-docs", destination: `${API_BASE}/api-docs` },
      // Usage
      { source: "/usage/:path*", destination: `${API_BASE}/usage/:path*` },
    ];
  },
};

export default nextConfig;
