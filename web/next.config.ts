import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/:path*', // Proxy to Backend
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:8080/auth/:path*', // Proxy Auth
      },
      {
        source: '/me/:path*',
        destination: 'http://localhost:8080/me/:path*', // Proxy User Settings
      },
      {
        source: '/__test/:path*',
        destination: 'http://localhost:8080/__test/:path*', // Proxy Test Routes
      },
      {
        source: '/admin-api/:path*',
        destination: 'http://localhost:8080/admin-api/:path*',
      },
      {
        source: '/node-api/:path*',
        destination: 'http://localhost:8080/node-api/:path*',
      },
      {
        source: '/dist-api/:path*',
        destination: 'http://localhost:8080/dist-api/:path*',
      },
      {
        source: '/ent-api/:path*',
        destination: 'http://localhost:8080/ent-api/:path*',
      },
      {
        source: '/stream/:path*',
        destination: 'http://localhost:8080/stream/:path*',
      },
      {
        source: '/admin-ctrl/:path*',
        destination: 'http://localhost:8080/admin/:path*',
      },
      {
        source: '/admin/:path(command|network|ops|revenue|rewards|security|settings|controls|support)/:rest*',
        destination: 'http://localhost:8080/admin/:path/:rest*',
      },
      {
        source: '/support/:path*',
        destination: 'http://localhost:8080/support/:path*',
      }
    ];
  },
};

export default nextConfig;
