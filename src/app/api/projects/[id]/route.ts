import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        consentForm: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        participants: {
          include: {
            patient: true, // Dados clínicos e cadastrais
            signatures: true, // Assinaturas eletrônicas do TCLE
            sessions: {
              orderBy: { sessionNumber: 'asc' },
            },
            responses: {
              include: {
                form: {
                  select: { id: true, title: true, questionsJson: true, description: true },
                },
              },
              orderBy: { submittedAt: 'desc' },
            },
          },
          orderBy: { researchCode: 'asc' },
        },
        forms: {
          include: {
            responses: {
              select: { id: true, participantId: true, submittedAt: true, answersJson: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    // Verificar se o usuário logado tem restrição de cegamento (Blinded)
    const currentMember = project.members.find(
      (m: any) => m.userId === currentUser?.id
    );
    const isBlinded = currentMember?.isBlinded ?? false;

    // Se for cego, remove a informação de 'group' (ex: qual gel ou grupo recebeu)
    const sanitizedParticipants = project.participants.map((p: any) => {
      if (isBlinded) {
        return {
          ...p,
          group: 'OCULTO (Avaliador Cego)',
        };
      }
      return p;
    });

    return NextResponse.json({
      project: {
        ...project,
        participants: sanitizedParticipants,
      },
      currentMember,
      isBlinded,
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do projeto:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar detalhes do projeto.' },
      { status: 500 }
    );
  }
}
