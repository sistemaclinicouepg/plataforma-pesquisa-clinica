import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('projectId');

    if (id) {
      const form = await prisma.form.findUnique({
        where: { id },
        include: {
          project: {
            select: { id: true, name: true },
          },
          _count: {
            select: { responses: true },
          },
        },
      });
      if (!form) {
        return NextResponse.json({ error: 'Formulário não encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ form });
    }

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

    // Se id foi fornecido, atualiza o formulário existente
    if (body.id) {
      const updated = await prisma.form.update({
        where: { id: body.id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          questionsJson: JSON.stringify(questions || []),
          expirationHours: Number(expirationHours) || 24,
          allowLate: Boolean(allowLate),
        },
      });
      return NextResponse.json({ success: true, form: updated });
    }

    // Se já existe um formulário idêntico sem respostas neste projeto, atualiza-o (evita duplicidade ao salvar)
    const existingUnanswered = await prisma.form.findFirst({
      where: {
        projectId: targetProjectId,
        title: title.trim(),
        responses: { none: {} },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingUnanswered) {
      const updated = await prisma.form.update({
        where: { id: existingUnanswered.id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          questionsJson: JSON.stringify(questions || []),
          expirationHours: Number(expirationHours) || 24,
          allowLate: Boolean(allowLate),
        },
      });
      return NextResponse.json({ success: true, form: updated });
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do formulário é obrigatório.' }, { status: 400 });
    }

    const form = await prisma.form.findUnique({
      where: { id },
    });

    if (!form) {
      return NextResponse.json({ error: 'Formulário não encontrado.' }, { status: 404 });
    }

    // Exclui respostas associadas se houver
    await prisma.formResponse.deleteMany({
      where: { formId: id },
    });

    await prisma.form.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Formulário excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir formulário:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir formulário.' },
      { status: 500 }
    );
  }
}
