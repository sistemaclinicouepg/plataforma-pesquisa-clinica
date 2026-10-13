const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando povoamento do banco de dados...');

  // Limpar dados anteriores para evitar duplicações
  await prisma.formResponse.deleteMany();
  await prisma.form.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar Usuários
  const admin = await prisma.user.create({
    data: {
      name: 'Dra. Alessandra Reis (Admin)',
      email: 'admin@uepg.br',
      password: 'admin',
      role: 'ADMIN',
      isApproved: true,
    },
  });

  const researcher = await prisma.user.create({
    data: {
      name: 'Dra. Roberta Micheten Dias',
      email: 'pesquisadora@uepg.br',
      password: '123',
      role: 'RESEARCHER',
      isApproved: true,
    },
  });

  const pendingResearcher = await prisma.user.create({
    data: {
      name: 'Carlos Eduardo (Mestrando)',
      email: 'carlos@uepg.br',
      password: '123',
      role: 'RESEARCHER',
      isApproved: false, // Aguardando aprovação
    },
  });

  console.log('Usuários criados com sucesso!');

  // 2. Criar Projetos
  const project1 = await prisma.project.create({
    data: {
      name: 'Clareamento Dental em Consultório: HP 6% vs CP 37% (Split-Mouth)',
      description: 'Ensaio clínico randomizado controlado de boca dividida avaliando eficácia e sensibilidade.',
      members: {
        create: [
          {
            userId: researcher.id,
            role: 'COORDINATOR',
            isBlinded: false,
          },
          {
            userId: admin.id,
            role: 'COORDINATOR',
            isBlinded: false,
          },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Avaliação Longitudinal de Resinas Compostas Bulk-Fill',
      description: 'Acompanhamento clínico de restaurações classe II em dentes posteriores.',
      members: {
        create: [
          {
            userId: researcher.id,
            role: 'EVALUATOR',
            isBlinded: true, // Avaliador cego!
          },
        ],
      },
    },
  });

  console.log('Projetos criados com sucesso!');

  // 3. Criar Pacientes Globais e Participantes no Projeto 1
  const p1 = await prisma.patient.create({
    data: {
      fullName: 'Ana Clara Silva',
      cpf: '111.222.333-44',
      email: 'ana.silva@email.com',
      phoneWhatsApp: '(42) 99911-2233',
      address: 'Rua das Flores, 120 - Ponta Grossa/PR',
      dateOfBirth: new Date('1998-05-14'),
      biologicalSex: 'Feminino',
      comorbidities: 'Nenhuma',
      allergies: 'Nenhuma conhecida',
      medications: 'Nenhum de uso contínuo',
      chiefComplaint: 'Dentes amarelados',
      expectations: 'Melhorar o sorriso para formatura',
      participations: {
        create: {
          projectId: project1.id,
          researchCode: 'P001',
          status: 'APPROVED',
          group: 'HP6_DIR / CP37_ESQ',
        },
      },
    },
  });

  const p2 = await prisma.patient.create({
    data: {
      fullName: 'Marcos Vinicius Oliveira',
      cpf: '222.333.444-55',
      email: 'marcos.oli@email.com',
      phoneWhatsApp: '(42) 99922-3344',
      address: 'Av. Vicente Machado, 850 - Ponta Grossa/PR',
      dateOfBirth: new Date('1995-10-20'),
      biologicalSex: 'Masculino',
      comorbidities: 'Hipertensão leve controlada',
      allergies: 'Dipirona',
      medications: 'Losartana 50mg',
      chiefComplaint: 'Desejo de clarear os dentes para casamento',
      expectations: 'Resultado natural e sem dor',
      participations: {
        create: {
          projectId: project1.id,
          researchCode: 'P002',
          status: 'PENDING', // Triagem Pendente
        },
      },
    },
  });

  const p3 = await prisma.patient.create({
    data: {
      fullName: 'Juliana Beatriz Santos',
      cpf: '333.444.555-66',
      email: 'juliana.santos@email.com',
      phoneWhatsApp: '(42) 99933-4455',
      address: 'Rua Balduíno Taques, 430 - Ponta Grossa/PR',
      dateOfBirth: new Date('2001-02-18'),
      biologicalSex: 'Feminino',
      comorbidities: 'Nenhuma',
      allergies: 'Alergia severa a peróxidos',
      medications: 'Nenhum',
      chiefComplaint: 'Gostaria de clarear',
      expectations: 'Dentes brancos',
      participations: {
        create: {
          projectId: project1.id,
          researchCode: 'P003',
          status: 'EXCLUDED',
          exclusionReason: 'Alergia prévia a agentes clareadores (Critério de Exclusão nº 3)',
        },
      },
    },
  });

  const p4 = await prisma.patient.create({
    data: {
      fullName: 'Lucas Gabriel Ferreira',
      cpf: '444.555.666-77',
      email: 'lucas.gf@email.com',
      phoneWhatsApp: '(42) 99944-5566',
      address: 'Rua Carlos Cavalcanti, 2100 - Uvaranas',
      dateOfBirth: new Date('1997-08-30'),
      biologicalSex: 'Masculino',
      comorbidities: 'Nenhuma',
      allergies: 'Nenhuma',
      medications: 'Nenhum',
      chiefComplaint: 'Manchas de café nos dentes anteriores',
      expectations: 'Remover manchas',
      participations: {
        create: {
          projectId: project1.id,
          researchCode: 'P004',
          status: 'APPROVED',
          group: 'CP37_DIR / HP6_ESQ',
        },
      },
    },
  });

  // 4. Criar Formulário Padrão do Projeto 1
  const form1 = await prisma.form.create({
    data: {
      projectId: project1.id,
      title: 'Diário de Sensibilidade e Irritação Gengival (24h)',
      description: 'Formulário diário para acompanhamento de sensibilidade e irritação gengival pós-sessão.',
      expirationHours: 24,
      allowLate: false,
      questionsJson: JSON.stringify([
        {
          id: 1,
          type: 'instruction',
          title: 'Orientações Iniciais',
          description: 'Responda avaliando suas sensações ao longo das últimas 24 horas.',
          required: false,
        },
        {
          id: 2,
          type: 'vas',
          title: 'Escala Visual Analógica (EVA) para irritação gengival',
          minLabel: '0 = Ausência de irritação gengival',
          maxLabel: '10 = Irritação gengival severa',
          required: true,
        },
        {
          id: 3,
          type: 'vas',
          title: 'Escala Visual Analógica (EVA) para sensibilidade dental',
          minLabel: '0 = Nenhuma sensibilidade',
          maxLabel: '10 = Dor/Sensibilidade insuportável',
          required: true,
        },
        {
          id: 4,
          type: 'boolean',
          title: 'Você precisou tomar algum remédio para dor (analgésico) nas últimas 24 horas?',
          required: true,
        },
      ]),
    },
  });

  console.log('Dados de teste criados com sucesso no banco de dados!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
