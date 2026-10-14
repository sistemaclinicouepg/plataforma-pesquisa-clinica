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

    return NextResponse.json({ success: true, participant: updated });
  } catch (error) {
    console.error('Erro ao atualizar participante:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status do participante.' },
      { status: 500 }
    );
  }
}
