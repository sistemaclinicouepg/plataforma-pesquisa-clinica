import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function matchesBirthDate(dobRaw: Date | string | null | undefined, inputRaw: string): boolean {
  if (!dobRaw || !inputRaw) return false;
  const dob = new Date(dobRaw);
  if (isNaN(dob.getTime())) return false;

  const input = inputRaw.trim();
  const digits = input.replace(/\D/g, '');

  const utcYear = dob.getUTCFullYear();
  const utcMonth = dob.getUTCMonth() + 1;
  const utcDay = dob.getUTCDate();

  const locYear = dob.getFullYear();
  const locMonth = dob.getMonth() + 1;
  const locDay = dob.getDate();

  // Caso 1: Usuário informou apenas o ano de nascimento (4 dígitos)
  if (digits.length === 4) {
    const inputYear = Number(digits);
    return inputYear === utcYear || inputYear === locYear;
  }

  // Caso 2: Formato ISO YYYY-MM-DD
  const utcIso = `${utcYear}-${String(utcMonth).padStart(2, '0')}-${String(utcDay).padStart(2, '0')}`;
  const locIso = `${locYear}-${String(locMonth).padStart(2, '0')}-${String(locDay).padStart(2, '0')}`;
  if (input === utcIso || input === locIso) return true;

  // Caso 3: Formato BR DD/MM/YYYY
  const utcBr = `${String(utcDay).padStart(2, '0')}/${String(utcMonth).padStart(2, '0')}/${utcYear}`;
  const locBr = `${String(locDay).padStart(2, '0')}/${String(locMonth).padStart(2, '0')}/${locYear}`;
  if (input === utcBr || input === locBr) return true;

  // Caso 4: Somente dígitos DDMMYYYY
  const utcDigits = `${String(utcDay).padStart(2, '0')}${String(utcMonth).padStart(2, '0')}${utcYear}`;
  const locDigits = `${String(locDay).padStart(2, '0')}${String(locMonth).padStart(2, '0')}${locYear}`;
  if (digits === utcDigits || digits === locDigits) return true;

  // Caso 5: Componentes separados por barra ou hífen sem zero à esquerda (ex: 1/1/1998)
  const parts = input.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if ((y === utcYear && m === utcMonth && d === utcDay) || (y === locYear && m === locMonth && d === locDay)) {
        return true;
      }
    } else {
      const d = Number(parts[0]);
      const m = Number(parts[1]);
      const y = Number(parts[2]);
      if ((y === utcYear && m === utcMonth && d === utcDay) || (y === locYear && m === locMonth && d === locDay)) {
        return true;
      }
    }
  }

  return false;
}

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
      const codeWithoutHyphen = cleanedCode.replace(/-/g, '');
      const codeVariants = [cleanedCode, codeWithoutHyphen];

      const pMatch = cleanedCode.match(/^P(\d+)-?(\d+)$/);
      if (pMatch) {
        const pNum = String(parseInt(pMatch[1], 10)).padStart(2, '0');
        const sNum = String(parseInt(pMatch[2], 10)).padStart(3, '0');
        codeVariants.push(`P${pNum}-${sNum}`);
        codeVariants.push(`P${pMatch[1]}-${sNum}`);
        codeVariants.push(`P${pNum}${sNum}`);
      }

      // Buscar todos os participantes que compartilham ou correspondem a este código
      let candidates = await prisma.participant.findMany({
        where: {
          researchCode: { in: codeVariants },
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

      // Se não encontrou e o projectId foi fornecido, tenta busca pelo sufixo numérico no projeto
      if (candidates.length === 0 && projectId) {
        const digitsMatch = cleanedCode.match(/\d+$/);
        if (digitsMatch) {
          const numPadded = digitsMatch[0].padStart(3, '0');
          candidates = await prisma.participant.findMany({
            where: {
              projectId,
              OR: [
                { researchCode: { endsWith: `-${numPadded}` } },
                { researchCode: `P${numPadded}` },
              ],
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
        }
      }

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
              const pCpf = (c.patient.cpf || '').replace(/\D/g, '');
              return pCpf.startsWith(cleanedCpfInput) || pCpf === cleanedCpfInput;
            });
          }
        }

        if (birthDateParam) {
          filtered = filtered.filter((c) =>
            matchesBirthDate(c.patient.dateOfBirth, birthDateParam)
          );
        }

        if (filtered.length === 1) {
          resolvedParticipantId = filtered[0].id;
        } else if (filtered.length === 0 && (cpfParam || birthDateParam)) {
          return NextResponse.json(
            {
              error:
                'Nenhum voluntário encontrado com os dados de confirmação (CPF ou data de nascimento) informados.',
            },
            { status: 404 }
          );
        } else {
          // Retornar lista segura de opções para o paciente escolher seu projeto ou confirmar dados
          const options = candidates.map((c) => {
            const rawCpf = (c.patient.cpf || '').replace(/\D/g, '');
            const maskedCpf =
              rawCpf.length >= 3 ? `${rawCpf.slice(0, 3)}.***.***-**` : '***';
            const nameParts = (c.patient.fullName || '').trim().split(/\s+/);
            const maskedName =
              nameParts.length > 1
                ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
                : nameParts[0];
            const birthYear = c.patient.dateOfBirth
              ? new Date(c.patient.dateOfBirth).getUTCFullYear() ||
                new Date(c.patient.dateOfBirth).getFullYear()
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
            members: {
              include: {
                user: {
                  select: { name: true, email: true },
                },
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

    // Processar formulários do projeto destinados ao paciente (PROMs)
    const patientForms = participant.project.forms.filter(
      (f: { description: string | null }) => !f.description?.includes('Preenchido por: Pesquisador')
    );

    const formsWithStatus = patientForms.map((f: { id: string; title: string; description: string | null; questionsJson: string; expirationHours: number; allowLate: boolean; createdAt: Date }) => {
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
        researcherPhone: null,
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
