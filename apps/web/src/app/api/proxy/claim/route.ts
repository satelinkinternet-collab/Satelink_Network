import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'https://rpc.satelink.network';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodeId, walletAddress } = body;

    if (!nodeId || !walletAddress) {
      return NextResponse.json({ error: 'nodeId and walletAddress required' }, { status: 400 });
    }

    // Step 1: Get auth token (server-to-server, no CORS)
    const tokenRes = await fetch(`${BACKEND}/api/auth/node-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId, walletAddress }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.ok || !tokenData.token) {
      return NextResponse.json({
        error: tokenData.error || 'Auth failed',
        debug: tokenData
      }, { status: 400 });
    }

    // Step 2: Call claim endpoint with token (server-to-server, no CORS)
    const claimRes = await fetch(`${BACKEND}/api/nodes/${nodeId}/claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });
    const claimData = await claimRes.json();

    return NextResponse.json(claimData);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
