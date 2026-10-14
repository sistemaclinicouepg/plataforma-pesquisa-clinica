import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, checkProjectPermission } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // 'PENDING' | 'RESOLVED'

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId é obrigatório.' },
        { status: 400 }
      );
    }

    const auth = await checkProjectPermission(projectId, false);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const alerts = await prisma.clinicalAlert.findMany({
      where: {
        projectId,
        ...(status ? { status } : {}),
      },
      include: {
        participant: {
          select: {
            id: true,
            researchCode: true,
            group: true,
            patient: {
              select: {
                fullName: true,
                phoneWhatsApp: true,
              },
            },
          },
        },
        session: {
          select: {
            id: true,
            sessionNumber: true,
            sessionDate: true,
            notes: true,
            adverseEvents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    console.error('Erro ao buscar alertas clínicos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar alertas de farmacovigilância.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Autenticação de pesquisador necessária.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { alertId, status, resolutionNotes, resolvedBy } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId é obrigatório.' },
        { status: 400 }
      );
    }

    const existingAlert = await prisma.clinicalAlert.findUnique({
      where: { id: alertId },
      include: {
        participant: true,
      },
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: 'Alerta clínico não localizado.' },
        { status: 404 }
      );
    }

    const auth = await checkProjectPermission(existingAlert.projectId, false);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const resolvedByName = resolvedBy || user.name || 'Pesquisador Responsável';
    const updated = await prisma.clinicalAlert.update({
      where: { id: alertId },
      data: {
        status: status || 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: resolvedByName,
        resolutionNotes: resolutionNotes || 'Atendimento clínico e suporte prestado ao participante.',
      },
    });

    // Registrar ação na Trilha de Auditoria (Audit Trail - GCP / 21 CFR Part 11)
    const auditLog = await prisma.auditLog.create({
      data: {
        projectId: existingAlert.projectId,
        entityType: 'ClinicalAlert',
        entityId: alertId,
        action: 'UPDATE',
        changedBy: resolvedByName,
        userEmail: user.email,
        fieldName: 'status / resolutionNotes',
        oldValue: existingAlert.status,
        newValue: `RESOLVED: ${resolutionNotes || 'Sem notas adicionais'}`,
        reason: 'Resolução de Alerta Vermelho Clínico de Farmacovigilância pela equipe médica/odontológica',
      },
    });

    return NextResponse.json({
      success: true,
      alert: { ...updated, participant: existingAlert.participant },
      auditLog,
    });
  } catch (error) {
    console.error('Erro ao atualizar alerta clínico:', error);
    return NextResponse.json(
      { error: 'Erro ao resolver alerta clínico.' },
      { status: 500 }
    );
  }
}
