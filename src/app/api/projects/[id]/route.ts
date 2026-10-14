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
        ...(currentUser.role === 'ADMIN'
          ? {
              auditLogs: {
                orderBy: { createdAt: 'desc' as const },
                take: 100,
              },
            }
          : {}),
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
        auditLogs: (project as any).auditLogs || [],
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await checkProjectPermission(id, true);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { name, description, status, anamnesisTemplate } = body;

    const dataToUpdate: Record<string, any> = {};
    if (typeof name === 'string' && name.trim()) {
      dataToUpdate.name = name.trim();
    }
    if (typeof description !== 'undefined') {
      dataToUpdate.description = description?.trim() || null;
    }
    if (typeof status === 'string' && ['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
      dataToUpdate.status = status.toUpperCase();
    }
    if (typeof anamnesisTemplate !== 'undefined') {
      dataToUpdate.anamnesisTemplate =
        typeof anamnesisTemplate === 'string'
          ? anamnesisTemplate
          : JSON.stringify(anamnesisTemplate);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar dados do projeto.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await checkProjectPermission(id, true);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Apenas Administradores do sistema podem excluir um projeto
    if (auth.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas o Administrador do sistema possui permissão para excluir um projeto.' },
        { status: 403 }
      );
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    // Exclusão atômica de todas as dependências e do projeto
    await prisma.$transaction(async (tx) => {
      // 1. Excluir respostas e formulários eCRF
      const forms = await tx.form.findMany({ where: { projectId: id }, select: { id: true } });
      const formIds = forms.map((f) => f.id);
      if (formIds.length > 0) {
        await tx.formResponse.deleteMany({ where: { formId: { in: formIds } } });
        await tx.form.deleteMany({ where: { id: { in: formIds } } });
      }

      // 2. Excluir assinaturas e formulário de consentimento TCLE
      const consent = await tx.consentForm.findUnique({ where: { projectId: id }, select: { id: true } });
      if (consent) {
        await tx.consentSignature.deleteMany({ where: { consentFormId: consent.id } });
        await tx.consentForm.delete({ where: { id: consent.id } });
      }

      // 3. Excluir participantes e seus dados clínicos vinculados
      const participants = await tx.participant.findMany({ where: { projectId: id }, select: { id: true } });
      const participantIds = participants.map((p) => p.id);
      if (participantIds.length > 0) {
        await tx.clinicalAlert.deleteMany({ where: { participantId: { in: participantIds } } });
        await tx.clinicalSession.deleteMany({ where: { participantId: { in: participantIds } } });
        await tx.consentSignature.deleteMany({ where: { participantId: { in: participantIds } } });
        await tx.formResponse.deleteMany({ where: { participantId: { in: participantIds } } });
        await tx.participant.deleteMany({ where: { id: { in: participantIds } } });
      }

      // 4. Excluir alertas e auditorias restantes vinculadas ao projeto
      await tx.clinicalAlert.deleteMany({ where: { projectId: id } });
      await tx.auditLog.deleteMany({ where: { projectId: id } });

      // 5. Excluir membros vinculados
      await tx.projectMember.deleteMany({ where: { projectId: id } });

      // 6. Excluir o projeto
      await tx.project.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: `Projeto "${existingProject.name}" excluído com sucesso.`,
    });
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir projeto e suas dependências.' },
      { status: 500 }
    );
  }
}


