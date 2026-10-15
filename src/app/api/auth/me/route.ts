import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  };
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401, headers });
  }
  return NextResponse.json({ user }, { headers });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
