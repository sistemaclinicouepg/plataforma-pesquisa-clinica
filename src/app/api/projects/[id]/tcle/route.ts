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

    // Modelo padrão inteligente baseado no protocolo da UEPG
    const defaultTCLE = {
      projectId: project.id,
      title: project.name,
      responsibleResearcher: 'Dra. Roberta Micheten Dias',
      advisor: 'Profa. Dra. Alessandra Reis',
      institution: 'Universidade Estadual de Ponta Grossa – UEPG',
      ethicsNumber: 'Parecer CEP nº 5.892.104 / CAAE',
      ethicsContacts:
        'Comitê de Ética em Pesquisa da UEPG: Av. Carlos Cavalcanti, nº 4748, Bloco Reitoria, Sala 22 - Uvaranas, Ponta Grossa/PR. Tel: (42) 3220-3282 - E-mail: coep105@uepg.br',
      contentMarkdown: `Você está sendo convidado(a) a participar de uma pesquisa científica desenvolvida na Universidade Estadual de Ponta Grossa (UEPG). Antes de decidir participar, é fundamental que leia atentamente este documento.

### 1. Justificativa e Objetivos
Esta pesquisa tem como objetivo comparar a eficácia clínica de dois géis clareadores amplamente utilizados no mercado odontológico: peróxido de hidrogênio a 6% e peróxido de carbamida a 37%. Serão realizadas 3 sessões clínicas com intervalo de 7 dias entre elas.

### 2. Procedimentos da Pesquisa
Serão avaliados ao longo do tratamento:
- Alteração e estabilidade da cor dos dentes por meio de escala visual padronizada;
- Ocorrência e intensidade de eventual sensibilidade dentária relatada;
- Avaliação criteriosa da saúde e possível irritação gengival transitória;
- Grau de satisfação pessoal do participante com a estética do sorriso.

O estudo utiliza a metodologia de boca dividida (split-mouth), onde cada hemi-arcada recebe um tratamento sob rigoroso cegamento metodológico.

### 3. Riscos, Desconfortos e Cuidados
Os riscos desta pesquisa são considerados mínimos e equivalentes aos de qualquer clareamento dental de rotina. Os principais desconfortos que podem ocorrer incluem sensibilidade dentária temporária ou leve irritação gengival transitória ao frio ou estímulos térmicos. 
Caso qualquer sintoma persista, a equipe de pesquisadores fornecerá acompanhamento integral gratuito e aplicação imediata de agentes dessensibilizantes.

### 4. Confidencialidade e LGPD (Lei nº 13.709/2018)
Seus dados pessoais serão rigorosamente protegidos. Qualquer divulgação de resultados em congressos ou periódicos científicos ocorrerá estritamente de forma anônima e coletiva através de código de pesquisa alfanumérico (ex: P00X).

### 5. Voluntariedade e Retirada de Consentimento
Sua participação é inteiramente livre e voluntária. Você possui o direito garantido de recusar ou desistir de participar a qualquer momento, sem qualquer penalidade ou prejuízo ao seu atendimento.`,
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
    const body = await req.json();
    const {
      title,
      responsibleResearcher,
      advisor,
      institution,
      ethicsNumber,
      ethicsContacts,
      contentMarkdown,
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
      },
    });

    return NextResponse.json({ success: true, consentForm: consent });
  } catch (error) {
    console.error('Erro ao salvar TCLE:', error);
    return NextResponse.json({ error: 'Erro ao salvar TCLE.' }, { status: 500 });
  }
}
