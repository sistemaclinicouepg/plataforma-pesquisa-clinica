'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AnamnesisConfig, AnamnesisQuestion } from '@/app/anamnese/page';
import { OdontogramChart, ToothSelectorModal, ToothStatus } from '@/components/odontogram';
import { PatientDossierModal } from '@/components/PatientDossierModal';
import {
  buildNumericCSVContent,
  generateCodebookMarkdown,
  generateCodebookText,
  generateRAnalysisScript,
  generateSPSSSyntaxScript,
  generateGraphPadPrismFormat,
} from '@/lib/exportGenerators';
import {
  parseStudyProtocol,
  StudyProtocolConfig,
  getRespondentLabel,
  getFrequencyLabel,
} from '@/lib/studyProtocol';
import {
  Stethoscope,
  ClipboardList,
  BarChart3,
  Users,
  Download,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  Check,
  X,
  FileText,
  FileSpreadsheet,
  Award,
  Sparkles,
  Shuffle,
  MessageSquare,
  Search,
  Eye,
  EyeOff,
  Edit,
  Plus,
  Send,
  Zap,
  Info,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Phone,
  ShieldAlert,
  Activity,
  FileCode,
  History,
  RefreshCw,
  Sliders,
  MoreHorizontal,
} from 'lucide-react';

type Patient = {
  id: string;
  fullName: string;
  cpf: string;
  email?: string | null;
  phoneWhatsApp: string;
  address?: string | null;
  dateOfBirth: string;
  biologicalSex: string;
  comorbidities: string | null;
  allergies: string | null;
  medications: string | null;
  chiefComplaint: string | null;
  expectations: string | null;
};

type ClinicalSession = {
  id: string;
  participantId: string;
  sessionNumber: number;
  sessionType: string;
  sessionDate: string;
  shadeRight: string | null;
  shadeLeft: string | null;
  painScore0h: number | null;
  painScore1h: number | null;
  painScore24h: number | null;
  painScore48h: number | null;
  gingivalIrritation: string | null;
  adverseEvents: string | null;
  operatorName: string | null;
  evaluatorName: string | null;
  notes: string | null;
};

type Participant = {
  id: string;
  researchCode: string;
  status: 'PENDING' | 'APPROVED' | 'EXCLUDED';
  exclusionReason: string | null;
  group: string | null;
  anamnesisDone: boolean;
  anamnesisData: string | null;
  patient: Patient;
  sessions?: ClinicalSession[];
  responses?: Array<{
    id: string;
    formId: string;
    answersJson: string;
    submittedAt: string;
    isLate?: boolean;
    form?: {
      id: string;
      title: string;
      description?: string | null;
      questionsJson?: string;
    };
  }>;
};

type ProjectMember = {
  id: string;
  userId: string;
  role: string;
  isBlinded: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type ClinicalAlertItem = {
  id: string;
  projectId: string;
  participantId: string;
  severity: string;
  alertType: string;
  painScore: number | null;
  gingivalSensation: string | null;
  timePoint: string | null;
  description: string;
  status: 'PENDING' | 'RESOLVED';
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  participant?: {
    id: string;
    researchCode: string;
    group?: string | null;
    patient?: {
      fullName: string;
      phoneWhatsApp?: string;
    };
  };
};

type AuditLogItem = {
  id: string;
  projectId: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string;
  userEmail: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type ProjectData = {
  id: string;
  name: string;
  description: string | null;
  status?: string | null;
  participants: Participant[];
  members: ProjectMember[];
  forms: Array<{
    id: string;
    title: string;
    description?: string | null;
    questionsJson?: string;
    responses?: Array<{ id: string; participantId: string; submittedAt: string; answersJson?: string }>;
  }>;
  isBlinded?: boolean;
  anamnesisTemplate?: string | null;
  alerts?: ClinicalAlertItem[];
  auditLogs?: AuditLogItem[];
};

type DynamicAnamnesisState = {
  odontogram: Record<string, string>; // dente (ex: "11") -> "HIGIDO" | "RESTAURADO" | "CARIE" | "AUSENTE" | "FACETA"
  periodontogram: {
    bleedingOnProbing: string;
    visiblePlaque: string;
    probingDepth: string;
    gingivalRecession: string;
    furcationOrMobility: string;
  };
  answers: Record<string, string>;
  clinicalNotes: string;
};

const initialDynamicAnamnesis: DynamicAnamnesisState = {
  odontogram: {},
  periodontogram: {
    bleedingOnProbing: '0-10%',
    visiblePlaque: '< 20%',
    probingDepth: '≤ 3mm',
    gingivalRecession: 'Ausente',
    furcationOrMobility: 'Ausente',
  },
  answers: {},
  clinicalNotes: '',
};

const VITA_CLASSICAL_SHADES = [
  'B1', 'A1', 'B2', 'D2', 'A2', 'C1', 'C2', 'D4',
  'A3', 'D3', 'B3', 'A3.5', 'B4', 'C3', 'A4', 'C4'
];

const getVitaSGU = (shade: string | null | undefined): number => {
  if (!shade) return 0;
  const idx = VITA_CLASSICAL_SHADES.indexOf(shade.toUpperCase().trim());
  return idx >= 0 ? idx + 1 : 0;
};

const SESSION_DEFINITIONS: Record<number, { title: string; subtitle: string; tag: string; defaultType: string }> = {
  1: {
    title: 'Sessão 1: Baseline & 1ª Aplicação',
    subtitle: 'Aferição da cor de base (VITA), aplicação dos géis (boca dividida) e registro da dor (EVA 0-48h)',
    tag: 'S1',
    defaultType: 'BASELINE_INTERVENTION_1',
  },
  2: {
    title: 'Sessão 2: 2ª Aplicação (7 dias)',
    subtitle: 'Segunda aplicação clínica do protocolo clareador e monitoramento de sensibilidade',
    tag: 'S2',
    defaultType: 'INTERVENTION_2',
  },
  3: {
    title: 'Sessão 3: Retorno de 14 Dias',
    subtitle: 'Avaliação pós-tratamento imediato: estabilidade de cor e ausência de efeitos adversos',
    tag: 'R14d',
    defaultType: 'FOLLOW_UP_14D',
  },
  4: {
    title: 'Sessão 4: Retorno de 30 Dias',
    subtitle: 'Avaliação final de longevidade, eficácia clareadora e encerramento do protocolo do participante',
    tag: 'R30d',
    defaultType: 'FOLLOW_UP_30D',
  },
};

const getPainBadgeColor = (score: number) => {
  if (score === 0) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (score <= 3) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (score <= 6) return 'bg-orange-100 text-orange-800 border-orange-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

export type ClinicalWindowConfig = {
  sessionNumber: number;
  name: string;
  shortName: string;
  targetDaysFromAnchor: number;
  toleranceMinusDays: number;
  tolerancePlusDays: number;
  anchorSessionNumber: number;
};

export const CLINICAL_WINDOWS: Record<number, ClinicalWindowConfig> = {
  2: {
    sessionNumber: 2,
    name: 'Sessão 2: 2ª Aplicação',
    shortName: 'S2 (7d)',
    targetDaysFromAnchor: 7,
    toleranceMinusDays: 2, // 5 a 9 dias pós-S1
    tolerancePlusDays: 2,
    anchorSessionNumber: 1,
  },
  3: {
    sessionNumber: 3,
    name: 'Sessão 3: Retorno de 14 Dias',
    shortName: 'R14d',
    targetDaysFromAnchor: 14,
    toleranceMinusDays: 3, // 11 a 17 dias pós-S2
    tolerancePlusDays: 3,
    anchorSessionNumber: 2,
  },
  4: {
    sessionNumber: 4,
    name: 'Sessão 4: Retorno de 30 Dias (Final)',
    shortName: 'R30d',
    targetDaysFromAnchor: 30,
    toleranceMinusDays: 5, // 25 a 35 dias pós-S2
    tolerancePlusDays: 5,
    anchorSessionNumber: 2,
  },
};

export type SessionWindowStatus = {
  sessionNumber: number;
  config: ClinicalWindowConfig;
  targetDate: Date;
  windowStart: Date;
  windowEnd: Date;
  isCompleted: boolean;
  actualDate?: Date;
  completedStatus?: 'ON_TIME' | 'DEVIATION_EARLY' | 'DEVIATION_LATE';
  deviationDays?: number;
  pendingStatus?: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING';
  daysDiff?: number;
};

export type ParticipantWindowsSummary = {
  hasS1: boolean;
  s1Date?: Date;
  allCompleted: boolean;
  nextPendingSessionNumber?: number;
  nextStatus?: SessionWindowStatus;
  sessions: Record<number, SessionWindowStatus>;
  overallAlert: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' | 'WAITING_S1' | 'COMPLETED';
};

export function calculateSessionWindows(
  part: Participant,
  customProtocol?: StudyProtocolConfig
): ParticipantWindowsSummary {
  const s1 = part.sessions?.find((s) => s.sessionNumber === 1);
  if (!s1) {
    return {
      hasS1: false,
      allCompleted: false,
      sessions: {},
      overallAlert: 'WAITING_S1',
    };
  }

  const s1Date = new Date(s1.sessionDate);
  const s2 = part.sessions?.find((s) => s.sessionNumber === 2);

  const sessions: Record<number, SessionWindowStatus> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextPendingSessionNumber: number | undefined = undefined;

  // Se houver sessões customizadas no protocolo do estudo
  const protocolSessions =
    customProtocol?.sessions && customProtocol.sessions.length > 0
      ? customProtocol.sessions.filter((s) => s.sessionNumber > 1)
      : null;

  if (protocolSessions) {
    let cumulativeDays = 0;
    for (const proto of protocolSessions) {
      cumulativeDays += proto.daysFromPrevious;
      const sNum = proto.sessionNumber;
      const tol = proto.toleranceDays || 2;
      const config: ClinicalWindowConfig = {
        sessionNumber: sNum,
        name: proto.name,
        shortName: `S${sNum}`,
        targetDaysFromAnchor: cumulativeDays,
        toleranceMinusDays: tol,
        tolerancePlusDays: tol,
        anchorSessionNumber: 1,
      };

      const targetDate = new Date(s1Date.getTime() + cumulativeDays * 86400000);
      const windowStart = new Date(s1Date.getTime() + (cumulativeDays - tol) * 86400000);
      const windowEnd = new Date(s1Date.getTime() + (cumulativeDays + tol) * 86400000);

      const existingSession = part.sessions?.find((s) => s.sessionNumber === sNum);

      if (existingSession) {
        const actualDate = new Date(existingSession.sessionDate);
        const actualTime = new Date(actualDate).setHours(0, 0, 0, 0);
        const startTime = new Date(windowStart).setHours(0, 0, 0, 0);
        const endTime = new Date(windowEnd).setHours(23, 59, 59, 999);

        let completedStatus: 'ON_TIME' | 'DEVIATION_EARLY' | 'DEVIATION_LATE' = 'ON_TIME';
        let deviationDays = 0;

        if (actualTime < startTime) {
          completedStatus = 'DEVIATION_EARLY';
          deviationDays = Math.round((startTime - actualTime) / 86400000);
        } else if (actualTime > endTime) {
          completedStatus = 'DEVIATION_LATE';
          deviationDays = Math.round((actualTime - endTime) / 86400000);
        }

        sessions[sNum] = {
          sessionNumber: sNum,
          config,
          targetDate,
          windowStart,
          windowEnd,
          isCompleted: true,
          actualDate,
          completedStatus,
          deviationDays,
        };
      } else {
        if (nextPendingSessionNumber === undefined) {
          nextPendingSessionNumber = sNum;
        }

        const startTime = new Date(windowStart).setHours(0, 0, 0, 0);
        const endTime = new Date(windowEnd).setHours(23, 59, 59, 999);

        let pendingStatus: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' = 'UPCOMING';
        let daysDiff = 0;

        if (today.getTime() > endTime) {
          pendingStatus = 'OVERDUE';
          daysDiff = Math.ceil((today.getTime() - endTime) / 86400000);
        } else if (today.getTime() >= startTime) {
          pendingStatus = 'DUE_NOW';
          daysDiff = Math.ceil((endTime - today.getTime()) / 86400000);
        } else {
          pendingStatus = 'UPCOMING';
          daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / 86400000);
        }

        sessions[sNum] = {
          sessionNumber: sNum,
          config,
          targetDate,
          windowStart,
          windowEnd,
          isCompleted: false,
          pendingStatus,
          daysDiff,
        };
      }
    }
  } else {
    // Protocolo padrão de 4 sessões (para compatibilidade com estudos existentes)
    for (const sNum of [2, 3, 4] as const) {
      const config = CLINICAL_WINDOWS[sNum];
      const anchor =
        config.anchorSessionNumber === 1 || !s2
          ? s1Date
          : new Date(s2.sessionDate);

      const additionalDays = config.anchorSessionNumber === 2 && !s2 ? 7 : 0;
      const totalDays = config.targetDaysFromAnchor + additionalDays;
      const targetDate = new Date(anchor.getTime() + totalDays * 86400000);
      const windowStart = new Date(
        anchor.getTime() + (totalDays - config.toleranceMinusDays) * 86400000
      );
      const windowEnd = new Date(
        anchor.getTime() + (totalDays + config.tolerancePlusDays) * 86400000
      );

      const existingSession = part.sessions?.find((s) => s.sessionNumber === sNum);

      if (existingSession) {
        const actualDate = new Date(existingSession.sessionDate);
        const actualTime = new Date(actualDate).setHours(0, 0, 0, 0);
        const startTime = new Date(windowStart).setHours(0, 0, 0, 0);
        const endTime = new Date(windowEnd).setHours(23, 59, 59, 999);

        let completedStatus: 'ON_TIME' | 'DEVIATION_EARLY' | 'DEVIATION_LATE' = 'ON_TIME';
        let deviationDays = 0;

        if (actualTime < startTime) {
          completedStatus = 'DEVIATION_EARLY';
          deviationDays = Math.round((startTime - actualTime) / 86400000);
        } else if (actualTime > endTime) {
          completedStatus = 'DEVIATION_LATE';
          deviationDays = Math.round((actualTime - endTime) / 86400000);
        }

        sessions[sNum] = {
          sessionNumber: sNum,
          config,
          targetDate,
          windowStart,
          windowEnd,
          isCompleted: true,
          actualDate,
          completedStatus,
          deviationDays,
        };
      } else {
        if (nextPendingSessionNumber === undefined) {
          nextPendingSessionNumber = sNum;
        }

        const startTime = new Date(windowStart).setHours(0, 0, 0, 0);
        const endTime = new Date(windowEnd).setHours(23, 59, 59, 999);

        let pendingStatus: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' = 'UPCOMING';
        let daysDiff = 0;

        if (today.getTime() > endTime) {
          pendingStatus = 'OVERDUE';
          daysDiff = Math.ceil((today.getTime() - endTime) / 86400000);
        } else if (today.getTime() >= startTime) {
          pendingStatus = 'DUE_NOW';
          daysDiff = Math.ceil((endTime - today.getTime()) / 86400000);
        } else {
          pendingStatus = 'UPCOMING';
          daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / 86400000);
        }

        sessions[sNum] = {
          sessionNumber: sNum,
          config,
          targetDate,
          windowStart,
          windowEnd,
          isCompleted: false,
          pendingStatus,
          daysDiff,
        };
      }
    }
  }

  const allNumbers = protocolSessions
    ? [1, ...protocolSessions.map((s) => s.sessionNumber)]
    : [1, 2, 3, 4];

  const allCompleted = allNumbers.every((num) =>
    part.sessions?.some((s) => s.sessionNumber === num)
  );

  let overallAlert: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' | 'WAITING_S1' | 'COMPLETED' =
    allCompleted ? 'COMPLETED' : 'UPCOMING';

  if (!allCompleted) {
    const uncompletedStatuses = Object.values(sessions).filter((s) => !s.isCompleted);
    if (uncompletedStatuses.some((s) => s.pendingStatus === 'OVERDUE')) {
      overallAlert = 'OVERDUE';
    } else if (uncompletedStatuses.some((s) => s.pendingStatus === 'DUE_NOW')) {
      overallAlert = 'DUE_NOW';
    } else {
      overallAlert = 'UPCOMING';
    }
  }

  const nextStatus = nextPendingSessionNumber
    ? sessions[nextPendingSessionNumber]
    : undefined;

  return {
    hasS1: true,
    s1Date,
    allCompleted,
    nextPendingSessionNumber,
    nextStatus,
    sessions,
    overallAlert,
  };
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [project, setProject] = useState<ProjectData | null>(null);
  const projectRef = React.useRef<ProjectData | null>(null);
  React.useEffect(() => {
    projectRef.current = project;
  }, [project]);
  const studyProtocol = React.useMemo(
    () => parseStudyProtocol(project?.anamnesisTemplate),
    [project?.anamnesisTemplate]
  );
  const [allProjects, setAllProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'triage' | 'audit' | 'consort' | 'team' | 'export'>('active');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isBlindedUser, setIsBlindedUser] = useState<boolean>(false);
  const [currentMemberRole, setCurrentMemberRole] = useState<string>('COORDINATOR');

  const isAdmin =
    currentUser?.role === 'ADMIN' ||
    currentUser?.email === 'admin@uepg.br' ||
    currentUser?.email === 'pesquisadora@uepg.br';

  const handleSelectTab = (tab: 'active' | 'triage' | 'audit' | 'consort' | 'team' | 'export') => {
    setActiveTab(tab);
    if (project?.id && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`uepg_tab_${project.id}`, tab);
      } catch (e) {}
    }
  };

  // Estados da Trilha de Auditoria Regulatória GCP (Exclusivo Administrador)
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');

  // Estados de Busca e Filtro da Aba de Prontuários & Atendimento
  const [activeSearch, setActiveSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Menu Dropdown de Exportação Bioestatística
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Proteção: Apenas o Administrador pode visualizar a aba de auditoria
  useEffect(() => {
    if (activeTab === 'audit' && currentUser && !isAdmin) {
      setActiveTab('active');
    }
  }, [activeTab, currentUser, isAdmin]);

  // Modais de Triagem
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [exclusionReason, setExclusionReason] = useState('');
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [openAnamnesisAfterCreate, setOpenAnamnesisAfterCreate] = useState(true);

  // Modal de Edição de Dados do Estudo Clínico
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [savingProjectEdit, setSavingProjectEdit] = useState(false);

  // Modal de Ficha Clínica & Anamnese do Projeto
  const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);
  const [currentAnamnesisPart, setCurrentAnamnesisPart] = useState<Participant | null>(null);
  const [anamnesisData, setAnamnesisData] = useState<DynamicAnamnesisState>(initialDynamicAnamnesis);
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);
  const [showToothSelectorModal, setShowToothSelectorModal] = useState(false);

  // Modal de Gestão de Equipe
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('EVALUATOR');
  const [newMemberBlinded, setNewMemberBlinded] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Modal de Alocação de Randomização / Grupos
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocatingParticipant, setAllocatingParticipant] = useState<Participant | null>(null);
  const [allocatedGroupInput, setAllocatedGroupInput] = useState('');
  const [savingAllocation, setSavingAllocation] = useState(false);

  // Modal de Linha do Tempo & Sessões Longitudinais
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineParticipant, setTimelineParticipant] = useState<Participant | null>(null);

  // Modal de Questionários & eCRF do Paciente
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [responsesParticipant, setResponsesParticipant] = useState<Participant | null>(null);
  const [overrideBlindedView, setOverrideBlindedView] = useState<boolean | null>(null);

  // Modal de Prontuário Clínico & Dossiê Completo do Paciente (Anamnese, Odontograma, Histórico)
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierParticipant, setDossierParticipant] = useState<Participant | null>(null);

  const openPatientDossier = (part: Participant) => {
    setDossierParticipant(part);
    setShowDossierModal(true);
  };

  const currentDossierParticipant = useMemo(() => {
    if (!dossierParticipant || !project?.participants) return dossierParticipant;
    return (project.participants as Participant[]).find((p) => p.id === dossierParticipant.id) || dossierParticipant;
  }, [dossierParticipant, project?.participants]);

  // Menu dropdown de mais ações da linha do participante
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.row-actions-dropdown')) {
        setActiveRowMenu(null);
      }
    };
    if (activeRowMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [activeRowMenu]);

  const handleOpenResponses = async (part: Participant) => {
    setResponsesParticipant(part);
    setShowResponsesModal(true);
    try {
      const res = await fetch(`/api/responses?participantId=${part.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.responses) {
          setResponsesParticipant((prev) => (prev && prev.id === part.id ? { ...prev, responses: data.responses } : prev));
          setProject((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: (prev.participants || []).map((p) =>
                p.id === part.id ? { ...p, responses: data.responses } : p
              ),
            };
          });
        }
      }
    } catch {}
  };

  // Modal de Registro/Edição de Sessão Clínica
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [currentSessionForm, setCurrentSessionForm] = useState<{
    participantId: string;
    sessionNumber: number;
    sessionType: string;
    sessionDate: string;
    shadeRight: string;
    shadeLeft: string;
    painScore0h: number;
    painScore1h: number | null;
    painScore24h: number | null;
    painScore48h: number | null;
    gingivalIrritation: string;
    adverseEvents: string;
    operatorName: string;
    evaluatorName: string;
    notes: string;
    justification?: string;
  }>({
    participantId: '',
    sessionNumber: 1,
    sessionType: 'BASELINE_INTERVENTION_1',
    sessionDate: new Date().toISOString().split('T')[0],
    shadeRight: 'A3',
    shadeLeft: 'A3',
    painScore0h: 0,
    painScore1h: null,
    painScore24h: null,
    painScore48h: null,
    gingivalIrritation: 'Ausente',
    adverseEvents: '',
    operatorName: '',
    evaluatorName: '',
    notes: '',
    justification: '',
  });
  const [savingSession, setSavingSession] = useState(false);

  // Form Novo Paciente
  const [savingPatient, setSavingPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    fullName: '',
    cpf: '',
    phoneWhatsApp: '',
    dateOfBirth: '1998-01-01',
    biologicalSex: 'Feminino',
    comorbidities: '',
    allergies: '',
    medications: '',
    chiefComplaint: '',
    expectations: '',
  });

  // Estados para Edição de Dados Cadastrais do Paciente (Audit Trail GCP / ICH E6)
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editPatientData, setEditPatientData] = useState({
    fullName: '',
    cpf: '',
    email: '',
    phoneWhatsApp: '',
    address: '',
    dateOfBirth: '1998-01-01',
    biologicalSex: 'Feminino',
    comorbidities: '',
    allergies: '',
    medications: '',
    chiefComplaint: '',
    expectations: '',
  });
  const [editPatientReason, setEditPatientReason] = useState('');
  const [savingPatientEdit, setSavingPatientEdit] = useState(false);

  const applyProjectData = (data: any) => {
    if (!data?.project) return;
    setProject(data.project);
    setIsBlindedUser(Boolean(data.isBlinded || data.currentMember?.isBlinded));
    setCurrentMemberRole(data.currentMember?.role || 'COORDINATOR');

    if (data.currentUser) {
      setCurrentUser(data.currentUser);
      try {
        localStorage.setItem('uepg_cached_user', JSON.stringify(data.currentUser));
      } catch (e) {}
    }

    // Salva no cache local para renderização instantânea em 0 ms nas próximas visitas (SWR)
    try {
      localStorage.setItem(`uepg_cached_project_${data.project.id}`, JSON.stringify(data.project));
      if (data.currentUser?.id) {
        localStorage.setItem(`uepg_cached_last_project_${data.currentUser.id}`, JSON.stringify(data.project));
      }
      localStorage.setItem('uepg_cached_last_project', JSON.stringify(data.project));
    } catch (e) {}

    // Seleção de aba inteligente:
    // Se não há participantes ativos aprovados, mas há candidatos na triagem, abre direto na Triagem!
    const approvedCount = (data.project.participants || []).filter((p: any) => p.status === 'APPROVED').length;
    const pendingCount = (data.project.participants || []).filter((p: any) => p.status === 'PENDING').length;

    const tabParam = searchParams.get('tab');
    if (tabParam && ['active', 'triage', 'audit', 'consort', 'team', 'export'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    } else {
      const savedTab = typeof window !== 'undefined' ? sessionStorage.getItem(`uepg_tab_${data.project.id}`) : null;
      if (savedTab && ['active', 'triage', 'audit', 'consort', 'team', 'export'].includes(savedTab)) {
        setActiveTab(savedTab as any);
      } else if (approvedCount === 0 && pendingCount > 0) {
        setActiveTab('triage');
      }
    }

    if (timelineParticipant) {
      const updated = data.project.participants?.find(
        (p: Participant) => p.id === timelineParticipant.id
      );
      if (updated) setTimelineParticipant(updated);
    }

    if (responsesParticipant) {
      const updated = data.project.participants?.find(
        (p: Participant) => p.id === responsesParticipant.id
      );
      if (updated) setResponsesParticipant(updated);
    }
  };

  const fetchWithRetry = async (url: string, timeoutMs: number = 15000, maxRetries: number = 1): Promise<Response> => {
    let lastError: any = null;
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
    const reqHeaders: Record<string, string> = {
      'Cache-Control': 'no-cache',
    };
    if (authToken) {
      reqHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include',
          headers: reqHeaders,
        });
        clearTimeout(timer);
        if (!res.ok && res.status >= 500 && attempt < maxRetries) {
          console.warn(`[API] Tentativa ${attempt + 1} para ${url} retornou status ${res.status}. Tentando novamente em 1s...`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        console.warn(`[API] Tentativa ${attempt + 1} para ${url} falhou: ${err.message || err.name}.`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
    }
    throw lastError;
  };

  const loadProject = async (silent: boolean = false) => {
    setLoadError(null);
    try {
      const hasExistingData = Boolean(projectRef.current || project);
      if (!silent && !hasExistingData) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      let pId = projectIdParam;

      // Se não há projectIdParam na URL, tenta o último projeto conhecido em cache para paralelizar
      if (!pId && typeof window !== 'undefined') {
        try {
          const cachedLastStr = localStorage.getItem('uepg_cached_last_project');
          if (cachedLastStr) {
            const parsedLast = JSON.parse(cachedLastStr);
            if (parsedLast?.id) {
              pId = parsedLast.id;
            }
          }
        } catch {}
      }

      if (pId) {
        // Dispara a lista de projetos em segundo plano se ainda não foi carregada
        if (allProjects.length === 0) {
          fetchWithRetry('/api/projects', 15000, 1)
            .then(async (listRes) => {
              if (listRes.status === 401 && typeof window !== 'undefined') {
                localStorage.removeItem('uepg_auth_token');
                localStorage.removeItem('uepg_cached_user');
                window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                return;
              }
              if (listRes.ok) {
                const listData = await listRes.json();
                if (listData.projects) {
                  setAllProjects(listData.projects.map((p: any) => ({ id: p.id, name: p.name })));
                }
                if (listData.currentUser) {
                  setCurrentUser(listData.currentUser);
                }
              }
            })
            .catch((e) => console.warn('Aviso: busca em segundo plano de projetos falhou:', e));
        }

        const resProject = await fetchWithRetry(`/api/projects/${pId}`, 15000, 1);

        if (resProject.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('uepg_auth_token');
            localStorage.removeItem('uepg_cached_user');
            window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          }
          return;
        }

        if (resProject.ok) {
          const data = await resProject.json();
          projectRef.current = data.project;
          applyProjectData(data);
        } else {
          const errData = await resProject.json().catch(() => ({}));
          if (!projectRef.current) {
            setLoadError(errData.error || 'Erro ao carregar dados do projeto.');
          }
        }
      } else {
        const listRes = await fetchWithRetry('/api/projects', 35000, 2);

        if (listRes.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          }
          return;
        }

        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.projects) {
            setAllProjects(listData.projects.map((p: any) => ({ id: p.id, name: p.name })));
          }
          if (listData.currentUser) {
            setCurrentUser(listData.currentUser);
          }
          if (listData.projects?.[0]?.id) {
            const firstRes = await fetchWithRetry(`/api/projects/${listData.projects[0].id}`, 35000, 2);
            if (firstRes.ok) {
              const firstData = await firstRes.json();
              projectRef.current = firstData.project;
              applyProjectData(firstData);
            }
          }
        } else {
          const errData = await listRes.json().catch(() => ({}));
          if (!projectRef.current) {
            setLoadError(errData.error || 'Erro ao carregar lista de projetos.');
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar projeto:', err);
      if (!projectRef.current) {
        if (err.name === 'AbortError') {
          setLoadError('A conexão com o banco de dados demorou para responder. Clique para tentar novamente.');
        } else {
          setLoadError('Não foi possível conectar ao banco de dados no momento.');
        }
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // 0. Interceptar auth_token da URL se fornecido no redirecionamento do login
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('auth_token');
        if (urlToken) {
          localStorage.setItem('uepg_auth_token', urlToken);
          const isHttps = window.location.protocol === 'https:';
          const secureFlag = isHttps ? '; Secure; SameSite=None' : '; SameSite=Lax';
          document.cookie = `auth_session=${urlToken}; path=/; max-age=604800${secureFlag}`;
          document.cookie = `auth_token_client=${urlToken}; path=/; max-age=604800${secureFlag}`;
          urlParams.delete('auth_token');
          const cleanQuery = urlParams.toString();
          const cleanPath = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '');
          window.history.replaceState({}, '', cleanPath);
        }
      } catch (e) {}
    }

    let hasRestoredFromCache = false;

    // 1. Carregamento seguro via Cache Local particionado por usuário (0 ms)
    if (typeof window !== 'undefined') {
      try {
        const cachedUserStr = localStorage.getItem('uepg_cached_user');
        let currentCachedUser: any = null;
        if (cachedUserStr) {
          currentCachedUser = JSON.parse(cachedUserStr);
          if (currentCachedUser) {
            setCurrentUser(currentCachedUser);
          }
        }

        const cachedKey = projectIdParam
          ? `uepg_cached_project_${projectIdParam}`
          : currentCachedUser?.id
          ? `uepg_cached_last_project_${currentCachedUser.id}`
          : 'uepg_cached_last_project';

        let cachedStr = cachedKey ? localStorage.getItem(cachedKey) : null;
        if (!cachedStr && !projectIdParam) {
          cachedStr = localStorage.getItem('uepg_cached_last_project');
        }

        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && cached.id) {
            const isUserAdmin = currentCachedUser?.role === 'ADMIN' || currentCachedUser?.email === 'admin@uepg.br';
            const isMember =
              !currentCachedUser ||
              isUserAdmin ||
              cached.members?.some(
                (m: any) =>
                  m.userId === currentCachedUser.id ||
                  m.user?.id === currentCachedUser.id ||
                  m.user?.email === currentCachedUser.email
              );

            if (isMember) {
              setProject(cached);
              projectRef.current = cached;
              setLoading(false); // Exibe o projeto imediatamente sem travar a interface!
              hasRestoredFromCache = true;
              const approvedCount = (cached.participants || []).filter((p: any) => p.status === 'APPROVED').length;
              const pendingCount = (cached.participants || []).filter((p: any) => p.status === 'PENDING').length;
              const savedTab = sessionStorage.getItem(`uepg_tab_${cached.id}`);
              if (savedTab && ['active', 'triage', 'audit', 'consort', 'team', 'export'].includes(savedTab)) {
                setActiveTab(savedTab as any);
              } else if (approvedCount === 0 && pendingCount > 0) {
                setActiveTab('triage');
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao ler cache do projeto:', e);
      }
    }

    // Valida o usuário autenticado de forma independente
    const currentAuthToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
    fetch('/api/auth/me', {
      credentials: 'include',
      headers: currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem('uepg_cached_user', JSON.stringify(data.user));
          } catch (e) {}
        }
      })
      .catch(() => {});

    // Se restaurou do cache, carrega silenciosamente em segundo plano
    loadProject(hasRestoredFromCache);

    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadProject(true);
      }
    };
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [projectIdParam]);

  // Ações de Edição do Projeto no Dashboard
  const openEditProjectModal = () => {
    if (!project) return;
    setEditProjectName(project.name);
    setEditProjectDesc(project.description || '');
    setEditProjectStatus(
      project.status === 'COMPLETED' ? 'COMPLETED' : project.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE'
    );
    setShowEditProjectModal(true);
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !editProjectName.trim()) return;

    try {
      setSavingProjectEdit(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: editProjectName.trim(),
          description: editProjectDesc.trim() || null,
          status: editProjectStatus,
        }),
      });

      if (res.ok) {
        const updated = {
          ...project,
          name: editProjectName.trim(),
          description: editProjectDesc.trim() || null,
          status: editProjectStatus,
        };
        setProject(updated);
        projectRef.current = updated;
        setShowEditProjectModal(false);

        setAllProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, name: editProjectName.trim() } : p))
        );

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`uepg_cached_project_${project.id}`, JSON.stringify(updated));
            const cachedList = localStorage.getItem('uepg_cached_projects');
            if (cachedList) {
              const parsed = JSON.parse(cachedList);
              const nextList = parsed.map((p: any) =>
                p.id === project.id
                  ? {
                      ...p,
                      name: editProjectName.trim(),
                      description: editProjectDesc.trim() || null,
                      status: editProjectStatus,
                    }
                  : p
              );
              localStorage.setItem('uepg_cached_projects', JSON.stringify(nextList));
            }
          } catch (e) {}
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erro ao salvar alterações do projeto.');
      }
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err);
      alert('Erro de conexão ao salvar alterações do projeto.');
    } finally {
      setSavingProjectEdit(false);
    }
  };

  // Ações de Membros da Equipe & Cegamento
  const handleToggleBlinded = async (memberId: string, currentVal: boolean) => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, isBlinded: !currentVal }),
      });
      if (res.ok) {
        loadProject();
      }
    } catch (err) {
      console.error('Erro ao alterar cegamento:', err);
    }
  };

  const handleChangeMemberRole = async (memberId: string, newRole: string) => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });
      if (res.ok) {
        loadProject();
      }
    } catch (err) {
      console.error('Erro ao alterar papel:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!project) return;
    if (!confirm('Deseja realmente remover este pesquisador da equipe?')) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadProject();
      }
    } catch (err) {
      console.error('Erro ao remover membro:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newMemberEmail.trim()) return;

    try {
      setAddingMember(true);
      setMemberError(null);

      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
          isBlinded: newMemberBlinded,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar membro.');
      }

      setShowAddMemberModal(false);
      setNewMemberEmail('');
      loadProject();
    } catch (err: any) {
      setMemberError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  // Ações de Triagem
  const handleApprove = async (participantId: string) => {
    // 1. Atualização otimista imediata na interface (0 ms de espera!)
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: (prev.participants || []).map((p) =>
          p.id === participantId ? { ...p, status: 'APPROVED' } : p
        ),
      };
    });
    handleSelectTab('active');

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      if (res.ok) {
        loadProject(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao incluir participante.');
        loadProject(true);
      }
    } catch (e) {
      console.error('Erro ao aprovar:', e);
      alert('Erro de comunicação ao incluir participante.');
      loadProject(true);
    }
  };

  const handleOpenReject = (part: Participant) => {
    setSelectedParticipant(part);
    setExclusionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedParticipant || !exclusionReason.trim()) return;

    const partId = selectedParticipant.id;
    const reason = exclusionReason.trim();

    // Fecha o modal imediatamente
    setShowRejectModal(false);
    setSelectedParticipant(null);

    // Atualização otimista imediata
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: (prev.participants || []).map((p) =>
          p.id === partId ? { ...p, status: 'EXCLUDED', exclusionReason: reason } : p
        ),
      };
    });

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/participants/${partId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          status: 'EXCLUDED',
          exclusionReason: reason,
        }),
      });

      if (res.ok) {
        loadProject(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao recusar participante.');
        loadProject(true);
      }
    } catch (e) {
      console.error('Erro ao excluir:', e);
      loadProject(true);
    }
  };

  // Ações de Alocação de Grupos (Randomização)
  const handleOpenAllocation = (part: Participant) => {
    setAllocatingParticipant(part);
    setAllocatedGroupInput(part.group || '');
    setShowAllocationModal(true);
  };

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingParticipant) return;

    const partId = allocatingParticipant.id;
    const newGroup = allocatedGroupInput.trim();

    // Fecha o modal e atualiza a interface instantaneamente
    setShowAllocationModal(false);
    setAllocatingParticipant(null);

    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: (prev.participants || []).map((p) =>
          p.id === partId ? { ...p, group: newGroup } : p
        ),
      };
    });

    try {
      setSavingAllocation(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/participants/${partId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ group: newGroup }),
      });

      if (res.ok) {
        loadProject(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao salvar alocação de grupo.');
        loadProject(true);
      }
    } catch (err) {
      console.error('Erro ao salvar alocação:', err);
      alert('Erro de comunicação ao salvar alocação.');
      loadProject(true);
    } finally {
      setSavingAllocation(false);
    }
  };

  // Cadastro de Novo Paciente
  const handleSaveNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setSavingPatient(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          ...newPatientData,
          projectId: project.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setShowNewPatientModal(false);
        setNewPatientData({
          fullName: '',
          cpf: '',
          phoneWhatsApp: '',
          dateOfBirth: '1998-01-01',
          biologicalSex: 'Feminino',
          comorbidities: '',
          allergies: '',
          medications: '',
          chiefComplaint: '',
          expectations: '',
        });

        // Atualização otimista imediata no estado local do projeto para aparecer instantaneamente
        if (result.participant) {
          setProject((prev) => {
            if (!prev) return prev;
            const existing = prev.participants || [];
            if (existing.some((p: any) => p.id === result.participant.id)) return prev;
            return {
              ...prev,
              participants: [...existing, result.participant],
            };
          });
        }

        // Alterna imediatamente para a aba de Triagem para exibir o voluntário recém-adicionado
        setActiveTab('triage');

        // Sincroniza em segundo plano sem travar o usuário
        loadProject(true);

        if (openAnamnesisAfterCreate && result.participant) {
          openAnamnesisModal(result.participant);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao cadastrar paciente.');
      }
    } catch (e) {
      console.error('Erro ao cadastrar paciente:', e);
      alert('Erro de rede ao cadastrar paciente.');
    } finally {
      setSavingPatient(false);
    }
  };

  // Abertura e Salvamento de Edição de Dados Cadastrais do Paciente
  const handleOpenEditPatient = (part: Participant) => {
    setEditingParticipant(part);
    const p = part.patient;
    const dobFormatted = p.dateOfBirth
      ? new Date(p.dateOfBirth).toISOString().split('T')[0]
      : '1998-01-01';

    setEditPatientData({
      fullName: p.fullName || '',
      cpf: p.cpf || '',
      email: p.email || '',
      phoneWhatsApp: p.phoneWhatsApp || '',
      address: p.address || '',
      dateOfBirth: dobFormatted,
      biologicalSex: p.biologicalSex || 'Feminino',
      comorbidities: p.comorbidities || '',
      allergies: p.allergies || '',
      medications: p.medications || '',
      chiefComplaint: p.chiefComplaint || '',
      expectations: p.expectations || '',
    });
    setEditPatientReason('');
    setShowEditPatientModal(true);
  };

  const handleSaveEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant || !project) return;
    if (!editPatientReason.trim()) {
      alert('A justificativa da alteração é obrigatória para conformidade com a Trilha de Auditoria (GCP/ICH E6).');
      return;
    }

    const patientId = editingParticipant.patient.id;
    const updatedPatientData = { ...editPatientData };

    // Fecha o modal e atualiza a interface imediatamente
    setShowEditPatientModal(false);
    setEditingParticipant(null);

    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: (prev.participants || []).map((p) =>
          p.patient.id === patientId
            ? { ...p, patient: { ...p.patient, ...updatedPatientData } }
            : p
        ),
      };
    });

    try {
      setSavingPatientEdit(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/patients', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          patientId,
          projectId: project.id,
          reason: editPatientReason.trim(),
          ...updatedPatientData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar dados cadastrais.');
      }

      loadProject(true);
    } catch (err: any) {
      console.error('Erro ao atualizar dados cadastrais do paciente:', err);
      alert(err?.message || 'Erro de comunicação ao salvar alterações.');
      loadProject(true);
    } finally {
      setSavingPatientEdit(false);
    }
  };


  // Abrir e Salvar Anamnese
  const openAnamnesisModal = (part: Participant) => {
    setCurrentAnamnesisPart(part);
    if (part.anamnesisData) {
      try {
        const parsed = JSON.parse(part.anamnesisData);
        if (parsed && (parsed.answers !== undefined || parsed.odontogram !== undefined || parsed.periodontogram !== undefined)) {
          setAnamnesisData({
            odontogram: parsed.odontogram || {},
            periodontogram: parsed.periodontogram || initialDynamicAnamnesis.periodontogram,
            answers: parsed.answers || {},
            clinicalNotes: parsed.clinicalNotes || '',
          });
        } else {
          setAnamnesisData({
            odontogram: {},
            periodontogram: initialDynamicAnamnesis.periodontogram,
            answers: typeof parsed === 'object' ? parsed : {},
            clinicalNotes: parsed?.clinicalNotes || '',
          });
        }
      } catch {
        setAnamnesisData(initialDynamicAnamnesis);
      }
    } else {
      setAnamnesisData(initialDynamicAnamnesis);
    }
    setShowAnamnesisModal(true);
  };

  const handleSaveAnamnesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnamnesisPart) return;

    const partId = currentAnamnesisPart.id;
    const serializedData = JSON.stringify(anamnesisData);

    // Fecha o modal e atualiza o estado local em 0 ms!
    setShowAnamnesisModal(false);
    setCurrentAnamnesisPart(null);

    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: (prev.participants || []).map((p) =>
          p.id === partId
            ? { ...p, anamnesisDone: true, anamnesisData: serializedData }
            : p
        ),
      };
    });

    try {
      setSavingAnamnesis(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/participants/${partId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          anamnesisDone: true,
          anamnesisData: serializedData,
        }),
      });

      if (res.ok) {
        loadProject(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao salvar ficha clínica / anamnese.');
        loadProject(true);
      }
    } catch (err) {
      console.error('Erro ao salvar anamnese:', err);
      alert('Falha de rede ao salvar anamnese.');
      loadProject(true);
    } finally {
      setSavingAnamnesis(false);
    }
  };

  // Abertura e Gravação de Sessões Clínicas
  const openSessionEditor = async (participant: Participant, sessionNumber: number) => {
    let existing = participant.sessions?.find((s) => s.sessionNumber === sessionNumber);
    const sessionTypes: Record<number, string> = {
      1: 'BASELINE_INTERVENTION_1',
      2: 'INTERVENTION_2',
      3: 'FOLLOW_UP_14D',
      4: 'FOLLOW_UP_30D',
    };
    const defaultType = sessionTypes[sessionNumber] || 'INTERVENTION';

    setCurrentSessionForm({
      participantId: participant.id,
      sessionNumber,
      sessionType: existing?.sessionType || defaultType,
      sessionDate: existing?.sessionDate
        ? new Date(existing.sessionDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      shadeRight: existing?.shadeRight || 'A3',
      shadeLeft: existing?.shadeLeft || 'A3',
      painScore0h: existing?.painScore0h ?? 0,
      painScore1h: existing?.painScore1h ?? null,
      painScore24h: existing?.painScore24h ?? null,
      painScore48h: existing?.painScore48h ?? null,
      gingivalIrritation: existing?.gingivalIrritation || 'Ausente',
      adverseEvents: existing?.adverseEvents || '',
      operatorName: existing?.operatorName || '',
      evaluatorName: existing?.evaluatorName || '',
      notes: existing?.notes || '',
      justification: '',
    });
    setShowSessionModal(true);

    // Consulta em tempo real para sincronizar quaisquer relatos submetidos pelo paciente no portal
    try {
      const res = await fetch(`/api/participants/${participant.id}/sessions`);
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) {
          const fresh = (data.sessions as ClinicalSession[]).find((s) => s.sessionNumber === sessionNumber);
          if (fresh) {
            setCurrentSessionForm((prev) => ({
              ...prev,
              painScore0h: fresh.painScore0h ?? prev.painScore0h,
              painScore1h: fresh.painScore1h ?? prev.painScore1h,
              painScore24h: fresh.painScore24h ?? prev.painScore24h,
              painScore48h: fresh.painScore48h ?? prev.painScore48h,
              notes: fresh.notes || prev.notes,
              adverseEvents: fresh.adverseEvents || prev.adverseEvents,
            }));
          }
          setProject((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: (prev.participants || []).map((p) =>
                p.id === participant.id ? { ...p, sessions: data.sessions } : p
              ),
            };
          });
        }
      }
    } catch {}
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSessionForm.participantId) return;

    const formData = { ...currentSessionForm };

    // Fecha o modal e atualiza a interface instantaneamente (0 ms de latência percebida)
    setShowSessionModal(false);

    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: (prev.participants || []).map((p) => {
          if (p.id !== formData.participantId) return p;
          const existingSessions = p.sessions || [];
          const sessionIndex = existingSessions.findIndex((s) => s.sessionNumber === formData.sessionNumber);
          const prevSess = sessionIndex >= 0 ? existingSessions[sessionIndex] : null;
          const updatedSession = {
            id: prevSess ? prevSess.id : `temp_${Date.now()}`,
            participantId: formData.participantId,
            sessionNumber: formData.sessionNumber,
            sessionType: formData.sessionType,
            sessionDate: new Date(formData.sessionDate),
            shadeRight: formData.shadeRight,
            shadeLeft: formData.shadeLeft,
            painScore0h: formData.painScore0h,
            painScore1h: formData.painScore1h !== null ? formData.painScore1h : prevSess?.painScore1h ?? null,
            painScore24h: formData.painScore24h !== null ? formData.painScore24h : prevSess?.painScore24h ?? null,
            painScore48h: formData.painScore48h !== null ? formData.painScore48h : prevSess?.painScore48h ?? null,
            gingivalIrritation: formData.gingivalIrritation,
            adverseEvents: formData.adverseEvents,
            operatorName: formData.operatorName,
            evaluatorName: formData.evaluatorName,
            notes: formData.notes,
            createdAt: new Date(),
            updatedAt: new Date(),
            alerts: [],
          };
          const newSessions = [...existingSessions];
          if (sessionIndex >= 0) {
            newSessions[sessionIndex] = updatedSession as any;
          } else {
            newSessions.push(updatedSession as any);
          }
          return { ...p, sessions: newSessions };
        }),
      };
    });

    try {
      setSavingSession(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/participants/${formData.participantId}/sessions`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        loadProject(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao registrar sessão clínica.');
        loadProject(true);
      }
    } catch (err) {
      console.error('Erro ao salvar sessão clínica:', err);
      alert('Erro de conexão ao salvar a sessão clínica. Verifique sua conexão com a internet e tente novamente.');
    } finally {
      setSavingSession(false);
    }
  };

  // Exportação Clínica Principal: Desidentificada em conformidade com a LGPD (Apenas Código de Pesquisa)
  const exportToCSV = () => {
    if (!project) return;
    const formHeaders = (project.forms || []).map(
      (f) => `Status_${f.title.replace(/[^a-zA-Z0-9]/g, '_')}`
    );

    const headers = [
      'Codigo_Pesquisa',
      'Sexo',
      'Ano_Nascimento',
      'Status_Triagem',
      'Ficha_Clinica_Concluida',
      'Grupo_Alocado',
      'S1_Data',
      'S1_Cor_Dir',
      'S1_Cor_Esq',
      'S1_Dor_0h',
      'S1_Dor_1h',
      'S1_Dor_24h',
      'S1_Dor_48h',
      'S2_Data',
      'S2_Cor_Dir',
      'S2_Cor_Esq',
      'S2_Dor_0h',
      'S2_Dor_1h',
      'S2_Dor_24h',
      'S2_Dor_48h',
      'R14d_Cor_Dir',
      'R14d_Cor_Esq',
      'R30d_Cor_Dir',
      'R30d_Cor_Esq',
      'Motivo_Exclusao',
      ...formHeaders,
    ];

    const rows = project.participants.map((p) => {
      const s1 = p.sessions?.find((s) => s.sessionNumber === 1);
      const s2 = p.sessions?.find((s) => s.sessionNumber === 2);
      const r14 = p.sessions?.find((s) => s.sessionNumber === 3);
      const r30 = p.sessions?.find((s) => s.sessionNumber === 4);

      const formCols = (project.forms || []).map((f) => {
        const resp = p.responses?.find((r) => r.formId === f.id);
        return resp ? 'CONCLUIDO' : 'PENDENTE';
      });

      const birthYear = p.patient.dateOfBirth
        ? new Date(p.patient.dateOfBirth).getUTCFullYear() ||
          new Date(p.patient.dateOfBirth).getFullYear()
        : '';

      return [
        p.researchCode,
        p.patient.biologicalSex,
        birthYear,
        p.status,
        p.anamnesisDone ? 'SIM' : 'NAO',
        `"${p.group || 'Nao Alocado'}"`,
        s1?.sessionDate ? new Date(s1.sessionDate).toLocaleDateString('pt-BR') : '',
        s1?.shadeRight || '',
        s1?.shadeLeft || '',
        s1?.painScore0h !== null && s1?.painScore0h !== undefined ? s1.painScore0h : '',
        s1?.painScore1h !== null && s1?.painScore1h !== undefined ? s1.painScore1h : '',
        s1?.painScore24h !== null && s1?.painScore24h !== undefined ? s1.painScore24h : '',
        s1?.painScore48h !== null && s1?.painScore48h !== undefined ? s1.painScore48h : '',
        s2?.sessionDate ? new Date(s2.sessionDate).toLocaleDateString('pt-BR') : '',
        s2?.shadeRight || '',
        s2?.shadeLeft || '',
        s2?.painScore0h !== null && s2?.painScore0h !== undefined ? s2.painScore0h : '',
        s2?.painScore1h !== null && s2?.painScore1h !== undefined ? s2.painScore1h : '',
        s2?.painScore24h !== null && s2?.painScore24h !== undefined ? s2.painScore24h : '',
        s2?.painScore48h !== null && s2?.painScore48h !== undefined ? s2.painScore48h : '',
        r14?.shadeRight || '',
        r14?.shadeLeft || '',
        r30?.shadeRight || '',
        r30?.shadeLeft || '',
        `"${p.exclusionReason || ''}"`,
        ...formCols,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `pesquisa_${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dados_clinicos_desidentificados.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportação Cadastral Separada: Restrita para fins administrativos/auditoria
  const exportCadastralToCSV = () => {
    if (!project) return;
    const headers = [
      'Codigo_Pesquisa',
      'Nome_Completo',
      'CPF',
      'Sexo',
      'Data_Nascimento',
      'WhatsApp',
      'Status_Triagem',
      'Grupo_Alocado',
    ];

    const rows = project.participants.map((p) => [
      p.researchCode,
      `"${p.patient.fullName}"`,
      `"${p.patient.cpf}"`,
      p.patient.biologicalSex,
      p.patient.dateOfBirth ? new Date(p.patient.dateOfBirth).toLocaleDateString('pt-BR') : '',
      `"${p.patient.phoneWhatsApp}"`,
      p.status,
      `"${p.group || 'Nao Alocado'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `pesquisa_${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_cadastro_identificado.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportação Específica por Questionário (Pronto para SPSS / R / Jamovi - Desidentificado)
  const exportFormToCSV = (formId: string) => {
    if (!project) return;
    const targetForm = project.forms.find((f) => f.id === formId);
    if (!targetForm) {
      alert('Formulário não encontrado para exportação.');
      return;
    }

    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(targetForm.questionsJson || '[]');
    } catch {
      parsedQuestions = [];
    }

    // Filtrar questões que possuem respostas (ignorar instruções puras)
    const evaluableQuestions = parsedQuestions.filter((q) => q.type !== 'instruction');

    // Montar cabeçalhos desidentificados
    const headers = [
      'Codigo_Pesquisa',
      'Grupo_Alocado',
      'Status_Formulario',
      'Data_Submissao',
      ...evaluableQuestions.map((q, idx) => {
        const cleanTitle = (q.label || q.title || `Q${idx + 1}`)
          .replace(/[;\n\r"]/g, ' ')
          .trim()
          .slice(0, 35);
        return `Q${idx + 1}_${cleanTitle}`;
      }),
      'Escore_Total_Numerico',
    ];

    const rows = project.participants.map((p) => {
      const resp = p.responses?.find((r) => r.formId === formId);
      let answers: Record<string, any> = {};
      if (resp) {
        try {
          answers = JSON.parse(resp.answersJson || '{}');
        } catch {
          answers = {};
        }
      }

      let totalScore = 0;
      let hasScoredItems = false;

      const questionCols = evaluableQuestions.map((q) => {
        if (!resp) return '';
        const val = answers[q.id];
        if (val === undefined || val === null || val === '') return '';

        // Tentar extrair pontuação numérica para Likert / VAS / Números
        if (q.type === 'vas') {
          const numVal = parseFloat(val);
          if (!isNaN(numVal)) {
            totalScore += numVal;
            hasScoredItems = true;
          }
          return numVal.toFixed(1);
        }

        if (typeof val === 'string') {
          // Detectar padrão "Nunca (0)", "Sempre (4)", "(1)", etc.
          const match = val.match(/\((\d+)\)/);
          if (match) {
            totalScore += parseInt(match[1], 10);
            hasScoredItems = true;
          }
        } else if (typeof val === 'number') {
          totalScore += val;
          hasScoredItems = true;
        }

        return `"${String(val).replace(/"/g, '""')}"`;
      });

      return [
        p.researchCode,
        `"${p.group || 'Nao Alocado'}"`,
        resp ? 'CONCLUIDO' : 'PENDENTE',
        resp?.submittedAt ? new Date(resp.submittedAt).toLocaleString('pt-BR') : '',
        ...questionCols,
        resp && hasScoredItems ? totalScore.toFixed(1) : '',
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `questionario_${targetForm.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_desidentificado.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportação da Trilha de Auditoria Regulatória (GCP / ICH E6 / 21 CFR Part 11) - Exclusivo Coordenador e Administrador
  const exportAuditLogsToCSV = () => {
    if (!isAdmin) {
      alert('Acesso restrito: Apenas o Coordenador do estudo ou Administrador pode exportar a trilha de auditoria.');
      return;
    }

    if (!project || !project.auditLogs || project.auditLogs.length === 0) {
      alert('Nenhum registro de auditoria disponível para exportação.');
      return;
    }

    const headers = [
      'Data_Hora_UTC',
      'Data_Hora_Local',
      'Acao',
      'Tipo_Entidade',
      'ID_Entidade',
      'Pesquisador',
      'Email_Pesquisador',
      'Campo_Alterado',
      'Valor_Anterior',
      'Valor_Novo',
      'Justificativa_Clinica',
      'Endereco_IP',
      'Dispositivo_UserAgent',
    ];

    const rows = project.auditLogs.map((log) => [
      `"${log.createdAt}"`,
      `"${new Date(log.createdAt).toLocaleString('pt-BR')}"`,
      `"${log.action}"`,
      `"${log.entityType}"`,
      `"${log.entityId}"`,
      `"${(log.changedBy || '').replace(/"/g, '""')}"`,
      `"${(log.userEmail || '').replace(/"/g, '""')}"`,
      `"${(log.fieldName || '').replace(/"/g, '""')}"`,
      `"${(log.oldValue || '').replace(/"/g, '""')}"`,
      `"${(log.newValue || '').replace(/"/g, '""')}"`,
      `"${(log.reason || '').replace(/"/g, '""')}"`,
      `"${log.ipAddress || ''}"`,
      `"${(log.userAgent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `auditoria_gcp_${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportação Numérica Padrão SPSS / R / Jamovi (.CSV)
  const exportNumericCSV = () => {
    if (!project) return;
    const participantsData = project.participants.map((p) => ({
      researchCode: p.researchCode,
      biologicalSex: p.patient.biologicalSex,
      dateOfBirth: p.patient.dateOfBirth,
      status: p.status,
      group: p.group,
      sessions: p.sessions?.map((s) => ({
        sessionNumber: s.sessionNumber,
        shadeRight: s.shadeRight,
        shadeLeft: s.shadeLeft,
        painScore0h: s.painScore0h,
        painScore1h: s.painScore1h,
        painScore24h: s.painScore24h,
        painScore48h: s.painScore48h,
        adverseEvents: s.adverseEvents,
        notes: s.notes,
      })),
    }));

    const csvContent = buildNumericCSVContent(project.name, participantsData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'uepg_ensaio_clinico_numerico.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download do Dicionário de Variáveis (Codebook .MD)
  const downloadCodebook = () => {
    if (!project) return;
    const content = generateCodebookMarkdown(project.name);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'codebook_dicionario_variaveis.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download do Dicionário de Variáveis em Texto Puro (Codebook .TXT)
  const downloadCodebookTxt = () => {
    if (!project) return;
    const content = generateCodebookText(project.name);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'codebook_dicionario_variaveis.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download do Script de Análise Estatística em R
  const downloadRScript = () => {
    if (!project) return;
    const content = generateRAnalysisScript(project.name);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'analise_uepg.R');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download da Syntax de Análise no IBM SPSS
  const downloadSPSSScript = () => {
    if (!project) return;
    const content = generateSPSSSyntaxScript(project.name);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'analise_uepg.sps');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download dos Dados Formatados para GraphPad Prism (.TXT)
  const downloadGraphPadData = () => {
    if (!project) return;
    const participantsData = project.participants.map((p) => ({
      researchCode: p.researchCode,
      biologicalSex: p.patient.biologicalSex,
      dateOfBirth: p.patient.dateOfBirth,
      status: p.status,
      group: p.group,
      sessions: p.sessions?.map((s) => ({
        sessionNumber: s.sessionNumber,
        shadeRight: s.shadeRight,
        shadeLeft: s.shadeLeft,
        painScore0h: s.painScore0h,
        painScore1h: s.painScore1h,
        painScore24h: s.painScore24h,
        painScore48h: s.painScore48h,
        adverseEvents: s.adverseEvents,
        notes: s.notes,
      })),
    }));

    const content = generateGraphPadPrismFormat(project.name, participantsData);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'dados_graphpad_prism.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPatientUrl = (code: string) => {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    return `${origin}/paciente?code=${code}`;
  };

  const openWhatsApp = (phone: string, code: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const link = getPatientUrl(code);
    const text = encodeURIComponent(
      `Olá! Aqui é da equipe de pesquisa da UEPG. Segue seu link seguro para preenchimento de diário e questionários (Código: ${code}): ${link}`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  const openWhatsAppReminder = (phone: string, code: string, formTitle: string, patientName?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const firstName = patientName ? patientName.split(' ')[0] : '';
    const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
    const link = getPatientUrl(code);
    const text = encodeURIComponent(
      `${greeting} Aqui é da equipe de pesquisa clínica da UEPG. Notamos que o questionário "${formTitle}" da sua pesquisa ainda não foi preenchido. Segue seu link seguro para responder pelo celular: ${link}\n\nLeva poucos minutos e é fundamental para o estudo. Muito obrigado!`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  const openWhatsAppAppointment = (
    phone: string,
    code: string,
    patientName: string,
    sessionTitle: string,
    windowStart: Date,
    windowEnd: Date
  ) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const firstName = patientName.split(' ')[0] || patientName;
    const startStr = windowStart.toLocaleDateString('pt-BR');
    const endStr = windowEnd.toLocaleDateString('pt-BR');
    const text = encodeURIComponent(
      `Olá, ${firstName}! Aqui é da equipe da pesquisa clínica da UEPG.\n\n` +
      `Gostaríamos de confirmar o agendamento da sua próxima consulta: *${sessionTitle}* (Código: ${code}).\n\n` +
      `*Período ideal pelo protocolo da pesquisa:* entre *${startStr}* e *${endStr}*.\n\n` +
      `Por favor, nos responda informando o melhor dia e horário para seu comparecimento à clínica odontológica. Muito obrigado!`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  if (loading && !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Carregando dados da pesquisa clínica...</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Conectando com segurança ao banco de dados clínico da UEPG.
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {loadError || 'Nenhum projeto encontrado.'}
        </h2>
        <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
          Não foi possível carregar os dados deste estudo. Verifique sua conexão ou tente novamente.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => loadProject(false)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Meus Projetos</span>
          </Link>
        </div>
      </div>
    );
  }

  const pendingList = project.participants.filter((p) => p.status === 'PENDING');
  const approvedList = project.participants.filter((p) => p.status === 'APPROVED');
  const excludedList = project.participants.filter((p) => p.status === 'EXCLUDED');

  const participantWindows = approvedList.map((part) => ({
    part,
    windows: calculateSessionWindows(part, studyProtocol),
  }));

  const overdueVisits = participantWindows.filter(
    (pw) => pw.windows.overallAlert === 'OVERDUE'
  );
  const dueNowVisits = participantWindows.filter(
    (pw) => pw.windows.overallAlert === 'DUE_NOW'
  );
  const allCompletedVisits = participantWindows.filter(
    (pw) => pw.windows.overallAlert === 'COMPLETED'
  );
  const upcomingVisits = participantWindows.filter(
    (pw) => pw.windows.overallAlert === 'UPCOMING'
  );

  const filteredApprovedList = approvedList.filter((part) => {
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase().trim();
      const matchCode = part.researchCode?.toLowerCase().includes(q);
      const matchName = part.patient?.fullName?.toLowerCase().includes(q);
      const matchPhone = part.patient?.phoneWhatsApp?.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchPhone) return false;
    }
    if (activeFilter === 'PENDING') {
      const w = calculateSessionWindows(part, studyProtocol);
      return w.overallAlert === 'OVERDUE' || w.overallAlert === 'DUE_NOW';
    }
    if (activeFilter === 'COMPLETED') {
      const w = calculateSessionWindows(part, studyProtocol);
      return w.overallAlert === 'COMPLETED';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Sub-Header do Estudo */}
      <div className="bg-white border-b border-slate-200 shadow-xs relative">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-h-12">
            <div className="flex items-center space-x-3">
              <Link
                href="/"
                className="text-slate-500 hover:text-blue-600 text-xs font-semibold transition flex items-center space-x-1 px-2 py-1.5 rounded-lg hover:bg-slate-100"
                title="Ver todos os projetos"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Meus Projetos</span>
              </Link>
              <div className="h-5 w-px bg-slate-200" />

              {allProjects.length > 1 ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:inline">Estudo:</span>
                  <select
                    value={project.id}
                    onChange={(e) => {
                      const newId = e.target.value;
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('app_active_project_id', newId);
                      }
                      router.push(`/dashboard?projectId=${newId}`);
                    }}
                    className="text-sm font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[240px] sm:max-w-xs truncate"
                    title="Alternar entre projetos de pesquisa"
                  >
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-base font-bold text-slate-900 truncate max-w-md">
                  {project.name}
                </span>
              )}

              {/* Badge de Status do Estudo */}
              {project.status === 'COMPLETED' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  <span>Finalizado</span>
                </span>
              ) : project.status === 'CANCELLED' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300 inline-flex items-center gap-1 shrink-0">
                  <X className="w-3 h-3 text-slate-500" />
                  <span>Cancelado</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Ativo</span>
                </span>
              )}

              <button
                onClick={() => loadProject(true)}
                disabled={isRefreshing}
                title="Recarregar dados do projeto"
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Ações e Ferramentas Conectadas do Estudo Clínico */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowNewPatientModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Paciente</span>
              </button>

              <button
                type="button"
                onClick={openEditProjectModal}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 shadow-2xs shrink-0 cursor-pointer"
                title="Editar nome, descrição e status deste estudo"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>Editar Estudo</span>
              </button>

              <Link
                href={`/anamnese?projectId=${project.id}`}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 shadow-2xs shrink-0"
                title="Configurar Odontograma, Critérios e Instrumentos do Estudo"
              >
                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Ficha & Critérios</span>
                <span className="sm:hidden">Ficha</span>
              </Link>

              <Link
                href={`/construtor?projectId=${project.id}`}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 shadow-2xs shrink-0"
                title="Construtor de questionários eCRFs para pesquisador ou paciente"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Construtor eCRF</span>
                <span className="sm:hidden">eCRF</span>
              </Link>

              <Link
                href={`/tcle/editor?projectId=${project.id}`}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 shadow-2xs shrink-0"
                title="Personalizar Termo de Consentimento Livre e Esclarecido"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>TCLE</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
        {/* Banner de Erro com Versão em Cache */}
        {loadError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{loadError} Exibindo versão local em cache.</span>
            </div>
            <button
              onClick={() => loadProject(false)}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 font-bold rounded-lg transition shrink-0"
            >
              Tentar Novamente
            </button>
          </div>
        )}
        
        {/* Abas de Navegação do Projeto (Segmented Control Padronizado) */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1.5 mb-6 border border-slate-200/80 overflow-x-auto no-scrollbar shadow-2xs">
          <button
            onClick={() => handleSelectTab('active')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Prontuários & Atendimento</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeTab === 'active' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {approvedList.length}
            </span>
            {(overdueVisits.length > 0 || dueNowVisits.length > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Retornos pendentes" />
            )}
          </button>

          <button
            onClick={() => handleSelectTab('triage')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'triage'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Triagem & Critérios</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeTab === 'triage' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingList.length}
            </span>
          </button>

          {isAdmin && (
            <button
              onClick={() => handleSelectTab('audit')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Trilha de Auditoria GCP</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeTab === 'audit' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {project.auditLogs?.length || 0}
              </span>
            </button>
          )}

          <button
            onClick={() => handleSelectTab('consort')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'consort'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Fluxo CONSORT</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeTab === 'consort' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {excludedList.length}
            </span>
          </button>

          <button
            onClick={() => handleSelectTab('team')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'team'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Equipe</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeTab === 'team' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {project.members?.length || 0}
            </span>
          </button>

          <button
            onClick={() => handleSelectTab('export')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Bioestatística & Exportar</span>
          </button>
        </div>

        {/* ABA 1: PRONTUÁRIOS & ATENDIMENTO CLÍNICO */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {/* Aviso Sutil de Mascaramento se Avaliador Cego */}
            {isBlindedUser && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-amber-900 shadow-2xs">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Modo Avaliador Cego Ativo ({currentUser?.name || currentUser?.email}):</strong> Os grupos de intervenção (Gel A vs Gel B) e respostas subjetivas permanecem mascarados conforme diretrizes CONSORT.
                </span>
              </div>
            )}

            {/* Métricas Compactas de Atendimento (Cards com Altura e Hierarquia Rigorosamente Padronizadas) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Ativos no Estudo */}
              <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-slate-200/90 p-4 flex flex-col justify-between h-[96px] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ativos no Estudo</span>
                  <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">{approvedList.length}</div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">Participantes no protocolo</p>
                </div>
              </div>

              {/* Card 2: Retornos Clínicos */}
              <div className={`rounded-2xl shadow-card hover:shadow-card-hover border p-4 flex flex-col justify-between h-[96px] transition-all ${
                overdueVisits.length > 0
                  ? 'bg-red-50/40 border-red-200'
                  : dueNowVisits.length > 0
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white border-slate-200/90'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retornos Clínicos</span>
                  <div className={`p-1.5 rounded-xl border ${
                    overdueVisits.length > 0
                      ? 'bg-red-100 text-red-700 border-red-200 animate-pulse'
                      : dueNowVisits.length > 0
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {overdueVisits.length > 0 ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : dueNowVisits.length > 0 ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">
                    {overdueVisits.length + dueNowVisits.length}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    {overdueVisits.length > 0 ? `${overdueVisits.length} atrasado(s)` : ''}
                    {overdueVisits.length > 0 && dueNowVisits.length > 0 ? ' • ' : ''}
                    {dueNowVisits.length > 0 ? `${dueNowVisits.length} na janela` : ''}
                    {overdueVisits.length === 0 && dueNowVisits.length === 0 ? 'Todos os retornos em dia' : ''}
                  </p>
                </div>
              </div>

              {/* Card 3: Protocolos Concluídos */}
              <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-slate-200/90 p-4 flex flex-col justify-between h-[96px] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protocolos Concluídos</span>
                  <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600 leading-none">{allCompletedVisits.length}</div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">Sessões finalizadas</p>
                </div>
              </div>

              {/* Card 4: Próximos Retornos */}
              <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-slate-200/90 p-4 flex flex-col justify-between h-[96px] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próximos Retornos</span>
                  <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">{upcomingVisits.length}</div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">Dentro da janela futura</p>
                </div>
              </div>
            </div>

            {/* Alerta de Retornos que Demandam Ação */}
            {(overdueVisits.length > 0 || dueNowVisits.length > 0) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-amber-900">
                    <strong>Atenção de Janela Clínica:</strong> {overdueVisits.length > 0 && `${overdueVisits.length} consulta(s) com prazo estourado.`}{' '}
                    {dueNowVisits.length > 0 && `${dueNowVisits.length} consulta(s) dentro da janela regulatória de retorno.`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === 'PENDING' ? 'ALL' : 'PENDING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                    activeFilter === 'PENDING'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                  }`}
                >
                  {activeFilter === 'PENDING' ? 'Mostrar Todos os Participantes' : 'Filtrar Apenas Retornos Pendentes'}
                </button>
              </div>
            )}

            {/* Lista Principal de Prontuários no Formato Tabela Padronizada */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
              {/* Barra Superior de Filtros e Busca Rápida (Segmented Control + Busca) */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1">
                    <button
                      onClick={() => setActiveFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        activeFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos ({approvedList.length})
                    </button>
                    <button
                      onClick={() => setActiveFilter('PENDING')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        activeFilter === 'PENDING'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Retornos Pendentes</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        activeFilter === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-slate-300 text-slate-700'
                      }`}>
                        {overdueVisits.length + dueNowVisits.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveFilter('COMPLETED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        activeFilter === 'COMPLETED'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Concluídos</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        activeFilter === 'COMPLETED' ? 'bg-emerald-800 text-white' : 'bg-slate-300 text-slate-700'
                      }`}>
                        {allCompletedVisits.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Caixa de Busca */}
                <div className="relative min-w-[220px] sm:max-w-xs w-full">
                  <input
                    type="text"
                    placeholder="Buscar código, nome ou WhatsApp..."
                    value={activeSearch}
                    onChange={(e) => setActiveSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  {activeSearch && (
                    <button
                      onClick={() => setActiveSearch('')}
                      className="absolute right-2 top-1.5 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 text-xs rounded-full hover:bg-slate-100"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Tabela ou Estado Vazio */}
              {approvedList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Nenhum participante ativo ainda.</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Acesse a aba <strong>Triagem & Critérios</strong> para avaliar candidatos e aprovar participantes no estudo.
                  </p>
                  {pendingList.length > 0 && (
                    <button
                      onClick={() => handleSelectTab('triage')}
                      className="mt-4 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center space-x-1.5 shadow-xs"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Acessar Fila de Triagem ({pendingList.length} aguardando)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[320px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 h-10">
                        <th className="py-2.5 px-4 min-w-[200px]">Participante</th>
                        <th className="py-2.5 px-3 min-w-[110px]">Grupo</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Sessões</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Status da Janela</th>
                        <th className="py-2.5 px-4 text-right min-w-[240px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredApprovedList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            Nenhum participante encontrado com os filtros atuais.
                          </td>
                        </tr>
                      ) : (
                        filteredApprovedList.map((part) => {
                          const sessionCount = part.sessions?.length || 0;
                          const windows = calculateSessionWindows(part, studyProtocol);
                          const next = windows.nextStatus;

                          return (
                            <tr key={part.id} className="hover:bg-slate-50/80 transition-colors h-[64px]">
                              {/* 1. Identificação do Participante */}
                              <td className="py-2.5 px-4 align-middle whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => openPatientDossier(part)}
                                    className="w-[72px] h-[22px] flex items-center justify-center px-1.5 bg-slate-900 hover:bg-blue-700 text-white text-[11px] font-mono font-bold rounded whitespace-nowrap shrink-0 shadow-2xs transition cursor-pointer"
                                    title="Abrir Prontuário Clínico Completo"
                                  >
                                    {part.researchCode}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openPatientDossier(part)}
                                    className="font-bold text-slate-900 hover:text-blue-600 text-xs truncate max-w-[150px] inline-block text-left transition cursor-pointer"
                                    title={`Abrir Prontuário / Ficha de ${part.patient.fullName}`}
                                  >
                                    {part.patient.fullName}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditPatient(part)}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition shrink-0"
                                    title="Editar dados cadastrais do paciente"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1.5 truncate max-w-[230px]">
                                  <span>{part.patient.biologicalSex}</span>
                                  <span>•</span>
                                  <span>{part.patient.phoneWhatsApp}</span>
                                </div>
                              </td>

                              {/* 2. Grupo de Alocação (Tratamento para não quebrar linha) */}
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                <div className="flex items-center space-x-1.5">
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[125px] inline-block whitespace-nowrap"
                                    title={part.group || 'Pendente'}
                                  >
                                    {isBlindedUser ? (
                                      <span className="flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                                        <span>Oculto</span>
                                      </span>
                                    ) : (
                                      part.group || 'Pendente'
                                    )}
                                  </span>
                                  {!isBlindedUser && (
                                    <button
                                      onClick={() => handleOpenAllocation(part)}
                                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline shrink-0 whitespace-nowrap"
                                    >
                                      {part.group ? 'Alterar' : 'Alocar'}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* 3. Indicadores de Sessões Clínicas (Todos 28x28px Perfeitos) */}
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  {studyProtocol.sessions.map((sess) => {
                                    const num = sess.sessionNumber;
                                    const done = part.sessions?.some((s) => s.sessionNumber === num);
                                    const isCurrent = next && next.sessionNumber === num;
                                    return (
                                      <button
                                        key={num}
                                        type="button"
                                        onClick={() => openSessionEditor(part, num)}
                                        className={`w-7 h-7 rounded text-[10px] font-bold font-mono transition-all inline-flex items-center justify-center shrink-0 ${
                                          done
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                            : isCurrent
                                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-500 hover:bg-blue-100'
                                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                                        }`}
                                        title={`${sess.name} (${sess.durationMinutes} min) - ${
                                          done ? 'Realizada (clique para ver/editar)' : 'Pendente (clique para registrar)'
                                        }`}
                                      >
                                        {done ? (
                                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                        ) : (
                                          <span>S{num}</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* 4. Status da Janela de Retorno (Badge de Altura Fixa h-7.5) */}
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                {windows.overallAlert === 'OVERDUE' && next && (
                                  <span className="h-7.5 px-2.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                    <span>{next.config.shortName} atrasada (+{next.daysDiff}d)</span>
                                  </span>
                                )}
                                {windows.overallAlert === 'DUE_NOW' && next && (
                                  <span className="h-7.5 px-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>{next.config.shortName} na janela ({next.daysDiff}d)</span>
                                  </span>
                                )}
                                {windows.overallAlert === 'UPCOMING' && next && (
                                  <span className="h-7.5 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span>{next.config.shortName} em {next.daysDiff}d</span>
                                  </span>
                                )}
                                {windows.overallAlert === 'COMPLETED' && (
                                  <span className="h-7.5 px-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{studyProtocol.sessions.length}/{studyProtocol.sessions.length} Concluído</span>
                                  </span>
                                )}
                                {windows.overallAlert === 'WAITING_S1' && (
                                  <span className="h-7.5 px-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Aguardando S1</span>
                                  </span>
                                )}
                              </td>

                              {/* 5. Ações Clínicas Padronizadas & Compactas */}
                              <td className="py-2.5 px-4 align-middle text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {/* Botão Primário: Registrar Atendimento ou Concluído */}
                                  {next ? (
                                    <button
                                      type="button"
                                      onClick={() => openSessionEditor(part, next.sessionNumber)}
                                      className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
                                      title={`Registrar atendimento clínico de ${next.config.name}`}
                                    >
                                      <Stethoscope className="w-3.5 h-3.5" />
                                      <span>Registrar {next.config.shortName}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTimelineParticipant(part);
                                        setShowTimelineModal(true);
                                      }}
                                      className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-2xs shrink-0"
                                      title="Ver histórico completo das sessões"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Concluído (4/4)</span>
                                    </button>
                                  )}

                                  {/* Prontuário / Ficha Completa */}
                                  <button
                                    type="button"
                                    onClick={() => openPatientDossier(part)}
                                    className="h-8 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                                    title="Abrir Prontuário e Ficha Clínica Completa (Anamnese, Odontograma e Histórico)"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Ficha</span>
                                  </button>

                                  {/* WhatsApp / Agendamento */}
                                  {next && (windows.overallAlert === 'OVERDUE' || windows.overallAlert === 'DUE_NOW') ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openWhatsAppAppointment(
                                          part.patient.phoneWhatsApp,
                                          part.researchCode,
                                          part.patient.fullName,
                                          next.config.name,
                                          next.windowStart,
                                          next.windowEnd
                                        )
                                      }
                                      className="h-8 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1 shadow-2xs shrink-0"
                                      title={`Agendar retorno ${next.config.name} no WhatsApp`}
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span>Agendar</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openWhatsApp(part.patient.phoneWhatsApp, part.researchCode)}
                                      className="h-8 w-8 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg transition inline-flex items-center justify-center shadow-2xs shrink-0 cursor-pointer"
                                      title="Conversar no WhatsApp com o participante"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                    </button>
                                  )}

                                  {/* Menu Dropdown de Mais Opções (eCRF, Portal, TCLE, Histórico, Edição) */}
                                  <div className="relative row-actions-dropdown">
                                    <button
                                      type="button"
                                      onClick={() => setActiveRowMenu(activeRowMenu === part.id ? null : part.id)}
                                      className={`h-8 w-8 rounded-lg border transition inline-flex items-center justify-center shadow-2xs shrink-0 cursor-pointer ${
                                        activeRowMenu === part.id
                                          ? 'bg-slate-200 text-slate-800 border-slate-300'
                                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}
                                      title="Mais opções do participante"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>

                                    {activeRowMenu === part.id && (
                                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs text-left animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                          Mais Opções
                                        </div>

                                        {/* eCRF */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveRowMenu(null);
                                            handleOpenResponses(part);
                                          }}
                                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 transition cursor-pointer"
                                        >
                                          <span className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Questionários (eCRF)</span>
                                          </span>
                                          <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                              (part.responses?.length || 0) > 0
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-slate-100 text-slate-500'
                                            }`}
                                          >
                                            {part.responses?.length || 0}
                                          </span>
                                        </button>

                                        {/* Portal do Paciente */}
                                        <a
                                          href={`/paciente?code=${part.researchCode}&projectId=${project.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => setActiveRowMenu(null)}
                                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Portal do Paciente</span>
                                        </a>

                                        {/* TCLE Oficial PDF */}
                                        <Link
                                          href={`/tcle/${part.id}/pdf`}
                                          target="_blank"
                                          onClick={() => setActiveRowMenu(null)}
                                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition"
                                        >
                                          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Baixar TCLE (PDF)</span>
                                        </Link>

                                        {/* Linha do Tempo */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveRowMenu(null);
                                            setTimelineParticipant(part);
                                            setShowTimelineModal(true);
                                          }}
                                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 transition cursor-pointer"
                                        >
                                          <span className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Linha do Tempo</span>
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            {sessionCount}/4
                                          </span>
                                        </button>

                                        {/* Editar Dados */}
                                        <div className="border-t border-slate-100 mt-1 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveRowMenu(null);
                                              handleOpenEditPatient(part);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition cursor-pointer"
                                          >
                                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Editar Cadastro</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: TRIAGEM & CRITÉRIOS CLÍNICOS */}
        {activeTab === 'triage' && (
          <div className="space-y-6">
            {/* Banner de Contexto de Triagem */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <ClipboardList className="w-5 h-5 text-indigo-700 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Triagem de Candidatos & Validação de Critérios Clínicos
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Admissão de voluntários e verificação dos critérios de inclusão/exclusão. A inclusão no estudo exige o preenchimento obrigatório da <strong>Ficha & Anamnese Clínica</strong> e a assinatura do <strong>TCLE Digital</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowNewPatientModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Candidato</span>
              </button>
            </div>

            {/* Métricas de Triagem */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex items-center">
                <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
                  <Users className="w-5 h-5" />
                </div>
                <div className="ml-3.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Inscritos</p>
                  <p className="text-2xl font-black text-slate-900">{project.participants.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex items-center">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="ml-3.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Triagem</p>
                  <p className="text-2xl font-black text-slate-900">{pendingList.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex items-center">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="ml-3.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ficha Preenchida</p>
                  <p className="text-2xl font-black text-slate-900">{pendingList.filter(p => p.anamnesisDone).length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex items-center">
                <div className="p-3 rounded-xl bg-red-50 text-red-700">
                  <X className="w-5 h-5" />
                </div>
                <div className="ml-3.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Excluídos na Triagem</p>
                  <p className="text-2xl font-black text-slate-900">{excludedList.length}</p>
                </div>
              </div>
            </div>

            {/* Fila de Triagem com Trava de Anamnese Obrigatória */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Fila de Triagem & Elegibilidade</h3>
                  <p className="text-xs text-slate-500">
                    A inclusão na pesquisa é desbloqueada após a validação clínica dos critérios na ficha do estudo.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                  {pendingList.length} aguardando
                </span>
              </div>

              <div className="flex-1">
                {pendingList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Nenhum voluntário aguardando triagem neste momento.</p>
                    <p className="text-xs text-slate-400 mt-1">Clique em "Cadastrar Candidato" acima para incluir um novo paciente na fila.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Candidato</th>
                          <th className="py-2.5 px-3">Contato & Triagem</th>
                          <th className="py-2.5 px-3 text-center">Ficha Clínica</th>
                          <th className="py-2.5 px-3 text-center">Documentos</th>
                          <th className="py-2.5 px-4 text-right">Elegibilidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {pendingList.map((part) => {
                          const isAnamnesisDone = Boolean(part.anamnesisDone);

                          return (
                            <tr key={part.id} className="hover:bg-slate-50/70 transition">
                              {/* Coluna 1: Código & Nome */}
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => openPatientDossier(part)}
                                    className="px-2 py-0.5 bg-slate-900 hover:bg-blue-700 text-white font-mono font-bold text-[11px] rounded shadow-2xs transition cursor-pointer"
                                    title="Abrir Prontuário Clínico Completo"
                                  >
                                    {part.researchCode}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openPatientDossier(part)}
                                    className="font-bold text-slate-900 hover:text-blue-600 text-xs sm:text-sm text-left transition cursor-pointer"
                                    title={`Abrir Prontuário / Ficha de ${part.patient?.fullName || 'Paciente'}`}
                                  >
                                    {part.patient?.fullName || 'Paciente'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditPatient(part)}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                                    title="Editar dados cadastrais"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              {/* Coluna 2: Contato, Sexo & Queixa */}
                              <td className="py-2.5 px-3">
                                <div className="text-[11px] leading-tight">
                                  <span className="font-semibold text-slate-700">{part.patient?.phoneWhatsApp || 'Sem telefone'}</span>
                                  <span className="text-slate-400"> • {part.patient?.biologicalSex || 'N/I'}</span>
                                  {(part.patient?.chiefComplaint || part.patient?.allergies) && (
                                    <p
                                      className="text-[10px] text-slate-500 truncate max-w-[240px] mt-0.5"
                                      title={`Queixa: ${part.patient?.chiefComplaint || 'N/I'} | Alergias: ${part.patient?.allergies || 'Nenhuma'}`}
                                    >
                                      Qx: {part.patient?.chiefComplaint || 'N/I'} • Alerg: {part.patient?.allergies || 'Nenhuma'}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Coluna 3: Ficha Clínica */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="inline-flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isAnamnesisDone) {
                                        openPatientDossier(part);
                                      } else {
                                        openAnamnesisModal(part);
                                      }
                                    }}
                                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                      isAnamnesisDone
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    }`}
                                    title={isAnamnesisDone ? 'Ver Prontuário Clínico Completo' : 'Preencher Ficha Clínica Obrigatória'}
                                  >
                                    {isAnamnesisDone ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>Ficha Ok</span>
                                      </>
                                    ) : (
                                      <>
                                        <ClipboardList className="w-3 h-3 text-blue-600 shrink-0" />
                                        <span>Preencher</span>
                                      </>
                                    )}
                                  </button>
                                  {isAnamnesisDone && (
                                    <button
                                      type="button"
                                      onClick={() => openAnamnesisModal(part)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition cursor-pointer"
                                      title="Editar respostas da anamnese e odontograma"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Coluna 4: TCLE e PDF */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="inline-flex items-center space-x-1">
                                  <Link
                                    href={`/tcle/${part.id}`}
                                    target="_blank"
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-bold transition inline-flex items-center space-x-1"
                                    title="Abrir TCLE Digital"
                                  >
                                    <FileText className="w-3 h-3 text-indigo-600" />
                                    <span>TCLE</span>
                                  </Link>

                                  <Link
                                    href={`/tcle/${part.id}/pdf`}
                                    target="_blank"
                                    className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-bold transition inline-flex items-center space-x-1"
                                    title="Baixar via PDF"
                                  >
                                    <FileText className="w-3 h-3 text-slate-500" />
                                    <span>PDF</span>
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditPatient(part)}
                                    className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-bold transition inline-flex items-center space-x-1"
                                    title="Editar dados cadastrais"
                                  >
                                    <Edit className="w-3 h-3 text-slate-500" />
                                    <span>Editar</span>
                                  </button>
                                </div>
                              </td>

                              {/* Coluna 5: Decisão de Elegibilidade */}
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center space-x-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(part.id)}
                                    disabled={!isAnamnesisDone}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1 ${
                                      isAnamnesisDone
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer'
                                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                    }`}
                                    title={
                                      isAnamnesisDone
                                        ? `Confirmar inclusão do participante ${part.researchCode}`
                                        : 'Preencha a ficha clínica antes de incluir'
                                    }
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Incluir</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenReject(part)}
                                    className="px-2 py-1 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition inline-flex items-center space-x-1"
                                    title="Excluir candidato da pesquisa"
                                  >
                                    <X className="w-3.5 h-3.5 text-red-600" />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

                {/* ABA: TRILHA DE AUDITORIA REGULATÓRIA GCP (ICH-GCP E6 & 21 CFR PART 11) */}
        {activeTab === 'audit' && isAdmin && (() => {
          const allLogs = project.auditLogs || [];

          const filteredLogs = allLogs.filter((log) => {
            const matchesEntity = (() => {
              if (auditEntityFilter === 'ALL') return true;
              const type = (log.entityType || '').toLowerCase();
              const filter = auditEntityFilter.toLowerCase();
              if (filter === 'participant') return type.includes('participant');
              if (filter === 'session') return type.includes('session');
              if (filter === 'consent_signature') return type.includes('consent') || type.includes('signature');
              if (filter === 'project') return type.includes('project');
              return type === filter;
            })();
            const term = auditSearch.trim().toLowerCase();
            if (!term) return matchesEntity;
            const matchesSearch =
              log.action.toLowerCase().includes(term) ||
              log.changedBy.toLowerCase().includes(term) ||
              log.reason.toLowerCase().includes(term) ||
              log.fieldName.toLowerCase().includes(term) ||
              log.entityId.toLowerCase().includes(term);
            return matchesEntity && matchesSearch;
          });

          return (
            <div className="space-y-6">
              {/* Banner de Contexto de Auditoria */}
              <div className="bg-gradient-to-r from-indigo-50 to-slate-100 border border-indigo-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-700 shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Trilha de Auditoria Regulatória (ICH-GCP E6 & 21 CFR Part 11)
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                      Registro contínuo e imutável de todas as modificações no ensaio clínico: assinaturas de TCLE, alocações de grupos, edições de prontuário, resoluções de alertas e justificativas clínicas obrigatórias.
                    </p>
                  </div>
                </div>

                <button
                  onClick={exportAuditLogsToCSV}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0"
                  title="Exportar trilha completa em CSV para auditoria e submissão ao CEP"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Trilha (.CSV)</span>
                </button>
              </div>

              {/* Filtros e Busca de Auditoria */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por pesquisador, justificativa, campo ou participante..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={auditEntityFilter}
                    onChange={(e) => setAuditEntityFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Todas as Entidades</option>
                    <option value="PARTICIPANT">Participantes & Status</option>
                    <option value="SESSION">Sessões Clínicas</option>
                    <option value="CONSENT_SIGNATURE">Assinaturas TCLE/TALE</option>
                    <option value="PROJECT">Projeto / Equipe</option>
                  </select>
                </div>

                <span className="text-xs text-slate-400 shrink-0">
                  {filteredLogs.length} registro(s) encontrado(s)
                </span>
              </div>

              {/* Tabela de Trilha de Auditoria */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Data / Hora</th>
                        <th className="p-3.5">Ação</th>
                        <th className="p-3.5">Entidade</th>
                        <th className="p-3.5">Pesquisador</th>
                        <th className="p-3.5">Campo Alterado</th>
                        <th className="p-3.5">Valor Anterior → Novo</th>
                        <th className="p-3.5">Justificativa Clínica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            Nenhum registro de auditoria encontrado para os critérios pesquisados.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono">
                              {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.action.includes('RESOLV')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.action.includes('SIGN') || log.action.includes('TCLE')
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : log.action.includes('CREATE') || log.action.includes('INCLUS')
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap font-mono text-slate-600">
                              {log.entityType}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="font-bold text-slate-800 block">{log.changedBy}</span>
                              <span className="text-[10px] text-slate-400 block">{log.userEmail}</span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap font-mono font-semibold text-slate-700">
                              {log.fieldName}
                            </td>
                            <td className="p-3.5 text-slate-600 max-w-xs truncate">
                              {log.oldValue ? <span className="line-through text-slate-400 mr-1">{log.oldValue}</span> : null}
                              {log.newValue ? <span className="font-bold text-slate-800">{log.newValue}</span> : '-'}
                            </td>
                            <td className="p-3.5 text-slate-700 max-w-sm">
                              <span className="line-clamp-2" title={log.reason}>
                                {log.reason}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ABA 3: FLUXOGRAMA CONSORT 2010 & EXCLUÍDOS */}
        {activeTab === 'consort' && (
          <div className="space-y-6">
            {/* Banner de Contexto Metodológico */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <BarChart3 className="w-5 h-5 text-emerald-800 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-emerald-950">
                    Fluxograma CONSORT 2010 & Auditoria Ética (CEP/CONEP)
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Rastreabilidade metodológica exigida para publicações científicas de ensaios clínicos randomizados. Registre o fluxo completo de elegibilidade, inclusão, acompanhamento longitudinal e justificativas de exclusão.
                  </p>
                </div>
              </div>
            </div>

            {/* Diagrama Visual das 4 Fases do CONSORT */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fase 1: Recrutamento / Triagem */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Fase 1: Triagem</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px] font-bold">Enrollment</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2">Avaliados p/ Elegibilidade</h4>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="flex justify-between">
                      <span>Inscritos totais:</span>
                      <strong className="text-slate-900 font-mono text-sm">{project.participants.length}</strong>
                    </p>
                    <p className="flex justify-between text-red-600">
                      <span>Excluídos na triagem:</span>
                      <strong className="font-mono text-sm">{excludedList.length}</strong>
                    </p>
                    <p className="flex justify-between text-amber-700">
                      <span>Aguardando triagem:</span>
                      <strong className="font-mono text-sm">{pendingList.length}</strong>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Critérios validados via Ficha Odontológica
                </div>
              </div>

              {/* Fase 2: Alocação / Randomização */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Fase 2: Alocação</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[11px] font-bold">Allocation</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2">Randomizados & Ativos</h4>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="flex justify-between">
                      <span>Total incluídos:</span>
                      <strong className="text-slate-900 font-mono text-sm">{approvedList.length}</strong>
                    </p>
                    <p className="flex justify-between text-indigo-600">
                      <span>Desenho do estudo:</span>
                      <strong className="font-mono text-xs">Boca Dividida</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Intervenções aplicadas bilateralmente (hemi-arcada D vs E)
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  TCLE assinado & código gerado
                </div>
              </div>

              {/* Fase 3: Seguimento Longitudinal */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Fase 3: Seguimento</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold">Follow-Up</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2">Presença por Sessão</h4>
                  <div className="space-y-1.5 text-xs text-slate-600 font-mono">
                    <p className="flex justify-between">
                      <span className="font-sans">S1 (Baseline):</span>
                      <strong>{approvedList.filter(p => p.sessions?.some(s => s.sessionNumber === 1)).length}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-sans">S2 (7 dias):</span>
                      <strong>{approvedList.filter(p => p.sessions?.some(s => s.sessionNumber === 2)).length}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-sans">R14d (14 dias):</span>
                      <strong>{approvedList.filter(p => p.sessions?.some(s => s.sessionNumber === 3)).length}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-sans">R30d (30 dias):</span>
                      <strong>{approvedList.filter(p => p.sessions?.some(s => s.sessionNumber === 4)).length}</strong>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-sans">
                  Tolerâncias regulatórias monitoradas
                </div>
              </div>

              {/* Fase 4: Análise / Conclusão */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Fase 4: Análise</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[11px] font-bold">Analysis</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2">Desfecho Completo</h4>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="flex justify-between text-emerald-700">
                      <span>Protocolo completo (4/4):</span>
                      <strong className="font-mono text-sm">{allCompletedVisits.length}</strong>
                    </p>
                    <p className="flex justify-between text-blue-700">
                      <span>Em andamento:</span>
                      <strong className="font-mono text-sm">{approvedList.length - allCompletedVisits.length}</strong>
                    </p>
                    <p className="flex justify-between text-slate-500">
                      <span>Perdas de seguimento:</span>
                      <strong className="font-mono text-sm">0</strong>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Exportação estatística (.CSV) liberada
                </div>
              </div>
            </div>

            {/* Tabela de Excluídos com Motivo */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Registro Oficial de Candidatos Excluídos ({excludedList.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Justificativas clínicas arquivadas para comprovação e prestação de contas aos comitês éticos (CEP/CONEP).
                  </p>
                </div>
              </div>

              {excludedList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Nenhum paciente excluído na triagem deste estudo até o momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Código</th>
                        <th className="p-4">Candidato(a)</th>
                        <th className="p-4">WhatsApp</th>
                        <th className="p-4">Justificativa Regulatória da Exclusão</th>
                        <th className="p-4 text-right">Prontuário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {excludedList.map((part) => (
                        <tr key={part.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-4 font-mono font-bold text-slate-800">
                            <button
                              type="button"
                              onClick={() => openPatientDossier(part)}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-blue-700 text-white font-mono font-bold text-[11px] rounded shadow-2xs transition cursor-pointer"
                              title="Abrir Prontuário Clínico Completo"
                            >
                              {part.researchCode}
                            </button>
                          </td>
                          <td className="p-4 font-bold text-slate-900">
                            <button
                              type="button"
                              onClick={() => openPatientDossier(part)}
                              className="font-bold text-slate-900 hover:text-blue-600 text-xs sm:text-sm text-left transition cursor-pointer"
                              title={`Abrir Prontuário / Ficha de ${part.patient.fullName}`}
                            >
                              {part.patient.fullName}
                            </button>
                          </td>
                          <td className="p-4 text-slate-500 font-mono">
                            {part.patient.phoneWhatsApp}
                          </td>
                          <td className="p-4">
                            <span className="inline-block px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium">
                              {part.exclusionReason || 'Critério de exclusão odontológico / desistência'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => openPatientDossier(part)}
                              className="h-7 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1 cursor-pointer"
                              title="Ver prontuário e ficha preenchida deste candidato excluído"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                              <span>Ver Ficha</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: EQUIPE DO ESTUDO & CEGAMENTO */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            
            {/* Banner Educativo Metodológico */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-blue-900">
                    Controle Metodológico de Cegamento (Blinding)
                  </h3>
                  <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                    Em ensaios clínicos randomizados de boca dividida (split-mouth), os avaliadores que medem a cor ou examinam o paciente 
                    <strong> nunca devem saber qual gel ou grupo foi aplicado em qual lado</strong>. 
                    Membros marcados como <strong>'Avaliador Cego'</strong> verão os grupos alocados como <span className="font-mono bg-blue-100 px-1 py-0.5 rounded font-bold inline-flex items-center"><Lock className="w-3 h-3 mr-1 inline" />OCULTO</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Cabeçalho da Lista de Membros */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Membros e Pesquisadores do Projeto</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gerencie quem faz parte do estudo, funções e quem deve ser cegado.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Pesquisador</span>
                </button>
              </div>

              {/* Tabela de Membros da Equipe */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">Pesquisador(a)</th>
                      <th className="p-4">Função no Estudo</th>
                      <th className="p-4">Status de Cegamento</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(project.members || []).map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-sm">{member.user.name}</p>
                          <p className="text-slate-400 text-xs">{member.user.email}</p>
                        </td>

                        <td className="p-4">
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                            className="border border-slate-300 rounded-lg p-1.5 text-xs font-semibold text-slate-700 bg-white"
                          >
                            <option value="COORDINATOR">Coordenador</option>
                            <option value="CO_ADVISOR">Co-orientador</option>
                            <option value="OPERATOR">Operador</option>
                            <option value="EVALUATOR">Avaliador</option>
                          </select>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => handleToggleBlinded(member.id, member.isBlinded)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition ${
                              member.isBlinded
                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Clique para alternar o status de cegamento deste pesquisador"
                          >
                            {member.isBlinded ? (
                              <EyeOff className="w-3.5 h-3.5 text-purple-700" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{member.isBlinded ? 'Avaliador Cego (Ativo)' : 'Não Cego (Visualiza Grupos)'}</span>
                          </button>
                        </td>

                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-500 hover:text-red-700 font-semibold p-1 hover:bg-red-50 rounded"
                            title="Remover pesquisador do projeto"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}


        {/* ABA 3: RESULTADOS E EXPORTAÇÃO DE DADOS (.CSV) */}
        {activeTab === 'export' && (() => {
          const allSessions = project.participants.flatMap((p) => p.sessions || []);
          const s1Sessions = allSessions.filter((s) => s.sessionNumber === 1);
          const s2Sessions = allSessions.filter((s) => s.sessionNumber === 2);
          const r14Sessions = allSessions.filter((s) => s.sessionNumber === 3);
          const r30Sessions = allSessions.filter((s) => s.sessionNumber === 4);

          const calcPainStats = (sessions: ClinicalSession[], field: 'painScore0h' | 'painScore1h' | 'painScore24h' | 'painScore48h') => {
            const valid = sessions
              .map((s) => s[field])
              .filter((v): v is number => typeof v === 'number' && !isNaN(v));
            if (valid.length === 0) return { mean: 0, sd: 0, sem: 0, ci95: 0, n: 0 };
            const sum = valid.reduce((acc, curr) => acc + curr, 0);
            const mean = sum / valid.length;
            const variance = valid.length > 1
              ? valid.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (valid.length - 1)
              : 0;
            const sd = Math.sqrt(variance);
            const sem = valid.length > 0 ? sd / Math.sqrt(valid.length) : 0;
            const ci95 = 1.96 * sem;
            return {
              mean: Number(mean.toFixed(1)),
              sd: Number(sd.toFixed(1)),
              sem: Number(sem.toFixed(2)),
              ci95: Number(ci95.toFixed(1)),
              n: valid.length,
            };
          };

          const s1Pain = {
            h0: calcPainStats(s1Sessions, 'painScore0h'),
            h1: calcPainStats(s1Sessions, 'painScore1h'),
            h24: calcPainStats(s1Sessions, 'painScore24h'),
            h48: calcPainStats(s1Sessions, 'painScore48h'),
          };

          const s2Pain = {
            h0: calcPainStats(s2Sessions, 'painScore0h'),
            h1: calcPainStats(s2Sessions, 'painScore1h'),
            h24: calcPainStats(s2Sessions, 'painScore24h'),
            h48: calcPainStats(s2Sessions, 'painScore48h'),
          };

          // Cálculo de Delta SGU (Unidades da Escala Vita Classical) Boca Dividida com Estatística Pareada
          const deltasR: number[] = [];
          const deltasL: number[] = [];
          const pairedDiffs: number[] = [];

          project.participants.forEach((p) => {
            const s1 = p.sessions?.find((s) => s.sessionNumber === 1);
            const latest = p.sessions?.filter((s) => s.sessionNumber > 1).sort((a, b) => b.sessionNumber - a.sessionNumber)[0];
            if (s1 && latest && s1.shadeRight && latest.shadeRight && s1.shadeLeft && latest.shadeLeft) {
              const sguS1R = getVitaSGU(s1.shadeRight);
              const sguLatR = getVitaSGU(latest.shadeRight);
              const sguS1L = getVitaSGU(s1.shadeLeft);
              const sguLatL = getVitaSGU(latest.shadeLeft);
              if (sguS1R > 0 && sguLatR > 0 && sguS1L > 0 && sguLatL > 0) {
                const dR = sguS1R - sguLatR;
                const dL = sguS1L - sguLatL;
                deltasR.push(dR);
                deltasL.push(dL);
                pairedDiffs.push(dR - dL);
              }
            }
          });

          const deltaCount = deltasR.length;
          const avgDeltaR = deltaCount > 0 ? Number((deltasR.reduce((a, b) => a + b, 0) / deltaCount).toFixed(1)) : 0;
          const avgDeltaL = deltaCount > 0 ? Number((deltasL.reduce((a, b) => a + b, 0) / deltaCount).toFixed(1)) : 0;
          
          const sdDeltaR = deltaCount > 1
            ? Number(Math.sqrt(deltasR.reduce((a, b) => a + Math.pow(b - avgDeltaR, 2), 0) / (deltaCount - 1)).toFixed(1))
            : 0;
          const sdDeltaL = deltaCount > 1
            ? Number(Math.sqrt(deltasL.reduce((a, b) => a + Math.pow(b - avgDeltaL, 2), 0) / (deltaCount - 1)).toFixed(1))
            : 0;

          const meanDiff = deltaCount > 0 ? Number((pairedDiffs.reduce((a, b) => a + b, 0) / deltaCount).toFixed(2)) : 0;
          const sdDiff = deltaCount > 1
            ? Number(Math.sqrt(pairedDiffs.reduce((a, b) => a + Math.pow(b - meanDiff, 2), 0) / (deltaCount - 1)).toFixed(2))
            : 0;

          const peakPainAll = Math.max(
            s1Pain.h0.mean, s1Pain.h1.mean, s1Pain.h24.mean, s1Pain.h48.mean,
            s2Pain.h0.mean, s2Pain.h1.mean, s2Pain.h24.mean, s2Pain.h48.mean
          );

          return (
            <div className="space-y-6">
              {/* Cabeçalho da Aba de Resultados & Central de Exportação Unificada */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Bioestatística & Resultados do Ensaio</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Desfechos clínicos primários (Cinética de Dor EVA e Clareamento ΔSGU Vita) e exportação científica.
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {/* Botão Primário: Exportar Planilha Completa em CSV */}
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                    title="Exportar planilha completa de dados clínicos desidentificados (.CSV)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Dados (.CSV)</span>
                  </button>

                  {/* Dropdown de Exportações Especializadas para Softwares Estatísticos */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition flex items-center space-x-1.5"
                      title="Opções especializadas de exportação (SPSS, R, Prism, Codebook)"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Softwares Estatísticos</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs divide-y divide-slate-100">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Formatos para Pacotes Estatísticos
                        </div>
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => { exportNumericCSV(); setShowExportMenu(false); }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-800">Banco Numérico Codificado</div>
                              <div className="text-[10px] text-slate-400">Variáveis numéricas prontas para SPSS, R e Jamovi</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => { downloadRScript(); setShowExportMenu(false); }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700"
                          >
                            <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-800">Script R (.R)</div>
                              <div className="text-[10px] text-slate-400">Importação, rotulagem de fatores e testes pareados</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => { downloadSPSSScript(); setShowExportMenu(false); }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-red-600 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-800">Syntax IBM SPSS (.SPS)</div>
                              <div className="text-[10px] text-slate-400">Comandos automáticos de rotulagem e análise</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => { downloadGraphPadData(); setShowExportMenu(false); }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700"
                          >
                            <Activity className="w-4 h-4 text-purple-600 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-800">GraphPad Prism (.TXT)</div>
                              <div className="text-[10px] text-slate-400">Delimitado por tabulação pronto para colar</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => { downloadCodebookTxt(); setShowExportMenu(false); }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700"
                          >
                            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-800">Dicionário de Variáveis (Codebook)</div>
                              <div className="text-[10px] text-slate-400">Metadados de codificação e escalas (.txt)</div>
                            </div>
                          </button>
                        </div>

                        {!isBlindedUser && (
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => { exportCadastralToCSV(); setShowExportMenu(false); }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700"
                            >
                              <ClipboardList className="w-4 h-4 text-amber-600 shrink-0" />
                              <div>
                                <div className="font-bold text-amber-900">Cadastro Geral Identificado</div>
                                <div className="text-[10px] text-amber-700">Restrito à coordenação do estudo</div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Indicadores Bioestatísticos Principais */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sessões Realizadas</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{allSessions.length}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">S1: {s1Sessions.length} • S2: {s2Sessions.length} • Ret: {r14Sessions.length + r30Sessions.length}</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clareamento Médio</p>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">
                    +{deltaCount > 0 ? ((avgDeltaR + avgDeltaL) / 2).toFixed(1) : 0} <span className="text-xs font-normal text-slate-400">ΔSGU</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Escala Vita Classical (16 passos)</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pico Médio de Dor</p>
                  <p className="text-xl font-black text-amber-600 mt-0.5">
                    {peakPainAll} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Escala Visual Analógica (EVA)</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxa de Conclusão</p>
                  <p className="text-xl font-black text-blue-600 mt-0.5">
                    {approvedList.length > 0 ? Math.round((allCompletedVisits.length / approvedList.length) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{allCompletedVisits.length} de {approvedList.length} com 4/4 sessões</p>
                </div>
              </div>

              {/* Gráficos Clínicos Comparativos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfico 1: Curva de Sensibilidade Dentinária EVA (0h, 1h, 24h, 48h) com Barras de Erro */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-amber-600" />
                        <h3 className="text-base font-bold text-slate-900">Cinética da Sensibilidade (EVA)</h3>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">Média ± DP (0-10)</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Média ± Desvio Padrão (DP) e Intervalo de Confiança (IC 95%) ao longo de 48 horas pós-clareamento.
                    </p>
                  </div>

                  {allSessions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Nenhuma sessão com registro de sensibilidade ainda.
                    </div>
                  ) : (
                    <div className="mt-6">
                      {/* Gráfico em Barras Comparativas com Barras de Erro */}
                      <div className="flex items-end justify-between h-48 border-b border-slate-200 px-4 pb-2 pt-6">
                        {[
                          { label: '0h (Imed.)', key: 'h0' as const },
                          { label: '1h Pós', key: 'h1' as const },
                          { label: '24h Pós', key: 'h24' as const },
                          { label: '48h Pós', key: 'h48' as const },
                        ].map((tp) => {
                          const v1 = s1Pain[tp.key];
                          const v2 = s2Pain[tp.key];
                          const h1Pct = Math.max(8, (v1.mean / 10) * 100);
                          const h2Pct = Math.max(8, (v2.mean / 10) * 100);

                          return (
                            <div key={tp.key} className="flex flex-col items-center space-y-2 flex-1">
                              <div className="flex items-end space-x-2.5 h-36">
                                {/* Barra S1 com Barra de Erro */}
                                <div className="flex flex-col items-center relative">
                                  <span className="text-[9px] font-black text-blue-700 mb-1" title={`Média: ${v1.mean} ± DP: ${v1.sd} (N=${v1.n})`}>
                                    {v1.mean} <span className="font-normal text-[8px] text-slate-400">±{v1.sd}</span>
                                  </span>
                                  <div className="relative">
                                    <div
                                      style={{ height: `${h1Pct}%` }}
                                      className="w-5 sm:w-8 bg-blue-500 rounded-t-md shadow-xs transition-all"
                                      title={`Sessão 1 (${tp.label}): Média ${v1.mean} ± DP ${v1.sd} | IC95% [${Math.max(0, v1.mean - v1.ci95).toFixed(1)} - ${Math.min(10, v1.mean + v1.ci95).toFixed(1)}]`}
                                    />
                                  </div>
                                </div>

                                {/* Barra S2 com Barra de Erro */}
                                <div className="flex flex-col items-center relative">
                                  <span className="text-[9px] font-black text-indigo-700 mb-1" title={`Média: ${v2.mean} ± DP: ${v2.sd} (N=${v2.n})`}>
                                    {v2.mean} <span className="font-normal text-[8px] text-slate-400">±{v2.sd}</span>
                                  </span>
                                  <div className="relative">
                                    <div
                                      style={{ height: `${h2Pct}%` }}
                                      className="w-5 sm:w-8 bg-indigo-400 rounded-t-md shadow-xs transition-all"
                                      title={`Sessão 2 (${tp.label}): Média ${v2.mean} ± DP ${v2.sd} | IC95% [${Math.max(0, v2.mean - v2.ci95).toFixed(1)} - ${Math.min(10, v2.mean + v2.ci95).toFixed(1)}]`}
                                    />
                                  </div>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-slate-600 text-center">{tp.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Legenda do Gráfico */}
                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs pt-2 border-t border-slate-100">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                            <span className="text-slate-600 font-semibold">1ª Aplicação (S1)</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="w-3 h-3 rounded bg-indigo-400 inline-block" />
                            <span className="text-slate-600 font-semibold">2ª Aplicação (S2)</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">Pico em 1h-24h com remissão em 48h</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 flex items-start space-x-1.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Interpretação Clínica:</strong> O perfil cinético da dor em clareamento reflete a difusão dos radicais livres através dos túbulos dentinários, sensibilizando as fibras nociceptivas A-delta pulpares.</span>
                  </div>
                </div>

                {/* Gráfico 2: Eficácia de Clareamento Dental (Delta SGU - Boca Dividida) */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <h3 className="text-base font-bold text-slate-900">Eficácia Clareadora (ΔSGU Vita)</h3>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">Escala Vita Classical</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Clareamento médio por hemi-arco em unidades da guia Vita (16 passos de B1 a C4).
                    </p>
                  </div>

                  {deltaCount === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Os deltas de cor (ΔSGU) serão calculados assim que as sessões de acompanhamento (S2, 14d ou 30d) forem registradas.
                    </div>
                  ) : (
                    <div className="mt-6 space-y-5">
                      {/* Hemi-arco Direito */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="font-bold text-slate-700">Hemi-arco Direito (13 a 11)</span>
                          <span className="font-mono font-black text-emerald-700 text-sm">
                            +{avgDeltaR} <span className="text-xs text-slate-400 font-normal">± {sdDeltaR} ΔSGU</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200 p-0.5">
                          <div
                            className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (avgDeltaR / 12) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Clareamento médio no quadrante direito (Média ± DP).
                        </span>
                      </div>

                      {/* Hemi-arco Esquerdo */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="font-bold text-slate-700">Hemi-arco Esquerdo (21 a 23)</span>
                          <span className="font-mono font-black text-indigo-700 text-sm">
                            +{avgDeltaL} <span className="text-xs text-slate-400 font-normal">± {sdDeltaL} ΔSGU</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200 p-0.5">
                          <div
                            className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (avgDeltaL / 12) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Clareamento médio no quadrante esquerdo (Média ± DP).
                        </span>
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="text-blue-900 font-semibold block">Diferença Pareada Inter-grupos:</span>
                          <span className="text-[10px] text-blue-700">Teste t Pareado / Wilcoxon Boca Dividida</span>
                        </div>
                        <span className="font-mono font-bold text-blue-900 text-sm">
                          {Math.abs(meanDiff)} ± {sdDiff} ΔSGU
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 flex items-start space-x-1.5">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Padrão de Pesquisa:</strong> A ordem dos 16 tons da Vita Classical por luminosidade é: B1 (1), A1 (2), B2 (3), D2 (4), A2 (5), C1 (6), C2 (7), D4 (8), A3 (9), D3 (10), B3 (11), A3.5 (12), B4 (13), C3 (14), A4 (15), C4 (16).</span>
                  </div>
                </div>

              </div>


              {/* Seção de Questionários Clínicos (eCRFs / PROMs) & Exportação Estatística */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
                  <div>
                    <div className="flex items-center space-x-2">
                      <ClipboardList className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        Questionários Clínicos Eletrônicos (eCRFs / PROMs)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Adesão do paciente (Patient-Reported Outcome Measures) e exportação de matrizes tabulares dedicadas para SPSS, R, Jamovi e GraphPad Prism.
                    </p>
                  </div>

                  <Link
                    href="/construtor"
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>+ Gerenciar Formulários no Construtor</span>
                    <span>→</span>
                  </Link>
                </div>

                {project.forms.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum formulário eCRF cadastrado neste projeto. Crie questionários personalizados no{' '}
                    <Link href="/construtor" className="text-blue-600 underline font-bold">
                      Construtor de Fichas
                    </Link>.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {project.forms.map((form) => {
                      let questionCount = 0;
                      try {
                        const qList = JSON.parse(form.questionsJson || '[]');
                        questionCount = qList.filter((q: any) => q.type !== 'instruction').length;
                      } catch {
                        questionCount = 0;
                      }

                      // Calcular quantos participantes responderam este form
                      const totalApproved = approvedList.length;
                      const respondedCount = project.participants.filter((p) =>
                        p.responses?.some((r) => r.formId === form.id)
                      ).length;
                      const complianceRate = totalApproved > 0 ? Math.round((respondedCount / totalApproved) * 100) : 0;

                      const isPatient = form.description?.includes('Preenchido por: Paciente') ||
                        studyProtocol.forms?.some((f) => f.title.toLowerCase() === form.title.toLowerCase() && f.respondent === 'PATIENT');
                      const freqMatch = form.description?.match(/Frequência:\s*([^|]+)/);
                      const freqLabel = freqMatch ? freqMatch[1].trim() : null;

                      return (
                        <div
                          key={form.id}
                          className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-slate-50/60 transition"
                        >
                          <div className="space-y-1 max-w-xl">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{form.title}</span>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                                {questionCount} {questionCount === 1 ? 'questão' : 'questões'}
                              </span>
                              {isPatient ? (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                  👤 Paciente (PROM)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                  🩺 Pesquisador (eCRF)
                                </span>
                              )}
                              {freqLabel && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                  📅 {freqLabel}
                                </span>
                              )}
                            </div>
                            {form.description && (
                              <p className="text-xs text-slate-500 line-clamp-1">{form.description}</p>
                            )}
                            <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-400">
                              <span>
                                Respostas recebidas:{' '}
                                <strong className="text-slate-700">{respondedCount}</strong> de{' '}
                                <strong className="text-slate-700">{totalApproved}</strong> participantes ativos
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 shrink-0">
                            {/* Barra de Taxa de Adesão */}
                            <div className="w-32 hidden sm:block">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                <span>Adesão</span>
                                <span className={complianceRate === 100 ? 'text-emerald-600' : 'text-slate-700'}>
                                  {complianceRate}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    complianceRate === 100
                                      ? 'bg-emerald-500'
                                      : complianceRate >= 50
                                      ? 'bg-blue-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${complianceRate}%` }}
                                />
                              </div>
                            </div>

                            {/* Botão de Exportação Especializada */}
                            <button
                              type="button"
                              onClick={() => exportFormToCSV(form.id)}
                              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                              title="Exportar planilha CSV com colunas de cada pergunta e escore total pronto para SPSS"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                              </svg>
                              <span>Exportar Matriz (.CSV)</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      </main>

      {/* Modal de Alocação de Randomização / Grupos */}
      {showAllocationModal && allocatingParticipant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center space-x-2 mb-2">
              <Shuffle className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">Alocação de Randomização</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Participante: <strong>{allocatingParticipant.researchCode} - {allocatingParticipant.patient.fullName}</strong>.
              Insira o grupo ou alocação de boca dividida conforme a lista de randomização externa.
            </p>

            <form onSubmit={handleSaveAllocation} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Atalhos Rápidos (Estudo Boca Dividida)
                </label>
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setAllocatedGroupInput('Direita: HP 6% / Esquerda: CP 37%')}
                    className="p-2 border border-slate-200 rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition text-[11px]"
                  >
                    <strong>Opção 1:</strong> Direita: HP 6% / Esquerda: CP 37%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocatedGroupInput('Direita: CP 37% / Esquerda: HP 6%')}
                    className="p-2 border border-slate-200 rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition text-[11px]"
                  >
                    <strong>Opção 2:</strong> Direita: CP 37% / Esquerda: HP 6%
                  </button>
                </div>

                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ou digite a identificação do grupo:
                </label>
                <input
                  type="text"
                  required
                  value={allocatedGroupInput}
                  onChange={(e) => setAllocatedGroupInput(e.target.value)}
                  placeholder="Ex: Grupo A ou Direita: HP 6% / Esquerda: CP 37%"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAllocationModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAllocation}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition disabled:opacity-50"
                >
                  {savingAllocation ? 'Salvando...' : 'Salvar Alocação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Pesquisador à Equipe */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Adicionar Pesquisador ao Estudo</h3>
            <p className="text-xs text-slate-500 mb-5">
              Vincule um pesquisador já cadastrado na plataforma ao protocolo deste projeto.
            </p>

            {memberError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r text-xs text-red-700">
                {memberError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail do Pesquisador ou Aluno
                </label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="exemplo@uepg.br"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Função no Projeto
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="COORDINATOR">Coordenador</option>
                  <option value="CO_ADVISOR">Co-orientador</option>
                  <option value="OPERATOR">Operador</option>
                  <option value="EVALUATOR">Avaliador</option>
                </select>
              </div>

              {/* Caixinha de Cegamento */}
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberBlinded}
                    onChange={(e) => setNewMemberBlinded(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-bold text-purple-900 block text-xs">
                      Pesquisador Cego
                    </span>
                    <span className="text-[11px] text-purple-700">
                      Oculta os grupos alocados deste membro no sistema.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition disabled:opacity-50"
                >
                  {addingMember ? 'Adicionando...' : 'Adicionar à Equipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ficha Clínica e Anamnese Específica do Estudo (Modular & Dinâmico) */}
      {showAnamnesisModal && currentAnamnesisPart && (() => {
        let templateConfig: AnamnesisConfig | null = null;
        if (project.anamnesisTemplate) {
          try {
            templateConfig = JSON.parse(project.anamnesisTemplate);
          } catch (e) {
            console.error('Erro ao ler template da anamnese:', e);
          }
        }

        const isConfigured = Boolean(templateConfig);

        const config: AnamnesisConfig = templateConfig ? {
          enableOdontogram: Boolean(templateConfig.enableOdontogram),
          odontogramScope: templateConfig.odontogramScope || 'full',
          enablePeriodontogram: Boolean(templateConfig.enablePeriodontogram),
          periodontogramFields: templateConfig.periodontogramFields || {
            bleedingOnProbing: true,
            visiblePlaque: true,
            probingDepth: false,
            gingivalRecession: true,
            furcationOrMobility: false,
          },
          questions: Array.isArray(templateConfig.questions) ? templateConfig.questions : [],
        } : {
          enableOdontogram: true,
          odontogramScope: 'full',
          enablePeriodontogram: false,
          periodontogramFields: {
            bleedingOnProbing: true,
            visiblePlaque: true,
            probingDepth: false,
            gingivalRecession: true,
            furcationOrMobility: false,
          },
          questions: [],
        };

        // Checar critérios de exclusão ativados pelas respostas atuais
        const activeExclusions = (config.questions || []).filter(
          (q) =>
            q.isCriterion &&
            q.disqualifyIf &&
            anamnesisData.answers[q.id]?.toLowerCase() === q.disqualifyIf.toLowerCase()
        );

        const teethList =
          config.odontogramScope === 'anterior'
            ? ['13', '12', '11', '21', '22', '23', '33', '32', '31', '41', '42', '43']
            : [
                '18', '17', '16', '15', '14', '13', '12', '11',
                '21', '22', '23', '24', '25', '26', '27', '28',
                '48', '47', '46', '45', '44', '43', '42', '41',
                '31', '32', '33', '34', '35', '36', '37', '38',
              ];

        const vitaShades = [
          'B1', 'A1', 'B2', 'D2', 'A2', 'C1', 'C2', 'D4',
          'A3', 'D3', 'B3', 'A3.5', 'B4', 'C3', 'A4', 'C4'
        ];

        const toothStatusLabels: Record<string, { label: string; bg: string; text: string; border: string }> = {
          HIGIDO: { label: 'Hígido', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
          RESTAURADO: { label: 'Restaurado', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
          CARIE: { label: 'Cárie', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
          FACETA: { label: 'Prótese', bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
          AUSENTE: { label: 'Ausente', bg: 'bg-slate-200', text: 'text-slate-700', border: 'border-slate-300' },
        };

        const cycleToothStatus = (tooth: string) => {
          const current = anamnesisData.odontogram[tooth] || 'HIGIDO';
          const order = ['HIGIDO', 'RESTAURADO', 'CARIE', 'FACETA', 'AUSENTE'];
          const nextIdx = (order.indexOf(current) + 1) % order.length;
          setAnamnesisData({
            ...anamnesisData,
            odontogram: {
              ...anamnesisData.odontogram,
              [tooth]: order[nextIdx],
            },
          });
        };

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full p-4 sm:p-6 border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
              {/* Topo do Modal */}
              <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                      {currentAnamnesisPart.researchCode}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                      <span>Odontograma Anatômico & Ficha Clínica</span>
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Paciente: <strong>{currentAnamnesisPart.patient.fullName}</strong> • Estudo: <em>{project.name}</em>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAnamnesisModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isConfigured && (
                <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-blue-900">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>O Odontograma Interativo está disponível para preenchimento. Para adicionar critérios de exclusão ou perguntas adicionais a este estudo, personalize a ficha.</span>
                  </div>
                  <Link
                    href={`/anamnese?projectId=${project.id}`}
                    className="px-3 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg font-bold shrink-0 transition"
                  >
                    Personalizar Ficha
                  </Link>
                </div>
              )}

              <form onSubmit={handleSaveAnamnesis} className="space-y-6 text-xs">
                {/* Alerta de Critério de Inelegibilidade */}
                {activeExclusions.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                    <div className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-red-500 mr-2 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                          Critério de Inelegibilidade Violado ({activeExclusions.length})
                        </h4>
                        <ul className="text-xs text-red-700 mt-1 list-disc list-inside space-y-0.5">
                          {activeExclusions.map((q) => (
                            <li key={q.id}>
                              <strong>{q.title}</strong>: Resposta marcada indica inelegibilidade ({anamnesisData.answers[q.id]?.toUpperCase()}).
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1. MÓDULO ODONTOGRAMA COM ILUSTRAÇÃO ANATÔMICA (SE HABILITADO) */}
                {config.enableOdontogram && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center">
                          <Stethoscope className="w-4 h-4 text-indigo-600 mr-2 inline" />
                          <span>Mapeamento Anatômico Dental (Odontograma Clínico)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Escopo: {config.odontogramScope === 'anterior' ? 'Dentes Anteriores (13 a 23 e 33 a 43)' : 'Arcada Completa'} • Clique no dente para alterar o status
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowToothSelectorModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Abrir Seletor de Elementos</span>
                      </button>
                    </div>

                    {/* Componente Gráfico com Desenhos Anatômicos dos Dentes */}
                    <OdontogramChart
                      mode="clinical_status"
                      statusMap={anamnesisData.odontogram as Record<string, ToothStatus>}
                      scope={config.odontogramScope || 'full'}
                      allowDeciduous={true}
                      onChangeStatus={(tooth, newStatus) => {
                        setAnamnesisData((prev) => ({
                          ...prev,
                          odontogram: {
                            ...prev.odontogram,
                            [tooth]: newStatus,
                          },
                        }));
                      }}
                    />
                  </div>
                )}

                {/* 2. MÓDULO PERIOGRAMA (SE HABILITADO) */}
                {config.enablePeriodontogram && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center">
                      <Stethoscope className="w-4 h-4 text-blue-600 mr-2 inline" />
                      <span>Exame Periodontal (Periograma)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {config.periodontogramFields.bleedingOnProbing && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <label className="block text-slate-700 font-bold mb-1">
                            Sangramento à Sondagem (SS / BOP):
                          </label>
                          <select
                            value={anamnesisData.periodontogram.bleedingOnProbing || '0-10%'}
                            onChange={(e) =>
                              setAnamnesisData({
                                ...anamnesisData,
                                periodontogram: {
                                  ...anamnesisData.periodontogram,
                                  bleedingOnProbing: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="0-10%">0 - 10% (Baixo Risco / Saudável)</option>
                            <option value="10-25%">10 - 25% (Gengivite Leve a Moderada)</option>
                            <option value=">25%">&gt; 25% (Gengivite Generalizada / Risco Elevado)</option>
                          </select>
                        </div>
                      )}

                      {config.periodontogramFields.visiblePlaque && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <label className="block text-slate-700 font-bold mb-1">
                            Índice de Placa Visível (IPV):
                          </label>
                          <select
                            value={anamnesisData.periodontogram.visiblePlaque || '< 20%'}
                            onChange={(e) =>
                              setAnamnesisData({
                                ...anamnesisData,
                                periodontogram: {
                                  ...anamnesisData.periodontogram,
                                  visiblePlaque: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="< 20%">&lt; 20% (Biofilme Controlado / Adequado)</option>
                            <option value="20-50%">20 - 50% (Biofilme Moderado)</option>
                            <option value="> 50%">&gt; 50% (Higiene Insuficiente / Biofilme Alto)</option>
                          </select>
                        </div>
                      )}

                      {config.periodontogramFields.probingDepth && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <label className="block text-slate-700 font-bold mb-1">
                            Profundidade de Sondagem (PS):
                          </label>
                          <select
                            value={anamnesisData.periodontogram.probingDepth || '≤ 3mm'}
                            onChange={(e) =>
                              setAnamnesisData({
                                ...anamnesisData,
                                periodontogram: {
                                  ...anamnesisData.periodontogram,
                                  probingDepth: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="≤ 3mm">≤ 3mm (Profundidade Fisiológica Normal)</option>
                            <option value="> 3mm">&gt; 3mm (Presença de Bolsa Periodontal Patológica)</option>
                          </select>
                        </div>
                      )}

                      {config.periodontogramFields.gingivalRecession && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <label className="block text-slate-700 font-bold mb-1">
                            Recessão Gengival / Lesão Cervical:
                          </label>
                          <select
                            value={anamnesisData.periodontogram.gingivalRecession || 'Ausente'}
                            onChange={(e) =>
                              setAnamnesisData({
                                ...anamnesisData,
                                periodontogram: {
                                  ...anamnesisData.periodontogram,
                                  gingivalRecession: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="Ausente">Ausente (Sem exposição radicular)</option>
                            <option value="Presente sem sensibilidade">Presente sem sensibilidade</option>
                            <option value="Presente com sensibilidade">Presente com sensibilidade dentinária</option>
                          </select>
                        </div>
                      )}

                      {config.periodontogramFields.furcationOrMobility && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 sm:col-span-2">
                          <label className="block text-slate-700 font-bold mb-1">
                            Envolvimento de Furca & Mobilidade:
                          </label>
                          <select
                            value={anamnesisData.periodontogram.furcationOrMobility || 'Ausente'}
                            onChange={(e) =>
                              setAnamnesisData({
                                ...anamnesisData,
                                periodontogram: {
                                  ...anamnesisData.periodontogram,
                                  furcationOrMobility: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="Ausente">Ausente (Grau 0 - Fisiológico)</option>
                            <option value="Grau 1 (Leve)">Grau 1 (Mobilidade Leve)</option>
                            <option value="Grau 2 ou 3 (Patológica)">Grau 2 ou 3 (Mobilidade Patológica Avançada)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. MÓDULO DE PERGUNTAS E CRITÉRIOS DE ELEGIBILIDADE */}
                {config.questions && config.questions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center">
                      <ClipboardList className="w-4 h-4 text-slate-700 mr-2 inline" />
                      <span>Perguntas de Anamnese & Elegibilidade</span>
                    </h4>

                    <div className="space-y-3">
                      {config.questions.map((q) => {
                        const currentVal = anamnesisData.answers[q.id] || '';
                        const isViolating =
                          q.isCriterion &&
                          q.disqualifyIf &&
                          currentVal.toLowerCase() === q.disqualifyIf.toLowerCase();

                        return (
                          <div
                            key={q.id}
                            className={`p-3.5 rounded-xl border transition ${
                              isViolating
                                ? 'bg-red-50/70 border-red-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <div>
                                <span className="text-slate-800 font-bold">{q.title}</span>
                                {q.required && <span className="text-red-500 ml-1">*</span>}
                              </div>
                              {q.isCriterion && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded shrink-0">
                                  Critério de Exclusão ({q.disqualifyIf?.toUpperCase()})
                                </span>
                              )}
                            </div>

                            {/* Renderização por Tipo */}
                            {q.type === 'boolean' && (
                              <div className="flex space-x-4 pt-1">
                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question_${q.id}`}
                                    value="sim"
                                    checked={currentVal === 'sim'}
                                    onChange={() =>
                                      setAnamnesisData({
                                        ...anamnesisData,
                                        answers: { ...anamnesisData.answers, [q.id]: 'sim' },
                                      })
                                    }
                                  />
                                  <span className="font-bold text-slate-700">Sim</span>
                                </label>

                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question_${q.id}`}
                                    value="nao"
                                    checked={currentVal === 'nao'}
                                    onChange={() =>
                                      setAnamnesisData({
                                        ...anamnesisData,
                                        answers: { ...anamnesisData.answers, [q.id]: 'nao' },
                                      })
                                    }
                                  />
                                  <span className="font-bold text-slate-700">Não</span>
                                </label>
                              </div>
                            )}

                            {q.type === 'vita_shade' && (
                              <div className="pt-1">
                                <select
                                  value={currentVal || 'A2'}
                                  onChange={(e) =>
                                    setAnamnesisData({
                                      ...anamnesisData,
                                      answers: { ...anamnesisData.answers, [q.id]: e.target.value },
                                    })
                                  }
                                  className="w-full sm:w-64 px-3 py-1.5 border border-slate-300 rounded text-xs bg-white font-bold text-slate-800"
                                >
                                  {vitaShades.map((shade) => (
                                    <option key={shade} value={shade}>
                                      Tom {shade} (Escala Vita Classical)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {q.type === 'sensitivity_scale' && (
                              <div className="pt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-semibold">Nível Indicado:</span>
                                  <span className="font-mono font-bold text-blue-700 text-sm">
                                    {Number(currentVal || 0).toFixed(1)} / 10
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={currentVal || '0'}
                                  onChange={(e) =>
                                    setAnamnesisData({
                                      ...anamnesisData,
                                      answers: { ...anamnesisData.answers, [q.id]: parseFloat(parseFloat(e.target.value).toFixed(1)).toString() },
                                    })
                                  }
                                  className="w-full h-2.5 bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                />
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                  <span>0.0 - Sem Sensibilidade</span>
                                  <span>5.0 - Moderada</span>
                                  <span>10.0 - Dor Severa</span>
                                </div>
                              </div>
                            )}

                          {q.type === 'text' && (
                            <input
                              type="text"
                              value={currentVal}
                              onChange={(e) =>
                                setAnamnesisData({
                                  ...anamnesisData,
                                  answers: { ...anamnesisData.answers, [q.id]: e.target.value },
                                })
                              }
                              placeholder="Digite a resposta ou observações..."
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          )}

                          {q.type === 'number' && (
                            <input
                              type="number"
                              value={currentVal}
                              onChange={(e) =>
                                setAnamnesisData({
                                  ...anamnesisData,
                                  answers: { ...anamnesisData.answers, [q.id]: e.target.value },
                                })
                              }
                              className="w-32 px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Anotações Gerais do Examinador */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Parecer do Examinador / Observações Adicionais:
                </label>
                <textarea
                  rows={3}
                  value={anamnesisData.clinicalNotes}
                  onChange={(e) =>
                    setAnamnesisData({ ...anamnesisData, clinicalNotes: e.target.value })
                  }
                  placeholder="Registre impressões clínicas relevantes do exame..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAnamnesisModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={savingAnamnesis}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{savingAnamnesis ? 'Gravando Ficha...' : 'Salvar Ficha Clínica'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    })()}

      {/* Modal Interativo de Seleção de Elementos (ToothSelectorModal) */}
      <ToothSelectorModal
        isOpen={showToothSelectorModal}
        onClose={() => setShowToothSelectorModal(false)}
        title="Selecione os Elementos"
        subtitle={
          currentAnamnesisPart
            ? `Paciente: ${currentAnamnesisPart.patient.fullName} • ${project?.name || ''}`
            : 'Mapeamento Dentário Anátomo-Clínico'
        }
        mode="clinical_status"
        initialStatusMap={anamnesisData.odontogram as Record<string, ToothStatus>}
        onConfirmStatus={(newStatusMap) => {
          setAnamnesisData((prev) => ({
            ...prev,
            odontogram: newStatusMap,
          }));
        }}
      />

      {/* Modal de Exclusão Obrigatória com Motivo */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Excluir Paciente da Pesquisa</h3>
            <p className="text-xs text-slate-500 mt-2">
              Você está excluindo <strong>{selectedParticipant?.patient.fullName}</strong>. Conforme o protocolo do Comitê de Ética, o motivo é obrigatório para as estatísticas de exclusão.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Motivo da Exclusão
              </label>
              <textarea 
                value={exclusionReason}
                onChange={(e) => setExclusionReason(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" 
                rows={3} 
                placeholder="Ex: Alergia a peróxidos, uso de medicação incompatível, recessão gengival severa..."
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmReject}
                disabled={!exclusionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Novo Paciente e Prontuário */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Cadastrar Paciente e Prontuário</h2>
            <p className="text-xs text-slate-500 mb-6">
              Os dados de identificação ficam guardados com segurança e o sistema gera automaticamente o código cego (Ex: P00X) para a pesquisa.
            </p>

            <form onSubmit={handleSaveNewPatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.fullName}
                    onChange={(e) => setNewPatientData({ ...newPatientData, fullName: e.target.value })}
                    placeholder="Nome do paciente"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.cpf}
                    onChange={(e) => setNewPatientData({ ...newPatientData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.phoneWhatsApp}
                    onChange={(e) => setNewPatientData({ ...newPatientData, phoneWhatsApp: e.target.value })}
                    placeholder="(42) 99999-9999"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Data Nascimento</label>
                  <input
                    type="date"
                    required
                    value={newPatientData.dateOfBirth}
                    onChange={(e) => setNewPatientData({ ...newPatientData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Sexo Biológico</label>
                  <select
                    value={newPatientData.biologicalSex}
                    onChange={(e) => setNewPatientData({ ...newPatientData, biologicalSex: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm mb-3">Dados Iniciais de Triagem</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Queixa Principal / Motivo da Consulta</label>
                    <input
                      type="text"
                      value={newPatientData.chiefComplaint}
                      onChange={(e) => setNewPatientData({ ...newPatientData, chiefComplaint: e.target.value })}
                      placeholder="Ex: Quer clarear os dentes para formatura"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Alergias Prévias Relatadas</label>
                    <input
                      type="text"
                      value={newPatientData.allergies}
                      onChange={(e) => setNewPatientData({ ...newPatientData, allergies: e.target.value })}
                      placeholder="Ex: Nenhuma ou Alergia a Penicilina"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Opção para abrir a Ficha Clínica imediatamente */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="openAnamnesisCheck"
                  checked={openAnamnesisAfterCreate}
                  onChange={(e) => setOpenAnamnesisAfterCreate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="openAnamnesisCheck" className="text-xs text-blue-900 font-semibold cursor-pointer">
                  Abrir a ficha clínica e anamnese do projeto imediatamente após salvar
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  disabled={savingPatient}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPatient}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-sm transition flex items-center gap-2"
                >
                  {savingPatient ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Salvando Candidato...
                    </>
                  ) : (
                    'Salvar Paciente'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Dados Cadastrais do Paciente (Audit Trail GCP / ICH E6) */}
      {showEditPatientModal && editingParticipant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Alteração de Dados Cadastrais do Paciente
                  </h3>
                  <p className="text-xs text-slate-500">
                    Código: <strong className="font-mono text-blue-700">{editingParticipant.researchCode}</strong> • Prontuário Central Global
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEditPatientModal(false);
                  setEditingParticipant(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner de Rastreabilidade Regulatória */}
            <div className="mb-5 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Conformidade Ética & Regulatória (GCP / ICH E6 & 21 CFR Part 11):</strong>
                <p className="text-indigo-800 text-[11px] mt-0.5">
                  Cada campo alterado será gravado com valor anterior, novo valor, identificação do pesquisador, endereço IP e data/hora oficial na Trilha de Auditoria.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditPatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatientData.fullName}
                    onChange={(e) => setEditPatientData({ ...editPatientData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatientData.cpf}
                    onChange={(e) => setEditPatientData({ ...editPatientData, cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatientData.phoneWhatsApp}
                    onChange={(e) => setEditPatientData({ ...editPatientData, phoneWhatsApp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={editPatientData.dateOfBirth}
                    onChange={(e) => setEditPatientData({ ...editPatientData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sexo Biológico *
                  </label>
                  <select
                    value={editPatientData.biologicalSex}
                    onChange={(e) => setEditPatientData({ ...editPatientData, biologicalSex: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={editPatientData.email}
                    onChange={(e) => setEditPatientData({ ...editPatientData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={editPatientData.address}
                    onChange={(e) => setEditPatientData({ ...editPatientData, address: e.target.value })}
                    placeholder="Rua, Número, Bairro, Cidade"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Comorbidades
                  </label>
                  <input
                    type="text"
                    value={editPatientData.comorbidities}
                    onChange={(e) => setEditPatientData({ ...editPatientData, comorbidities: e.target.value })}
                    placeholder="Ex: Nenhuma, Hipertensão, Diabetes"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Alergias Prévias
                  </label>
                  <input
                    type="text"
                    value={editPatientData.allergies}
                    onChange={(e) => setEditPatientData({ ...editPatientData, allergies: e.target.value })}
                    placeholder="Ex: Alergia a Dipirona, Nenhuma"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Medicamentos de Uso Contínuo
                  </label>
                  <input
                    type="text"
                    value={editPatientData.medications}
                    onChange={(e) => setEditPatientData({ ...editPatientData, medications: e.target.value })}
                    placeholder="Ex: Anticoncepcional, Anti-hipertensivo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Queixa Principal
                  </label>
                  <input
                    type="text"
                    value={editPatientData.chiefComplaint}
                    onChange={(e) => setEditPatientData({ ...editPatientData, chiefComplaint: e.target.value })}
                    placeholder="Motivo da busca pelo tratamento"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Justificativa Obrigatória para a Trilha de Auditoria (GCP / ICH E6) */}
              <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-1.5">
                <label className="block font-bold text-amber-950 uppercase tracking-wider">
                  Justificativa da Alteração Cadastral (Obrigatório - Trilha de Auditoria GCP) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editPatientReason}
                  onChange={(e) => setEditPatientReason(e.target.value)}
                  placeholder="Descreva detalhadamente o motivo desta alteração: ex. Correção da data de nascimento para 1998-05-14 conforme conferência de RG na consulta presencial..."
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                />
                <p className="text-[10px] text-amber-800">
                  A justificativa é exigida pelas normas de Boas Práticas Clínicas e ficará permanentemente registrada no log de auditoria.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPatientModal(false);
                    setEditingParticipant(null);
                  }}
                  disabled={savingPatientEdit}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPatientEdit || !editPatientReason.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {savingPatientEdit ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando Alterações...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar e Registrar na Auditoria</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Linha do Tempo & Sessões Longitudinais */}
      {showTimelineModal && timelineParticipant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                    {timelineParticipant.researchCode}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Linha do Tempo Clínica (Ensaio Clínico)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Paciente: <strong>{timelineParticipant.patient.fullName}</strong> • Grupo:{' '}
                  <span className="font-semibold text-slate-700">
                    {project.isBlinded ? (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Lock className="w-3 h-3 text-slate-500" /> Oculto (Avaliador Cego)
                      </span>
                    ) : (
                      timelineParticipant.group || 'Aguardando'
                    )}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTimelineModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timeline Steps */}
            <div className="space-y-4">
              {(() => {
                const participantWindows = calculateSessionWindows(timelineParticipant, studyProtocol);

                return studyProtocol.sessions.map((sess) => {
                  const sNum = sess.sessionNumber;
                  const sessionInfo = SESSION_DEFINITIONS[sNum];
                  const session = timelineParticipant.sessions?.find((s) => s.sessionNumber === sNum);
                  const isCompleted = Boolean(session);
                  const winStatus = participantWindows.sessions[sNum];
                  const peakPain = isCompleted
                    ? Math.max(
                        session?.painScore0h || 0,
                        session?.painScore1h || 0,
                        session?.painScore24h || 0,
                        session?.painScore48h || 0
                      )
                    : 0;

                  const titleText = sess.name || sessionInfo?.title || `Sessão ${sNum}`;
                  const subtitleText = sessionInfo?.subtitle || (sess.daysFromPrevious > 0 ? `Intervalo de ${sess.daysFromPrevious} dias da etapa anterior` : 'Atendimento Inicial');

                  return (
                    <div
                      key={sNum}
                      className={`p-4 rounded-xl border transition ${
                        isCompleted
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : winStatus?.pendingStatus === 'OVERDUE'
                          ? 'bg-red-50/30 border-red-200 hover:border-red-300'
                          : winStatus?.pendingStatus === 'DUE_NOW'
                          ? 'bg-amber-50/30 border-amber-300 hover:border-amber-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : winStatus?.pendingStatus === 'OVERDUE'
                                ? 'bg-red-600 text-white animate-pulse'
                                : winStatus?.pendingStatus === 'DUE_NOW'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isCompleted ? <Check className="w-4 h-4" /> : sNum}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 text-sm">{titleText}</h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {isCompleted ? 'Concluída' : 'Pendente'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {sess.durationMinutes} min
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {sess.type === 'CLINICAL' ? 'Intervenção' : sess.type === 'EVALUATION' ? 'Avaliação' : 'Acompanhamento'}
                              </span>

                              {/* Badges de Auditoria de Janela Clínica */}
                              {isCompleted && winStatus && (
                                winStatus.completedStatus === 'ON_TIME' ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700" /> No Prazo
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-700" /> Desvio ({winStatus.completedStatus === 'DEVIATION_EARLY' ? `-${winStatus.deviationDays}d` : `+${winStatus.deviationDays}d`})
                                  </span>
                                )
                              )}

                              {!isCompleted && winStatus && (
                                <>
                                  {winStatus.pendingStatus === 'OVERDUE' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 animate-pulse inline-flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-red-700" /> Atrasada (+{winStatus.daysDiff}d)
                                    </span>
                                  )}
                                  {winStatus.pendingStatus === 'DUE_NOW' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-700" /> Janela Aberta ({winStatus.daysDiff}d)
                                    </span>
                                  )}
                                  {winStatus.pendingStatus === 'UPCOMING' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-blue-600" /> Prevista (em {winStatus.daysDiff}d)
                                    </span>
                                  )}
                                </>
                              )}

                              {!isCompleted && !winStatus && sNum === 1 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-700" /> Baseline Pendente
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{subtitleText}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => openSessionEditor(timelineParticipant, sNum)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 inline-flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <Edit className="w-3.5 h-3.5 text-slate-500" />
                              <span>Editar</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Registrar</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Painel da Janela para Sessões Pendentes com Data Alvo Calculada */}
                      {!isCompleted && winStatus && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] bg-slate-50/80 p-2.5 rounded-lg">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div>
                              <span className="text-slate-400">Data Alvo:</span>{' '}
                              <span className="font-bold text-slate-800">{winStatus.targetDate.toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Janela Permitida:</span>{' '}
                              <span className="font-semibold text-slate-700">
                                {winStatus.windowStart.toLocaleDateString('pt-BR')} a {winStatus.windowEnd.toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {winStatus.daysDiff !== undefined && (
                              <span className={`text-[10px] font-bold ${winStatus.pendingStatus === 'OVERDUE' ? 'text-red-600' : winStatus.pendingStatus === 'DUE_NOW' ? 'text-amber-700' : 'text-slate-500'}`}>
                                ({winStatus.pendingStatus === 'OVERDUE' ? `${winStatus.daysDiff} dias em atraso` : `em ${winStatus.daysDiff} dias`})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              openWhatsAppAppointment(
                                timelineParticipant.patient.phoneWhatsApp,
                                timelineParticipant.researchCode,
                                timelineParticipant.patient.fullName,
                                sessionInfo?.title || `Sessão ${sNum}`,
                                winStatus.windowStart,
                                winStatus.windowEnd
                              )
                            }
                            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-md font-bold text-xs shadow-xs transition shrink-0"
                            title="Enviar convite de retorno com datas da janela clínica pelo WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Convidar no WhatsApp</span>
                          </button>
                        </div>
                      )}

                      {/* Detalhes Clínicos da Sessão Registrada */}
                      {isCompleted && session && (
                        <div className="mt-3 pt-3 border-t border-emerald-100/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-white/80 p-2 rounded border border-emerald-100">
                            <span className="text-slate-400 block text-[10px]">Data do Atendimento</span>
                            <span className="font-bold text-slate-800">
                              {new Date(session.sessionDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <div className="bg-white/80 p-2 rounded border border-emerald-100">
                            <span className="text-slate-400 block text-[10px]">Cor VITA (Dir / Esq)</span>
                            <span className="font-bold text-slate-800 font-mono">
                              {session.shadeRight || '—'} / {session.shadeLeft || '—'}
                            </span>
                          </div>

                          <div className="bg-white/80 p-2 rounded border border-emerald-100">
                            <span className="text-slate-400 block text-[10px]">Pico Dor EVA (0-10)</span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${getPainBadgeColor(peakPain)}`}>
                              {Number(peakPain).toFixed(1)} / 10
                            </span>
                          </div>

                          <div className="bg-white/80 p-2 rounded border border-emerald-100">
                            <span className="text-slate-400 block text-[10px]">Irritação Gengival</span>
                            <span className="font-semibold text-slate-700 truncate block">
                              {session.gingivalIrritation || 'Ausente'}
                            </span>
                          </div>

                          {/* Faixa de Auditoria de Protocolo / Janela */}
                          {winStatus && (
                            <div className="col-span-2 sm:col-span-4 bg-slate-50/90 p-2 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                              <div>
                                <span className="text-slate-500">Janela do Protocolo:</span>{' '}
                                <span className="font-semibold text-slate-700">
                                  {winStatus.windowStart.toLocaleDateString('pt-BR')} a {winStatus.windowEnd.toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-slate-400 ml-1">(Alvo: {winStatus.targetDate.toLocaleDateString('pt-BR')})</span>
                              </div>
                              <div>
                                {winStatus.completedStatus === 'ON_TIME' ? (
                                  <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Executada em conformidade
                                  </span>
                                ) : (
                                  <span className="text-amber-800 font-bold inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-700" /> Desvio de protocolo ({winStatus.completedStatus === 'DEVIATION_EARLY' ? `-${winStatus.deviationDays}d` : `+${winStatus.deviationDays}d`})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTimelineModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
              >
                Fechar Linha do Tempo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro e Edição de Sessão Clínica */}
      {showSessionModal && currentSessionForm && (() => {
        const protoSession = studyProtocol.sessions.find(
          (s) => s.sessionNumber === currentSessionForm.sessionNumber
        );
        const sessionInfo = SESSION_DEFINITIONS[currentSessionForm.sessionNumber];
        const displayTitle = protoSession?.name || sessionInfo?.title || `Registro Clínico: Sessão ${currentSessionForm.sessionNumber}`;
        const displaySubtitle = sessionInfo?.subtitle || 'Preencha os desfechos aferidos durante a consulta.';

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
              <div className="border-b border-slate-100 pb-4 mb-5 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {displayTitle}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {protoSession && (
                      <>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {protoSession.type === 'CLINICAL' ? '🩺 Intervenção / Procedimento' : protoSession.type === 'EVALUATION' ? '📋 Avaliação' : '🔍 Acompanhamento'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Duração prevista: {protoSession.durationMinutes} min
                        </span>
                        {protoSession.daysFromPrevious > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Intervalo: {protoSession.daysFromPrevious} dias
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {displaySubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSession} className="space-y-4 text-xs">
                {/* Data do Atendimento */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data do Atendimento Clínico
                  </label>
                  <input
                    type="date"
                    required
                    value={currentSessionForm.sessionDate}
                    onChange={(e) =>
                      setCurrentSessionForm({ ...currentSessionForm, sessionDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>

                {/* Registro de Cor Escala VITA Classical */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs inline-flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Escala de Cor VITA Classical (Boca Dividida)</span>
                    </span>
                    <span className="text-[11px] text-slate-500">16 tons (B1 mais claro a C4 mais escuro)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Hemi-arco Direito (13 a 11)
                      </label>
                      <select
                        value={currentSessionForm.shadeRight}
                        onChange={(e) =>
                          setCurrentSessionForm({ ...currentSessionForm, shadeRight: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono font-bold"
                      >
                        {VITA_CLASSICAL_SHADES.map((sh, idx) => (
                          <option key={sh} value={sh}>
                            {sh} (Passo {idx + 1})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Hemi-arco Esquerdo (21 a 23)
                      </label>
                      <select
                        value={currentSessionForm.shadeLeft}
                        onChange={(e) =>
                          setCurrentSessionForm({ ...currentSessionForm, shadeLeft: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono font-bold"
                      >
                        {VITA_CLASSICAL_SHADES.map((sh, idx) => (
                          <option key={sh} value={sh}>
                            {sh} (Passo {idx + 1})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Escala Visual Analógica (EVA) de Sensibilidade Dentinária */}
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 text-xs inline-flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span>Sensibilidade Dentinária - Escala Visual Analógica (EVA 0-10)</span>
                    </span>
                    <span className="text-[11px] text-blue-700">0 = Sem dor | 10 = Pior dor imaginável</span>
                  </div>

                  {[
                    { label: '0h (Imediato pós-clareamento)', key: 'painScore0h' as const },
                    { label: '1 hora pós-atendimento', key: 'painScore1h' as const },
                    { label: '24 horas pós-atendimento', key: 'painScore24h' as const },
                    { label: '48 horas pós-atendimento', key: 'painScore48h' as const },
                  ].map((tp) => (
                    <div key={tp.key} className="space-y-1.5 bg-white/70 p-3 rounded-xl border border-blue-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700">{tp.label}:</span>
                        <div className="flex items-center space-x-2">
                          {currentSessionForm[tp.key] === null ? (
                            <span className="font-mono font-medium text-amber-700 text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Pendente (Aguardando diário)
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-blue-800 text-sm">
                              {Number(currentSessionForm[tp.key]).toFixed(1)}{' '}
                              <span className="text-[10px] text-slate-400 font-normal">/ 10</span>
                            </span>
                          )}
                          {tp.key !== 'painScore0h' && (
                            <button
                              type="button"
                              onClick={() =>
                                setCurrentSessionForm({
                                  ...currentSessionForm,
                                  [tp.key]: currentSessionForm[tp.key] === null ? 0 : null,
                                })
                              }
                              className="text-[10px] text-blue-600 hover:text-blue-800 underline font-medium"
                            >
                              {currentSessionForm[tp.key] === null ? 'Definir EVA' : 'Marcar pendente'}
                            </button>
                          )}
                        </div>
                      </div>

                      {currentSessionForm[tp.key] !== null ? (
                        <>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.1"
                            value={currentSessionForm[tp.key] ?? 0}
                            onChange={(e) =>
                              setCurrentSessionForm({
                                ...currentSessionForm,
                                [tp.key]: parseFloat(parseFloat(e.target.value).toFixed(1)),
                              })
                            }
                            className="w-full h-2.5 bg-gradient-to-r from-emerald-400 via-amber-400 via-orange-400 to-red-500 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                          />

                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>0.0 - Nenhuma dor</span>
                            <span>5.0 - Moderada</span>
                            <span>10.0 - Pior dor</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          Aguardando registro pelo paciente no portal.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reação Tecidual / Irritação Gengival */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Irritação Gengival (Margem Gengival)
                  </label>
                  <select
                    value={currentSessionForm.gingivalIrritation}
                    onChange={(e) =>
                      setCurrentSessionForm({
                        ...currentSessionForm,
                        gingivalIrritation: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Ausente">Ausente (Tecido gengival hígido)</option>
                    <option value="Leve">Leve (Eritema marginal transitório)</option>
                    <option value="Moderada">Moderada (Eritema acentuado / branqueamento focal)</option>
                    <option value="Severa">Severa (Ulceração química / queimação relatada)</option>
                  </select>
                </div>

                {/* Eventos Adversos */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Eventos Adversos Espontâneos
                  </label>
                  <input
                    type="text"
                    value={currentSessionForm.adverseEvents}
                    onChange={(e) =>
                      setCurrentSessionForm({ ...currentSessionForm, adverseEvents: e.target.value })
                    }
                    placeholder="Ex: Cefaleia leve, gosto amargo, desconforto oclusal transitório..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* Operador e Avaliador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Operador(a) da Intervenção
                    </label>
                    <input
                      type="text"
                      value={currentSessionForm.operatorName}
                      onChange={(e) =>
                        setCurrentSessionForm({ ...currentSessionForm, operatorName: e.target.value })
                      }
                      placeholder="Nome do operador que aplicou"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Avaliador(a) Cego(a)
                    </label>
                    <input
                      type="text"
                      value={currentSessionForm.evaluatorName}
                      onChange={(e) =>
                        setCurrentSessionForm({
                          ...currentSessionForm,
                          evaluatorName: e.target.value,
                        })
                      }
                      placeholder="Nome do examinador da cor"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Observações Clínicas Adicionais */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Anotações Clínicas Adicionais
                  </label>
                  <textarea
                    rows={2}
                    value={currentSessionForm.notes}
                    onChange={(e) =>
                      setCurrentSessionForm({ ...currentSessionForm, notes: e.target.value })
                    }
                    placeholder="Observações do atendimento, comportamento do paciente ou intercorrências..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* Justificativa de Alteração / Registro Clínico (GCP / ICH E6 e 21 CFR Part 11) */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                  <label className="block font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                    Justificativa Clínica / Motivo do Registro (GCP / 21 CFR Part 11)
                  </label>
                  <input
                    type="text"
                    value={currentSessionForm.justification || ''}
                    onChange={(e) =>
                      setCurrentSessionForm({ ...currentSessionForm, justification: e.target.value })
                    }
                    placeholder="Ex: Consulta regular, ajuste de sensibilidade, retificação de cor..."
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-amber-700">
                    Obrigatório para rastreabilidade e integridade regulatória na Trilha de Auditoria.
                  </p>
                </div>

                {/* Ações do Rodapé */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSessionModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSession}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savingSession ? 'Gravando...' : 'Salvar Sessão Clínica'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal de Questionários & eCRF do Paciente */}
      {showResponsesModal && responsesParticipant && (() => {
        const part = responsesParticipant;
        const projectForms = project?.forms || [];
        const responses = part.responses || [];
        const isCurrentBlinded = overrideBlindedView !== null ? overrideBlindedView : (project?.isBlinded ?? false);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* Cabeçalho */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 rounded-t-2xl">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg uppercase tracking-wide">
                      {part.researchCode}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">
                      Questionários & eCRF do Participante
                    </h2>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Paciente: <span className="font-semibold text-slate-700">{part.patient.fullName}</span> • {part.patient.phoneWhatsApp}
                  </p>

                  {/* Simulador Interativo de Cegamento */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-200/70">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Simular Papel:
                    </span>
                    <button
                      type="button"
                      onClick={() => setOverrideBlindedView(false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                        !isCurrentBlinded
                          ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                      title="Simular Pesquisador Não-Cego ou Coordenador (visualiza todas as respostas)"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pesquisador Não-Cego (Ver Respostas)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideBlindedView(true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                        isCurrentBlinded
                          ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                      title="Simular Avaliador Cego (respostas mascaradas conforme protocolo)"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Avaliador Cego (Mascarado)</span>
                    </button>
                    {overrideBlindedView !== null && (
                      <button
                        type="button"
                        onClick={() => setOverrideBlindedView(null)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline ml-1"
                        title="Restaurar regra original do usuário logado"
                      >
                        Resetar ({project?.isBlinded ? 'Cego' : 'Não-Cego'})
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowResponsesModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo com Scroll */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {projectForms.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">Nenhum questionário cadastrado para este projeto.</p>
                    <Link
                      href="/construtor"
                      className="inline-block mt-3 text-xs font-bold text-blue-600 hover:underline"
                    >
                      + Criar questionários no Construtor de Fichas
                    </Link>
                  </div>
                ) : (
                  projectForms.map((form) => {
                    const resp = responses.find((r) => r.formId === form.id);
                    let parsedQuestions: any[] = [];
                    try {
                      if (form.questionsJson) {
                        parsedQuestions = JSON.parse(form.questionsJson);
                      } else if (resp?.form?.questionsJson) {
                        parsedQuestions = JSON.parse(resp.form.questionsJson);
                      }
                    } catch (e) {
                      parsedQuestions = [];
                    }

                    let answers: Record<string, any> = {};
                    if (resp) {
                      try {
                        answers = JSON.parse(resp.answersJson || '{}');
                      } catch (e) {
                        answers = {};
                      }
                    }

                    return (
                      <div
                        key={form.id}
                        className={`rounded-xl border transition p-5 ${
                          resp
                            ? 'border-blue-200 bg-white shadow-xs'
                            : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                          <div>
                            <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                              <span>{form.title}</span>
                            </h3>
                            {form.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{form.description}</p>
                            )}
                          </div>

                          <div>
                            {resp ? (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>
                                  Respondido em{' '}
                                  {new Date(resp.submittedAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </span>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Pendente</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWhatsAppReminder(
                                      part.patient.phoneWhatsApp,
                                      part.researchCode,
                                      form.title,
                                      part.patient.fullName
                                    )
                                  }
                                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#25D366] hover:bg-[#128C7E] text-white shadow-xs transition"
                                  title="Enviar cobrança ou lembrete via WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Lembrar no WhatsApp</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Perguntas e Respostas */}
                        {resp ? (
                          isCurrentBlinded ? (
                            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-left">
                              <div className="flex items-start space-x-3">
                                <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="text-sm font-bold text-amber-900">
                                    Conteúdo Mascarado — Avaliador Cego
                                  </h4>
                                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                    Conforme as normas de ensaio clínico duplo-cego (GCP / ICH E6), avaliadores cegos não têm acesso aos escores de dor (EVA contínua) ou respostas relatadas pelo paciente para evitar quebra de imparcialidade na avaliação clínica.
                                  </p>
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-300 inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Status confirmado: Respondido ({new Date(resp.submittedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setOverrideBlindedView(false)}
                                      className="text-xs font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Alternar para visão Não-Cego e ver respostas</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-800">
                                <span className="font-semibold flex items-center space-x-1.5">
                                  <Eye className="w-3.5 h-3.5 text-blue-700" />
                                  <span>Acesso Não-Cego / Coordenação: Visualização integral das respostas</span>
                                </span>
                                <span className="font-mono text-[11px] text-blue-600">ID: {resp.id.slice(0, 8)}</span>
                              </div>

                              {parsedQuestions.length === 0 ? (
                                <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-600">
                                  <pre>{JSON.stringify(answers, null, 2)}</pre>
                                </div>
                              ) : (
                                parsedQuestions.map((q: any, idx: number) => {
                                  const val = answers[q.id];
                                  const hasAnswer = val !== undefined && val !== null && val !== '';

                                  return (
                                    <div
                                      key={q.id || idx}
                                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5"
                                    >
                                      <div className="flex justify-between items-start gap-4">
                                        <div>
                                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                                            Questão {idx + 1}
                                          </span>
                                          <p className="text-sm font-medium text-slate-800">
                                            {q.label || q.title || `Item ${idx + 1}`}
                                          </p>
                                          {q.observation && (
                                            <p className="text-xs text-slate-500 italic mt-0.5">
                                              Obs: {q.observation}
                                            </p>
                                          )}
                                        </div>

                                        <div className="shrink-0 text-right">
                                          {q.type === 'instruction' ? (
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded text-xs font-medium">
                                              Texto Informativo
                                            </span>
                                          ) : q.type === 'vas' ? (
                                            <div className="inline-flex flex-col items-end">
                                              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-sm font-bold font-mono">
                                                {hasAnswer ? `${Number(val).toFixed(1)} / 10.0` : '—'}
                                              </span>
                                              <span className="text-[10px] text-slate-400 mt-0.5">
                                                Escala Visual Analógica (EVA)
                                              </span>
                                            </div>
                                          ) : q.type === 'matrix' ? (
                                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold border border-purple-200">
                                              {hasAnswer ? (val === 'NA' ? 'NA (Não se aplica)' : `Nota ${val}`) : 'Não respondido'}
                                            </span>
                                          ) : q.type === 'boolean' ? (
                                            <span
                                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                val === 'Sim' || val === true
                                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                  : 'bg-slate-200 text-slate-700'
                                              }`}
                                            >
                                              {hasAnswer ? String(val) : 'Não respondido'}
                                            </span>
                                          ) : q.type === 'choice' || q.type === 'likert' ? (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
                                              {hasAnswer ? String(val) : 'Não respondido'}
                                            </span>
                                          ) : (
                                            <span className="text-sm font-semibold text-slate-800">
                                              {hasAnswer ? String(val) : '—'}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Barra de visualização para EVA na visão do pesquisador */}
                                      {q.type === 'vas' && hasAnswer && (
                                        <div className="pt-2">
                                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                                            <div
                                              className="h-full bg-indigo-600 rounded-full transition-all"
                                              style={{ width: `${Math.min(Math.max((Number(val) / 10) * 100, 0), 100)}%` }}
                                            />
                                          </div>
                                          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                                            <span>{q.leftAnchor || '0.0 (Mínimo)'}</span>
                                            <span>{q.rightAnchor || '10.0 (Máximo)'}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-slate-400 italic py-2 flex items-center justify-between">
                            <span>Envie o link seguro via WhatsApp para o participante responder diretamente pelo celular.</span>
                            <a
                              href={`/paciente?code=${part.researchCode}&tab=forms&formId=${form.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1.5 text-emerald-600 hover:text-emerald-800 font-bold underline ml-2"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Testar resposta agora</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Rodapé */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
                <div className="text-xs text-slate-500">
                  Total de formulários: <strong className="text-slate-700">{projectForms.length}</strong> | Respondidos: <strong className="text-emerald-600">{responses.length}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResponsesModal(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Edição de Dados do Estudo Clínico */}
      {showEditProjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Editar Dados do Estudo Clínico</h2>
                  <p className="text-xs text-slate-500">
                    Ajuste o título, a descrição e o status de andamento deste projeto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProjectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nome do Projeto / Ensaio Clínico *
                </label>
                <input
                  type="text"
                  required
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Descrição / Hipótese do Estudo (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Status do Estudo
                </label>
                <select
                  value={editProjectStatus}
                  onChange={(e) => setEditProjectStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                >
                  <option value="ACTIVE">🟢 Em Andamento / Ativo</option>
                  <option value="COMPLETED">🔵 Finalizado / Concluído</option>
                  <option value="CANCELLED">⚪ Cancelado / Interrompido</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Editores Especializados deste Estudo:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <Link
                    href={`/anamnese?projectId=${project.id}`}
                    className="p-2.5 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-blue-900 font-semibold transition flex items-center justify-between"
                  >
                    <span>Ficha Clínica & Critérios</span>
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                  </Link>
                  <Link
                    href={`/construtor?projectId=${project.id}`}
                    className="p-2.5 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl text-indigo-900 font-semibold transition flex items-center justify-between"
                  >
                    <span>Construtor de eCRF</span>
                    <ChevronRight className="w-4 h-4 text-indigo-600" />
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditProjectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProjectEdit || !editProjectName.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingProjectEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Prontuário Clínico Completo / Dossiê do Paciente */}
      {showDossierModal && currentDossierParticipant && (
        <PatientDossierModal
          isOpen={showDossierModal}
          onClose={() => setShowDossierModal(false)}
          participant={currentDossierParticipant}
          project={project}
          studyProtocol={studyProtocol}
          onEditAnamnesis={(part) => {
            setShowDossierModal(false);
            openAnamnesisModal(part);
          }}
          onEditPatient={(part) => {
            setShowDossierModal(false);
            handleOpenEditPatient(part);
          }}
          isBlindedUser={isBlindedUser}
        />
      )}

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
