import { NextResponse } from 'next/server';

const BACKEND = 'https://rpc.satelink.network';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/epochs`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[PROXY EPOCHS ERROR]', error);
    return NextResponse.json({ error: error.message, epochs: [] }, { status: 500 });
  }
}
