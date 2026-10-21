import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const forms = await prisma.form.findMany({
      where: projectId ? { projectId } : {},
      include: {
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ forms });
  } catch (error) {
    console.error('Erro ao listar formulários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar formulários.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, title, description, questions, expirationHours, allowLate } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Título do formulário é obrigatório.' },
        { status: 400 }
      );
    }

    // Se não tiver projectId selecionado, associa ao primeiro projeto ativo
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const firstProject = await prisma.project.findFirst();
      targetProjectId = firstProject?.id;
    }

    if (!targetProjectId) {
      return NextResponse.json(
        { error: 'Nenhum projeto encontrado para vincular este formulário.' },
        { status: 400 }
      );
    }

    const newForm = await prisma.form.create({
      data: {
        projectId: targetProjectId,
        title: title.trim(),
        description: description?.trim() || null,
        questionsJson: JSON.stringify(questions || []),
        expirationHours: Number(expirationHours) || 24,
        allowLate: Boolean(allowLate),
      },
    });

    return NextResponse.json({ success: true, form: newForm });
  } catch (error) {
    console.error('Erro ao salvar formulário:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar formulário no banco de dados.' },
      { status: 500 }
    );
  }
}
