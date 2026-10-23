import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseStudyProtocol, getFrequencyLabel } from '@/lib/studyProtocol';
import { parseUnlockMeta } from '@/lib/unlockProtocol';

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
      const rawCode = code.trim().toUpperCase();
      const cleanedCode = rawCode;
      const codeWithoutHyphen = rawCode.replace(/[^A-Z0-9]/g, '');

      // Mapeamento retroativo de códigos antigos/sequenciais para os novos códigos seguros sem hífen
      const LEGACY_CODE_MAP: Record<string, string> = {
        'P01001': 'P013WD6', 'P01-001': 'P013WD6', 'P001': 'P013WD6',
        'P01002': 'P01FV5K', 'P01-002': 'P01FV5K',
        'P01003': 'P017D8Y', 'P01-003': 'P017D8Y',
        'P01004': 'P01WGMJ', 'P01-004': 'P01WGMJ',
        'P02001': 'P02MS4V', 'P02-001': 'P02MS4V',
        'P01005': 'P01HD8J', 'P01-005': 'P01HD8J',
        'P02002': 'P02MM9P', 'P02-002': 'P02MM9P',
        'P03001': 'P03XHTS', 'P03-001': 'P03XHTS',
        'P01006': 'P0143Q9', 'P01-006': 'P0143Q9',
        'P04001': 'P0423QR', 'P04-001': 'P0423QR',
        'P05001': 'P05CQWE', 'P05-001': 'P05CQWE',
        'P04002': 'P04SUV3', 'P04-002': 'P04SUV3',
        'P07001': 'P07NN23', 'P07-001': 'P07NN23',
      };

      const mappedLegacyCode = LEGACY_CODE_MAP[codeWithoutHyphen] || LEGACY_CODE_MAP[rawCode];

      const codeVariants = [rawCode, codeWithoutHyphen];
      if (mappedLegacyCode) {
        codeVariants.push(mappedLegacyCode);
      }

      // Se o usuário digitou com ou sem hífen (ex: P01-3WD6 ou P013WD6)
      if (codeWithoutHyphen.length >= 5) {
        codeVariants.push(`${codeWithoutHyphen.slice(0, codeWithoutHyphen.length - 4)}-${codeWithoutHyphen.slice(-4)}`);
      }

      // Suporte legado para códigos sequenciais antigos (ex: P01-001)
      const pMatch = codeWithoutHyphen.match(/^P(\d+)(\d{3})$/);
      if (pMatch) {
        const pNum = String(parseInt(pMatch[1], 10)).padStart(2, '0');
        const sNum = pMatch[2];
        codeVariants.push(`P${pNum}-${sNum}`);
        codeVariants.push(`P${pMatch[1]}-${sNum}`);
        codeVariants.push(`P${pNum}${sNum}`);
      }

      // Buscar todos os participantes que compartilham ou correspondem a este código ou CPF
      const isPossibleCpf = codeWithoutHyphen.length >= 8 || rawCode.includes('.') || rawCode.includes('-');
      let candidates = await prisma.participant.findMany({
        where: {
          OR: [
            { researchCode: { in: codeVariants } },
            { researchCode: codeWithoutHyphen },
            { researchCode: rawCode },
            ...(isPossibleCpf
              ? [
                  { patient: { cpf: rawCode } },
                  { patient: { cpf: codeWithoutHyphen } },
                  { patient: { cpf: { contains: codeWithoutHyphen } } },
                ]
              : []),
          ],
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
            anamnesisTemplate: true,
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
          orderBy: { submittedAt: 'desc' },
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

    // Protocolo de sessões do estudo
    const protocol = parseStudyProtocol(participant.project.anamnesisTemplate);
    const totalSessions = Number(protocol.totalSessions) || 3;
    const completedSessionNumbers = participant.sessions.map((s) => s.sessionNumber);
    const maxCompletedSession = completedSessionNumbers.length > 0 ? Math.max(...completedSessionNumbers) : 0;

    // Metadados de liberação manual configurados pelos pesquisadores
    const allUnlockedForms = participant.sessions.flatMap((s) => parseUnlockMeta(s.notes).unlockedForms);

    // Processar formulários do projeto destinados ao paciente (PROMs)
    // Regra GCP: Exibir exclusivamente os questionários e perguntas criadas no eCRF deste projeto de pesquisa
    const patientForms = participant.project.forms.filter(
      (f: { id: string; title: string; description: string | null }) => {
        // Se foi liberado expressamente pelo pesquisador, torna visível imediatamente
        if (allUnlockedForms.includes(f.id)) {
          return true;
        }

        // 1. Desconsiderar formulários de preenchimento exclusivo pelo pesquisador
        if (f.description?.includes('Preenchido por: Pesquisador')) return false;

        const lowerTitle = f.title.toLowerCase();
        const lowerDesc = (f.description || '').toLowerCase();
        const combined = `${lowerTitle} ${lowerDesc}`;

        // 2. Questionários vinculados à consulta vs. Acompanhamento Domiciliar por tempo pré-definido:
        // Questionários domiciliares por tempo pré-definido (ex: Clareamento Caseiro: 24h, 48h, 7 dias, etc.)
        // NUNCA devem ser bloqueados por falta de sessões clínicas presenciais registradas!
        const isTimeBased =
          combined.includes('modalidade: tempo') ||
          combined.includes('domiciliar') ||
          combined.includes('caseiro') ||
          combined.includes('tempo:') ||
          combined.includes('24h') ||
          combined.includes('48h') ||
          combined.includes('7 dia') ||
          combined.includes('14 dia') ||
          combined.includes('21 dia') ||
          combined.includes('30 dia') ||
          combined.includes('semanal') ||
          combined.includes('diário') ||
          combined.includes('diario');

        if (!isTimeBased) {
          // Formulários vinculados a uma sessão clínica futura específica (ex: "Sessão 2", "3ª Sessão")
          // Exigem que a respectiva sessão clínica tenha sido realizada ou desbloqueada pelo pesquisador
          const sessMatch = combined.match(/sess[ãa]o\s*(\d+)/i) || combined.match(/(\d+)ª?\s*sess[ãa]o/i);
          if (sessMatch) {
            const requiredSession = parseInt(sessMatch[1], 10);
            if (requiredSession > 1 && requiredSession > maxCompletedSession) {
              return false; // Sessão clínica presencial posterior ainda não realizada
            }
          }
        }

        return true;
      }
    );

    const formsWithStatus = patientForms.map((f: { id: string; title: string; description: string | null; questionsJson: string; expirationHours: number; allowLate: boolean; createdAt: Date }) => {
      const resp = participant.responses.find((r: { formId: string; submittedAt: Date; answersJson: string | null }) => r.formId === f.id);
      let parsedQuestions = [];
      try {
        parsedQuestions = JSON.parse(f.questionsJson);
      } catch {
        parsedQuestions = [];
      }

      // Identificar ocorrência formatada e modalidade do formulário de acordo com cada estudo
      const desc = f.description || '';
      const lowerDesc = desc.toLowerCase();
      const lowerTitle = f.title.toLowerCase();
      const combined = `${lowerTitle} ${lowerDesc}`;

      const isTimeBased =
        combined.includes('modalidade: tempo') ||
        combined.includes('domiciliar') ||
        combined.includes('caseiro') ||
        combined.includes('tempo:') ||
        combined.includes('24h') ||
        combined.includes('48h') ||
        combined.includes('7 dia') ||
        combined.includes('14 dia') ||
        combined.includes('21 dia') ||
        combined.includes('30 dia') ||
        combined.includes('semanal') ||
        combined.includes('diário') ||
        combined.includes('diario');

      const modality: 'SESSION' | 'TIME_BASED' = isTimeBased ? 'TIME_BASED' : 'SESSION';

      let occurrence = isTimeBased ? 'Acompanhamento Domiciliar por Tempo' : 'Consulta Clínica Presencial';

      const matchingProto = protocol.forms?.find((pf) => {
        if (pf.id === 'ohip' && lowerTitle.includes('ohip')) return true;
        if (pf.id === 'satisfaction' && (lowerTitle.includes('satisfação') || lowerTitle.includes('satisfacao'))) return true;
        if (pf.id === 'habits' && (lowerTitle.includes('hábito') || lowerTitle.includes('habito'))) return true;
        if (pf.id === 'eva' && (lowerTitle.includes('escala visual analógica') || lowerTitle.includes('sensibilidade'))) return true;
        return pf.title.toLowerCase() === lowerTitle;
      });

      const freqMatch = desc.match(/Frequência:\s*([^|]+)/i);
      const occMatch = desc.match(/Ocorrência:\s*([^|]+)/i);
      if (freqMatch) {
        occurrence = freqMatch[1].trim();
      } else if (occMatch) {
        occurrence = occMatch[1].trim();
      } else if (matchingProto?.frequencyDescription) {
        occurrence = matchingProto.frequencyDescription;
      } else if (matchingProto?.frequency) {
        occurrence = getFrequencyLabel(matchingProto.frequency);
      } else if (combined.includes('linha de base') || combined.includes('admissão') || combined.includes('triagem') || combined.includes('inicial')) {
        occurrence = 'Linha de Base / Admissão';
      } else if (combined.includes('24h') || combined.includes('24 horas')) {
        occurrence = 'Tempo: 24 Horas (Domiciliar)';
      } else if (combined.includes('48h') || combined.includes('48 horas')) {
        occurrence = 'Tempo: 48 Horas (Domiciliar)';
      } else if (combined.includes('7 dias') || combined.includes('1ª semana')) {
        occurrence = 'Tempo: 7 Dias (Domiciliar)';
      } else if (combined.includes('14 dias') || combined.includes('2ª semana')) {
        occurrence = 'Tempo: 14 Dias (Domiciliar)';
      } else if (combined.includes('21 dias') || combined.includes('3ª semana')) {
        occurrence = 'Tempo: 21 Dias (Domiciliar)';
      } else if (combined.includes('a cada sessão') || combined.includes('a cada consulta')) {
        occurrence = 'A cada Consulta Clínica';
      } else if (combined.includes('pós-operatório') || combined.includes('pos-operatorio')) {
        occurrence = 'Pós-Operatório';
      } else if (combined.includes('retorno final') || combined.includes('sessão final') || combined.includes('satisfação')) {
        occurrence = 'Retorno Final / Conclusão';
      }

      return {
        id: f.id,
        title: f.title,
        description: f.description,
        occurrence,
        modality,
        questions: parsedQuestions,
        expirationHours: f.expirationHours,
        allowLate: f.allowLate,
        createdAt: f.createdAt,
        isCompleted: Boolean(resp),
        submittedAt: resp?.submittedAt ? new Date(resp.submittedAt).toLocaleString('pt-BR') : null,
        myAnswers: resp ? JSON.parse(resp.answersJson || '{}') : null,
      };
    });

    // Buscar se o mesmo paciente participa de outros estudos na plataforma (isolamento completo de dados)
    const otherParticipations = await prisma.participant.findMany({
      where: {
        patientId: participant.patientId,
        id: { not: participant.id },
      },
      select: {
        id: true,
        researchCode: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const otherStudies = otherParticipations.map((op) => ({
      participantId: op.id,
      researchCode: op.researchCode,
      projectId: op.project.id,
      projectName: op.project.name,
    }));

    const sessionsWithMeta = participant.sessions.map((s) => {
      const meta = parseUnlockMeta(s.notes);
      return {
        ...s,
        unlockedMoments: meta.unlockedMoments,
        releaseMode: meta.releaseMode,
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
        sessions: sessionsWithMeta,
        latestSession,
        totalSessions,
        maxCompletedSession,
        studyProtocol: protocol,
        specialty: protocol.specialty,
        forms: formsWithStatus,
        otherStudies,
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
