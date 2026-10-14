import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // Se estiver logado, busca os projetos vinculados; caso contrário, busca todos para modo demonstração
    let projects;
    if (currentUser) {
      projects = await prisma.project.findMany({
        where: currentUser.role === 'ADMIN' ? {} : {
          members: {
            some: { userId: currentUser.id },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          participants: {
            select: { id: true, status: true },
          },
          forms: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      projects = await prisma.project.findMany({
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          participants: {
            select: { id: true, status: true },
          },
          forms: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ projects, currentUser });
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    return NextResponse.json({ error: 'Erro ao carregar projetos.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'O nome do projeto é obrigatório.' }, { status: 400 });
    }

    // Se não houver usuário logado no momento, vincula ao primeiro pesquisador encontrado
    let userId = currentUser?.id;
    if (!userId) {
      const fallbackUser = await prisma.user.findFirst();
      userId = fallbackUser?.id;
    }

    const newProject = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    let members: unknown[] = [];
    if (userId) {
      const coordinator = await prisma.projectMember.create({
        data: {
          projectId: newProject.id,
          userId: userId,
          role: 'COORDINATOR',
          isBlinded: false,
        },
      });
      members = [coordinator];
    }

    return NextResponse.json({ success: true, project: { ...newProject, members } });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return NextResponse.json({ error: 'Erro ao criar projeto.' }, { status: 500 });
  }
}
