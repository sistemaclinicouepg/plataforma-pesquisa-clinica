import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkProjectPermission } from '@/lib/auth';
import {
  parseUnlockMeta,
  encodeUnlockMeta,
  SessionUnlockMeta,
} from '@/lib/unlockProtocol';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params;

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        sessions: {
          orderBy: { sessionNumber: 'asc' },
        },
      },
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
      sessionId,
      sessionNumber,
      moment, // '1h' | '24h' | '48h'
      formId,
      releaseMode, // 'AUTO' | 'MANUAL'
      action, // 'UNLOCK_MOMENT' | 'LOCK_MOMENT' | 'UNLOCK_ALL' | 'SET_MODE' | 'UNLOCK_FORM' | 'LOCK_FORM'
    } = body;

    // Localizar a sessão alvo
    let targetSession = sessionId
      ? participant.sessions.find((s) => s.id === sessionId)
      : sessionNumber
      ? participant.sessions.find((s) => s.sessionNumber === Number(sessionNumber))
      : participant.sessions[participant.sessions.length - 1];

    if (!targetSession) {
      return NextResponse.json(
        { error: 'Sessão clínica não encontrada para este participante.' },
        { status: 404 }
      );
    }

    const currentMeta = parseUnlockMeta(targetSession.notes);
    let newUnlockedMoments = [...currentMeta.unlockedMoments];
    let newUnlockedForms = [...currentMeta.unlockedForms];
    let newReleaseMode = currentMeta.releaseMode;

    const userName = auth.user.name || auth.user.email || 'Pesquisador';

    switch (action) {
      case 'UNLOCK_MOMENT':
        if (moment && !newUnlockedMoments.includes(moment)) {
          newUnlockedMoments.push(moment);
        }
        break;

      case 'LOCK_MOMENT':
        if (moment) {
          newUnlockedMoments = newUnlockedMoments.filter((m) => m !== moment);
        }
        break;

      case 'UNLOCK_ALL':
        newUnlockedMoments = ['0h', '1h', '24h', '48h'];
        break;

      case 'SET_MODE':
        if (releaseMode === 'MANUAL' || releaseMode === 'AUTO') {
          newReleaseMode = releaseMode;
        }
        break;

      case 'UNLOCK_FORM':
        if (formId && !newUnlockedForms.includes(formId)) {
          newUnlockedForms.push(formId);
        }
        break;

      case 'LOCK_FORM':
        if (formId) {
          newUnlockedForms = newUnlockedForms.filter((f) => f !== formId);
        }
        break;

      default:
        return NextResponse.json({ error: 'Ação de desbloqueio inválida.' }, { status: 400 });
    }

    const updatedMeta: SessionUnlockMeta = {
      unlockedMoments: newUnlockedMoments,
      unlockedForms: newUnlockedForms,
      releaseMode: newReleaseMode,
      lastUnlockedAt: new Date().toISOString(),
      unlockedBy: userName,
    };

    const newNotes = encodeUnlockMeta(targetSession.notes, updatedMeta);

    const updatedSession = await prisma.clinicalSession.update({
      where: { id: targetSession.id },
      data: { notes: newNotes },
    });

    // Trilha de Auditoria (GCP / ICH E6 e 21 CFR Part 11)
    const reqHeaders = req.headers;
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || 'Browser / Sistema';

    await prisma.auditLog.create({
      data: {
        projectId: participant.projectId,
        entityType: 'ClinicalSession',
        entityId: targetSession.id,
        action: 'UPDATE',
        changedBy: userName,
        userEmail: auth.user.email,
        fieldName: 'unlockMeta / releaseMode',
        oldValue: JSON.stringify(currentMeta),
        newValue: JSON.stringify(updatedMeta),
        reason: `Ação de liberação pelo pesquisador: ${action}${moment ? ` (${moment})` : ''}${releaseMode ? ` (${releaseMode})` : ''}`,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
      meta: updatedMeta,
      message: `Configuração de liberação atualizada com sucesso (${action}).`,
    });
  } catch (error) {
    console.error('Erro ao gerenciar liberação de questionários:', error);
    return NextResponse.json(
      { error: 'Erro ao processar liberação de escalas e questionários.' },
      { status: 500 }
    );
  }
}
