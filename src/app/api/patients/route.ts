import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() || '';

    const patients = await prisma.patient.findMany({
      where: search ? {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search } },
          { phoneWhatsApp: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        participations: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            },
            sessions: {
              select: {
                id: true,
                sessionNumber: true,
                sessionDate: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error('Erro ao buscar pacientes:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar pacientes.' },
      { status: 500 }
    );
  }
}

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

    if (!fullName || !cpf || !phoneWhatsApp) {
      return NextResponse.json(
        { error: 'Nome completo, CPF e WhatsApp são obrigatórios.' },
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

    if (patient && !projectId) {
      return NextResponse.json(
        { error: `Já existe um paciente cadastrado com este CPF (${cleanCpf}): ${patient.fullName}.` },
        { status: 409 }
      );
    }

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

      // Se criado sem vínculo a um projeto específico (Cadastro Central)
      if (!projectId) {
        try {
          const currentUser = await getCurrentUser();
          await prisma.auditLog.create({
            data: {
              action: 'CREATE',
              entityType: 'Patient',
              entityId: patient.id,
              changedBy: currentUser?.name || currentUser?.email || 'Administrador',
              userEmail: currentUser?.email,
              reason: `Cadastro de novo paciente ${patient.fullName} no prontuário unificado.`,
            },
          });
        } catch (auditErr) {
          console.warn('Erro ao registrar log de auditoria de cadastro:', auditErr);
        }
        return NextResponse.json({ success: true, patient });
      }
    } else if (!projectId) {
      return NextResponse.json({ success: true, patient });
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

    // 3. Determinar o prefixo exclusivo do projeto e gerar código sequencial seguro (ex: P01-001, P07-001)
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, createdAt: true, anamnesisTemplate: true },
    });

    let projectPrefix = '';
    if (currentProject?.anamnesisTemplate) {
      try {
        const proto = JSON.parse(currentProject.anamnesisTemplate);
        const customPrefix = proto?.studyProtocol?.projectPrefix || proto?.projectPrefix;
        if (customPrefix && typeof customPrefix === 'string') {
          projectPrefix = customPrefix.trim().toUpperCase();
        }
      } catch (e) {}
    }

    if (!projectPrefix) {
      // Calcular índice do projeto pela ordem de criação histórica
      const allProjects = await prisma.project.findMany({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      const pIdx = allProjects.findIndex((p) => p.id === projectId) + 1;
      projectPrefix = `P${String(pIdx > 0 ? pIdx : 1).padStart(2, '0')}`;
    }

    // Geração de Código NÃO-SEQUENCIAL e Criptograficamente Seguro (Anti-Enumeração / LGPD / GCP)
    // Sem hífen conforme especificação, utiliza 4 caracteres alfanuméricos inequívocos (sem 0, O, 1, I, L)
    // Garante que nenhum paciente consiga acessar a ficha de outro mudando o último dígito
    const generateSecureCode = (prefix: string, length = 4): string => {
      const cleanPrefix = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
      let token = '';
      const array = new Uint8Array(length);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
      } else {
        for (let i = 0; i < length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }
      for (let i = 0; i < length; i++) {
        token += chars[array[i] % chars.length];
      }
      return `${cleanPrefix}${token}`;
    };

    let researchCode = generateSecureCode(projectPrefix, 4);
    let attempts = 0;
    // Garantia absoluta de unicidade em toda a plataforma
    while (await prisma.participant.findFirst({ where: { researchCode } })) {
      attempts++;
      researchCode = generateSecureCode(projectPrefix, attempts > 5 ? 5 : 4);
    }

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

export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Não autorizado. Autenticação de pesquisador necessária.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      patientId,
      projectId,
      reason,
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
    } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId é obrigatório.' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A justificativa da alteração cadastral é obrigatória para a Trilha de Auditoria (GCP/ICH E6).' },
        { status: 400 }
      );
    }

    // Validação de permissão: usuário deve ser ADMIN ou membro do projeto
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.email === 'admin@uepg.br';
    if (!isAdmin) {
      if (!projectId) {
        return NextResponse.json(
          { error: 'projectId é obrigatório para validação de permissão de pesquisador.' },
          { status: 400 }
        );
      }
      const member = await prisma.projectMember.findFirst({
        where: { projectId, userId: currentUser.id },
      });
      if (!member) {
        return NextResponse.json(
          { error: 'Acesso negado. Você não possui permissão para editar dados de participantes deste estudo.' },
          { status: 403 }
        );
      }
    }

    const currentPatient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!currentPatient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado no prontuário.' },
        { status: 404 }
      );
    }

    // Se CPF foi alterado, verificar duplicidade
    if (cpf && cpf.trim() !== currentPatient.cpf) {
      const existingWithCpf = await prisma.patient.findFirst({
        where: {
          cpf: cpf.trim(),
          id: { not: patientId },
        },
      });
      if (existingWithCpf) {
        return NextResponse.json(
          { error: `Já existe outro paciente cadastrado com este CPF (${cpf.trim()}).` },
          { status: 409 }
        );
      }
    }

    // Preparar objeto de atualização e registrar trilha de auditoria para cada campo modificado
    const updates: Record<string, any> = {};
    const auditEntries: Array<{
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    const checkAndTrack = (
      field: string,
      oldVal: any,
      newVal: any,
      formatVal?: (v: any) => string | null
    ) => {
      if (newVal === undefined) return;
      const formattedOld = formatVal ? formatVal(oldVal) : oldVal ? String(oldVal).trim() : null;
      const formattedNew = formatVal ? formatVal(newVal) : newVal ? String(newVal).trim() : null;

      if (formattedOld !== formattedNew) {
        updates[field] = newVal;
        auditEntries.push({
          fieldName: field,
          oldValue: formattedOld,
          newValue: formattedNew,
        });
      }
    };

    checkAndTrack('fullName', currentPatient.fullName, fullName?.trim());
    checkAndTrack('cpf', currentPatient.cpf, cpf?.trim());
    checkAndTrack('email', currentPatient.email, email?.trim() || null);
    checkAndTrack('phoneWhatsApp', currentPatient.phoneWhatsApp, phoneWhatsApp?.trim());
    checkAndTrack('address', currentPatient.address, address?.trim() || null);
    checkAndTrack('biologicalSex', currentPatient.biologicalSex, biologicalSex?.trim());
    checkAndTrack('comorbidities', currentPatient.comorbidities, comorbidities?.trim() || null);
    checkAndTrack('allergies', currentPatient.allergies, allergies?.trim() || null);
    checkAndTrack('medications', currentPatient.medications, medications?.trim() || null);
    checkAndTrack('chiefComplaint', currentPatient.chiefComplaint, chiefComplaint?.trim() || null);
    checkAndTrack('expectations', currentPatient.expectations, expectations?.trim() || null);

    if (dateOfBirth) {
      const oldDobStr = currentPatient.dateOfBirth
        ? new Date(currentPatient.dateOfBirth).toISOString().split('T')[0]
        : null;
      const newDobDate = new Date(dateOfBirth);
      const newDobStr = !isNaN(newDobDate.getTime())
        ? newDobDate.toISOString().split('T')[0]
        : null;

      if (oldDobStr !== newDobStr && newDobStr) {
        updates.dateOfBirth = newDobDate;
        auditEntries.push({
          fieldName: 'dateOfBirth',
          oldValue: oldDobStr,
          newValue: newDobStr,
        });
      }
    }

    if (auditEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum dado cadastral foi modificado.',
        patient: currentPatient,
      });
    }

    // Executar atualização no banco
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: updates,
    });

    // Registrar alterações no AuditLog (GCP / ICH E6)
    const reqHeaders = req.headers;
    const ipAddress =
      reqHeaders.get('x-forwarded-for')?.split(',')[0] ||
      reqHeaders.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || 'Browser';

    for (const entry of auditEntries) {
      await prisma.auditLog.create({
        data: {
          projectId: projectId || null,
          entityType: 'Patient',
          entityId: patientId,
          action: 'UPDATE',
          changedBy: currentUser.name || currentUser.email,
          userEmail: currentUser.email,
          fieldName: entry.fieldName,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          reason: reason.trim(),
          ipAddress,
          userAgent,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${auditEntries.length} campo(s) cadastral(is) atualizado(s) com sucesso.`,
      patient: updatedPatient,
      changesCount: auditEntries.length,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar dados cadastrais do paciente:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar dados cadastrais.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir registros de pacientes.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let patientId = searchParams.get('id');
    let reason = searchParams.get('reason');

    if (!patientId) {
      try {
        const body = await req.json();
        patientId = body.patientId || body.id;
        reason = body.reason;
      } catch (e) {}
    }

    if (!patientId) {
      return NextResponse.json({ error: 'ID do paciente é obrigatório.' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        participations: {
          select: { id: true, researchCode: true, projectId: true }
        }
      }
    });

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado no prontuário.' }, { status: 404 });
    }

    const participantIds = patient.participations.map((p) => p.id);

    // Cascata transacional segura
    await prisma.$transaction(async (tx) => {
      if (participantIds.length > 0) {
        await tx.consentSignature.deleteMany({
          where: { participantId: { in: participantIds } }
        });
        await tx.formResponse.deleteMany({
          where: { participantId: { in: participantIds } }
        });
        await tx.clinicalAlert.deleteMany({
          where: { participantId: { in: participantIds } }
        });
        await tx.clinicalSession.deleteMany({
          where: { participantId: { in: participantIds } }
        });
        await tx.participant.deleteMany({
          where: { id: { in: participantIds } }
        });
      }

      await tx.patient.delete({
        where: { id: patientId }
      });

      // Registro de Auditoria GCP / ICH
      await tx.auditLog.create({
        data: {
          entityType: 'Patient',
          entityId: patientId,
          action: 'DELETE',
          changedBy: currentUser?.name || currentUser?.email || 'Administrador',
          userEmail: currentUser?.email,
          reason: reason?.trim() || `Exclusão definitiva do paciente ${patient.fullName} (CPF: ${patient.cpf}) por administrador.`,
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Paciente ${patient.fullName} e registros vinculados excluídos com sucesso.`
    });
  } catch (error: any) {
    console.error('Erro ao excluir paciente:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao excluir paciente.' },
      { status: 500 }
    );
  }
}

