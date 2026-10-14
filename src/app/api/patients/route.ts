import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // 1. Localizar ou criar o paciente central (LGPD: Prontuário Global)
    let patient = await prisma.patient.findUnique({
      where: { cpf: cleanCpf },
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

    // 2. Gerar o próximo código de pesquisa no projeto (P001, P002, etc.)
    const totalParticipants = await prisma.participant.count({
      where: { projectId },
    });
    const nextNumber = totalParticipants + 1;
    const researchCode = `P${String(nextNumber).padStart(3, '0')}`;

    // 3. Criar a participação desidentificada vinculada ao projeto
    const participant = await prisma.participant.create({
      data: {
        patientId: patient.id,
        projectId: projectId,
        researchCode: researchCode,
        status: 'PENDING', // Inicia aguardando triagem
      },
    });

    return NextResponse.json({ success: true, participant: { ...participant, patient } });
  } catch (error) {
    console.error('Erro ao cadastrar paciente:', error);
    return NextResponse.json(
      { error: 'Erro ao cadastrar prontuário e participante.' },
      { status: 500 }
    );
  }
}
