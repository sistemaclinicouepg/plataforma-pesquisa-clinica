import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  parseUnlockMeta,
  encodeDetailedDiaryReport,
} from '@/lib/unlockProtocol';

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

    // Identificar sessão alvo (ou a informada, ou a mais recente)
    let targetSession = sessionNumber
      ? participant.sessions.find((s: { sessionNumber: number }) => s.sessionNumber === Number(sessionNumber))
      : participant.sessions[0];

    // O diário de sensibilidade pós-operatório (EVA) exige que o atendimento clínico
    // tenha sido previamente realizado e registrado pelo pesquisador no consultório.
    // Nunca criamos sessões clínicas fictícias a partir do portal do paciente.
    if (!targetSession) {
      return NextResponse.json(
        {
          error:
            'O atendimento clínico presencial desta sessão ainda não foi registrado pelo pesquisador. O diário de sensibilidade só deve ser preenchido após a consulta clínica no consultório.',
        },
        { status: 400 }
      );
    }

    // Verificação de Liberação Manual ou Automática (GCP / ICH E6)
    const unlockMeta = parseUnlockMeta(targetSession.notes);
    const isManuallyUnlocked = unlockMeta.unlockedMoments.includes(String(timePoint));

    if (!isManuallyUnlocked) {
      if (unlockMeta.releaseMode === 'MANUAL' && timePoint !== '0h') {
        return NextResponse.json(
          { error: 'Este relato do diário de sensibilidade ainda não foi liberado pelo pesquisador responsável.' },
          { status: 400 }
        );
      }

      // Validação temporal GCP padrão quando em modo automático:
      const sessionCreatedAt = targetSession.createdAt ? new Date(targetSession.createdAt) : new Date(targetSession.sessionDate);
      const now = new Date();
      const elapsedHours = (now.getTime() - sessionCreatedAt.getTime()) / (1000 * 60 * 60);

      const sessionDay = new Date(sessionCreatedAt.getFullYear(), sessionCreatedAt.getMonth(), sessionCreatedAt.getDate()).getTime();
      const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffDays = Math.floor((todayDay - sessionDay) / (1000 * 60 * 60 * 24));

      if (timePoint === '24h' && diffDays < 1 && elapsedHours < 18) {
        return NextResponse.json(
          { error: 'O diário de 24 horas (dia seguinte) ainda não está disponível. Ele será liberado para preenchimento a partir de amanhã ou quando liberado pela equipe.' },
          { status: 400 }
        );
      }

      if (timePoint === '48h' && diffDays < 2 && elapsedHours < 40) {
        return NextResponse.json(
          { error: 'O diário de 48 horas (2 dias após) ainda não está disponível para envio.' },
          { status: 400 }
        );
      }
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
    const reportNote = `[Diário ${timePoint} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] EVA: ${painScore}/10 | Tipo: ${painType || 'Não especificado'} | Analgésico: ${usedAnalgesic || 'Não'} ${analgesicDetails ? `(${analgesicDetails})` : ''} | Gengiva: ${gingivalSensation || 'Normal'} ${otherSymptoms ? `| Obs: ${otherSymptoms}` : ''}${isManuallyUnlocked ? ' | [Liberado por Pesquisador]' : ''}`;

    let currentNotes = targetSession.notes ? `${targetSession.notes}\n${reportNote}` : reportNote;

    // Codifica estruturadamente o relato para visualização e estatísticas
    currentNotes = encodeDetailedDiaryReport(currentNotes, {
      timePoint: String(timePoint),
      painScore: Number(painScore),
      painType: painType || undefined,
      usedAnalgesic: usedAnalgesic || undefined,
      analgesicDetails: analgesicDetails || undefined,
      gingivalSensation: gingivalSensation || undefined,
      otherSymptoms: otherSymptoms || undefined,
      submittedAt: new Date().toISOString(),
    });

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
