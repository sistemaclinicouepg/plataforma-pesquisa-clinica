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
    if (timePoint === '1h') {
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

    return NextResponse.json({
      success: true,
      message: 'Diário de dor e sensibilidade gravado com sucesso!',
      sessionId: updatedSession.id,
      timePoint,
      painScore,
    });
  } catch (error) {
    console.error('Erro ao registrar diário do paciente:', error);
    return NextResponse.json(
      { error: 'Erro ao processar e salvar relato do diário clínico.' },
      { status: 500 }
    );
  }
}
