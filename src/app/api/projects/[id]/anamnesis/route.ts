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

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        anamnesisTemplate: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    let parsedTemplate = null;
    if (project.anamnesisTemplate) {
      try {
        parsedTemplate = JSON.parse(project.anamnesisTemplate);
      } catch (err) {
        console.error('Erro ao fazer parse do template de anamnese:', err);
      }
    }

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      anamnesisTemplate: parsedTemplate,
    });
  } catch (error) {
    console.error('Erro ao buscar template de anamnese:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar configuração da anamnese.' },
      { status: 500 }
    );
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
    const { anamnesisTemplate } = body;

    // Preservar studyProtocol caso o formulário de anamnese não o envie explicitamente
    let finalTemplate = anamnesisTemplate;
    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { anamnesisTemplate: true },
    });

    if (existingProject?.anamnesisTemplate && finalTemplate) {
      try {
        const existingParsed = JSON.parse(existingProject.anamnesisTemplate);
        if (existingParsed?.studyProtocol && !finalTemplate.studyProtocol) {
          finalTemplate = {
            ...finalTemplate,
            studyProtocol: existingParsed.studyProtocol,
          };
        }
      } catch (err) {
        console.warn('Aviso ao mesclar studyProtocol existente:', err);
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        anamnesisTemplate: finalTemplate ? JSON.stringify(finalTemplate) : null,
      },
    });

    return NextResponse.json({
      success: true,
      projectId: updated.id,
      anamnesisTemplate: finalTemplate,
    });
  } catch (error) {
    console.error('Erro ao salvar template de anamnese:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configuração da anamnese.' },
      { status: 500 }
    );
  }
}
