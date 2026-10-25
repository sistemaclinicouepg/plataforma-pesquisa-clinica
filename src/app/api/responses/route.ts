import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { encodeDetailedDiaryReport } from '@/lib/unlockProtocol';

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

    const allResponses = [...responses];

    // Se a consulta foi por um participante específico, também agrega as respostas de perguntas customizadas de anamnese do estudo
    if (participantId) {
      try {
        const part = await prisma.participant.findUnique({
          where: { id: participantId },
          include: {
            project: { select: { id: true, name: true, anamnesisTemplate: true } },
            patient: { select: { fullName: true } },
          },
        });

        if (part && part.project?.anamnesisTemplate) {
          const parsedTmpl = JSON.parse(part.project.anamnesisTemplate);
          const anQuestions = parsedTmpl.questions || [];
          if (Array.isArray(anQuestions) && anQuestions.length > 0) {
            let anAnswers: Record<string, any> = {};
            if (part.anamnesisData) {
              try {
                const parsedData = JSON.parse(part.anamnesisData);
                anAnswers = parsedData.answers || (typeof parsedData === 'object' ? parsedData : {});
              } catch {}
            }

            if (Object.keys(anAnswers).length > 0) {
              allResponses.unshift({
                id: `anamnesis_resp_${part.id}`,
                formId: `anamnesis_${part.project.id}`,
                participantId: part.id,
                answersJson: JSON.stringify(anAnswers),
                signatureData: null,
                isLate: false,
                submittedAt: part.createdAt,
                form: {
                  id: `anamnesis_${part.project.id}`,
                  title: 'Ficha de Anamnese & Critérios de Participação',
                  questionsJson: JSON.stringify(anQuestions),
                },
                participant: {
                  id: part.id,
                  researchCode: part.researchCode,
                  patient: {
                    fullName: part.patient.fullName,
                  },
                },
              } as any);
            }
          }
        }
      } catch (anErr) {
        console.warn('Erro ao carregar respostas de anamnese no GET /api/responses:', anErr);
      }
    }

    return NextResponse.json({ responses: allResponses });
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

    // Tratar envio de respostas para a ficha de anamnese do estudo
    if (participantId && targetFormId && String(targetFormId).startsWith('anamnesis_')) {
      const part = await prisma.participant.findUnique({
        where: { id: participantId },
      });
      if (part) {
        let existingAnamnesis: any = {};
        try {
          existingAnamnesis = part.anamnesisData ? JSON.parse(part.anamnesisData) : {};
        } catch {}
        existingAnamnesis.answers = { ...(existingAnamnesis.answers || {}), ...(answers || {}) };
        await prisma.participant.update({
          where: { id: participantId },
          data: {
            anamnesisData: JSON.stringify(existingAnamnesis),
            anamnesisDone: true,
          },
        });
        return NextResponse.json({
          success: true,
          response: {
            id: `resp_${Date.now()}`,
            formId: targetFormId,
            participantId,
            isAnamnesis: true,
            submittedAt: new Date(),
          },
        });
      }
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

    // Analisar respostas para Farmacovigilância em Tempo Real (Alerta Vermelho)
    let isRedAlert = false;
    let maxVasScore: number | null = null;
    let severeSymptomDesc = '';
    if (participantId && answers && typeof answers === 'object') {
      const formRecord = await prisma.form.findUnique({
        where: { id: targetFormId },
        select: { projectId: true, title: true },
      });

      if (formRecord) {
        for (const val of Object.values(answers)) {
          const num =
            typeof val === 'number'
              ? val
              : typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== ''
              ? Number(val)
              : null;
          if (num !== null && num >= 7 && num <= 10) {
            isRedAlert = true;
            if (maxVasScore === null || num > maxVasScore) maxVasScore = num;
          } else if (typeof val === 'string') {
            const lower = val.toLowerCase();
            if (
              lower.includes('muita dor') ||
              lower.includes('dor severa') ||
              lower.includes('queimação intensa') ||
              lower.includes('dor intensa') ||
              lower.includes('queimação moderada') ||
              lower.includes('queimação severa') ||
              lower.includes('irritação severa') ||
              lower.includes('irritação moderada') ||
              lower.includes('queimação gengival') ||
              lower.includes('irritação gengival') ||
              lower.includes('dor insuportável') ||
              lower.includes('afta') ||
              lower.includes('ulceração')
            ) {
              isRedAlert = true;
              if (!severeSymptomDesc) severeSymptomDesc = val;
            }
          }
        }

        if (isRedAlert) {
          const part = await prisma.participant.findUnique({
            where: { id: participantId },
            select: { id: true, researchCode: true, projectId: true },
          });

          if (part) {
            const isCritical =
              (maxVasScore !== null && maxVasScore >= 8) ||
              severeSymptomDesc.toLowerCase().includes('sever') ||
              severeSymptomDesc.toLowerCase().includes('insuport');
            const alertType =
              maxVasScore !== null && severeSymptomDesc
                ? 'SEVERE_PAIN_AND_BURNING'
                : maxVasScore !== null
                ? 'SEVERE_PAIN'
                : severeSymptomDesc.toLowerCase().includes('queimação') ||
                  severeSymptomDesc.toLowerCase().includes('irritação')
                ? 'GINGIVAL_BURNING'
                : 'ADVERSE_EVENT';

            const alertRecord = await prisma.clinicalAlert.create({
              data: {
                projectId: part.projectId,
                participantId: part.id,
                severity: isCritical ? 'CRITICAL' : 'SEVERE',
                alertType,
                painScore: maxVasScore,
                gingivalSensation: severeSymptomDesc || null,
                timePoint: 'eCRF',
                description: `[Alerta Questionário eCRF - ${formRecord.title}] Participante ${part.researchCode} reportou desfecho severo no formulário (${maxVasScore !== null ? `EVA: ${maxVasScore}/10` : 'Sintoma adverso'}${severeSymptomDesc ? `: "${severeSymptomDesc}"` : ''}).`,
                status: 'PENDING',
              },
            });

            // Registrar na Trilha de Auditoria (GCP / ICH E6)
            const reqHeaders = req.headers;
            const ipAddress =
              reqHeaders.get('x-forwarded-for')?.split(',')[0] ||
              reqHeaders.get('x-real-ip') ||
              '127.0.0.1';
            const userAgent = reqHeaders.get('user-agent') || 'Browser';

            await prisma.auditLog.create({
              data: {
                projectId: part.projectId,
                entityType: 'ClinicalAlert',
                entityId: alertRecord.id,
                action: 'CREATE',
                changedBy: `PARTICIPANTE (${part.researchCode})`,
                fieldName: `Formulário: ${formRecord.title}`,
                oldValue: null,
                newValue: `Alerta: ${alertType} (EVA: ${maxVasScore ?? 'N/A'}, Sintoma: ${severeSymptomDesc || 'N/A'})`,
                reason: 'Disparo automático de Alerta Vermelho Clínico a partir de resposta em questionário eCRF',
                ipAddress,
                userAgent,
              },
            });
          }
        }
      }
    }

    // Se o formulário enviado contém escalas de dor (EVA) ou se é um diário de sensibilidade,
    // sincroniza automaticamente com a sessão clínica mais recente do participante
    if (participantId && answers && typeof answers === 'object') {
      try {
        const latestSession = await prisma.clinicalSession.findFirst({
          where: { participantId },
          orderBy: { sessionNumber: 'desc' },
        });

        if (latestSession) {
          let vasScore: number | null = null;
          let analgesicUsed: string | null = null;
          let analgesicDet: string | null = null;
          let painTypeVal: string | null = null;

          for (const [key, val] of Object.entries(answers)) {
            const k = key.toLowerCase();
            const num =
              typeof val === 'number'
                ? val
                : typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== ''
                ? Number(val)
                : null;
            if (num !== null && (k.includes('vas') || k.includes('sens') || k.includes('dor') || (num >= 0 && num <= 10 && vasScore === null))) {
              vasScore = num;
            }
            if (k.includes('analgesic') || k.includes('remedio') || k.includes('medic')) {
              if (val === 'sim' || val === true || val === 'Sim') analgesicUsed = 'Sim';
              else if (val === 'nao' || val === false || val === 'Não') analgesicUsed = 'Não';
              else if (typeof val === 'string') analgesicDet = val;
            }
            if (k.includes('type') || k.includes('tipo')) {
              painTypeVal = String(val);
            }
          }

          if (vasScore !== null) {
            const sessDate = new Date(latestSession.sessionDate);
            const now = new Date();
            const elapsedHours = (now.getTime() - sessDate.getTime()) / (1000 * 60 * 60);

            const sessionUpdate: Record<string, any> = {};
            let determinedTimePoint: '0h' | '1h' | '24h' | '48h' = '0h';

            if (elapsedHours >= 36) {
              determinedTimePoint = '48h';
              sessionUpdate.painScore48h = vasScore;
            } else if (elapsedHours >= 12) {
              determinedTimePoint = '24h';
              sessionUpdate.painScore24h = vasScore;
            } else if (elapsedHours >= 0.5) {
              determinedTimePoint = '1h';
              sessionUpdate.painScore1h = vasScore;
            } else {
              determinedTimePoint = '0h';
              sessionUpdate.painScore0h = vasScore;
            }

            const currentNotes = encodeDetailedDiaryReport(latestSession.notes, {
              timePoint: determinedTimePoint,
              painScore: vasScore,
              painType: painTypeVal || undefined,
              usedAnalgesic: analgesicUsed || undefined,
              analgesicDetails: analgesicDet || undefined,
              submittedAt: now.toISOString(),
            });
            sessionUpdate.notes = currentNotes;

            await prisma.clinicalSession.update({
              where: { id: latestSession.id },
              data: sessionUpdate,
            });
          }
        }
      } catch (syncErr) {
        console.warn('Erro ao sincronizar relato com sessão clínica:', syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      responseId: response.id,
      isRedAlert,
      maxVasScore,
      severeSymptomDesc: severeSymptomDesc || null,
    });
  } catch (error) {
    console.error('Erro ao salvar resposta do paciente:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar resposta no banco de dados.' },
      { status: 500 }
    );
  }
}
