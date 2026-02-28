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
      // Auth
      { source: '/auth/:path*', destination: 'http://localhost:8080/auth/:path*' },
      // User settings
      { source: '/me/:path*', destination: 'http://localhost:8080/me/:path*' },
      // Admin API (NOT admin pages — those are frontend)
      { source: '/admin-api/:path*', destination: 'http://localhost:8080/admin-api/:path*' },
      // Node API
      { source: '/node-api/:path*', destination: 'http://localhost:8080/node-api/:path*' },
      // Builder API
      { source: '/builder-api/:path*', destination: 'http://localhost:8080/builder-api/:path*' },
      // Distributor API
      { source: '/dist-api/:path*', destination: 'http://localhost:8080/dist-api/:path*' },
      // Enterprise API
      { source: '/ent-api/:path*', destination: 'http://localhost:8080/ent-api/:path*' },
      // Pairing
      { source: '/pair/:path*', destination: 'http://localhost:8080/pair/:path*' },
      // SSE Stream
      { source: '/stream/:path*', destination: 'http://localhost:8080/stream/:path*' },
      // Support
      { source: '/support/:path*', destination: 'http://localhost:8080/support/:path*' },
      // Beta
      { source: '/beta/:path*', destination: 'http://localhost:8080/beta/:path*' },
      // Health
      { source: '/health', destination: 'http://localhost:8080/health' },
      // Test routes (dev only)
      { source: '/__test/:path*', destination: 'http://localhost:8080/__test/:path*' },
      // Webhooks
      { source: '/webhooks/:path*', destination: 'http://localhost:8080/webhooks/:path*' },
      // Network stats
      { source: '/network-stats/:path*', destination: 'http://localhost:8080/network-stats/:path*' },
      // Partners
      { source: '/partners/:path*', destination: 'http://localhost:8080/partners/:path*' },
    ];
  },
};

export default nextConfig;
