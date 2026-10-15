import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Consulta ultra-leve para manter o compute do Neon acordado e quente
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', timestamp: Date.now() }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err?.message || 'Database ping failed' },
      { status: 500 }
    );
  }
}
