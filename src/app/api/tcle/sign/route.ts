import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { participantId, consentFormId, signatureData } = await req.json();

    if (!participantId || !signatureData) {
      return NextResponse.json(
        { error: 'Identificação do participante e traçado da assinatura são obrigatórios.' },
        { status: 400 }
      );
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { patient: true, project: { include: { consentForm: true } } },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }

    // Se consentFormId não veio, pega o consentForm do projeto ou o primeiro ativo
    let targetFormId = consentFormId || participant.project.consentForm?.id;
    if (!targetFormId) {
      // Se ainda não existir ConsentForm persistido, cria um automaticamente para o projeto
      const newConsent = await prisma.consentForm.create({
        data: {
          projectId: participant.projectId,
          title: participant.project.name,
          responsibleResearcher: 'Dra. Roberta Micheten Dias',
          advisor: 'Profa. Dra. Alessandra Reis',
          contentMarkdown: 'Termo de Consentimento Livre e Esclarecido padrão assinado pelo participante.',
        },
      });
      targetFormId = newConsent.id;
    }

    const reqHeaders = await headers();
    const ipAddress =
      reqHeaders.get('x-forwarded-for')?.split(',')[0] ||
      reqHeaders.get('x-real-ip') ||
      '127.0.0.1 (Rede Local)';
    const userAgent = reqHeaders.get('user-agent') || 'Navegador Web / Celular';

    const signature = await prisma.consentSignature.create({
      data: {
        consentFormId: targetFormId,
        participantId: participant.id,
        participantName: participant.patient.fullName,
        cpf: participant.patient.cpf,
        signatureData: signatureData,
        ipAddress: ipAddress,
        userAgent: userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      signatureId: signature.id,
      signedAt: signature.signedAt,
      audit: {
        ipAddress: signature.ipAddress,
        userAgent: signature.userAgent,
      },
    });
  } catch (error) {
    console.error('Erro ao assinar TCLE:', error);
    return NextResponse.json(
      { error: 'Erro interno ao registrar assinatura eletrônica.' },
      { status: 500 }
    );
  }
}
