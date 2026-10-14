import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkProjectPermission } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await checkProjectPermission(id, false);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const currentUser = auth.user;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        consentForm: true,
        alerts: {
          orderBy: { createdAt: 'desc' },
          include: {
            participant: {
              select: {
                id: true,
                researchCode: true,
                patient: {
                  select: { fullName: true, phoneWhatsApp: true },
                },
              },
            },
          },
        },
        auditLogs: currentUser.role === 'ADMIN' ? {
          orderBy: { createdAt: 'desc' },
          take: 100,
        } : false,
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
            alerts: {
              orderBy: { createdAt: 'desc' },
            },
            responses: {
              include: {
                form: {
                  select: { id: true, title: true, description: true },
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
      (m: { userId: string; isBlinded: boolean }) => m.userId === currentUser.id
    );
    const isBlinded = currentMember?.isBlinded ?? false;

    // Se for cego, remove a informação de 'group' (ex: qual gel ou grupo recebeu)
    const sanitizedParticipants = project.participants.map((p) => {
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
