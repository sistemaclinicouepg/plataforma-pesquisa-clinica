import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OFFICIAL_UEPG_TCLE } from '@/lib/tcleDefault';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do participante é obrigatório.' },
        { status: 400 }
      );
    }

    if (id === 'demo') {
      return NextResponse.json({
        success: true,
        consentForm: {
          id: 'demo-tcle',
          title: OFFICIAL_UEPG_TCLE.title,
          responsibleResearcher: OFFICIAL_UEPG_TCLE.responsibleResearcher,
          advisor: OFFICIAL_UEPG_TCLE.advisor,
          institution: OFFICIAL_UEPG_TCLE.institution,
          ethicsNumber: OFFICIAL_UEPG_TCLE.ethicsNumber,
          ethicsContacts: OFFICIAL_UEPG_TCLE.ethicsContacts,
          contentMarkdown: OFFICIAL_UEPG_TCLE.contentMarkdown,
          assentContentMarkdown: OFFICIAL_UEPG_TCLE.assentContentMarkdown,
        },
        participant: {
          id: 'demo',
          researchCode: 'P-DEMO',
          fullName: 'Voluntário de Demonstração',
          projectName: 'Ensaio Clínico Split-Mouth Clareamento UEPG',
        },
      });
    }

    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            fullName: true,
            cpf: true,
            dateOfBirth: true,
          },
        },
        project: {
          include: {
            consentForm: true,
          },
        },
        signatures: {
          orderBy: { signedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participante não encontrado.' },
        { status: 404 }
      );
    }

    const dob = participant.patient.dateOfBirth;
    let isMinor = false;
    if (dob) {
      const birthDate = new Date(dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        isMinor = age < 18;
      }
    }

    let consentForm = participant.project.consentForm;

    if (!consentForm) {
      consentForm = {
        id: `default-${participant.project.id}`,
        projectId: participant.project.id,
        title: participant.project.name || OFFICIAL_UEPG_TCLE.title,
        responsibleResearcher: OFFICIAL_UEPG_TCLE.responsibleResearcher,
        advisor: OFFICIAL_UEPG_TCLE.advisor,
        institution: OFFICIAL_UEPG_TCLE.institution,
        ethicsNumber: OFFICIAL_UEPG_TCLE.ethicsNumber,
        ethicsContacts: OFFICIAL_UEPG_TCLE.ethicsContacts,
        contentMarkdown: OFFICIAL_UEPG_TCLE.contentMarkdown,
        assentContentMarkdown: OFFICIAL_UEPG_TCLE.assentContentMarkdown,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const latestSignature = participant.signatures[0] || null;

    return NextResponse.json({
      success: true,
      consentForm,
      isMinor,
      requiresAssent: isMinor, // Assentimento (TALE) exclusivo para menores de 18 anos
      existingSignature: latestSignature,
      participant: {
        id: participant.id,
        researchCode: participant.researchCode,
        fullName: participant.patient.fullName,
        cpf: participant.patient.cpf,
        dateOfBirth: participant.patient.dateOfBirth,
        projectName: participant.project.name,
        projectId: participant.project.id,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar TCLE do participante:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar TCLE.' },
      { status: 500 }
    );
  }
}
