import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const participantId = searchParams.get('participantId');
    const projectId = searchParams.get('projectId');

    if (!code && !participantId) {
      return NextResponse.json(
        { error: 'Código do participante ou ID é obrigatório.' },
        { status: 400 }
      );
    }

    let whereClause: any = {};
    if (participantId) {
      whereClause.id = participantId;
    } else if (code) {
      whereClause.researchCode = code.trim().toUpperCase();
      if (projectId) {
        whereClause.projectId = projectId;
      }
    }

    const participant = await prisma.participant.findFirst({
      where: whereClause,
      include: {
        patient: {
          select: {
            fullName: true,
            biologicalSex: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            consentForm: {
              select: {
                responsibleResearcher: true,
                ethicsNumber: true,
                ethicsContacts: true,
              },
            },
            forms: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                questionsJson: true,
                expirationHours: true,
                allowLate: true,
                createdAt: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { sessionNumber: 'asc' },
        },
        responses: {
          select: {
            id: true,
            formId: true,
            answersJson: true,
            submittedAt: true,
            isLate: true,
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participante não encontrado com o código fornecido.' },
        { status: 404 }
      );
    }

    // Identificar a sessão ativa mais recente para registro do diário de dor
    const latestSession = participant.sessions[participant.sessions.length - 1] || null;

    // Processar formulários do projeto e identificar status para o participante
    const formsWithStatus = participant.project.forms.map((f) => {
      const resp = participant.responses.find((r) => r.formId === f.id);
      let parsedQuestions = [];
      try {
        parsedQuestions = JSON.parse(f.questionsJson);
      } catch {
        parsedQuestions = [];
      }
      return {
        id: f.id,
        title: f.title,
        description: f.description,
        questions: parsedQuestions,
        expirationHours: f.expirationHours,
        allowLate: f.allowLate,
        createdAt: f.createdAt,
        isCompleted: Boolean(resp),
        submittedAt: resp?.submittedAt ? new Date(resp.submittedAt).toLocaleString('pt-BR') : null,
        myAnswers: resp ? JSON.parse(resp.answersJson || '{}') : null,
      };
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        researchCode: participant.researchCode,
        patientName: participant.patient.fullName,
        projectName: participant.project.name,
        projectId: participant.project.id,
        responsibleResearcher: participant.project.consentForm?.responsibleResearcher || 'Equipe de Pesquisa UEPG',
        ethicsNumber: participant.project.consentForm?.ethicsNumber || 'Em conformidade com o CEP/CONEP',
        ethicsContacts: participant.project.consentForm?.ethicsContacts || 'cep@uepg.br',
        sessions: participant.sessions,
        latestSession,
        forms: formsWithStatus,
      },
    });
  } catch (error) {
    console.error('Erro ao consultar participante:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar dados do participante.' },
      { status: 500 }
    );
  }
}
