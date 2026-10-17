import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkProjectPermission } from '@/lib/auth';
import { OFFICIAL_UEPG_TCLE } from '@/lib/tcleDefault';

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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        consentForm: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    // Se já tiver TCLE customizado no banco, retorna ele
    if (project.consentForm) {
      return NextResponse.json({ consentForm: project.consentForm, isDefault: false });
    }

    // Modelo padrão oficial baseado no documento de protocolo da UEPG
    const defaultTCLE = {
      projectId: project.id,
      title: project.name || OFFICIAL_UEPG_TCLE.title,
      responsibleResearcher: OFFICIAL_UEPG_TCLE.responsibleResearcher,
      advisor: OFFICIAL_UEPG_TCLE.advisor,
      institution: OFFICIAL_UEPG_TCLE.institution,
      ethicsNumber: OFFICIAL_UEPG_TCLE.ethicsNumber,
      ethicsContacts: OFFICIAL_UEPG_TCLE.ethicsContacts,
      contentMarkdown: OFFICIAL_UEPG_TCLE.contentMarkdown,
      assentContentMarkdown: OFFICIAL_UEPG_TCLE.assentContentMarkdown,
    };

    return NextResponse.json({ consentForm: defaultTCLE, isDefault: true });
  } catch (error) {
    console.error('Erro ao buscar TCLE:', error);
    return NextResponse.json({ error: 'Erro ao carregar TCLE.' }, { status: 500 });
  }
}

export async function PUT(
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
    const {
      title,
      responsibleResearcher,
      advisor,
      institution,
      ethicsNumber,
      ethicsContacts,
      contentMarkdown,
      assentContentMarkdown,
    } = body;

    const consent = await prisma.consentForm.upsert({
      where: { projectId: id },
      update: {
        title,
        responsibleResearcher,
        advisor,
        institution,
        ethicsNumber,
        ethicsContacts,
        contentMarkdown,
        ...(assentContentMarkdown !== undefined ? { assentContentMarkdown } : {}),
      },
      create: {
        projectId: id,
        title,
        responsibleResearcher,
        advisor,
        institution,
        ethicsNumber,
        ethicsContacts,
        contentMarkdown,
        assentContentMarkdown: assentContentMarkdown || OFFICIAL_UEPG_TCLE.assentContentMarkdown,
      },
    });

    return NextResponse.json({ success: true, consentForm: consent });
  } catch (error) {
    console.error('Erro ao salvar TCLE:', error);
    return NextResponse.json({ error: 'Erro ao salvar TCLE.' }, { status: 500 });
  }
}
