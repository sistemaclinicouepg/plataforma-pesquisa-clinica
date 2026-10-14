import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId é obrigatório.' },
        { status: 400 }
      );
    }

    if (participantId === 'demo') {
      return NextResponse.json({
        success: true,
        consentForm: {
          id: 'demo-tcle',
          title: 'Ensaio Clínico de Demonstração - Clareamento Dental UEPG',
          responsibleResearcher: 'Dra. Roberta Micheten Dias',
          advisor: 'Profa. Dra. Alessandra Reis',
          institution: 'Universidade Estadual de Ponta Grossa – UEPG',
          ethicsNumber: 'Parecer CEP nº 5.892.104 / CAAE',
          ethicsContacts:
            'Comitê de Ética em Pesquisa da UEPG: Av. Carlos Cavalcanti, nº 4748, Bloco Reitoria, Sala 22 - Uvaranas, Ponta Grossa/PR. Tel: (42) 3220-3282 - E-mail: coep105@uepg.br',
          contentMarkdown: 'Termo de Consentimento Livre e Esclarecido padrão assinado pelo participante.',
        },
        participant: {
          id: 'demo',
          researchCode: 'P-DEMO',
          fullName: 'Voluntário de Demonstração',
        },
      });
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        patient: { select: { fullName: true, cpf: true } },
        project: { include: { consentForm: true } },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }

    const consentForm = participant.project.consentForm || {
      id: `default-${participant.project.id}`,
      projectId: participant.project.id,
      title: participant.project.name,
      responsibleResearcher: 'Dra. Roberta Micheten Dias',
      advisor: 'Profa. Dra. Alessandra Reis',
      institution: 'Universidade Estadual de Ponta Grossa – UEPG',
      ethicsNumber: 'Parecer CEP nº 5.892.104 / CAAE',
      ethicsContacts:
        'Comitê de Ética em Pesquisa da UEPG: Av. Carlos Cavalcanti, nº 4748, Bloco Reitoria, Sala 22 - Uvaranas, Ponta Grossa/PR. Tel: (42) 3220-3282 - E-mail: coep105@uepg.br',
      contentMarkdown: 'Termo de Consentimento Livre e Esclarecido padrão assinado pelo participante.',
    };

    return NextResponse.json({
      success: true,
      consentForm,
      participant: {
        id: participant.id,
        researchCode: participant.researchCode,
        fullName: participant.patient.fullName,
        projectName: participant.project.name,
      },
    });
  } catch (error) {
    console.error('Erro ao consultar TCLE:', error);
    return NextResponse.json({ error: 'Erro ao consultar TCLE.' }, { status: 500 });
  }
}

import { generateSignatureHash } from '@/lib/cryptoHash';

export async function POST(req: Request) {
  try {
    const {
      participantId,
      consentFormId,
      signatureData,
      isAssent,
      guardianName,
      guardianCpf,
      guardianRelationship,
      guardianSignatureData,
    } = await req.json();

    if (!participantId || !signatureData) {
      return NextResponse.json(
        { error: 'Identificação do participante e traçado da assinatura são obrigatórios.' },
        { status: 400 }
      );
    }

    if (isAssent && (!guardianName || !guardianCpf || !guardianSignatureData)) {
      return NextResponse.json(
        { error: 'Para o Termo de Assentimento (menores de 18 anos), o preenchimento dos dados e assinatura do responsável legal são obrigatórios.' },
        { status: 400 }
      );
    }

    if (participantId === 'demo') {
      const demoSignedAt = new Date().toISOString();
      const demoHash = generateSignatureHash({
        participantId: 'demo',
        cpf: '000.000.000-00',
        signedAt: demoSignedAt,
        consentFormId: 'demo-tcle',
        signatureData,
        isAssent: Boolean(isAssent),
        guardianCpf,
      });

      return NextResponse.json({
        success: true,
        signatureId: 'TCLE-DEMO-2026',
        signedAt: demoSignedAt,
        signatureHash: demoHash,
        audit: {
          ipAddress: '127.0.0.1 (Demonstração)',
          userAgent: 'Navegador Web / Modo Teste',
          hash: demoHash,
        },
      });
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
    const signedAt = new Date();

    // Cálculo do Hash SHA-256 de validação criptográfica (CNS 466/12 e LGPD)
    const signatureHash = generateSignatureHash({
      participantId: participant.id,
      cpf: participant.patient.cpf,
      signedAt,
      consentFormId: targetFormId,
      signatureData,
      isAssent: Boolean(isAssent),
      guardianCpf,
    });

    const signature = await prisma.consentSignature.create({
      data: {
        consentFormId: targetFormId,
        participantId: participant.id,
        participantName: participant.patient.fullName,
        cpf: participant.patient.cpf,
        signatureData: signatureData,
        signatureHash: signatureHash,
        ipAddress: ipAddress,
        userAgent: userAgent,
        isAssent: Boolean(isAssent),
        guardianName: guardianName || null,
        guardianCpf: guardianCpf || null,
        guardianRelationship: guardianRelationship || null,
        guardianSignatureData: guardianSignatureData || null,
        signedAt: signedAt,
      },
    });

    // Registrar assinatura na Trilha de Auditoria (Audit Trail - GCP / ICH E6)
    await prisma.auditLog.create({
      data: {
        projectId: participant.projectId,
        entityType: isAssent ? 'ConsentSignature (TALE)' : 'ConsentSignature (TCLE)',
        entityId: signature.id,
        action: 'CREATE',
        changedBy: participant.patient.fullName,
        userEmail: participant.patient.email || undefined,
        fieldName: 'signatureData / signatureHash',
        oldValue: null,
        newValue: `Hash SHA-256: ${signatureHash}${isAssent ? ` | Responsável: ${guardianName} (${guardianRelationship})` : ''}`,
        reason: isAssent
          ? 'Registro e assinatura eletrônica de Termo de Assentimento Livre e Esclarecido (TALE)'
          : 'Registro e assinatura eletrônica de Termo de Consentimento Livre e Esclarecido (TCLE)',
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      signatureId: signature.id,
      signedAt: signature.signedAt,
      signatureHash: signature.signatureHash,
      isAssent: signature.isAssent,
      guardianName: signature.guardianName,
      guardianRelationship: signature.guardianRelationship,
      audit: {
        ipAddress: signature.ipAddress,
        userAgent: signature.userAgent,
        hash: signature.signatureHash,
      },
    });
  } catch (error) {
    console.error('Erro ao assinar TCLE/TALE:', error);
    return NextResponse.json(
      { error: 'Erro interno ao registrar assinatura eletrônica.' },
      { status: 500 }
    );
  }
}
