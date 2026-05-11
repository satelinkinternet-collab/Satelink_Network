/**
 * Public RPC Proxy Endpoint
 *
 * Routes: /api/rpc/:chain (e.g., /api/rpc/amoy, /api/rpc/polygon)
 *
 * Proxies JSON-RPC requests to the Satelink backend API.
 * If backend is not available, falls back to direct chain RPC.
 *
 * Env vars:
 *   NEXT_PUBLIC_API_BASE - Backend API URL (e.g., https://api.satelink.network)
 *   FALLBACK_RPC_AMOY    - Fallback RPC for Polygon Amoy
 */

import { NextRequest, NextResponse } from 'next/server';

const CHAIN_RPC_FALLBACKS: Record<string, string> = {
  amoy: process.env.FALLBACK_RPC_AMOY || 'https://rpc-amoy.polygon.technology',
  polygon: process.env.FALLBACK_RPC_POLYGON || 'https://polygon-rpc.com',
  ethereum: process.env.FALLBACK_RPC_ETHEREUM || 'https://eth.llamarpc.com',
};

const SUPPORTED_CHAINS = new Set(Object.keys(CHAIN_RPC_FALLBACKS));

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params;

  if (!SUPPORTED_CHAINS.has(chain)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported chain: ${chain}` },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Validate JSON-RPC format
  if (!body.jsonrpc || body.jsonrpc !== '2.0' || !body.method) {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON-RPC 2.0 format' },
      { status: 400 }
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  const apiKey = request.headers.get('x-api-key');

  // Try backend first if configured
  if (apiBase) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers['x-api-key'] = apiKey;

      const backendUrl = `${apiBase}/v1/workload/rpc/${chain}`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (err) {
      console.warn(`[RPC Proxy] Backend failed, falling back to direct RPC: ${err}`);
    }
  }

  // Fallback: direct RPC call (no billing)
  const fallbackUrl = CHAIN_RPC_FALLBACKS[chain];
  try {
    const response = await fetch(fallbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Add header to indicate fallback mode
    return NextResponse.json(data, {
      status: 200,
      headers: { 'X-Satelink-Mode': 'fallback' },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'RPC request failed', details: String(err) },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Satelink RPC Gateway',
    chains: Array.from(SUPPORTED_CHAINS),
    docs: 'https://docs.satelink.network/rpc',
  });
}
