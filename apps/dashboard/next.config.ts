import type { NextConfig } from "next";

// When running inside Docker, Next.js (server-side) must reach the API via
// the Docker service alias "api", not "localhost".
// INTERNAL_API_URL is injected by docker-compose; falls back to localhost for
// plain `next dev` outside Docker.
const API_BASE =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

const nextConfig: NextConfig = {
  // Prevent Next.js from adding its own caching headers to proxied API responses
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/system/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/network/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/admin-api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Admin API calls: only proxy when X-API-Call header is present (from axios)
      // This prevents conflicts with Next.js page routes at the same paths
      {
        source: '/admin/:path*',
        has: [{ type: 'header', key: 'x-api-call' }],
        destination: `${API_BASE}/admin/:path*`,
      },
      { source: '/auth/:path*', destination: `${API_BASE}/auth/:path*` },
      { source: '/me/:path*', destination: `${API_BASE}/me/:path*` },
      { source: '/admin-api/:path*', destination: `${API_BASE}/admin-api/:path*` },
      { source: '/node-api/:path*', destination: `${API_BASE}/node-api/:path*` },
      { source: '/builder-api/:path*', destination: `${API_BASE}/builder-api/:path*` },
      { source: '/dist-api/:path*', destination: `${API_BASE}/dist-api/:path*` },
      { source: '/ent-api/:path*', destination: `${API_BASE}/ent-api/:path*` },
      // Note: /node/* frontend calls use /node-api/* which has its own rewrite above
      // /economics/* — no page conflict, direct proxy
      { source: '/economics/:path*', destination: `${API_BASE}/economics/:path*` },
      // /treasury/* — no page conflict, direct proxy
      { source: '/treasury/:path*', destination: `${API_BASE}/treasury/:path*` },
      { source: '/settlement/:path*', destination: `${API_BASE}/settlement/:path*` },
      { source: '/pair/:path*', destination: `${API_BASE}/pair/:path*` },
      { source: '/stream/:path*', destination: `${API_BASE}/stream/:path*` },
      { source: '/support/:path*', destination: `${API_BASE}/support/:path*` },
      { source: '/beta/:path*', destination: `${API_BASE}/beta/:path*` },
      { source: '/dev/:path*', destination: `${API_BASE}/dev/:path*` },
      { source: '/health', destination: `${API_BASE}/health` },
      { source: '/__test/:path*', destination: `${API_BASE}/__test/:path*` },
      { source: '/webhooks/:path*', destination: `${API_BASE}/webhooks/:path*` },
      { source: '/network-stats/:path*', destination: `${API_BASE}/network-stats/:path*` },
      { source: '/partners/:path*', destination: `${API_BASE}/partners/:path*` },
      { source: '/system/:path*', destination: `${API_BASE}/system/:path*` },
      { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },
      { source: '/network/health', destination: `${API_BASE}/network/health` },
    ];
  },
};

export default nextConfig;
