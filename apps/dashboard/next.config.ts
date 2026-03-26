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
      { source: '/auth/:path*', destination: `${API_BASE}/auth/:path*` },
      { source: '/me/:path*', destination: `${API_BASE}/me/:path*` },
      { source: '/admin-api/:path*', destination: `${API_BASE}/admin-api/:path*` },
      { source: '/node-api/:path*', destination: `${API_BASE}/node-api/:path*` },
      { source: '/builder-api/:path*', destination: `${API_BASE}/builder-api/:path*` },
      { source: '/dist-api/:path*', destination: `${API_BASE}/dist-api/:path*` },
      { source: '/ent-api/:path*', destination: `${API_BASE}/ent-api/:path*` },
      { source: '/pair/:path*', destination: `${API_BASE}/pair/:path*` },
      { source: '/stream/:path*', destination: `${API_BASE}/stream/:path*` },
      { source: '/support/:path*', destination: `${API_BASE}/support/:path*` },
      { source: '/beta/:path*', destination: `${API_BASE}/beta/:path*` },
      { source: '/health', destination: `${API_BASE}/health` },
      { source: '/__test/:path*', destination: `${API_BASE}/__test/:path*` },
      { source: '/webhooks/:path*', destination: `${API_BASE}/webhooks/:path*` },
      { source: '/network-stats/:path*', destination: `${API_BASE}/network-stats/:path*` },
      { source: '/partners/:path*', destination: `${API_BASE}/partners/:path*` },
      { source: '/system/:path*', destination: `${API_BASE}/system/:path*` },
      { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },
      { source: '/network/:path(health|stats)$', destination: `${API_BASE}/network/:path*` },
    ];
  },
};

export default nextConfig;
