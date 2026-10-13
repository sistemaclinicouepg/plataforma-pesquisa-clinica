import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const updated = await prisma.participant.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(exclusionReason !== undefined && { exclusionReason }),
        ...(group !== undefined && { group }),
        ...(anamnesisDone !== undefined && { anamnesisDone }),
        ...(anamnesisData !== undefined && { anamnesisData }),
      },
      include: {
        patient: true,
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
