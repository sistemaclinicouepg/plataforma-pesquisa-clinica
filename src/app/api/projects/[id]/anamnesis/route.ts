import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const body = await req.json();
    const { anamnesisTemplate } = body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        anamnesisTemplate: anamnesisTemplate ? JSON.stringify(anamnesisTemplate) : null,
      },
    });

    return NextResponse.json({
      success: true,
      projectId: updated.id,
      anamnesisTemplate,
    });
  } catch (error) {
    console.error('Erro ao salvar template de anamnese:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configuração da anamnese.' },
      { status: 500 }
    );
  }
}
