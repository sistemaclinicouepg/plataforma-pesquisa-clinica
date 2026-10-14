import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      participantId,
      sessionNumber,
      timePoint, // '1h' | '24h' | '48h'
      painScore, // 0 a 10
      painType,
      usedAnalgesic,
      analgesicDetails,
      gingivalSensation,
      otherSymptoms,
    } = body;

    if (!participantId || !timePoint || painScore === undefined) {
      return NextResponse.json(
        { error: 'Dados incompletos para registro do diário de dor.' },
        { status: 400 }
      );
    }

    // Buscar participante
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        sessions: {
          orderBy: { sessionNumber: 'desc' },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participante não encontrado.' },
        { status: 404 }
      );
    }

    // Identificar sessão alvo (ou a informada, ou a mais recente, ou criar a sessão 1)
    let targetSession = sessionNumber
      ? participant.sessions.find((s: { sessionNumber: number }) => s.sessionNumber === Number(sessionNumber))
      : participant.sessions[0];

    if (!targetSession) {
      targetSession = await prisma.clinicalSession.create({
        data: {
          participantId: participant.id,
          sessionNumber: Number(sessionNumber) || 1,
          sessionType: 'BASELINE_INTERVENTION_1',
          sessionDate: new Date(),
        },
      });
    }

    // Montar objeto de atualização do score de dor
    const updateData: Record<string, unknown> = {};
    if (timePoint === '0h') {
      updateData.painScore0h = Number(painScore);
    } else if (timePoint === '1h') {
      updateData.painScore1h = Number(painScore);
    } else if (timePoint === '24h') {
      updateData.painScore24h = Number(painScore);
    } else if (timePoint === '48h') {
      updateData.painScore48h = Number(painScore);
    }

    // Atualizar registro de eventos adversos e medicação
    const reportNote = `[Diário ${timePoint} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] EVA: ${painScore}/10 | Tipo: ${painType || 'Não especificado'} | Analgésico: ${usedAnalgesic || 'Não'} ${analgesicDetails ? `(${analgesicDetails})` : ''} | Gengiva: ${gingivalSensation || 'Normal'} ${otherSymptoms ? `| Obs: ${otherSymptoms}` : ''}`;

    const currentNotes = targetSession.notes ? `${targetSession.notes}\n${reportNote}` : reportNote;
    updateData.notes = currentNotes;

    if (usedAnalgesic === 'Sim' || painScore >= 7) {
      const currentAdv = targetSession.adverseEvents
        ? `${targetSession.adverseEvents}; ${reportNote}`
        : reportNote;
      updateData.adverseEvents = currentAdv;
    }

    if (gingivalSensation && gingivalSensation !== 'Normal' && (!targetSession.gingivalIrritation || targetSession.gingivalIrritation === 'Ausente')) {
      updateData.gingivalIrritation = 'Leve';
    }

    const updatedSession = await prisma.clinicalSession.update({
      where: { id: targetSession.id },
      data: updateData,
    });

    // Gatilho de Alerta Vermelho de Farmacovigilância em Tempo Real
    const numericPain = Number(painScore);
    const isSeverePain = numericPain >= 7;
    const isGingivalIssue = Boolean(
      gingivalSensation &&
      gingivalSensation !== 'Normal' &&
      (
        gingivalSensation.toLowerCase().includes('queimação') ||
        gingivalSensation.toLowerCase().includes('ardência') ||
        gingivalSensation.toLowerCase().includes('moderad') ||
        gingivalSensation.toLowerCase().includes('sever') ||
        gingivalSensation.toLowerCase().includes('afta') ||
        gingivalSensation.toLowerCase().includes('vermelhidão')
      )
    );

    const isRedAlert = isSeverePain || isGingivalIssue;
    let alertRecord = null;

    if (isRedAlert) {
      let alertType = 'SEVERE_PAIN';
      if (isSeverePain && isGingivalIssue) {
        alertType = 'SEVERE_PAIN_AND_BURNING';
      } else if (isGingivalIssue) {
        alertType = 'GINGIVAL_BURNING';
      }

      const severity = (numericPain >= 8 || (gingivalSensation && gingivalSensation.toLowerCase().includes('sever'))) ? 'CRITICAL' : 'SEVERE';
      const alertDesc = `[Alerta Vermelho ${timePoint}] Participante ${participant.researchCode} relatou dor severa EVA ${numericPain}/10${isGingivalIssue ? ` com desconforto gengival: "${gingivalSensation}"` : ''}${usedAnalgesic === 'Sim' ? ` (Uso de analgésico: ${analgesicDetails || 'Sim'})` : ''}.`;

      alertRecord = await prisma.clinicalAlert.create({
        data: {
          projectId: participant.projectId,
          participantId: participant.id,
          sessionId: updatedSession.id,
          severity,
          alertType,
          painScore: numericPain,
          gingivalSensation: gingivalSensation || null,
          timePoint: String(timePoint),
          description: alertDesc,
          status: 'PENDING',
        },
      });

      // Trilha de Auditoria (Audit Trail - GCP / ICH E6)
      await prisma.auditLog.create({
        data: {
          projectId: participant.projectId,
          entityType: 'ClinicalAlert',
          entityId: alertRecord.id,
          action: 'CREATE',
          changedBy: `PARTICIPANTE (${participant.researchCode})`,
          fieldName: 'painScore / gingivalSensation',
          oldValue: null,
          newValue: `EVA: ${numericPain}/10, Gengiva: ${gingivalSensation || 'Normal'}`,
          reason: 'Disparo automático de Gatilho de Alerta Vermelho de Farmacovigilância em Tempo Real',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Diário de dor e sensibilidade gravado com sucesso!',
      sessionId: updatedSession.id,
      timePoint,
      painScore: numericPain,
      isRedAlert,
      alert: alertRecord
        ? {
            id: alertRecord.id,
            severity: alertRecord.severity,
            alertType: alertRecord.alertType,
            description: alertRecord.description,
          }
        : null,
    });
  } catch (error) {
    console.error('Erro ao registrar diário do paciente:', error);
    return NextResponse.json(
      { error: 'Erro ao processar e salvar relato do diário clínico.' },
      { status: 500 }
    );
  }
}
