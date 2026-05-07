import type { NextConfig } from "next";

// When running inside Docker, Next.js (server-side) must reach the API via
// the Docker service alias "api", not "localhost".
// INTERNAL_API_URL is injected by docker-compose; falls back to localhost for
// plain `next dev` outside Docker.
const API_BASE =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: '../..',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async rewrites() {
    const apiPrefixes = [
      'auth', 'me', 'admin-api', 'node-api', 'builder-api', 'dist-api',
      'ent-api', 'pair', 'stream', 'support', 'beta', 'webhooks',
      'network-stats', 'partners', '__test', 'api', 'v1', 'rpc', 'node',
      'treasury', 'network', 'heartbeat', 'exchange', 'marketplace',
      'connectors', 'compute', 'capacity', 'amm', 'protocol', 'watchdog',
      'settlement',
    ];
    return [
      ...apiPrefixes.map(prefix => ({
        source: `/${prefix}/:path*`,
        destination: `${API_BASE}/${prefix}/:path*`,
      })),
      { source: '/health', destination: `${API_BASE}/health` },
      { source: '/metrics', destination: `${API_BASE}/metrics` },
      { source: '/metrics/json', destination: `${API_BASE}/metrics/json` },
    ];
  },
};

export default nextConfig;
