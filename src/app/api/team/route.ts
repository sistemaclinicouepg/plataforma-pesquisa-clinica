import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() || '';

    const users = await prisma.user.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { role: { contains: search, mode: 'insensitive' } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
        createdAt: true,
        projects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Erro ao buscar equipe de pesquisadores:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar equipe.' },
      { status: 500 }
    );
  }
}
