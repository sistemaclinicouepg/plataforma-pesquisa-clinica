import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const participantId = searchParams.get('participantId');
    const projectId = searchParams.get('projectId');
    const cpfParam = searchParams.get('cpf') || searchParams.get('cpfPrefix');
    const birthDateParam = searchParams.get('birthDate');

    if (!code && !participantId) {
      return NextResponse.json(
        { error: 'Código do participante ou ID é obrigatório.' },
        { status: 400 }
      );
    }

    let resolvedParticipantId: string | null = participantId;

    if (!resolvedParticipantId && code) {
      const cleanedCode = code.trim().toUpperCase();

      // Buscar todos os participantes que compartilham este código de pesquisa
      const candidates = await prisma.participant.findMany({
        where: {
          researchCode: cleanedCode,
          ...(projectId && { projectId }),
        },
        include: {
          patient: {
            select: {
              fullName: true,
              cpf: true,
              dateOfBirth: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (candidates.length === 0) {
        return NextResponse.json(
          { error: 'Participante não encontrado com o código fornecido.' },
          { status: 404 }
        );
      }

      if (candidates.length === 1) {
        resolvedParticipantId = candidates[0].id;
      } else {
        // Múltiplos voluntários com o mesmo código em projetos distintos.
        // Tentar desambiguar caso o usuário tenha fornecido CPF ou Data de Nascimento
        let filtered = candidates;

        if (cpfParam) {
          const cleanedCpfInput = cpfParam.replace(/\D/g, '');
          if (cleanedCpfInput.length >= 3) {
            filtered = filtered.filter((c) => {
              const pCpf = c.patient.cpf.replace(/\D/g, '');
              return pCpf.startsWith(cleanedCpfInput) || pCpf === cleanedCpfInput;
            });
          }
        }

        if (birthDateParam) {
          const cleanedBirth = birthDateParam.trim();
          filtered = filtered.filter((c) => {
            const dob = new Date(c.patient.dateOfBirth);
            const isoDate = dob.toISOString().split('T')[0];
            const brDate = dob.toLocaleDateString('pt-BR');
            const year = String(dob.getFullYear());
            return (
              cleanedBirth === isoDate ||
              cleanedBirth === brDate ||
              cleanedBirth === year
            );
          });
        }

        if (filtered.length === 1) {
          resolvedParticipantId = filtered[0].id;
        } else {
          // Retornar lista segura de opções para o paciente escolher seu projeto ou confirmar dados
          const options = candidates.map((c) => {
            const rawCpf = c.patient.cpf.replace(/\D/g, '');
            const maskedCpf =
              rawCpf.length >= 3 ? `${rawCpf.slice(0, 3)}.***.***-**` : '***';
            const nameParts = c.patient.fullName.trim().split(/\s+/);
            const maskedName =
              nameParts.length > 1
                ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
                : nameParts[0];
            const birthYear = c.patient.dateOfBirth
              ? new Date(c.patient.dateOfBirth).getFullYear()
              : null;

            return {
              participantId: c.id,
              projectId: c.project.id,
              projectName: c.project.name,
              maskedName,
              maskedCpf,
              cpfPrefix: rawCpf.slice(0, 3),
              birthYear,
            };
          });

          return NextResponse.json({
            multiple: true,
            code: cleanedCode,
            message:
              'Foram encontrados múltiplos voluntários com este código em pesquisas diferentes. Por favor, confirme seu projeto ou seus dados de identificação.',
            options,
          });
        }
      }
    }

    if (!resolvedParticipantId) {
      return NextResponse.json(
        { error: 'Participante não encontrado.' },
        { status: 404 }
      );
    }

    const participant = await prisma.participant.findUnique({
      where: { id: resolvedParticipantId },
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
        { error: 'Participante não encontrado com o identificador fornecido.' },
        { status: 404 }
      );
    }

    // Identificar a sessão ativa mais recente para registro do diário de dor
    const latestSession = participant.sessions[participant.sessions.length - 1] || null;

    // Processar formulários do projeto e identificar status para o participante
    const formsWithStatus = participant.project.forms.map((f: { id: string; title: string; description: string | null; questionsJson: string; expirationHours: number; allowLate: boolean; createdAt: Date }) => {
      const resp = participant.responses.find((r: { formId: string; submittedAt: Date; answersJson: string | null }) => r.formId === f.id);
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
