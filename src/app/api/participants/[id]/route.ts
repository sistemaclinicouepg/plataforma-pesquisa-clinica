import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, exclusionReason, group, anamnesisDone, anamnesisData } = await req.json();

    const participant = await prisma.participant.findUnique({
      where: { id },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Não autorizado. Autenticação de pesquisador necessária.' },
        { status: 401 }
      );
    }

    let isBlinded = false;

    if (currentUser.role !== 'ADMIN') {
      const member = await prisma.projectMember.findFirst({
        where: { projectId: participant.projectId, userId: currentUser.id },
      });
      if (!member) {
        return NextResponse.json(
          { error: 'Acesso negado. Você não é membro deste projeto de pesquisa.' },
          { status: 403 }
        );
      }
      if (member.isBlinded) {
        isBlinded = true;
      }
    }

    // Se o usuário for avaliador cego, impede alteração direta do grupo
    const updated = await prisma.participant.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(exclusionReason !== undefined && { exclusionReason }),
        ...(!isBlinded && group !== undefined && { group }),
        ...(anamnesisDone !== undefined && { anamnesisDone }),
        ...(anamnesisData !== undefined && { anamnesisData }),
      },
      include: {
        patient: true,
      },
    });

    // Se o usuário atual for avaliador cego, mascara o atributo group
    if (isBlinded) {
      updated.group = 'OCULTO (Avaliador Cego)';
    }

    // Registrar na Trilha de Auditoria (Audit Trail - GCP / ICH E6)
    const reqHeaders = req.headers;
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || 'Browser';

    let actionDesc = 'Atualização de prontuário do participante';
    if (status) actionDesc = `Status alterado para ${status}${exclusionReason ? ` (Motivo: ${exclusionReason})` : ''}`;
    else if (group) actionDesc = `Grupo alocado: ${group}`;
    else if (anamnesisDone) actionDesc = 'Anamnese e ficha clínica concluídas';

    await prisma.auditLog.create({
      data: {
        projectId: participant.projectId,
        entityType: 'Participant',
        entityId: id,
        action: 'UPDATE',
        changedBy: currentUser.name || currentUser.email,
        userEmail: currentUser.email,
        fieldName: status ? 'status' : group ? 'group' : 'anamnesisData',
        oldValue: status ? participant.status : group ? participant.group : null,
        newValue: status || group || 'Ficha atualizada',
        reason: exclusionReason || actionDesc,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, participant: updated });
  } catch (error) {
    console.error('Erro ao atualizar participante:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status do participante.' },
      { status: 500 }
    );
  }
}
