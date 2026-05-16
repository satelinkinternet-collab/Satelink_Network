import { NextResponse } from 'next/server';

const BACKEND = 'https://rpc.satelink.network';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/epochs`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 10 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
