const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function importData() {
  const prisma = new PrismaClient();
  console.log('Iniciando importação de dados para o novo banco de dados...');

  if (!fs.existsSync('prisma/data_backup.json')) {
    console.error('Arquivo prisma/data_backup.json não encontrado!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync('prisma/data_backup.json', 'utf8'));

  // 1. Usuários
  console.log(`Importando ${data.users.length} usuários...`);
  for (const item of data.users) {
    await prisma.user.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        name: item.name,
        email: item.email,
        password: item.password,
        role: item.role,
        isApproved: Boolean(item.isApproved),
        createdAt: new Date(item.createdAt),
      },
    });
  }

  // 2. Pacientes (Prontuário Central)
  console.log(`Importando ${data.patients.length} pacientes...`);
  for (const item of data.patients) {
    await prisma.patient.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        fullName: item.fullName,
        cpf: item.cpf,
        email: item.email,
        phoneWhatsApp: item.phoneWhatsApp,
        address: item.address,
        dateOfBirth: new Date(item.dateOfBirth),
        biologicalSex: item.biologicalSex,
        comorbidities: item.comorbidities,
        allergies: item.allergies,
        medications: item.medications,
        chiefComplaint: item.chiefComplaint,
        expectations: item.expectations,
        createdAt: new Date(item.createdAt),
      },
    });
  }

  // 3. Projetos de Pesquisa
  console.log(`Importando ${data.projects.length} projetos...`);
  for (const item of data.projects) {
    await prisma.project.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        anamnesisTemplate: item.anamnesisTemplate,
        createdAt: new Date(item.createdAt),
      },
    });
  }

  // 4. Membros da Equipe
  console.log(`Importando ${data.projectMembers.length} membros da equipe...`);
  for (const item of data.projectMembers) {
    await prisma.projectMember.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        userId: item.userId,
        projectId: item.projectId,
        role: item.role,
        isBlinded: Boolean(item.isBlinded),
      },
    });
  }

  // 5. Participantes da Pesquisa
  console.log(`Importando ${data.participants.length} participantes...`);
  for (const item of data.participants) {
    await prisma.participant.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        patientId: item.patientId,
        projectId: item.projectId,
        researchCode: item.researchCode,
        status: item.status,
        exclusionReason: item.exclusionReason,
        group: item.group,
        anamnesisDone: Boolean(item.anamnesisDone),
        anamnesisData: item.anamnesisData,
        createdAt: new Date(item.createdAt),
      },
    });
  }

  // 6. TCLEs
  console.log(`Importando ${data.consentForms.length} termos de consentimento...`);
  for (const item of data.consentForms) {
    await prisma.consentForm.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        projectId: item.projectId,
        title: item.title,
        responsibleResearcher: item.responsibleResearcher,
        advisor: item.advisor,
        institution: item.institution,
        ethicsNumber: item.ethicsNumber,
        ethicsContacts: item.ethicsContacts,
        contentMarkdown: item.contentMarkdown,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt || item.createdAt),
      },
    });
  }

  // 7. Assinaturas de TCLE
  console.log(`Importando ${data.consentSignatures.length} assinaturas...`);
  for (const item of data.consentSignatures) {
    await prisma.consentSignature.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        consentFormId: item.consentFormId,
        participantId: item.participantId,
        participantName: item.participantName,
        cpf: item.cpf,
        signatureData: item.signatureData,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        signedAt: new Date(item.signedAt),
      },
    });
  }

  // 8. Formulários eCRF
  console.log(`Importando ${data.forms.length} formulários eCRF...`);
  for (const item of data.forms) {
    await prisma.form.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        projectId: item.projectId,
        title: item.title,
        description: item.description,
        questionsJson: item.questionsJson,
        expirationHours: item.expirationHours,
        allowLate: Boolean(item.allowLate),
        createdAt: new Date(item.createdAt),
      },
    });
  }

  // 9. Respostas eCRF
  console.log(`Importando ${data.formResponses.length} respostas eCRF...`);
  for (const item of data.formResponses) {
    await prisma.formResponse.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        formId: item.formId,
        participantId: item.participantId,
        answersJson: item.answersJson,
        signatureData: item.signatureData,
        isLate: Boolean(item.isLate),
        submittedAt: new Date(item.submittedAt),
      },
    });
  }

  // 10. Sessões Clínicas
  console.log(`Importando ${data.clinicalSessions.length} sessões clínicas...`);
  for (const item of data.clinicalSessions) {
    await prisma.clinicalSession.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        participantId: item.participantId,
        sessionNumber: item.sessionNumber,
        sessionType: item.sessionType,
        sessionDate: new Date(item.sessionDate),
        shadeRight: item.shadeRight,
        shadeLeft: item.shadeLeft,
        painScore0h: item.painScore0h,
        painScore1h: item.painScore1h,
        painScore24h: item.painScore24h,
        painScore48h: item.painScore48h,
        gingivalIrritation: item.gingivalIrritation,
        adverseEvents: item.adverseEvents,
        operatorName: item.operatorName,
        evaluatorName: item.evaluatorName,
        notes: item.notes,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt || item.createdAt),
      },
    });
  }

  console.log('✅ Importação concluída com 100% de sucesso!');
  await prisma.$disconnect();
}

importData().catch((err) => {
  console.error('Erro na importação:', err);
  process.exit(1);
});
