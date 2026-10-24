import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { parseStudyProtocol, PRESET_FORM_QUESTIONS, getFrequencyLabel } from '@/lib/studyProtocol';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // Se estiver logado, busca os projetos vinculados; caso contrário, busca todos para modo demonstração
    const selectFields = {
      id: true,
      name: true,
      description: true,
      status: true,
      anamnesisTemplate: true,
      createdAt: true,
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
    };

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Não autorizado. Autenticação de pesquisador necessária.' },
        { status: 401 }
      );
    }

    const isAdmin = currentUser.role === 'ADMIN' || currentUser.email === 'admin@uepg.br';

    const projects = await prisma.project.findMany({
      where: isAdmin
        ? {}
        : {
            members: {
              some: { userId: currentUser.id },
            },
          },
      select: selectFields,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      { projects, currentUser },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    return NextResponse.json({ error: 'Erro ao carregar projetos.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { name, description, status, anamnesisTemplate } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'O nome do projeto é obrigatório.' }, { status: 400 });
    }

    // Se não houver usuário logado no momento, vincula ao primeiro pesquisador encontrado
    let userId = currentUser?.id;
    if (!userId) {
      const fallbackUser = await prisma.user.findFirst();
      userId = fallbackUser?.id;
    }

    const projectStatus =
      typeof status === 'string' && ['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())
        ? status.toUpperCase()
        : 'ACTIVE';

    const newProject = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: projectStatus,
        anamnesisTemplate: anamnesisTemplate
          ? (typeof anamnesisTemplate === 'string' ? anamnesisTemplate : JSON.stringify(anamnesisTemplate))
          : null,
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

    // Formulários eCRF são gerenciados exclusivamente pelo Construtor de Fichas do projeto.
    // Preservamos o protocolo no template de anamnese sem criar formulários genéricos duplicados no banco.

    return NextResponse.json({ success: true, project: { ...newProject, members } });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return NextResponse.json({ error: 'Erro ao criar projeto.' }, { status: 500 });
  }
}
