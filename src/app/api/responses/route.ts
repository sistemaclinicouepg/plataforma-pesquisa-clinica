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
