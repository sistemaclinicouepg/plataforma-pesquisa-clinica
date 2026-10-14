import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      projectId,
      fullName,
      cpf,
      email,
      phoneWhatsApp,
      address,
      dateOfBirth,
      biologicalSex,
      comorbidities,
      allergies,
      medications,
      chiefComplaint,
      expectations,
    } = data;

    if (!fullName || !cpf || !phoneWhatsApp || !projectId) {
      return NextResponse.json(
        { error: 'Nome completo, CPF, WhatsApp e Projeto são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanCpf = cpf.trim();
    const cleanDigits = cpf.replace(/\D/g, '');

    // 1. Localizar ou criar o paciente central (LGPD: Prontuário Global)
    // Permite localizar tanto formatado ("000.000.000-00") quanto apenas dígitos
    let patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { cpf: cleanCpf },
          ...(cleanDigits.length >= 6 ? [{ cpf: cleanDigits }] : []),
        ],
      },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          fullName: fullName.trim(),
          cpf: cleanCpf,
          email: email?.trim() || null,
          phoneWhatsApp: phoneWhatsApp.trim(),
          address: address?.trim() || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('2000-01-01'),
          biologicalSex: biologicalSex || 'Não informado',
          comorbidities: comorbidities?.trim() || null,
          allergies: allergies?.trim() || null,
          medications: medications?.trim() || null,
          chiefComplaint: chiefComplaint?.trim() || null,
          expectations: expectations?.trim() || null,
        },
      });
    }

    // 2. Verificar se este paciente já está cadastrado nesta pesquisa específica
    const existingParticipant = await prisma.participant.findFirst({
      where: {
        projectId,
        patientId: patient.id,
      },
      include: {
        patient: true,
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        {
          error: `Este voluntário (${patient.fullName}) já está cadastrado nesta pesquisa com o código ${existingParticipant.researchCode}.`,
          participant: existingParticipant,
        },
        { status: 409 }
      );
    }

    // 3. Gerar código de pesquisa sequencial seguro e à prova de colisões (P001, P002, etc.)
    const existingParticipants = await prisma.participant.findMany({
      where: { projectId },
      select: { researchCode: true },
    });

    const usedNumbers = existingParticipants
      .map((p) => {
        const m = p.researchCode.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      })
      .filter((n) => n > 0);

    const nextNumber = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1;
    const researchCode = `P${String(nextNumber).padStart(3, '0')}`;

    // 4. Criar a participação desidentificada vinculada ao projeto
    const participant = await prisma.participant.create({
      data: {
        patientId: patient.id,
        projectId: projectId,
        researchCode: researchCode,
        status: 'PENDING', // Inicia aguardando triagem
      },
    });

    // 5. Trilha de Auditoria (GCP/ICH E6 e 21 CFR Part 11)
    try {
      const currentUser = await getCurrentUser();
      await prisma.auditLog.create({
        data: {
          projectId,
          action: 'CREATE',
          entityType: 'Participant',
          entityId: participant.id,
          changedBy: currentUser?.name || 'Pesquisador Responsável',
          reason: `Admissão de voluntário ${patient.fullName} (Código: ${researchCode}) para triagem clínica.`,
        },
      });
    } catch (auditErr) {
      console.warn('Erro ao registrar log de auditoria de admissão:', auditErr);
    }

    return NextResponse.json({ success: true, participant: { ...participant, patient } });
  } catch (error: any) {
    console.error('Erro ao cadastrar paciente:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao cadastrar prontuário e participante.' },
      { status: 500 }
    );
  }
}
