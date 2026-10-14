import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
          title: 'Ensaio Clínico de Demonstração - Clareamento Dental UEPG',
          responsibleResearcher: 'Dra. Roberta Micheten Dias',
          advisor: 'Profa. Dra. Alessandra Reis',
          institution: 'Universidade Estadual de Ponta Grossa – UEPG',
          ethicsNumber: 'Parecer CEP nº 5.892.104 / CAAE',
          ethicsContacts:
            'Comitê de Ética em Pesquisa da UEPG: Av. Carlos Cavalcanti, nº 4748, Bloco Reitoria, Sala 22 - Uvaranas, Ponta Grossa/PR. Tel: (42) 3220-3282 - E-mail: coep105@uepg.br',
          contentMarkdown: `Você está sendo convidado(a) a participar de uma pesquisa científica desenvolvida na Universidade Estadual de Ponta Grossa (UEPG). Antes de decidir participar, é fundamental que leia atentamente este documento.

### 1. Justificativa e Objetivos
Esta pesquisa tem como objetivo comparar a eficácia clínica de dois géis clareadores amplamente utilizados no mercado odontológico: peróxido de hidrogênio a 6% e peróxido de carbamida a 37%.

### 2. Procedimentos da Pesquisa
Serão avaliados ao longo do tratamento: alteração e estabilidade da cor dos dentes, ocorrência e intensidade de eventual sensibilidade dentária e saúde gengival.

### 3. Riscos e Benefícios
Os riscos são mínimos e equivalentes a procedimentos odontológicos de rotina. Caso haja sensibilidade, atendimento imediato e agentes dessensibilizantes serão oferecidos gratuitamente.

### 4. Confidencialidade e LGPD (Lei nº 13.709/2018)
Seus dados pessoais serão rigorosamente protegidos nos termos da Lei Geral de Proteção de Dados. Qualquer divulgação de resultados em periódicos científicos ocorrerá de forma anônima através de código de pesquisa alfanumérico.`,
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
        title: participant.project.name,
        responsibleResearcher: 'Dra. Roberta Micheten Dias',
        advisor: 'Profa. Dra. Alessandra Reis',
        institution: 'Universidade Estadual de Ponta Grossa – UEPG',
        ethicsNumber: 'Parecer CEP nº 5.892.104 / CAAE',
        ethicsContacts:
          'Comitê de Ética em Pesquisa da UEPG: Av. Carlos Cavalcanti, nº 4748, Bloco Reitoria, Sala 22 - Uvaranas, Ponta Grossa/PR. Tel: (42) 3220-3282 - E-mail: coep105@uepg.br',
        contentMarkdown: `Você está sendo convidado(a) a participar de uma pesquisa científica desenvolvida na Universidade Estadual de Ponta Grossa (UEPG). Antes de decidir participar, é fundamental que leia atentamente este documento.

### 1. Justificativa e Objetivos
Esta pesquisa tem como objetivo avaliar protocolos clínicos odontológicos desenvolvidos no âmbito dos ensaios clínicos da UEPG.

### 2. Procedimentos da Pesquisa
Serão avaliados ao longo do tratamento a eficácia do protocolo, eventual sensibilidade relatada e parâmetros de segurança clínica.

### 3. Confidencialidade e LGPD (Lei nº 13.709/2018)
Seus dados pessoais serão protegidos com sigilo e confidencialidade nos termos da LGPD, sendo identificados na pesquisa estritamente através do seu código de pesquisa.`,
        assentContentMarkdown: `Termo de Assentimento Livre e Esclarecido (TALE) - UEPG
Você está sendo convidado a participar de uma pesquisa sobre clareamento dental e saúde bucal.
Explicamos tudo para você e seus pais ou responsáveis. Se você tiver qualquer dúvida ou não quiser continuar em qualquer momento, você pode nos dizer e nada vai acontecer de ruim. Seus pais assinam junto com você para confirmar sua participação segura.`,
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
