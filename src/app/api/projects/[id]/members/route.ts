import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkProjectPermission } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await checkProjectPermission(id, false);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { role: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Erro ao listar membros do projeto:', error);
    return NextResponse.json({ error: 'Erro ao listar membros.' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await checkProjectPermission(id, true);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { email, role, isBlinded } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'E-mail do pesquisador é obrigatório.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Nenhum usuário cadastrado com este e-mail no sistema.' },
        { status: 404 }
      );
    }

    const existingMember = await prisma.projectMember.findFirst({
      where: { projectId: id, userId: user.id },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Este pesquisador já faz parte da equipe deste projeto.' },
        { status: 409 }
      );
    }

    const newMember = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: user.id,
        role: role || 'EVALUATOR',
        isBlinded: Boolean(isBlinded),
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        ...newMember,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    console.error('Erro ao adicionar membro:', error);
    return NextResponse.json({ error: 'Erro ao adicionar membro à equipe.' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await checkProjectPermission(id, true);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { memberId, role, isBlinded } = await req.json();

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        ...(role && { role }),
        ...(isBlinded !== undefined && { isBlinded }),
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: updated.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, member: { ...updated, user } });
  } catch (error) {
    console.error('Erro ao atualizar membro:', error);
    return NextResponse.json({ error: 'Erro ao atualizar membro.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await checkProjectPermission(id, true);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'memberId é obrigatório.' }, { status: 400 });
    }

    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover membro:', error);
    return NextResponse.json({ error: 'Erro ao remover membro da equipe.' }, { status: 500 });
  }
}
