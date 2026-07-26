import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained production build (node .next/standalone/server.js) —
  // ideal for Docker / bare-VPS deploys without node_modules on the host.
  output: 'standalone',

  // The repo root also has a package-lock.json (backend) — pin the
  // workspace root to this app so Turbopack doesn't get confused.
  turbopack: {
    root: __dirname,
  },

  // Proxy browser requests to the Express backend so the frontend and API
  // share one origin (no CORS). BACKEND_URL is read at server start,
  // so the same build works in any environment.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
