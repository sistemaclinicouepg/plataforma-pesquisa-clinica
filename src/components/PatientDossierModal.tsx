'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { OdontogramChart, ToothStatus } from '@/components/odontogram';
import { TOOTH_STATUS_CONFIG } from '@/components/odontogram/teethData';
import {
  X,
  Printer,
  Edit,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  ShieldCheck,
  Activity,
  ExternalLink,
  Lock,
  Unlock,
  Stethoscope,
  Smile,
  AlertCircle,
  ClipboardList,
  Copy,
  Check,
  MessageSquare,
  Camera,
  Columns,
  Grid,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  UploadCloud,
  Trash2,
  Maximize2,
  UserCheck,
  CalendarClock,
  Share2,
} from 'lucide-react';
import { parseColorAssessmentData, stripMetaFromNotes } from '@/lib/unlockProtocol';
import { calculateSessionWindows } from '@/lib/sessionWindows';

export type DossierTab =
  | 'cadastro_elegibilidade'
  | 'timeline_consultas'
  | 'questionarios'
  | 'galeria_clinica';

export interface ClinicalPhoto {
  id: string;
  url: string;
  sessionNumber: number;
  sessionName?: string;
  photoType: 'sorriso' | 'intraoral_frontal' | 'lateral_direita' | 'lateral_esquerda' | 'oclusal_sup' | 'oclusal_inf' | 'outro';
  photoTypeLabel: string;
  capturedAt: string;
  notes?: string;
}

interface PatientDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: any;
  project: any;
  studyProtocol?: any;
  onEditAnamnesis?: (part: any) => void;
  onEditPatient?: (part: any) => void;
  onOpenSession?: (part: any, sessionNumber: number) => void;
  isBlindedUser?: boolean;
}

export const PatientDossierModal: React.FC<PatientDossierModalProps> = ({
  isOpen,
  onClose,
  participant,
  project,
  studyProtocol,
  onEditAnamnesis,
  onEditPatient,
  onOpenSession,
  isBlindedUser = false,
}) => {
  // Navegação pelas 4 abas solicitadas
  const [activeTab, setActiveTab] = useState<DossierTab>('cadastro_elegibilidade');

  // Proteção e máscara LGPD para dados sensíveis
  const [showSensitiveLGPD, setShowSensitiveLGPD] = useState(false);

  // Sessões desbloqueadas explicitamente para edição acidental
  const [unlockedSessions, setUnlockedSessions] = useState<Record<number, boolean>>({});
  const [unlockConfirmSessNum, setUnlockConfirmSessNum] = useState<number | null>(null);

  // Feedback de cópia de link dos questionários
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  // Estados da Galeria Clínica
  const [galleryViewMode, setGalleryViewMode] = useState<'comparison' | 'timeline'>('comparison');
  const [compareLeftSession, setCompareLeftSession] = useState<number>(1);
  const [compareRightSession, setCompareRightSession] = useState<number>(2);
  const [compareAngleFilter, setCompareAngleFilter] = useState<string>('all');
  const [selectedPhotoFullscreen, setSelectedPhotoFullscreen] = useState<ClinicalPhoto | null>(null);
  const [showUploadPhotoModal, setShowUploadPhotoModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoSession, setNewPhotoSession] = useState<number>(1);
  const [newPhotoAngle, setNewPhotoAngle] = useState<ClinicalPhoto['photoType']>('sorriso');
  const [newPhotoNotes, setNewPhotoNotes] = useState<string>('');

  // Expandir respostas dos questionários
  const [expandedResponseIds, setExpandedResponseIds] = useState<Record<string, boolean>>({});

  // Parse dos dados clínicos armazenados em anamnesisData
  const parsedAnamnesis = useMemo(() => {
    if (!participant?.anamnesisData) {
      return {
        chiefComplaint: '',
        allergies: '',
        odontogram: {} as Record<string, ToothStatus>,
        periodontogram: {
          bleedingOnProbing: '0-10%',
          visiblePlaque: '< 20%',
          probingDepth: '≤ 3mm',
          gingivalRecession: 'Ausente',
          furcationOrMobility: 'Ausente',
        },
        answers: {} as Record<string, string>,
        clinicalNotes: '',
        clinicalPhotos: [] as ClinicalPhoto[],
      };
    }

    try {
      const data = JSON.parse(participant.anamnesisData);
      return {
        chiefComplaint: data.chiefComplaint || '',
        allergies: data.allergies || '',
        odontogram: (data.odontogram || {}) as Record<string, ToothStatus>,
        periodontogram: data.periodontogram || {
          bleedingOnProbing: '0-10%',
          visiblePlaque: '< 20%',
          probingDepth: '≤ 3mm',
          gingivalRecession: 'Ausente',
          furcationOrMobility: 'Ausente',
        },
        answers: (data.answers || (typeof data === 'object' ? data : {})) as Record<string, string>,
        clinicalNotes: data.clinicalNotes || '',
        clinicalPhotos: (Array.isArray(data.clinicalPhotos) ? data.clinicalPhotos : []) as ClinicalPhoto[],
      };
    } catch {
      return {
        chiefComplaint: '',
        allergies: '',
        odontogram: {} as Record<string, ToothStatus>,
        periodontogram: {
          bleedingOnProbing: '0-10%',
          visiblePlaque: '< 20%',
          probingDepth: '≤ 3mm',
          gingivalRecession: 'Ausente',
          furcationOrMobility: 'Ausente',
        },
        answers: {} as Record<string, string>,
        clinicalNotes: '',
        clinicalPhotos: [] as ClinicalPhoto[],
      };
    }
  }, [participant?.anamnesisData]);

  // Lista local de fotos para renderização e atualização imediata
  const [clinicalPhotosList, setClinicalPhotosList] = useState<ClinicalPhoto[]>([]);
  React.useEffect(() => {
    setClinicalPhotosList(parsedAnamnesis.clinicalPhotos);
  }, [parsedAnamnesis.clinicalPhotos]);

  // Template da anamnese do projeto (perguntas de inclusão/exclusão)
  const templateConfig = useMemo(() => {
    if (!project?.anamnesisTemplate) return null;
    try {
      return JSON.parse(project.anamnesisTemplate);
    } catch {
      return null;
    }
  }, [project?.anamnesisTemplate]);

  // Janelas e status cronológicos de todas as sessões
  const windowsSummary = useMemo(() => {
    if (!participant) return null;
    return calculateSessionWindows(participant, studyProtocol);
  }, [participant, studyProtocol]);

  // Sessões configuradas no protocolo
  const protocolSessionsList = useMemo(() => {
    if (studyProtocol?.sessions && Array.isArray(studyProtocol.sessions) && studyProtocol.sessions.length > 0) {
      return studyProtocol.sessions;
    }
    // Fallback padrão GCP de 4 sessões
    return [
      { sessionNumber: 1, name: 'Sessão 1: Linha de Base (T0)', daysFromPrevious: 0, toleranceDays: 0 },
      { sessionNumber: 2, name: 'Sessão 2: 1ª Intervenção (T7)', daysFromPrevious: 7, toleranceDays: 2 },
      { sessionNumber: 3, name: 'Sessão 3: Retorno de 14 Dias (T14)', daysFromPrevious: 7, toleranceDays: 3 },
      { sessionNumber: 4, name: 'Sessão 4: Avaliação Final (T30)', daysFromPrevious: 16, toleranceDays: 5 },
    ];
  }, [studyProtocol?.sessions]);

  // Cálculo da idade
  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return 'N/I';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 'N/I';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  // Máscaras de proteção LGPD
  const maskCPF = (cpf?: string | null) => {
    if (!cpf) return 'Não informado';
    if (showSensitiveLGPD) return cpf;
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `***.***.${clean.slice(6, 9)}-**`;
    }
    return '***.***.***-**';
  };

  const maskPhone = (phone?: string | null) => {
    if (!phone) return 'Não informado';
    if (showSensitiveLGPD) return phone;
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 10) {
      return `(${clean.slice(0, 2)}) *****-${clean.slice(-4)}`;
    }
    return '(**) *****-****';
  };

  const handlePrint = () => {
    window.print();
  };

  // Ações de compartilhamento do questionário
  const getPatientUrl = (code: string) => {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    return `${origin}/paciente?code=${code}`;
  };

  const handleCopyPatientLink = (formId: string, code: string) => {
    const url = getPatientUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedFormId(formId);
    setTimeout(() => setCopiedFormId(null), 2500);
  };

  const handleSendWhatsAppReminder = (phone: string, code: string, formTitle: string, patientName?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const firstName = patientName ? patientName.split(' ')[0] : 'Participante';
    const link = getPatientUrl(code);
    const text = encodeURIComponent(
      `Olá, ${firstName}! Aqui é da equipe da pesquisa clínica da UEPG.\n\n` +
      `Enviamos este lembrete para o preenchimento do seu questionário: *${formTitle}*.\n\n` +
      `Acesse seu link seguro no celular para responder: ${link}\n\n` +
      `Seu código de voluntário: *${code}*. Muito obrigado pela colaboração!`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  const handleSendWhatsAppAppointment = (
    phone: string,
    code: string,
    patientName: string,
    sessionName: string,
    windowStart?: Date,
    windowEnd?: Date
  ) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const firstName = patientName ? patientName.split(' ')[0] : 'Participante';
    const startStr = windowStart ? new Date(windowStart).toLocaleDateString('pt-BR') : '';
    const endStr = windowEnd ? new Date(windowEnd).toLocaleDateString('pt-BR') : '';
    const windowMsg = (startStr && endStr) ? `\n\n*Período ideal pelo protocolo:* de *${startStr}* a *${endStr}*.` : '';

    const text = encodeURIComponent(
      `Olá, ${firstName}! Aqui é da equipe de pesquisa clínica da UEPG.\n\n` +
      `Gostaríamos de agendar a sua próxima consulta da pesquisa: *${sessionName}* (Código: ${code}).${windowMsg}\n\n` +
      `Por favor, informe-nos qual o melhor dia e horário para o seu atendimento no consultório da UEPG.`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  // Upload e persistência de nova foto clínica
  const handleUploadNewPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoFile || !participant) return;

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', newPhotoFile);
      formData.append('folder', `clinical-photos/${participant.id}`);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Falha ao processar upload da fotografia.');
      }

      const uploadData = await uploadRes.json();
      const photoUrl = uploadData.url;

      const angleLabels: Record<ClinicalPhoto['photoType'], string> = {
        sorriso: 'Sorriso Frontal',
        intraoral_frontal: 'Intraoral Frontal',
        lateral_direita: 'Lateral Direita',
        lateral_esquerda: 'Lateral Esquerda',
        oclusal_sup: 'Oclusal Superior',
        oclusal_inf: 'Oclusal Inferior',
        outro: 'Foto Livre / Close-up',
      };

      const matchedSession = protocolSessionsList.find((s: any) => s.sessionNumber === newPhotoSession);
      const sessionLabel = matchedSession ? matchedSession.name : `Visita T${newPhotoSession}`;

      const newPhotoObj: ClinicalPhoto = {
        id: `photo_${Date.now()}`,
        url: photoUrl,
        sessionNumber: newPhotoSession,
        sessionName: sessionLabel,
        photoType: newPhotoAngle,
        photoTypeLabel: angleLabels[newPhotoAngle] || 'Fotografia Clínica',
        capturedAt: new Date().toISOString(),
        notes: newPhotoNotes.trim() || undefined,
      };

      const updatedPhotos = [...clinicalPhotosList, newPhotoObj];
      setClinicalPhotosList(updatedPhotos);

      // Persistir no banco via PATCH /api/participants/[id] dentro de anamnesisData
      let currentAnamnesisJson: any = {};
      try {
        currentAnamnesisJson = participant.anamnesisData ? JSON.parse(participant.anamnesisData) : {};
      } catch {}

      currentAnamnesisJson.clinicalPhotos = updatedPhotos;

      await fetch(`/api/participants/${participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anamnesisData: JSON.stringify(currentAnamnesisJson),
        }),
      });

      setShowUploadPhotoModal(false);
      setNewPhotoFile(null);
      setNewPhotoNotes('');
    } catch (err: any) {
      alert(`Erro ao salvar foto: ${err?.message || 'Falha de conexão'}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Exclusão de foto clínica
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Deseja remover esta fotografia da galeria do participante?')) return;
    const updated = clinicalPhotosList.filter((p) => p.id !== photoId);
    setClinicalPhotosList(updated);

    try {
      let currentAnamnesisJson: any = {};
      try {
        currentAnamnesisJson = participant.anamnesisData ? JSON.parse(participant.anamnesisData) : {};
      } catch {}
      currentAnamnesisJson.clinicalPhotos = updated;

      await fetch(`/api/participants/${participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anamnesisData: JSON.stringify(currentAnamnesisJson),
        }),
      });
    } catch (err) {
      console.error('Erro ao excluir foto:', err);
    }
  };

  if (!isOpen || !participant) return null;

  const patient = participant.patient || {};
  const questionsList = Array.isArray(templateConfig?.questions) ? templateConfig.questions : [];

  // Critérios de exclusão violados
  const disqualifiedCriteria = questionsList.filter((q: any) => {
    if (!q.isCriterion || !q.disqualifyIf) return false;
    const answer = parsedAnamnesis.answers[q.id];
    return (
      answer !== undefined &&
      answer !== '' &&
      String(answer).trim().toLowerCase() === String(q.disqualifyIf).trim().toLowerCase()
    );
  });
  const hasDisqualification = disqualifiedCriteria.length > 0;

  // Próxima visita do participante calculada
  const nextVisitText = (() => {
    if (participant.status === 'EXCLUDED') return 'Participante Inelegível / Excluído';
    if (windowsSummary?.allCompleted) return '✓ Todas as visitas concluídas (100%)';
    if (windowsSummary?.nextStatus) {
      const targetDateStr = new Date(windowsSummary.nextStatus.targetDate).toLocaleDateString('pt-BR');
      const startStr = new Date(windowsSummary.nextStatus.windowStart).toLocaleDateString('pt-BR');
      const endStr = new Date(windowsSummary.nextStatus.windowEnd).toLocaleDateString('pt-BR');
      const sName = windowsSummary.nextStatus.config.shortName || `S${windowsSummary.nextStatus.sessionNumber}`;
      return `${sName}: ${targetDateStr} (Janela: ${startStr} a ${endStr})`;
    }
    if (!windowsSummary?.hasS1) return 'Sessão 1 (Baseline) - Aguardando agendamento';
    return 'Cronograma em dia';
  })();

  // Formulários do estudo vinculados
  const allProjectForms = Array.isArray(project?.forms) ? project.forms : [];

  // Fotos para o comparador lado a lado
  const leftSessionPhotos = clinicalPhotosList.filter(
    (p) => p.sessionNumber === compareLeftSession && (compareAngleFilter === 'all' || p.photoType === compareAngleFilter)
  );
  const rightSessionPhotos = clinicalPhotosList.filter(
    (p) => p.sessionNumber === compareRightSession && (compareAngleFilter === 'all' || p.photoType === compareAngleFilter)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* ========================================================
            CABEÇALHO FIXO COMPACTO (Sticky Header)
            Exibe apenas: Código, Status, Projeto vinculado e Data da Próxima Visita
            ======================================================== */}
        <header className="px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm print:bg-white print:text-slate-900 print:border-slate-300">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            {/* Código do Participante */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Código:</span>
              <span className="px-2.5 py-1 bg-blue-600 text-white font-mono font-extrabold text-xs rounded-lg shadow-2xs tracking-wide">
                {participant.researchCode || 'P00000'}
              </span>
            </div>

            {/* Separador */}
            <span className="hidden sm:inline text-slate-600">•</span>

            {/* Status (Ativo / Concluído / Excluído) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Status:</span>
              {participant.status === 'APPROVED' && (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Ativo</span>
                </span>
              )}
              {participant.status === 'PENDING' && (
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Em Triagem</span>
                </span>
              )}
              {participant.status === 'EXCLUDED' && (
                <span className="px-2.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold rounded-full flex items-center gap-1">
                  <X className="w-3 h-3 text-red-400" />
                  <span>Excluído</span>
                </span>
              )}
              {windowsSummary?.allCompleted && participant.status === 'APPROVED' && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold rounded-full">
                  Concluído
                </span>
              )}
            </div>

            {/* Separador */}
            <span className="hidden sm:inline text-slate-600">•</span>

            {/* Projeto Vinculado */}
            <div className="flex items-center gap-1.5 truncate max-w-[240px] sm:max-w-[320px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0">Projeto:</span>
              <span className="text-xs font-semibold text-slate-200 truncate" title={project?.name}>
                {project?.name || 'Protocolo Clínico UEPG'}
              </span>
            </div>

            {/* Separador */}
            <span className="hidden md:inline text-slate-600">•</span>

            {/* Data da Próxima Visita */}
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0">Próxima Visita:</span>
              <strong className="text-amber-300 font-medium truncate max-w-[280px]">
                {nextVisitText}
              </strong>
            </div>
          </div>

          {/* Ações Rápidas do Cabeçalho */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Imprimir prontuário em PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Fechar prontuário"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================
            BARRA DE NAVEGAÇÃO: 4 ABAS HORIZONTAIS
            Aba 1: Cadastro & Elegibilidade
            Aba 2: Linha do Tempo de Consultas
            Aba 3: Questionários do Paciente
            Aba 4: Galeria Clínica
            ======================================================== */}
        <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 overflow-x-auto text-xs font-bold shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('cadastro_elegibilidade')}
            className={`py-3.5 px-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'cadastro_elegibilidade'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Cadastro & Elegibilidade</span>
            {hasDisqualification && (
              <span className="px-1.5 py-0.2 bg-red-100 text-red-800 rounded-full text-[10px] font-bold animate-pulse">
                Alerta
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline_consultas')}
            className={`py-3.5 px-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'timeline_consultas'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Linha do Tempo de Consultas</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
              {participant.sessions?.length || 0}/{protocolSessionsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questionarios')}
            className={`py-3.5 px-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'questionarios'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Questionários do Paciente</span>
            {participant.responses?.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
                {participant.responses.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('galeria_clinica')}
            className={`py-3.5 px-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'galeria_clinica'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Galeria Clínica</span>
            {clinicalPhotosList.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px]">
                {clinicalPhotosList.length}
              </span>
            )}
          </button>
        </nav>

        {/* ========================================================
            CORPO DO PRONTUÁRIO CLÍNICO (Conteúdo das 4 Abas)
            ======================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          
          {/* ========================================================
              ABA 1: CADASTRO & ELEGIBILIDADE
              Dados pessoais (máscara LGPD), anamnese médica,
              checklist de critérios (com alerta) e status do TCLE
              ======================================================== */}
          {activeTab === 'cadastro_elegibilidade' && (
            <div className="space-y-6">

              {/* Alerta Visual Crítico caso algum critério de exclusão seja violado */}
              {hasDisqualification && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3.5 text-red-900 shadow-sm animate-pulse">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-extrabold text-xs uppercase tracking-wide text-red-800 flex items-center gap-1.5">
                      <span>Alerta Crítico de Elegibilidade: Critério de Exclusão Assinalado</span>
                      <span className="px-2 py-0.2 bg-red-200 text-red-900 rounded-full text-[10px]">
                        {disqualifiedCriteria.length} critério(s) incompatível(is)
                      </span>
                    </h4>
                    <p className="text-xs text-red-700 mt-1">
                      Este voluntário assinalou respostas que indicam <strong>incompatibilidade com os critérios do protocolo de pesquisa</strong>:
                    </p>
                    <div className="mt-2 space-y-1">
                      {disqualifiedCriteria.map((q: any) => (
                        <div key={q.id} className="text-xs bg-white/80 p-2 rounded-lg border border-red-200 flex items-center justify-between">
                          <span className="font-medium text-red-950">{q.title}</span>
                          <span className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                            Marcado: {String(parsedAnamnesis.answers[q.id])} (Critério: {q.disqualifyIf})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Grid 1: Dados Pessoais com Máscara LGPD e Anamnese Médica */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Cartão 1: Dados Pessoais & Contato com Proteção LGPD */}
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Dados Pessoais do Participante
                        </h3>
                        <span className="text-[10px] text-slate-400">Proteção LGPD ativa</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => setShowSensitiveLGPD((prev) => !prev)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title={showSensitiveLGPD ? 'Ocultar dados protegidos pela LGPD' : 'Exibir dados completos'}
                      >
                        {showSensitiveLGPD ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            <span>Ocultar LGPD</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Revelar LGPD</span>
                          </>
                        )}
                      </button>

                      {onEditPatient && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditPatient(participant);
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome Completo:</span>
                      <strong className="text-slate-900 text-sm block mt-0.5 truncate">
                        {patient.fullName || 'Não informado'}
                      </strong>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CPF:</span>
                      <strong className="font-mono text-slate-800 text-sm block mt-0.5">
                        {maskCPF(patient.cpf)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nascimento / Idade:</span>
                      <span className="font-semibold text-slate-800 block mt-0.5">
                        {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('pt-BR') : 'N/I'}{' '}
                        <span className="text-slate-500">({calculateAge(patient.dateOfBirth)})</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sexo Biológico:</span>
                      <strong className="text-slate-800 block mt-0.5">{patient.biologicalSex || 'Não informado'}</strong>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Telefone / WhatsApp:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <strong className="font-mono text-slate-900">{maskPhone(patient.phoneWhatsApp)}</strong>
                        {patient.phoneWhatsApp && (
                          <a
                            href={`https://wa.me/55${patient.phoneWhatsApp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-md transition flex items-center gap-1 print:hidden"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-700" />
                            <span>Conversar no WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {patient.email && (
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail:</span>
                        <span className="text-slate-800">{patient.email}</span>
                      </div>
                    )}

                    {patient.address && (
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço Residencial:</span>
                        <span className="text-slate-800">{patient.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cartão 2: Anamnese Médica & Queixa Odontológica */}
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Anamnese Médica & Queixa
                        </h3>
                        <span className="text-[10px] text-slate-400">Avaliação sistêmica inicial</span>
                      </div>
                    </div>

                    {onEditAnamnesis && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditAnamnesis(participant);
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer print:hidden"
                      >
                        Editar Anamnese
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Queixa Principal Relatada:
                      </span>
                      <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 italic mt-0.5 leading-relaxed">
                        &ldquo;{parsedAnamnesis.chiefComplaint || patient.chiefComplaint || 'Nenhuma queixa específica relatada na triagem.'}&rdquo;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Alergias com Destaque Visual */}
                      <div className={`p-2.5 rounded-xl border transition ${
                        (parsedAnamnesis.allergies || patient.allergies)
                          ? 'bg-red-50/80 border-red-300 text-red-900'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1">
                          {(parsedAnamnesis.allergies || patient.allergies) && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                          <span>Alergias Conhecidas:</span>
                        </span>
                        <strong className="block mt-0.5">
                          {parsedAnamnesis.allergies || patient.allergies || 'Nenhuma alergia relatada'}
                        </strong>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Comorbidades:</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">
                          {patient.comorbidities || 'Nenhuma comorbidade relatada'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Medicamentos em Uso:</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">
                          {patient.medications || 'Nenhum medicamento'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Expectativas:</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">
                          {patient.expectations || 'Não especificadas'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Checklist de Critérios de Inclusão e Exclusão do Protocolo */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Checklist de Critérios de Inclusão & Exclusão ({questionsList.length} itens)
                    </h3>
                  </div>

                  {onEditAnamnesis && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditAnamnesis(participant);
                      }}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer print:hidden"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Alterar Respostas</span>
                    </button>
                  )}
                </div>

                {questionsList.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                    Nenhum critério específico de inclusão ou exclusão configurado no template do estudo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {questionsList.map((q: any, idx: number) => {
                      const answer = parsedAnamnesis.answers[q.id];
                      const hasAnswer = answer !== undefined && answer !== '';
                      const isDisqualified =
                        q.isCriterion &&
                        q.disqualifyIf &&
                        String(answer).trim().toLowerCase() === String(q.disqualifyIf).trim().toLowerCase();

                      return (
                        <div
                          key={q.id || idx}
                          className={`p-3 rounded-xl border transition flex items-start justify-between gap-2 ${
                            isDisqualified
                              ? 'bg-red-50/80 border-red-300 text-red-900'
                              : hasAnswer
                              ? 'bg-slate-50/70 border-slate-200 text-slate-800'
                              : 'bg-slate-50/40 border-slate-200/80 text-slate-400'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                              <span className="font-bold text-xs">{q.title}</span>
                              {q.isCriterion && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                                  Critério
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {isDisqualified ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 font-bold text-[11px] rounded-lg flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-red-600" />
                                <span>{String(answer)} (Incompatível)</span>
                              </span>
                            ) : hasAnswer ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{String(answer)}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded italic">
                                Não respondido
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Ético do TCLE / TALE */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <span>Termo de Consentimento Livre e Esclarecido (TCLE)</span>
                      <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                        Conformidade CNS 466/2012 & LGPD
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Documentação comprobatória de consentimento informado registrada digitalmente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center print:hidden">
                  <Link
                    href={`/tcle/${participant.id}`}
                    target="_blank"
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-xl font-bold text-xs transition inline-flex items-center gap-1 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver TCLE Digital</span>
                  </Link>

                  <Link
                    href={`/tcle/${participant.id}/pdf`}
                    target="_blank"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition inline-flex items-center gap-1 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Baixar PDF Oficial</span>
                  </Link>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              ABA 2: LINHA DO TEMPO DE CONSULTAS
              Timeline cronológica com semáforo de status:
              - Verde: Concluída e bloqueada para edição acidental
              - Amarelo: Em andamento / Aguardando questionário
              - Cinza: Agendada, mostrando janela de dias permitida
              ======================================================== */}
          {activeTab === 'timeline_consultas' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-blue-600" />
                    <span>Timeline Cronológica de Visitas & Intervenções</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhamento longitudinal dos atendimentos na cadeira e janelas de tolerância do protocolo GCP.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Verde: Concluída</span>
                  </span>
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Amarelo: Em Aberto</span>
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Cinza: Agendada</span>
                  </span>
                </div>
              </div>

              {/* Timeline Vertical Estruturada */}
              <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {protocolSessionsList.map((protoSess: any, idx: number) => {
                  const sessNum = protoSess.sessionNumber || idx + 1;
                  const existingSession = participant.sessions?.find((s: any) => s.sessionNumber === sessNum);
                  const isCompleted = Boolean(existingSession);

                  // Informações de janela calculada
                  const winInfo = windowsSummary?.sessions ? windowsSummary.sessions[sessNum] : null;
                  const isUnlocked = unlockedSessions[sessNum];

                  // Cores do semáforo
                  // Verde: Concluída
                  // Amarelo: Sessão da janela atual ou aguardando questionários do paciente pós-sessão
                  // Cinza: Futura / Agendada
                  let statusType: 'green' | 'yellow' | 'gray' = 'gray';
                  if (isCompleted) {
                    // Se a sessão está feita, mas tem formulários daquela visita ainda pendentes
                    statusType = 'green';
                  } else if (windowsSummary?.nextPendingSessionNumber === sessNum) {
                    statusType = 'yellow';
                  } else {
                    statusType = 'gray';
                  }

                  const colorData = parseColorAssessmentData(existingSession?.notes);
                  const cleanNotes = stripMetaFromNotes(existingSession?.notes);

                  return (
                    <div key={sessNum} className="relative">
                      {/* Marcador do Semáforo na Linha */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono font-extrabold text-[10px] shadow-sm transition-all ${
                          statusType === 'green'
                            ? 'bg-emerald-500 border-emerald-600 text-white ring-4 ring-emerald-100'
                            : statusType === 'yellow'
                            ? 'bg-amber-400 border-amber-500 text-amber-950 ring-4 ring-amber-100 animate-pulse'
                            : 'bg-white border-slate-300 text-slate-500'
                        }`}
                      >
                        {sessNum}
                      </div>

                      {/* Card da Visita */}
                      <div
                        className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs space-y-3.5 ${
                          statusType === 'green'
                            ? 'bg-white border-emerald-200/80 hover:border-emerald-300'
                            : statusType === 'yellow'
                            ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                            : 'bg-slate-50/80 border-slate-200'
                        }`}
                      >
                        {/* Linha Superior: Nome da Visita, Data e Semáforo */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {protoSess.name || `Visita ${sessNum}`}
                              </span>

                              {statusType === 'green' && (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Concluída e Bloqueada</span>
                                </span>
                              )}

                              {statusType === 'yellow' && (
                                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Em Andamento / Visita Atual</span>
                                </span>
                              )}

                              {statusType === 'gray' && (
                                <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                                  Agendada / Prevista
                                </span>
                              )}
                            </div>

                            {/* Informações de Janela e Tolerância */}
                            {winInfo ? (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Prevista para: <strong>{new Date(winInfo.targetDate).toLocaleDateString('pt-BR')}</strong> • Janela permitida: {new Date(winInfo.windowStart).toLocaleDateString('pt-BR')} a {new Date(winInfo.windowEnd).toLocaleDateString('pt-BR')} (±{winInfo.config.tolerancePlusDays} dias)
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Linha de Base (T0) • Abertura do ensaio clínico
                              </p>
                            )}
                          </div>

                          {/* Botões de Ação da Visita */}
                          <div className="flex items-center gap-2 self-end sm:self-center print:hidden">
                            {/* Sessão Concluída: Bloqueada para edição acidental */}
                            {statusType === 'green' && (
                              <>
                                {!isUnlocked ? (
                                  <button
                                    type="button"
                                    onClick={() => setUnlockConfirmSessNum(sessNum)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                    title="Desbloquear para alterar dados desta visita"
                                  >
                                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Bloqueada (Editar)</span>
                                  </button>
                                ) : (
                                  onOpenSession && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenSession(participant, sessNum)}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <Unlock className="w-3.5 h-3.5 text-white" />
                                      <span>Abrir Prontuário da Visita</span>
                                    </button>
                                  )
                                )}
                              </>
                            )}

                            {/* Sessão em Aberto ou Agendada: Botão de Iniciar/Registrar */}
                            {statusType !== 'green' && onOpenSession && (
                              <button
                                type="button"
                                onClick={() => onOpenSession(participant, sessNum)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer ${
                                  statusType === 'yellow'
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white font-extrabold'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>{statusType === 'yellow' ? 'Registrar Atendimento' : 'Registrar Visita'}</span>
                              </button>
                            )}

                            {/* WhatsApp de Agendamento */}
                            {statusType !== 'green' && patient.phoneWhatsApp && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSendWhatsAppAppointment(
                                    patient.phoneWhatsApp,
                                    participant.researchCode,
                                    patient.fullName,
                                    protoSess.name,
                                    winInfo?.windowStart,
                                    winInfo?.windowEnd
                                  )
                                }
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition"
                                title="Enviar lembrete de agendamento no WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Modal/Aviso de confirmação para desbloquear edição acidental */}
                        {unlockConfirmSessNum === sessNum && (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="text-xs font-medium">
                                Esta consulta já foi finalizada. Deseja realmente desbloquear para alteração?
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setUnlockedSessions((prev) => ({ ...prev, [sessNum]: true }));
                                  setUnlockConfirmSessNum(null);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
                              >
                                Sim, Desbloquear
                              </button>
                              <button
                                type="button"
                                onClick={() => setUnlockConfirmSessNum(null)}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Detalhamento dos Dados Clínicos Coletados na Consulta (se realizada) */}
                        {isCompleted && (
                          <div className="space-y-3 pt-1">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              {/* VITA Classical */}
                              {colorData?.vitaClassical ? (
                                <>
                                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                                    <span className="text-[10px] text-amber-800 font-bold block uppercase">VITA Classical (Dir):</span>
                                    <strong className="text-slate-900 text-sm">{colorData.vitaClassical.shadeRight}</strong>{' '}
                                    <span className="text-[10px] text-amber-700 font-semibold">(SGU {colorData.vitaClassical.sguRight})</span>
                                  </div>
                                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                                    <span className="text-[10px] text-amber-800 font-bold block uppercase">VITA Classical (Esq):</span>
                                    <strong className="text-slate-900 text-sm">{colorData.vitaClassical.shadeLeft}</strong>{' '}
                                    <span className="text-[10px] text-amber-700 font-semibold">(SGU {colorData.vitaClassical.sguLeft})</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {existingSession.shadeRight && (
                                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Cor Dir:</span>
                                      <strong className="text-slate-900 text-sm">{existingSession.shadeRight}</strong>
                                    </div>
                                  )}
                                  {existingSession.shadeLeft && (
                                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Cor Esq:</span>
                                      <strong className="text-slate-900 text-sm">{existingSession.shadeLeft}</strong>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Dor EVA */}
                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Escala EVA (0h):</span>
                                <strong className="text-slate-900 text-sm">
                                  {existingSession.painScore0h !== null ? `${existingSession.painScore0h} / 10` : '—'}
                                </strong>
                              </div>

                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Escala EVA (24h):</span>
                                <strong className="text-slate-900 text-sm">
                                  {existingSession.painScore24h !== null ? `${existingSession.painScore24h} / 10` : 'Pendente'}
                                </strong>
                              </div>
                            </div>

                            {/* VITA 3D e Easyshade se presentes */}
                            {(colorData?.vita3D || colorData?.easyshade) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {colorData.vita3D && (
                                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/60 rounded-xl">
                                    <span className="text-[10px] text-indigo-800 font-bold block uppercase">VITA Bleachedguide 3D:</span>
                                    <p className="text-xs text-indigo-950 font-medium mt-0.5">
                                      Dir: <strong>{colorData.vita3D.labelRight}</strong> • Esq: <strong>{colorData.vita3D.labelLeft}</strong>
                                    </p>
                                  </div>
                                )}
                                {colorData.easyshade && (
                                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
                                    <span className="text-[10px] text-emerald-800 font-bold block uppercase">Easyshade CIELAB (L*, a*, b*):</span>
                                    <p className="text-[11px] font-mono text-emerald-950 mt-0.5">
                                      Dir: {colorData.easyshade.rightL ?? '—'} / {colorData.easyshade.rightA ?? '—'} / {colorData.easyshade.rightB ?? '—'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Notas Clínicas e Operador */}
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                              <span>
                                Realizado em: <strong>{existingSession.sessionDate ? new Date(existingSession.sessionDate).toLocaleDateString('pt-BR') : 'Data não informada'}</strong>
                              </span>
                              {existingSession.operatorName && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                                  Operador: {existingSession.operatorName}
                                </span>
                              )}
                            </div>

                            {cleanNotes && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                                &ldquo;{cleanNotes}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 3: QUESTIONÁRIOS DO PACIENTE
              Lista de questionários vinculados às visitas,
              status de resposta e ação rápida 'Copiar Link / WhatsApp'
              ======================================================== */}
          {activeTab === 'questionarios' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Questionários Eletrônicos & PROMs do Participante</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe o envio, status de preenchimento e envie links diretos aos voluntários via WhatsApp.
                  </p>
                </div>

                {/* Botão de Envio Geral do Portal */}
                {patient.phoneWhatsApp && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSendWhatsAppReminder(
                        patient.phoneWhatsApp,
                        participant.researchCode,
                        'Questionários da Pesquisa',
                        patient.fullName
                      )
                    }
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Enviar Acesso Geral no WhatsApp</span>
                  </button>
                )}
              </div>

              {allProjectForms.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-400 mb-1" />
                  <h4 className="font-bold text-sm text-slate-800">Nenhum questionário vinculado ao projeto</h4>
                  <p className="text-xs max-w-md mx-auto">
                    Acesse o <strong>Construtor de eCRF</strong> para associar escalas (EVA, OHIP-14, OES ou Satisfação) a este estudo clínico.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {allProjectForms.map((form: any) => {
                    const response = participant.responses?.find((r: any) => r.formId === form.id);
                    const isSubmitted = Boolean(response);

                    let parsedAnswers: Record<string, any> = {};
                    if (response?.answersJson) {
                      try {
                        parsedAnswers = JSON.parse(response.answersJson);
                      } catch {}
                    }
                    const answerEntries = Object.entries(parsedAnswers);
                    const isExpanded = Boolean(expandedResponseIds[form.id]);

                    return (
                      <div
                        key={form.id}
                        className={`rounded-2xl border p-4 sm:p-5 transition shadow-2xs space-y-3 ${
                          isSubmitted
                            ? 'bg-white border-emerald-200/80'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900">{form.title}</h4>
                              {isSubmitted ? (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Respondido em {response?.submittedAt ? new Date(response.submittedAt).toLocaleDateString('pt-BR') : 'Data registrada'}</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Aguardando Preenchimento</span>
                                </span>
                              )}
                            </div>

                            {form.description && (
                              <p className="text-xs text-slate-500 mt-1 leading-snug">{form.description}</p>
                            )}
                          </div>

                          {/* Ações Rápidas: Copiar Link e Enviar via WhatsApp */}
                          <div className="flex items-center gap-2 shrink-0 print:hidden">
                            <button
                              type="button"
                              onClick={() => handleCopyPatientLink(form.id, participant.researchCode)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              title="Copiar link seguro do participante"
                            >
                              {copiedFormId === form.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-extrabold">Link Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Copiar Link</span>
                                </>
                              )}
                            </button>

                            {patient.phoneWhatsApp && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSendWhatsAppReminder(
                                    patient.phoneWhatsApp,
                                    participant.researchCode,
                                    form.title,
                                    patient.fullName
                                  )
                                }
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                title="Enviar formulário via WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Enviar no WhatsApp</span>
                              </button>
                            )}

                            {isSubmitted && answerEntries.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedResponseIds((prev) => ({
                                    ...prev,
                                    [form.id]: !prev[form.id],
                                  }))
                                }
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="Visualizar respostas"
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Acordeão de Respostas Submetidas */}
                        {isSubmitted && isExpanded && answerEntries.length > 0 && (
                          <div className="pt-3 border-t border-slate-200 mt-2 space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Respostas registradas pelo participante:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              {answerEntries.map(([k, v]) => (
                                <div key={k} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                                  <span className="text-slate-400 block text-[10px] font-bold uppercase">{k}:</span>
                                  <strong className="text-slate-900 block mt-0.5">{String(v)}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ABA 4: GALERIA CLÍNICA
              Fotos agrupadas por visita (T0, T7, T14...)
              e Comparador Lado a Lado (Before & After)
              ======================================================== */}
          {activeTab === 'galeria_clinica' && (
            <div className="space-y-6">
              
              {/* Topo da Galeria: Modos de visualização e botão de nova foto */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Galeria Fotográfica Clínica Longitudinal</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Documentação de cor, esmalte dental e tecidos moles com comparação lado a lado entre visitas.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
                  {/* Seletor de Modo: Comparador vs Galeria */}
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setGalleryViewMode('comparison')}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                        galleryViewMode === 'comparison'
                          ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>Comparar Lado a Lado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryViewMode('timeline')}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                        galleryViewMode === 'timeline'
                          ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Todas por Visita</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowUploadPhotoModal(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>+ Adicionar Foto</span>
                  </button>
                </div>
              </div>

              {/* MODO 1: COMPARADOR LADO A LADO (DUAL VIEWER) */}
              {galleryViewMode === 'comparison' && (
                <div className="space-y-4">
                  {/* Barra de Seleção de Visitas para Comparação */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700">Comparar:</span>

                      {/* Seletor Visita Esquerda (A) */}
                      <select
                        value={compareLeftSession}
                        onChange={(e) => setCompareLeftSession(Number(e.target.value))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {protocolSessionsList.map((s: any) => (
                          <option key={s.sessionNumber} value={s.sessionNumber}>
                            Coluna A: {s.name}
                          </option>
                        ))}
                      </select>

                      <span className="font-bold text-slate-400">vs</span>

                      {/* Seletor Visita Direita (B) */}
                      <select
                        value={compareRightSession}
                        onChange={(e) => setCompareRightSession(Number(e.target.value))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {protocolSessionsList.map((s: any) => (
                          <option key={s.sessionNumber} value={s.sessionNumber}>
                            Coluna B: {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro por Ângulo / Enquadramento */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">Enquadramento:</span>
                      <select
                        value={compareAngleFilter}
                        onChange={(e) => setCompareAngleFilter(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Todos os Ângulos</option>
                        <option value="sorriso">Sorriso Frontal</option>
                        <option value="intraoral_frontal">Intraoral Frontal</option>
                        <option value="lateral_direita">Lateral Direita</option>
                        <option value="lateral_esquerda">Lateral Esquerda</option>
                        <option value="oclusal_sup">Oclusal Superior</option>
                        <option value="oclusal_inf">Oclusal Inferior</option>
                      </select>
                    </div>
                  </div>

                  {/* Visualização Comparativa em Duas Colunas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Coluna A */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <strong className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          <span>
                            Coluna A: {protocolSessionsList.find((s: any) => s.sessionNumber === compareLeftSession)?.name || `Visita T${compareLeftSession}`}
                          </span>
                        </strong>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {leftSessionPhotos.length} foto(s)
                        </span>
                      </div>

                      {leftSessionPhotos.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          Nenhuma fotografia registrada para esta visita com o filtro atual.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {leftSessionPhotos.map((photo) => (
                            <div key={photo.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs group relative">
                              <img
                                src={photo.url}
                                alt={photo.photoTypeLabel}
                                className="w-full h-56 object-cover cursor-pointer hover:opacity-95 transition"
                                onClick={() => setSelectedPhotoFullscreen(photo)}
                              />
                              <div className="p-2.5 flex items-center justify-between text-[11px] bg-white">
                                <div>
                                  <span className="font-bold text-slate-800 block">{photo.photoTypeLabel}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(photo.capturedAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPhotoFullscreen(photo)}
                                    className="p-1 text-slate-400 hover:text-slate-800 rounded transition"
                                    title="Ampliar foto"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    className="p-1 text-red-400 hover:text-red-600 rounded transition"
                                    title="Remover foto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Coluna B */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <strong className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                          <span>
                            Coluna B: {protocolSessionsList.find((s: any) => s.sessionNumber === compareRightSession)?.name || `Visita T${compareRightSession}`}
                          </span>
                        </strong>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {rightSessionPhotos.length} foto(s)
                        </span>
                      </div>

                      {rightSessionPhotos.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          Nenhuma fotografia registrada para esta visita com o filtro atual.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {rightSessionPhotos.map((photo) => (
                            <div key={photo.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs group relative">
                              <img
                                src={photo.url}
                                alt={photo.photoTypeLabel}
                                className="w-full h-56 object-cover cursor-pointer hover:opacity-95 transition"
                                onClick={() => setSelectedPhotoFullscreen(photo)}
                              />
                              <div className="p-2.5 flex items-center justify-between text-[11px] bg-white">
                                <div>
                                  <span className="font-bold text-slate-800 block">{photo.photoTypeLabel}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(photo.capturedAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPhotoFullscreen(photo)}
                                    className="p-1 text-slate-400 hover:text-slate-800 rounded transition"
                                    title="Ampliar foto"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    className="p-1 text-red-400 hover:text-red-600 rounded transition"
                                    title="Remover foto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODO 2: TODAS POR VISITA */}
              {galleryViewMode === 'timeline' && (
                <div className="space-y-6">
                  {clinicalPhotosList.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-2">
                      <Camera className="w-10 h-10 mx-auto text-slate-400 mb-1" />
                      <h4 className="font-bold text-sm text-slate-800">Nenhuma fotografia clínica anexada</h4>
                      <p className="text-xs max-w-md mx-auto">
                        Clique em <strong>+ Adicionar Foto</strong> acima para registrar imagens odontológicas do paciente nas diferentes visitas.
                      </p>
                    </div>
                  ) : (
                    protocolSessionsList.map((protoSess: any) => {
                      const sessPhotos = clinicalPhotosList.filter((p) => p.sessionNumber === protoSess.sessionNumber);
                      if (sessPhotos.length === 0) return null;

                      return (
                        <div key={protoSess.sessionNumber} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                              <span>{protoSess.name}</span>
                            </h4>
                            <span className="text-[11px] text-slate-400 font-semibold">
                              {sessPhotos.length} foto(s)
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sessPhotos.map((photo) => (
                              <div key={photo.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-2xs group relative">
                                <img
                                  src={photo.url}
                                  alt={photo.photoTypeLabel}
                                  className="w-full h-36 object-cover cursor-pointer hover:opacity-95 transition"
                                  onClick={() => setSelectedPhotoFullscreen(photo)}
                                />
                                <div className="p-2 text-[10px]">
                                  <strong className="text-slate-800 block truncate">{photo.photoTypeLabel}</strong>
                                  <span className="text-slate-400">
                                    {new Date(photo.capturedAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* ========================================================
            MODAL DE UPLOAD DE NOVA FOTO CLÍNICA
            ======================================================== */}
        {showUploadPhotoModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Anexar Nova Fotografia Clínica</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowUploadPhotoModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadNewPhoto} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Arquivo de Imagem (JPG ou PNG) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewPhotoFile(e.target.files[0]);
                      }
                    }}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Visita / Sessão *
                    </label>
                    <select
                      value={newPhotoSession}
                      onChange={(e) => setNewPhotoSession(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:outline-none"
                    >
                      {protocolSessionsList.map((s: any) => (
                        <option key={s.sessionNumber} value={s.sessionNumber}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Enquadramento *
                    </label>
                    <select
                      value={newPhotoAngle}
                      onChange={(e) => setNewPhotoAngle(e.target.value as ClinicalPhoto['photoType'])}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:outline-none"
                    >
                      <option value="sorriso">Sorriso Frontal</option>
                      <option value="intraoral_frontal">Intraoral Frontal</option>
                      <option value="lateral_direita">Lateral Direita</option>
                      <option value="lateral_esquerda">Lateral Esquerda</option>
                      <option value="oclusal_sup">Oclusal Superior</option>
                      <option value="oclusal_inf">Oclusal Inferior</option>
                      <option value="outro">Outro / Close-up</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Observações Clínicas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={newPhotoNotes}
                    onChange={(e) => setNewPhotoNotes(e.target.value)}
                    placeholder="Ex: Padrão de iluminação ring-light, dente 11 com mancha hipoplásica prévia..."
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowUploadPhotoModal(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingPhoto || !newPhotoFile}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {uploadingPhoto ? 'Enviando...' : 'Salvar na Galeria'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL DE ZOOM EM TELA CHEIA (LIGHTBOX)
            ======================================================== */}
        {selectedPhotoFullscreen && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-70"
            onClick={() => setSelectedPhotoFullscreen(null)}
          >
            <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="w-full flex items-center justify-between text-white text-xs">
                <span className="font-bold">
                  {selectedPhotoFullscreen.sessionName || `Visita T${selectedPhotoFullscreen.sessionNumber}`} • {selectedPhotoFullscreen.photoTypeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoFullscreen(null)}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <img
                src={selectedPhotoFullscreen.url}
                alt={selectedPhotoFullscreen.photoTypeLabel}
                className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-white/20"
              />

              {selectedPhotoFullscreen.notes && (
                <p className="text-slate-300 text-xs italic bg-black/40 px-3 py-1 rounded-lg">
                  &ldquo;{selectedPhotoFullscreen.notes}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            RODAPÉ DO PRONTUÁRIO
            ======================================================== */}
        <footer className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Prontuário protegido sob a LGPD (Lei nº 13.709/2018) • UEPG Clínica Odontológica</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
