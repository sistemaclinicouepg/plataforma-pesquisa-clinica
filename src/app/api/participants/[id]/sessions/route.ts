import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkProjectPermission } from '@/lib/auth';
import { mergeNotesWithExistingMeta } from '@/lib/unlockProtocol';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const participant = await prisma.participant.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }

    const auth = await checkProjectPermission(participant.projectId, false);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const sessions = await prisma.clinicalSession.findMany({
      where: { participantId: id },
      orderBy: { sessionNumber: 'asc' },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Erro ao buscar sessões clínicas:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar sessões clínicas do participante.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const participant = await prisma.participant.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }

    const auth = await checkProjectPermission(participant.projectId, false);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    const {
      sessionNumber,
      sessionType,
      sessionDate,
      shadeRight,
      shadeLeft,
      painScore0h,
      painScore1h,
      painScore24h,
      painScore48h,
      gingivalIrritation,
      adverseEvents,
      operatorName,
      evaluatorName,
      notes,
    } = body;

    if (!sessionNumber) {
      return NextResponse.json(
        { error: 'O número da sessão é obrigatório.' },
        { status: 400 }
      );
    }

    // Procura se já existe sessão registrada para este número
    const existing = await prisma.clinicalSession.findFirst({
      where: {
        participantId: id,
        sessionNumber: Number(sessionNumber),
      },
    });

    const parsedDate = sessionDate ? new Date(sessionDate) : new Date();

    const resolveScore = (incoming: unknown, existingVal: number | null) => {
      if (incoming === undefined) return existingVal;
      if (incoming === null || incoming === '') return existingVal !== null ? existingVal : null;
      const n = Number(incoming);
      return isNaN(n) ? existingVal : n;
    };

    let session;
    if (existing) {
      session = await prisma.clinicalSession.update({
        where: { id: existing.id },
        data: {
          sessionType: sessionType || existing.sessionType,
          sessionDate: parsedDate,
          shadeRight: shadeRight !== undefined ? shadeRight : existing.shadeRight,
          shadeLeft: shadeLeft !== undefined ? shadeLeft : existing.shadeLeft,
          painScore0h: resolveScore(painScore0h, existing.painScore0h),
          painScore1h: resolveScore(painScore1h, existing.painScore1h),
          painScore24h: resolveScore(painScore24h, existing.painScore24h),
          painScore48h: resolveScore(painScore48h, existing.painScore48h),
          gingivalIrritation: gingivalIrritation !== undefined ? gingivalIrritation : existing.gingivalIrritation,
          adverseEvents: adverseEvents !== undefined ? adverseEvents : existing.adverseEvents,
          operatorName: operatorName !== undefined ? operatorName : existing.operatorName,
          evaluatorName: evaluatorName !== undefined ? evaluatorName : existing.evaluatorName,
          notes: notes !== undefined ? mergeNotesWithExistingMeta(notes, existing.notes) : existing.notes,
        },
      });
    } else {
      session = await prisma.clinicalSession.create({
        data: {
          participantId: id,
          sessionNumber: Number(sessionNumber),
          sessionType: sessionType || 'INTERVENTION',
          sessionDate: parsedDate,
          shadeRight: shadeRight || null,
          shadeLeft: shadeLeft || null,
          painScore0h: painScore0h !== undefined && painScore0h !== null ? Number(painScore0h) : null,
          painScore1h: painScore1h !== undefined && painScore1h !== null ? Number(painScore1h) : null,
          painScore24h: painScore24h !== undefined && painScore24h !== null ? Number(painScore24h) : null,
          painScore48h: painScore48h !== undefined && painScore48h !== null ? Number(painScore48h) : null,
          gingivalIrritation: gingivalIrritation || 'Ausente',
          adverseEvents: adverseEvents || null,
          operatorName: operatorName || null,
          evaluatorName: evaluatorName || null,
          notes: notes || null,
        },
      });
    }

    // Registrar na Trilha de Auditoria (Audit Trail - GCP / ICH E6 e 21 CFR Part 11)
    const reqHeaders = req.headers;
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || 'Browser / Sistema';

    await prisma.auditLog.create({
      data: {
        projectId: participant.projectId,
        entityType: 'ClinicalSession',
        entityId: session.id,
        action: existing ? 'UPDATE' : 'CREATE',
        changedBy: auth.user.name || auth.user.email,
        userEmail: auth.user.email,
        fieldName: `Sessão ${sessionNumber} (${sessionType || 'Consulta'})`,
        oldValue: existing
          ? JSON.stringify({
              shadeRight: existing.shadeRight,
              shadeLeft: existing.shadeLeft,
              painScore0h: existing.painScore0h,
              painScore1h: existing.painScore1h,
              painScore24h: existing.painScore24h,
              painScore48h: existing.painScore48h,
              gingivalIrritation: existing.gingivalIrritation,
            })
          : null,
        newValue: JSON.stringify({
          shadeRight: session.shadeRight,
          shadeLeft: session.shadeLeft,
          painScore0h: session.painScore0h,
          painScore1h: session.painScore1h,
          painScore24h: session.painScore24h,
          painScore48h: session.painScore48h,
          gingivalIrritation: session.gingivalIrritation,
        }),
        reason:
          body.justification ||
          body.reason ||
          (existing
            ? `Atualização clínica da Sessão ${sessionNumber} por pesquisador autorizado`
            : `Registro da consulta clínica Sessão ${sessionNumber}`),
        ipAddress,
        userAgent,
      },
    });

    // Gatilho de Alerta Vermelho Clínico em Tempo Real durante o atendimento ou avaliação
    const painMoments: Array<{ tp: string; score: number | null }> = [
      { tp: '0h', score: session.painScore0h },
      { tp: '1h', score: session.painScore1h },
      { tp: '24h', score: session.painScore24h },
      { tp: '48h', score: session.painScore48h },
    ];
    let maxPainMoment = '0h';
    let maxPain = 0;
    for (const m of painMoments) {
      if (typeof m.score === 'number' && !isNaN(m.score) && m.score > maxPain) {
        maxPain = m.score;
        maxPainMoment = m.tp;
      }
    }

    const isGingivalIssue =
      session.gingivalIrritation === 'Severa' ||
      session.gingivalIrritation === 'Moderada';

    if (maxPain >= 7 || isGingivalIssue) {
      const isCritical = maxPain >= 8 || session.gingivalIrritation === 'Severa';
      let alertType = 'SEVERE_PAIN';
      if (maxPain >= 7 && isGingivalIssue) {
        alertType = 'SEVERE_PAIN_AND_BURNING';
      } else if (isGingivalIssue) {
        alertType = 'GINGIVAL_BURNING';
      }

      await prisma.clinicalAlert.create({
        data: {
          projectId: participant.projectId,
          participantId: id,
          sessionId: session.id,
          severity: isCritical ? 'CRITICAL' : 'SEVERE',
          alertType,
          painScore: maxPain > 0 ? maxPain : null,
          gingivalSensation: session.gingivalIrritation,
          timePoint: maxPainMoment,
          description: `[Alerta Consultório Sessão ${sessionNumber}] Registrada sensibilidade severa EVA ${maxPain}/10 (${maxPainMoment}) ou irritação gengival ${session.gingivalIrritation} durante atendimento.`,
          status: 'PENDING',
        },
      });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Erro ao salvar sessão clínica:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar sessão clínica.' },
      { status: 500 }
    );
  }
}
