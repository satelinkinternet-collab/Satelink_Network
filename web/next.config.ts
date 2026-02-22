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
      {
        source: "/api/:path*",
        destination: `${API_BASE}/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${API_BASE}/auth/:path*`,
      },
      {
        source: "/me/:path*",
        destination: `${API_BASE}/me/:path*`,
      },
      {
        source: "/__test/:path*",
        destination: `${API_BASE}/__test/:path*`,
      },
      {
        source: "/admin-api/:path*",
        destination: `${API_BASE}/admin-api/:path*`,
      },
      {
        source: "/node-api/:path*",
        destination: `${API_BASE}/node-api/:path*`,
      },
      {
        source: "/dist-api/:path*",
        destination: `${API_BASE}/dist-api/:path*`,
      },
      {
        source: "/ent-api/:path*",
        destination: `${API_BASE}/ent-api/:path*`,
      },
      {
        source: "/stream/:path*",
        destination: `${API_BASE}/stream/:path*`,
      },
      {
        source: "/admin-ctrl/:path*",
        destination: `${API_BASE}/admin/:path*`,
      },
      {
        source: "/admin/:path(command|network|ops|revenue|rewards|security|settings|controls|support)/:rest*",
        destination: `${API_BASE}/admin/:path/:rest*`,
      },
      {
        source: "/support/:path*",
        destination: `${API_BASE}/support/:path*`,
      },
    ];
  },
};

export default nextConfig;
