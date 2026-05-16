import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'https://rpc.satelink.network';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, walletAddress } = body;

    if (!nodeId || !walletAddress) {
      return NextResponse.json(
        { error: 'nodeId and walletAddress required' },
        { status: 400 }
      );
    }

    // Step 1: Get auth token from backend
    const tokenResponse = await fetch(`${BACKEND}/api/auth/node-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId, walletAddress }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      return NextResponse.json(
        { error: `Auth failed: ${err.slice(0, 100)}` },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok || !tokenData.token) {
      return NextResponse.json(
        { error: tokenData.error || 'No token returned' },
        { status: 400 }
      );
    }

    // Step 2: Call claim endpoint
    const claimResponse = await fetch(
      `${BACKEND}/api/nodes/${nodeId}/claim`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      }
    );

    const claimData = await claimResponse.json();
    return NextResponse.json(claimData);

  } catch (error: any) {
    console.error('[PROXY CLAIM ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Proxy error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
