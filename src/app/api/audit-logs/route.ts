import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, checkProjectPermission } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Autenticação de pesquisador necessária.' },
        { status: 401 }
      );
    }

    // Apenas o Administrador do sistema pode consultar a trilha de auditoria
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. A visualização da trilha de auditoria é restrita ao Administrador do sistema.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const entityType = searchParams.get('entityType');

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

    const logs = await prisma.auditLog.findMany({
      where: {
        projectId,
        ...(entityType ? { entityType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Erro ao buscar trilha de auditoria:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar trilha de auditoria.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { projectId, entityType, entityId, action, fieldName, oldValue, newValue, reason } = body;

    if (!projectId || !entityType || !entityId || !action || !reason) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes para registro de auditoria.' },
        { status: 400 }
      );
    }

    const auth = await checkProjectPermission(projectId, false);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const reqHeaders = req.headers;
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || 'Browser';

    const log = await prisma.auditLog.create({
      data: {
        projectId,
        entityType,
        entityId,
        action,
        changedBy: user.name || user.email,
        userEmail: user.email,
        fieldName: fieldName || 'RECORD',
        oldValue: oldValue || null,
        newValue: newValue || null,
        reason,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Erro ao gravar log de auditoria:', error);
    return NextResponse.json(
      { error: 'Erro ao gravar log de auditoria.' },
      { status: 500 }
    );
  }
}
