import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Autenticação de pesquisador necessária.' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('formId');
    const participantId = searchParams.get('participantId');
    const projectId = searchParams.get('projectId');

    const where: Record<string, unknown> = {};
    if (formId) where.formId = formId;
    if (participantId) where.participantId = participantId;
    if (projectId) where.form = { projectId };

    const responses = await prisma.formResponse.findMany({
      where,
      include: {
        form: {
          select: {
            id: true,
            title: true,
            questionsJson: true,
          },
        },
        participant: {
          select: {
            id: true,
            researchCode: true,
            patient: {
              select: { fullName: true },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar respostas de formulários.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { formId, participantId, answers, signatureData, isLate } = await req.json();

    // Se formId não for informado, associa ao formulário mais recente
    let targetFormId = formId;
    if (!targetFormId) {
      const latestForm = await prisma.form.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      targetFormId = latestForm?.id;
    }

    if (!targetFormId) {
      return NextResponse.json(
        { error: 'Nenhum formulário ativo encontrado.' },
        { status: 400 }
      );
    }

    // Se o participante já respondeu a este formulário, atualiza; senão cria
    let response;
    if (participantId && targetFormId) {
      const existing = await prisma.formResponse.findFirst({
        where: { participantId, formId: targetFormId },
      });

      if (existing) {
        response = await prisma.formResponse.update({
          where: { id: existing.id },
          data: {
            answersJson: JSON.stringify(answers || {}),
            signatureData: signatureData || null,
            isLate: Boolean(isLate),
            submittedAt: new Date(),
          },
        });
      } else {
        response = await prisma.formResponse.create({
          data: {
            formId: targetFormId,
            participantId,
            answersJson: JSON.stringify(answers || {}),
            signatureData: signatureData || null,
            isLate: Boolean(isLate),
          },
        });
      }
    } else {
      response = await prisma.formResponse.create({
        data: {
          formId: targetFormId,
          participantId: participantId || null,
          answersJson: JSON.stringify(answers || {}),
          signatureData: signatureData || null,
          isLate: Boolean(isLate),
        },
      });
    }

    return NextResponse.json({ success: true, responseId: response.id });
  } catch (error) {
    console.error('Erro ao salvar resposta do paciente:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar resposta no banco de dados.' },
      { status: 500 }
    );
  }
}
