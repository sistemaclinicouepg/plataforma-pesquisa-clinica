'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Clock,
  Plus,
  Check,
  Activity,
  FileSpreadsheet,
  EyeOff,
  ArrowRight,
  FolderPlus,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  LogIn,
  Sliders,
  X,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  ShieldAlert,
  LayoutGrid,
  List,
  Users,
  FolderKanban,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  MessageSquare,
  Shuffle,
  ArrowLeft,
  Layers,
  ClipboardList,
  BookmarkPlus,
  Bookmark,
  Edit3,
  RotateCcw,
} from 'lucide-react';

import type { AnamnesisQuestion, QuestionType } from '@/app/anamnese/page';

import {
  DEFAULT_STUDY_SESSIONS,
  DEFAULT_FORM_TARGETS,
  parseStudyProtocol,
  StudySessionProtocol,
  FormTargetProtocol,
  ResearchSpecialty,
  PRESET_QUESTIONNAIRES_CATALOG,
  SessionClinicalModules,
  ColorAssessmentModel,
  COLOR_MODEL_OPTIONS,
  PRESET_FORM_QUESTIONS,
  getPresetQuestionsForMethod,
  FormQuestionProtocol,
} from '@/lib/studyProtocol';

type Project = {
  id: string;
  name: string;
  description: string | null;
  status?: string | null;
  anamnesisTemplate?: string | null;
  createdAt: string;
  members: Array<{
    id: string;
    role: string;
    isBlinded: boolean;
    user: { id: string; name: string; email: string };
  }>;
  participants: Array<{ id: string; status: string }>;
  forms: Array<{ id: string; title: string }>;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type PendingUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type StatusFilterType = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

const DEFAULT_PROJECT_ANAMNESIS_QUESTIONS: AnamnesisQuestion[] = [
  {
    id: 'crit_age',
    title: 'Idade entre 18 e 35 anos?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'nao',
  },
  {
    id: 'crit_sound_teeth',
    title: 'Incisivos e caninos hígidos (sem cárie ativa ou restaurações amplas)?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'nao',
  },
  {
    id: 'crit_baseline_color',
    title: 'Cor inicial basal elegível (A2 ou mais escura na escala VITA Classical)?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'nao',
  },
  {
    id: 'crit_allergy',
    title: 'Alergia prévia a peróxido de hidrogênio ou componentes do gel?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    id: 'crit_hypersensitivity',
    title: 'Histórico de hipersensibilidade dentinária prévia moderada a severa?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    id: 'crit_pregnant',
    title: 'Gestante ou lactante?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    id: 'crit_recent_bleaching',
    title: 'Tratamento clareador dental prévio nos últimos 12 meses?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    id: 'crit_smoking',
    title: 'Hábito de tabagismo ativo (fumante crônico)?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    id: 'hist_systemic',
    title: 'Histórico de doenças sistêmicas crônicas ou uso contínuo de medicações:',
    type: 'text',
    required: false,
    isCriterion: false,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros de status, busca textual e modo de exibição (Grade / Lista)
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('uepg_projects_view_mode');
      if (savedMode === 'grid' || savedMode === 'list') {
        setViewMode(savedMode);
      }
    }
  }, []);

  const handleChangeViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('uepg_projects_view_mode', mode);
      } catch (e) {}
    }
  };

  // Modal de criação de projeto por etapas (Wizard)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [createStepError, setCreateStepError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [newProjectSpecialty, setNewProjectSpecialty] = useState<ResearchSpecialty>('GENERAL');
  const [newProjectGroups, setNewProjectGroups] = useState<string[]>([
    'Grupo 1: Convencional (HP 35%)',
    'Grupo 2: Experimental (HP 20%)',
  ]);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [newProjectTargetParticipants, setNewProjectTargetParticipants] = useState<string>('30');
  const [enableOdontogram, setEnableOdontogram] = useState(true);
  const [odontogramScope, setOdontogramScope] = useState<'anterior' | 'full'>('anterior');
  const [enablePeriodontogram, setEnablePeriodontogram] = useState(false);
  const [enableAnamnesis, setEnableAnamnesis] = useState(true);
  const [newProjectQuestions, setNewProjectQuestions] = useState<AnamnesisQuestion[]>(DEFAULT_PROJECT_ANAMNESIS_QUESTIONS);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('boolean');
  const [newQuestionIsCriterion, setNewQuestionIsCriterion] = useState(true);
  const [newQuestionDisqualifyIf, setNewQuestionDisqualifyIf] = useState<'sim' | 'nao'>('sim');
  const [newQuestionRequired, setNewQuestionRequired] = useState(true);
  const [newCustomFormTitle, setNewCustomFormTitle] = useState('');
  const [newCustomFormRespondent, setNewCustomFormRespondent] = useState<'PATIENT' | 'RESEARCHER'>('PATIENT');
  const [studySessions, setStudySessions] = useState<StudySessionProtocol[]>(DEFAULT_STUDY_SESSIONS);
  const [formTargets, setFormTargets] = useState<FormTargetProtocol[]>(DEFAULT_FORM_TARGETS);
  const [creating, setCreating] = useState(false);

  // Estados para Gestão de Perguntas, Métodos de Avaliação e Modelos no eCRF
  const [expandedFormQuestions, setExpandedFormQuestions] = useState<Record<string, boolean>>({});
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [addMethodTab, setAddMethodTab] = useState<'presets' | 'saved' | 'custom'>('presets');
  const [newCustomMethodTitle, setNewCustomMethodTitle] = useState('');
  const [newCustomMethodDesc, setNewCustomMethodDesc] = useState('');
  const [newCustomMethodRespondent, setNewCustomMethodRespondent] = useState<'PATIENT' | 'RESEARCHER'>('PATIENT');
  const [newCustomMethodFreq, setNewCustomMethodFreq] = useState('A cada consulta clínica');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateToSave, setTemplateToSave] = useState<{
    formId?: string;
    name: string;
    description: string;
    category: string;
    questions: any[];
  } | null>(null);
  const [templateToast, setTemplateToast] = useState<string | null>(null);
  const [customTemplatesList, setCustomTemplatesList] = useState<any[]>([]);

  // Sincroniza modelos salvos no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('uepg_custom_questionnaire_templates');
      if (saved) {
        setCustomTemplatesList(JSON.parse(saved));
      }
    } catch {}
  }, [showAddMethodModal, showSaveTemplateModal]);

  const handleToggleFormQuestions = (formId: string) => {
    setExpandedFormQuestions((prev) => ({
      ...prev,
      [formId]: !prev[formId],
    }));
  };

  const handleUpdateQuestionInForm = (
    formId: string,
    qIdx: number,
    field: string,
    value: any,
    isEdit: boolean = false
  ) => {
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== formId) return f;
      const currentQuestions = Array.isArray(f.questions)
        ? [...f.questions]
        : getPresetQuestionsForMethod(f.id);
      if (!currentQuestions[qIdx]) return f;
      currentQuestions[qIdx] = {
        ...currentQuestions[qIdx],
        [field]: value,
      };
      return { ...f, questions: currentQuestions };
    });
    if (isEdit) setEditFormTargets(updated);
    else setFormTargets(updated);
  };

  const handleAddQuestionToForm = (formId: string, isEdit: boolean = false) => {
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== formId) return f;
      const currentQuestions = Array.isArray(f.questions)
        ? [...f.questions]
        : getPresetQuestionsForMethod(f.id);
      const newQuestion: any = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'choice',
        title: 'Nova pergunta de avaliação',
        required: true,
        options: [
          { label: 'Opção 1', value: '1' },
          { label: 'Opção 2', value: '2' },
        ],
      };
      return { ...f, questions: [...currentQuestions, newQuestion] };
    });
    if (isEdit) setEditFormTargets(updated);
    else setFormTargets(updated);
  };

  const handleRemoveQuestionFromForm = (
    formId: string,
    qIdx: number,
    isEdit: boolean = false
  ) => {
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== formId) return f;
      const currentQuestions = Array.isArray(f.questions)
        ? [...f.questions]
        : getPresetQuestionsForMethod(f.id);
      return { ...f, questions: currentQuestions.filter((_, i) => i !== qIdx) };
    });
    if (isEdit) setEditFormTargets(updated);
    else setFormTargets(updated);
  };

  const handleRestoreFormQuestions = (formId: string, isEdit: boolean = false) => {
    const defaultQs = getPresetQuestionsForMethod(formId);
    if (!defaultQs || defaultQs.length === 0) return;
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== formId) return f;
      return { ...f, questions: JSON.parse(JSON.stringify(defaultQs)) };
    });
    if (isEdit) setEditFormTargets(updated);
    else setFormTargets(updated);
  };

  const handleAddOptionToQuestion = (
    formId: string,
    qIdx: number,
    isEdit: boolean = false
  ) => {
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== formId) return f;
      const currentQuestions = Array.isArray(f.questions)
        ? [...f.questions]
        : getPresetQuestionsForMethod(f.id);
      const targetQ = currentQuestions[qIdx];
      if (!targetQ) return f;
      const currentOptions = Array.isArray(targetQ.options) ? [...targetQ.options] : [];
      const nextNum = currentOptions.length + 1;
      currentOptions.push({ label: `Opção ${nextNum}`, value: String(nextNum) });
      currentQuestions[qIdx] = { ...targetQ, options: currentOptions };
      return { ...f, questions: currentQuestions };
    });
    if (isEdit) setEditFormTargets(updated);
    else setFormTargets(updated);
  };

  const handleUpdateOptionInQuestion = (
    formId: string,
    qIdx: number,
    optIdx: number,
    field: 'label' | 'value',
    val: string,
    isEdit: boolean = false
  ) => {
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== formId) return f;
      const currentQuestions = Array.isArray(f.questions)
        ? [...f.questions]
        : getPresetQuestionsForMethod(f.id);
      const targetQ = currentQuestions[qIdx];
      if (!targetQ || !Array.isArray(targetQ.options)) return f;
      const currentOptions = [...targetQ.options];
      if (!currentOptions[optIdx]) return f;
      currentOptions[optIdx] = { ...currentOptions[optIdx], [field]: val };
      currentQuestions[qIdx] = { ...targetQ, options: currentOptions };
      return { ...f, questions: currentQuestions };
    });
    if (isEdit) setEditFormTargets(updated);
    else setFormTargets(updated);
  };

  const handleRemoveOptionFromQuestion = (
    formId: string,
    qIdx: number,
    optIdx: number,
    isEdit: boolean = false
  ) => {
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== formId) return f;
      const currentQuestions = Array.isArray(f.questions)
        ? [...f.questions]
        : getPresetQuestionsForMethod(f.id);
      const targetQ = currentQuestions[qIdx];
      if (!targetQ || !Array.isArray(targetQ.options)) return f;
      const currentOptions = targetQ.options.filter((_, i) => i !== optIdx);
      currentQuestions[qIdx] = { ...targetQ, options: currentOptions };
      return { ...f, questions: currentQuestions };
    });
    if (isEdit) setEditFormTargets(updated);
    else setFormTargets(updated);
  };

  const handleSelectPresetMethod = (methodId: string) => {
    const existingIndex = formTargets.findIndex((f) => f.id === methodId);
    if (existingIndex !== -1) {
      setFormTargets((prev) =>
        prev.map((f, i) => (i === existingIndex ? { ...f, enabled: true } : f))
      );
      setExpandedFormQuestions((prev) => ({ ...prev, [methodId]: true }));
      setShowAddMethodModal(false);
      return;
    }

    const catalogItem = PRESET_QUESTIONNAIRES_CATALOG.find((c) => c.id === methodId);
    const newForm: FormTargetProtocol = {
      id: methodId,
      title: catalogItem?.title || methodId,
      description: catalogItem?.description || 'Método de avaliação clínica do protocolo.',
      enabled: true,
      respondent: catalogItem?.defaultRespondent || 'PATIENT',
      frequency: 'ONCE',
      frequencyDescription: 'Conforme cronograma',
      isPreset: true,
      questions: getPresetQuestionsForMethod(methodId),
    };

    setFormTargets((prev) => [...prev, newForm]);
    setExpandedFormQuestions((prev) => ({ ...prev, [methodId]: true }));
    setShowAddMethodModal(false);
  };

  const handleApplySavedTemplateAsMethod = (tpl: any) => {
    const newForm: FormTargetProtocol = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: tpl.name || tpl.title,
      description: tpl.description || 'Modelo reutilizado de pesquisa anterior.',
      enabled: true,
      respondent: 'PATIENT',
      frequency: 'ONCE',
      frequencyDescription: 'Conforme cronograma',
      isPreset: false,
      questions: JSON.parse(JSON.stringify(tpl.questions || [])),
    };
    setFormTargets((prev) => [...prev, newForm]);
    setExpandedFormQuestions((prev) => ({ ...prev, [newForm.id]: true }));
    setShowAddMethodModal(false);
    setTemplateToast(`Modelo "${newForm.title}" adicionado aos métodos de avaliação!`);
    setTimeout(() => setTemplateToast(null), 4000);
  };

  const handleCreateCustomMethodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomMethodTitle.trim()) return;

    const newForm: FormTargetProtocol = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newCustomMethodTitle.trim(),
      description: newCustomMethodDesc.trim() || 'Instrumento personalizado de avaliação cadastrado pelo pesquisador.',
      enabled: true,
      respondent: newCustomMethodRespondent,
      frequency: 'PER_SESSION',
      frequencyDescription: newCustomMethodFreq.trim() || 'A cada consulta clínica',
      isPreset: false,
      questions: [
        {
          id: `q_${Date.now()}_1`,
          type: 'text',
          title: 'Primeira pergunta de avaliação',
          required: true,
        },
      ],
    };

    setFormTargets((prev) => [...prev, newForm]);
    setExpandedFormQuestions((prev) => ({ ...prev, [newForm.id]: true }));
    setNewCustomMethodTitle('');
    setNewCustomMethodDesc('');
    setShowAddMethodModal(false);
    setTemplateToast(`Instrumento "${newForm.title}" adicionado com sucesso! Personalize as perguntas abaixo.`);
    setTimeout(() => setTemplateToast(null), 4000);
  };

  const handleOpenSaveTemplateModal = (formId: string) => {
    const target = formTargets.find((f) => f.id === formId);
    if (!target) return;
    const questionsToSave = Array.isArray(target.questions) && target.questions.length > 0
      ? target.questions
      : getPresetQuestionsForMethod(target.id);

    setTemplateToSave({
      formId: target.id,
      name: target.title,
      description: target.description || '',
      category: target.respondent === 'PATIENT' ? 'Questionário Paciente (PROMs)' : 'Avaliação Pesquisador',
      questions: JSON.parse(JSON.stringify(questionsToSave)),
    });
    setShowSaveTemplateModal(true);
  };

  const handleConfirmSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateToSave || !templateToSave.name.trim()) return;

    try {
      const savedRaw = localStorage.getItem('uepg_custom_questionnaire_templates');
      const existing = savedRaw ? JSON.parse(savedRaw) : [];
      const newTpl = {
        id: `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: templateToSave.name.trim(),
        description: templateToSave.description.trim(),
        category: templateToSave.category || 'Geral',
        questions: templateToSave.questions,
        createdAt: new Date().toISOString(),
      };
      const updated = [newTpl, ...existing];
      localStorage.setItem('uepg_custom_questionnaire_templates', JSON.stringify(updated));
      setCustomTemplatesList(updated);
      setShowSaveTemplateModal(false);
      setTemplateToast(`Modelo "${newTpl.name}" salvo com sucesso! Já está disponível na aba "Meus Modelos Salvos".`);
      setTimeout(() => setTemplateToast(null), 5000);
    } catch {
      alert('Erro ao salvar modelo no navegador.');
    }
  };

  const handleRemoveFormTarget = (formId: string) => {
    if (!confirm('Deseja remover este método de avaliação do estudo?')) return;
    setFormTargets((prev) => prev.filter((f) => f.id !== formId));
  };

  // Manipulação de perguntas da Anamnese no Wizard
  const handleAddQuestion = () => {
    if (!newQuestionTitle.trim()) return;
    const newQ: AnamnesisQuestion = {
      id: `q_${Date.now()}`,
      title: newQuestionTitle.trim(),
      type: newQuestionType,
      required: newQuestionRequired,
      isCriterion: newQuestionIsCriterion,
      disqualifyIf: newQuestionIsCriterion ? newQuestionDisqualifyIf : undefined,
    };
    setNewProjectQuestions((prev) => [...prev, newQ]);
    setNewQuestionTitle('');
    setNewQuestionType('boolean');
    setNewQuestionIsCriterion(true);
    setNewQuestionDisqualifyIf('sim');
    setNewQuestionRequired(true);
  };

  const handleRemoveQuestion = (idx: number) => {
    setNewProjectQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRestoreDefaultQuestions = () => {
    setNewProjectQuestions(DEFAULT_PROJECT_ANAMNESIS_QUESTIONS);
  };

  const handleAddCustomForm = () => {
    if (!newCustomFormTitle.trim()) return;
    const newForm: FormTargetProtocol = {
      id: `custom_${Date.now()}`,
      title: newCustomFormTitle.trim(),
      description: 'Instrumento personalizado de avaliação cadastrado pelo pesquisador.',
      enabled: true,
      respondent: newCustomFormRespondent,
      frequency: 'PER_SESSION',
      frequencyDescription: 'A cada consulta clínica',
      isPreset: false,
    };
    setFormTargets((prev) => [...prev, newForm]);
    setNewCustomFormTitle('');
  };

  // Modal de edição / configuração do estudo
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTab, setEditTab] = useState<'GENERAL' | 'GROUPS' | 'SESSIONS' | 'FORMS'>('GENERAL');
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectPrefix, setEditProjectPrefix] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [editProjectSpecialty, setEditProjectSpecialty] = useState<ResearchSpecialty>('GENERAL');
  const [editProjectGroups, setEditProjectGroups] = useState<string[]>([]);
  const [editNewGroupInput, setEditNewGroupInput] = useState('');
  const [editEnableOdontogram, setEditEnableOdontogram] = useState(true);
  const [editOdontogramScope, setEditOdontogramScope] = useState<'anterior' | 'full'>('anterior');
  const [editEnablePeriodontogram, setEditEnablePeriodontogram] = useState(false);
  const [editEnableAnamnesis, setEditEnableAnamnesis] = useState(true);
  const [editStudySessions, setEditStudySessions] = useState<StudySessionProtocol[]>(DEFAULT_STUDY_SESSIONS);
  const [editFormTargets, setEditFormTargets] = useState<FormTargetProtocol[]>(DEFAULT_FORM_TARGETS);
  const [savingEdit, setSavingEdit] = useState(false);

  // Manipulação dinâmica de sessões
  const handleAddSession = (isEdit: boolean) => {
    const list = isEdit ? editStudySessions : studySessions;
    const nextNum = list.length + 1;
    const newSession: StudySessionProtocol = {
      id: `sess_${Date.now()}`,
      sessionNumber: nextNum,
      name: `Sessão ${nextNum}: Avaliação Clínica / Retorno`,
      type: 'EVALUATION',
      daysFromPrevious: 7,
      durationMinutes: 30,
      toleranceDays: 2,
      description: `Consulta clínica de acompanhamento (${nextNum}ª sessão).`,
      requiresPatientQuestionnaire: true,
      patientQuestionnaireIds: ['eva'],
      clinicalModules: {
        toothMapping: true,
        colorGuide: true,
        painVAS: true,
        softTissueExam: true,
        fdiCriteria: false,
        edemaTrismus: false,
        percussionPalpation: false,
        periodontogram: false,
      },
    };
    if (isEdit) {
      setEditStudySessions([...list, newSession]);
    } else {
      setStudySessions([...list, newSession]);
    }
  };

  const handleRemoveSession = (index: number, isEdit: boolean) => {
    const list = isEdit ? editStudySessions : studySessions;
    if (list.length <= 1) return;
    const updated = list
      .filter((_, i) => i !== index)
      .map((s, idx) => ({
        ...s,
        sessionNumber: idx + 1,
      }));
    if (isEdit) {
      setEditStudySessions(updated);
    } else {
      setStudySessions(updated);
    }
  };

  const handleUpdateSession = (
    index: number,
    field: keyof StudySessionProtocol,
    value: any,
    isEdit: boolean
  ) => {
    const list = isEdit ? editStudySessions : studySessions;
    const updated = list.map((s, idx) => {
      if (idx !== index) return s;
      return { ...s, [field]: value };
    });
    if (isEdit) {
      setEditStudySessions(updated);
    } else {
      setStudySessions(updated);
    }
  };

  const handleToggleSessionQuestionnaire = (
    index: number,
    qId: string,
    isEdit: boolean
  ) => {
    const list = isEdit ? editStudySessions : studySessions;
    const currentSession = list[index];
    const current = currentSession?.patientQuestionnaireIds || ['eva'];
    const exists = current.includes(qId);
    const updatedIds = exists ? current.filter((id) => id !== qId) : [...current, qId];

    const currentFreqs = currentSession?.questionnaireFrequencies || {};
    let updatedFreqs = { ...currentFreqs };
    if (!exists && !updatedFreqs[qId]) {
      if (qId === 'eva' || qId.includes('dor') || qId.includes('sensibil')) {
        updatedFreqs[qId] = currentSession?.responseFrequency || 'DAILY';
      } else {
        updatedFreqs[qId] = 'ONCE';
      }
    } else if (exists) {
      delete updatedFreqs[qId];
    }

    const updatedSession = {
      ...currentSession,
      patientQuestionnaireIds: updatedIds,
      questionnaireFrequencies: updatedFreqs,
    };

    const updatedList = list.map((s, idx) => (idx === index ? updatedSession : s));
    if (isEdit) {
      setEditStudySessions(updatedList);
    } else {
      setStudySessions(updatedList);
    }
  };

  const getQuestionnaireFreq = (s: StudySessionProtocol, qId: string) => {
    if (s.questionnaireFrequencies && s.questionnaireFrequencies[qId]) {
      return s.questionnaireFrequencies[qId];
    }
    if (qId === 'eva' || qId.includes('dor') || qId.includes('sensibil')) {
      return s.responseFrequency || 'DAILY';
    }
    return 'ONCE';
  };

  const getQuestionnaireCustom = (s: StudySessionProtocol, qId: string) => {
    if (s.questionnaireCustomIntervals && s.questionnaireCustomIntervals[qId]) {
      return s.questionnaireCustomIntervals[qId];
    }
    return {
      days: s.responseIntervalDays || 3,
      description: s.responseIntervalDescription || '',
    };
  };

  const handleUpdateQuestionnaireFrequency = (
    sessionIndex: number,
    qId: string,
    freq: string,
    isEdit: boolean
  ) => {
    const list = isEdit ? editStudySessions : studySessions;
    const currentSession = list[sessionIndex];
    if (!currentSession) return;
    const currentFreqs = currentSession.questionnaireFrequencies || {};
    const updatedFreqs = { ...currentFreqs, [qId]: freq };
    handleUpdateSession(sessionIndex, 'questionnaireFrequencies', updatedFreqs, isEdit);
  };

  const handleUpdateQuestionnaireCustomInterval = (
    sessionIndex: number,
    qId: string,
    field: 'days' | 'description',
    value: any,
    isEdit: boolean
  ) => {
    const list = isEdit ? editStudySessions : studySessions;
    const currentSession = list[sessionIndex];
    if (!currentSession) return;
    const currentCustom = currentSession.questionnaireCustomIntervals || {};
    const itemCustom = currentCustom[qId] || {};
    const updatedItem = { ...itemCustom, [field]: value };
    const updatedCustom = { ...currentCustom, [qId]: updatedItem };
    handleUpdateSession(sessionIndex, 'questionnaireCustomIntervals', updatedCustom, isEdit);
  };

  const handleToggleSessionClinicalModule = (
    index: number,
    moduleKey: keyof SessionClinicalModules,
    isEdit: boolean
  ) => {
    const list = isEdit ? editStudySessions : studySessions;
    const currentModules = list[index]?.clinicalModules || {};
    const willBeActive = !currentModules[moduleKey];
    const updatedModules: SessionClinicalModules = {
      ...currentModules,
      [moduleKey]: willBeActive,
    };
    if (moduleKey === 'colorGuide') {
      if (willBeActive && (!updatedModules.colorModels || updatedModules.colorModels.length === 0)) {
        updatedModules.colorModels = ['VITA_CLASSICAL'];
      }
    }
    handleUpdateSession(index, 'clinicalModules', updatedModules, isEdit);
  };

  const handleToggleSessionColorModel = (
    sessionIndex: number,
    colorModel: ColorAssessmentModel,
    isEdit: boolean
  ) => {
    const list = isEdit ? editStudySessions : studySessions;
    const currentModules = list[sessionIndex]?.clinicalModules || {};
    const existingModels: ColorAssessmentModel[] = Array.isArray(currentModules.colorModels)
      ? [...currentModules.colorModels]
      : currentModules.colorGuide ? ['VITA_CLASSICAL'] : [];

    let updatedModels: ColorAssessmentModel[];
    if (existingModels.includes(colorModel)) {
      updatedModels = existingModels.filter((m) => m !== colorModel);
    } else {
      updatedModels = [...existingModels, colorModel];
    }

    const updatedModules: SessionClinicalModules = {
      ...currentModules,
      colorGuide: updatedModels.length > 0,
      colorModels: updatedModels,
    };
    handleUpdateSession(sessionIndex, 'clinicalModules', updatedModules, isEdit);
  };

  const handleApplyBleachingPreset = (
    presetType: 'office_standard' | 'office_intensive' | 'home_supervised' | 'office_single',
    isEdit: boolean
  ) => {
    let sessions: StudySessionProtocol[] = [];
    if (presetType === 'office_standard') {
      sessions = [
        {
          id: `sess_${Date.now()}_1`,
          sessionNumber: 1,
          name: 'Sessão 1: tomada de cor inicial e 1ª aplicação do gel',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 60,
          toleranceDays: 0,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva', 'habits'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
        {
          id: `sess_${Date.now()}_2`,
          sessionNumber: 2,
          name: 'Sessão 2: 2ª aplicação clínica do gel',
          type: 'CLINICAL',
          daysFromPrevious: 7,
          durationMinutes: 60,
          toleranceDays: 2,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
        {
          id: `sess_${Date.now()}_3`,
          sessionNumber: 3,
          name: 'Sessão 3: retorno final (estabilidade de cor e satisfação)',
          type: 'EVALUATION',
          daysFromPrevious: 7,
          durationMinutes: 30,
          toleranceDays: 3,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
      ];
    } else if (presetType === 'home_supervised') {
      sessions = [
        {
          id: `sess_${Date.now()}_1`,
          sessionNumber: 1,
          name: 'Sessão 1: moldagem, entrega de moldeiras e cor inicial',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 45,
          toleranceDays: 0,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva', 'habits'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
        {
          id: `sess_${Date.now()}_2`,
          sessionNumber: 2,
          name: 'Sessão 2: acompanhamento clínico (7 dias)',
          type: 'EVALUATION',
          daysFromPrevious: 7,
          durationMinutes: 30,
          toleranceDays: 2,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
        {
          id: `sess_${Date.now()}_3`,
          sessionNumber: 3,
          name: 'Sessão 3: avaliação de cor final e encerramento (21 dias)',
          type: 'EVALUATION',
          daysFromPrevious: 14,
          durationMinutes: 30,
          toleranceDays: 3,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
      ];
    } else if (presetType === 'office_single') {
      sessions = [
        {
          id: `sess_${Date.now()}_1`,
          sessionNumber: 1,
          name: 'Sessão 1: tomada de cor inicial e aplicação única',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 60,
          toleranceDays: 0,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva', 'habits'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
        {
          id: `sess_${Date.now()}_2`,
          sessionNumber: 2,
          name: 'Sessão 2: retorno de avaliação de cor (7 dias)',
          type: 'EVALUATION',
          daysFromPrevious: 7,
          durationMinutes: 30,
          toleranceDays: 2,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
      ];
    } else if (presetType === 'office_intensive') {
      sessions = [
        {
          id: `sess_${Date.now()}_1`,
          sessionNumber: 1,
          name: 'Sessão 1: tomada de cor inicial e 1ª aplicação',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 60,
          toleranceDays: 0,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva', 'habits'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
        {
          id: `sess_${Date.now()}_2`,
          sessionNumber: 2,
          name: 'Sessão 2: 2ª aplicação clínica',
          type: 'CLINICAL',
          daysFromPrevious: 7,
          durationMinutes: 60,
          toleranceDays: 2,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
        {
          id: `sess_${Date.now()}_3`,
          sessionNumber: 3,
          name: 'Sessão 3: 3ª aplicação clínica',
          type: 'CLINICAL',
          daysFromPrevious: 7,
          durationMinutes: 60,
          toleranceDays: 2,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
        {
          id: `sess_${Date.now()}_4`,
          sessionNumber: 4,
          name: 'Sessão 4: retorno final (estabilidade de cor e satisfação)',
          type: 'EVALUATION',
          daysFromPrevious: 7,
          durationMinutes: 30,
          toleranceDays: 3,
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
        },
      ];
    }
    if (isEdit) {
      setEditStudySessions(sessions);
    } else {
      setStudySessions(sessions);
    }
  };

  const renderSessionCard = (s: StudySessionProtocol, idx: number, isEdit: boolean) => {
    const list = isEdit ? editStudySessions : studySessions;
    const requiresProms = s.requiresPatientQuestionnaire !== false;
    const activeQIds = s.patientQuestionnaireIds || ['eva'];
    const clinicalMods = s.clinicalModules || {
      toothMapping: true,
      colorGuide: true,
      painVAS: true,
      softTissueExam: true,
    };

    return (
      <div
        key={s.id || idx}
        className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs hover:border-slate-300 transition"
      >
        {/* Cabeçalho da Consulta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {s.sessionNumber}
            </span>
            <span className="text-xs font-bold text-slate-900">
              {s.sessionNumber === 1
                ? 'Consulta 1: linha de base (dia 0)'
                : `Consulta ${s.sessionNumber}`}
            </span>
            {s.sessionNumber > 1 ? (
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                +{s.daysFromPrevious} dias
              </span>
            ) : (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Início do clareamento
              </span>
            )}
          </div>
          {list.length > 1 && (
            <button
              type="button"
              onClick={() => handleRemoveSession(idx, isEdit)}
              className="text-slate-400 hover:text-red-600 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Remover esta consulta do cronograma"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Linha de Nome e Intervalo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Nome da consulta / procedimento
            </label>
            <input
              type="text"
              value={s.name}
              onChange={(e) => handleUpdateSession(idx, 'name', e.target.value, isEdit)}
              placeholder="Ex: Sessão 1: tomada de cor e 1ª aplicação"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {s.sessionNumber > 1 ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Dias após consulta anterior</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={s.daysFromPrevious}
                  onChange={(e) => handleUpdateSession(idx, 'daysFromPrevious', Math.max(1, Number(e.target.value)), isEdit)}
                  className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-bold text-center focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-500 font-medium">dias</span>
              </div>
            </div>
          ) : (
            <div className="flex items-end pb-1.5">
              <span className="text-[11px] text-slate-500 font-medium">
                Consulta inicial no mocho
              </span>
            </div>
          )}
        </div>

        {/* Avaliações Clínicas na Cadeira (Específico Clareamento) */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              <span>Exames realizados na cadeira pelo pesquisador:</span>
            </span>
            <span className="text-[10px] text-slate-400">Clique para alternar</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
            {[
              { key: 'colorGuide' as const, label: 'Tomada de cor (VITA)', icon: '🎨' },
              { key: 'painVAS' as const, label: 'Sensibilidade na cadeira (EVA)', icon: '⚡' },
              { key: 'toothMapping' as const, label: 'Dentes clareados', icon: '🦷' },
              { key: 'softTissueExam' as const, label: 'Exame de tecidos / gengiva', icon: '🔬' },
            ].map((mod) => {
              const isModActive = clinicalMods[mod.key] ?? false;
              return (
                <button
                  key={mod.key}
                  type="button"
                  onClick={() => handleToggleSessionClinicalModule(idx, mod.key, isEdit)}
                  className={`p-2 rounded-lg border text-left transition text-[11px] flex items-center gap-1.5 cursor-pointer ${
                    isModActive
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>{mod.icon}</span>
                  <span className="truncate">{mod.label}</span>
                  {isModActive && <Check className="w-3 h-3 ml-auto text-blue-600 stroke-[3]" />}
                </button>
              );
            })}
          </div>

          {/* Sub-seleção dos Modelos de Tomada de Cor */}
          {clinicalMods.colorGuide && (
            <div className="mt-2.5 p-3 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Modelos de tomada de cor selecionados:</span>
                </span>
                <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-full">
                  {(clinicalMods.colorModels || ['VITA_CLASSICAL']).length} de 3 modelos ativos
                </span>
              </div>
              <p className="text-[10px] text-amber-900/80 leading-snug">
                Selecione quais e quantos dos 3 modelos serão utilizados nesta consulta. Cada um disponibilizará os campos correspondentes no prontuário.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                {COLOR_MODEL_OPTIONS.map((cMod) => {
                  const activeModels = clinicalMods.colorModels || ['VITA_CLASSICAL'];
                  const isChecked = activeModels.includes(cMod.id);
                  return (
                    <button
                      key={cMod.id}
                      type="button"
                      onClick={() => handleToggleSessionColorModel(idx, cMod.id, isEdit)}
                      className={`p-2 rounded-lg border text-left transition text-xs flex flex-col justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-white border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400'
                          : 'bg-white/60 border-amber-200/60 text-slate-500 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold flex items-center gap-1 text-[11px] text-slate-900">
                          <span>{cMod.icon}</span>
                          <span>{cMod.name}</span>
                        </span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          isChecked ? 'bg-amber-500 text-white' : 'border border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-800 font-medium">{cMod.badge}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 leading-tight">{cMod.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Formulários eCRF Aplicados na Consulta pelo Pesquisador (se houver instrumentos configurados para o pesquisador) */}
        {(() => {
          const allForms = isEdit ? editFormTargets : formTargets;
          const researcherForms = allForms.filter(
            (f) => f.enabled && f.id !== 'anamnesis' && f.id !== 'odontogram' && f.respondent === 'RESEARCHER'
          );
          if (researcherForms.length === 0) return null;
          const sessionForms = s.forms || [];
          return (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                  <span>Formulários eCRF aplicados nesta consulta (pesquisador):</span>
                </span>
                <span className="text-[10px] text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-full font-semibold">
                  {sessionForms.length} vinculados
                </span>
              </div>
              <p className="text-[10px] text-blue-900/80 leading-snug">
                Selecione quais instrumentos criados no eCRF serão preenchidos pela equipe durante esta consulta:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {researcherForms.map((rf) => {
                  const isChecked = sessionForms.includes(rf.id);
                  return (
                    <button
                      key={rf.id}
                      type="button"
                      onClick={() => {
                        const next = isChecked ? sessionForms.filter((id) => id !== rf.id) : [...sessionForms, rf.id];
                        handleUpdateSession(idx, 'forms', next, isEdit);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isChecked
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{rf.icon || '📋'}</span>
                      <span>{rf.title}</span>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Questionário / Diário do Paciente no Celular */}
        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-[11px] text-indigo-900">
              <input
                type="checkbox"
                checked={requiresProms}
                onChange={(e) => handleUpdateSession(idx, 'requiresPatientQuestionnaire', e.target.checked, isEdit)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
              <span>Paciente responde questionário ou diário no celular após esta consulta?</span>
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              requiresProms ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {requiresProms ? 'Ativo' : 'Não'}
            </span>
          </div>

          {requiresProms && (
            <div className="space-y-3 pt-2 border-t border-indigo-100">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Questionários do eCRF encaminhados ao celular:</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full font-semibold">
                    {activeQIds.length} selecionados
                  </span>
                </div>
                <p className="text-[10px] text-indigo-900/80 mb-2 leading-snug">
                  Selecione quais questionários personalizados no Passo 3 (eCRF) serão disponibilizados para o paciente responder no celular:
                </p>

                {(() => {
                  const allForms = isEdit ? editFormTargets : formTargets;
                  const patientForms = allForms.filter(
                    (f) => f.enabled && f.id !== 'anamnesis' && f.id !== 'odontogram' && f.respondent !== 'RESEARCHER'
                  );
                  const displayForms = patientForms.length > 0
                    ? patientForms
                    : allForms.filter((f) => f.enabled && f.id !== 'anamnesis' && f.id !== 'odontogram');

                  if (displayForms.length === 0) {
                    return (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        Nenhum questionário está habilitado no eCRF. Volte à etapa do Construtor de eCRF para habilitar instrumentos (como Sensibilidade EVA, Satisfação, etc.).
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {displayForms.map((cat) => {
                        const isChecked = activeQIds.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleToggleSessionQuestionnaire(idx, cat.id, isEdit)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              isChecked
                                ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-700'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{cat.icon || '📝'}</span>
                            <span>{cat.title}</span>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Seletor de Periodicidade Domiciliar Individual por Questionário */}
              {activeQIds.length > 0 && (
                <div className="space-y-3 pt-2.5 border-t border-indigo-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Periodicidade de resposta no celular (individual por questionário):</span>
                    </label>
                    <span className="text-[10px] text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full font-medium">
                      {activeQIds.length} {activeQIds.length === 1 ? 'questionário configurado' : 'questionários configurados'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Personalize a frequência com que o paciente responderá cada questionário entre esta consulta e a próxima (ex: Diário de Sensibilidade a cada 24h e OHIP-14 uma única vez):
                  </p>

                  <div className="space-y-2.5">
                    {(() => {
                      const allForms = isEdit ? editFormTargets : formTargets;
                      const selectedForms = allForms.filter((f) => activeQIds.includes(f.id));

                      return selectedForms.map((qForm) => {
                        const qFreq = getQuestionnaireFreq(s, qForm.id);
                        const qCustom = getQuestionnaireCustom(s, qForm.id);
                        const isCustom = qFreq === 'CUSTOM';

                        return (
                          <div
                            key={qForm.id}
                            className="p-3 bg-white rounded-xl border border-indigo-200/80 shadow-2xs space-y-2 transition"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base shrink-0">{qForm.icon || '📝'}</span>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 block truncate">
                                    {qForm.title}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {qForm.questions?.length || 0} {qForm.questions?.length === 1 ? 'pergunta' : 'perguntas'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                {qFreq === 'GCP_HOURS'
                                  ? '⏱️ Padrão GCP'
                                  : qFreq === 'DAILY'
                                  ? '📅 Diário (24h)'
                                  : qFreq === 'EVERY_48H'
                                  ? '⏳ A cada 48h'
                                  : qFreq === 'WEEKLY'
                                  ? '📆 Semanal (7d)'
                                  : qFreq === 'BIWEEKLY'
                                  ? '🗓️ Quinzenal (14d)'
                                  : qFreq === 'ONCE'
                                  ? '🎯 Única vez'
                                  : '⚙️ Personalizado'}
                              </span>
                            </div>

                            {/* Grade de Frequências para este questionário específico */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 pt-0.5">
                              {[
                                { id: 'GCP_HOURS', label: 'Padrão GCP', desc: '0h, 1h, 24h e 48h', icon: '⏱️' },
                                { id: 'DAILY', label: 'Diário (24h)', desc: 'A cada 24 horas', icon: '📅' },
                                { id: 'EVERY_48H', label: 'A cada 48h', desc: 'Dia sim / não', icon: '⏳' },
                                { id: 'WEEKLY', label: 'Semanal (7d)', desc: 'A cada 7 dias', icon: '📆' },
                                { id: 'BIWEEKLY', label: 'Quinzenal', desc: 'A cada 14 dias', icon: '🗓️' },
                                { id: 'ONCE', label: 'Única vez', desc: 'Pontual pós-sessão', icon: '🎯' },
                                { id: 'CUSTOM', label: 'Personalizado', desc: 'Configurar dias', icon: '⚙️' },
                              ].map((freq) => {
                                const isSelected = qFreq === freq.id;
                                return (
                                  <button
                                    key={freq.id}
                                    type="button"
                                    onClick={() => handleUpdateQuestionnaireFrequency(idx, qForm.id, freq.id, isEdit)}
                                    className={`p-1.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold ring-1 ring-indigo-600'
                                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-indigo-50/50'
                                    }`}
                                  >
                                    <span className="text-[11px] flex items-center gap-1 font-bold">
                                      <span>{freq.icon}</span>
                                      <span className="truncate">{freq.label}</span>
                                    </span>
                                    <span className={`text-[9px] mt-0.5 truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                      {freq.desc}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Seletor Customizado se CUSTOM selecionado */}
                            {isCustom && (
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 animate-in fade-in">
                                <label className="text-[11px] font-semibold text-slate-700">Responder a cada:</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={180}
                                  value={qCustom.days || 3}
                                  onChange={(e) =>
                                    handleUpdateQuestionnaireCustomInterval(
                                      idx,
                                      qForm.id,
                                      'days',
                                      Math.max(1, Number(e.target.value)),
                                      isEdit
                                    )
                                  }
                                  className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white font-bold text-center focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-[11px] text-slate-600 font-medium">dias até o próximo retorno</span>
                                <input
                                  type="text"
                                  value={qCustom.description || ''}
                                  onChange={(e) =>
                                    handleUpdateQuestionnaireCustomInterval(
                                      idx,
                                      qForm.id,
                                      'description',
                                      e.target.value,
                                      isEdit
                                    )
                                  }
                                  placeholder="Observação (ex: nos dias pares de uso do gel caseiro)"
                                  className="flex-1 min-w-[200px] px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleUpdateFormTarget = (
    id: string,
    field: keyof FormTargetProtocol,
    value: any,
    isEdit: boolean
  ) => {
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== id) return f;
      return { ...f, [field]: value };
    });
    if (isEdit) {
      setEditFormTargets(updated);
    } else {
      setFormTargets(updated);
    }
  };

  // Modal de exclusão de projeto (Exclusivo para ADMIN)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setEditTab('GENERAL');
    setEditProjectName(p.name);
    setEditProjectDesc(p.description || '');
    setEditProjectStatus(
      p.status === 'COMPLETED' ? 'COMPLETED' : p.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE'
    );

    let tpl: any = {};
    if (p.anamnesisTemplate) {
      try {
        tpl = typeof p.anamnesisTemplate === 'string' ? JSON.parse(p.anamnesisTemplate) : p.anamnesisTemplate;
      } catch (e) {}
    }

    setEditEnableOdontogram(tpl.enableOdontogram !== false);
    setEditOdontogramScope(tpl.odontogramScope || 'anterior');
    setEditEnablePeriodontogram(Boolean(tpl.enablePeriodontogram));
    setEditEnableAnamnesis(tpl.enableAnamnesis !== false);

    const protocol = parseStudyProtocol(p.anamnesisTemplate);
    setEditStudySessions(protocol.sessions);
    setEditFormTargets(protocol.forms);
    setEditProjectPrefix(protocol.projectPrefix || '');
    setEditProjectSpecialty(protocol.specialty || 'BLEACHING');
    setEditProjectGroups(protocol.groups || []);
    setEditNewGroupInput('');
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectName.trim()) return;

    const targetProject = editingProject;
    const previousProjects = [...projects];

    let existingTemplate: any = {};
    if (targetProject.anamnesisTemplate) {
      try {
        existingTemplate =
          typeof targetProject.anamnesisTemplate === 'string'
            ? JSON.parse(targetProject.anamnesisTemplate)
            : targetProject.anamnesisTemplate;
      } catch (e) {}
    }

    const updatedTemplate = {
      ...existingTemplate,
      enableOdontogram: editEnableOdontogram,
      odontogramScope: editOdontogramScope,
      enablePeriodontogram: editEnablePeriodontogram,
      enableAnamnesis: editEnableAnamnesis,
      studyProtocol: {
        specialty: editProjectSpecialty,
        projectPrefix: editProjectPrefix.trim().toUpperCase() || undefined,
        totalSessions: editStudySessions.length,
        sessions: editStudySessions,
        forms: editFormTargets.filter((f) => f.id !== 'anamnesis' && f.id !== 'odontogram'),
        groups: editProjectGroups.filter(Boolean),
      },
    };

    const updatedProjectLocally: Project = {
      ...targetProject,
      name: editProjectName.trim(),
      description: editProjectDesc.trim() || null,
      status: editProjectStatus,
      anamnesisTemplate: updatedTemplate,
    };

    // 1. Resposta imediata em 0 ms: fecha modal e atualiza interface
    setProjects((prev) =>
      prev.map((p) => (p.id === targetProject.id ? { ...p, ...updatedProjectLocally } : p))
    );
    setEditingProject(null);
    setSavingEdit(false);

    // 2. Persiste no cache local de forma atômica
    try {
      const newProjects = projects.map((p) =>
        p.id === targetProject.id ? { ...p, ...updatedProjectLocally } : p
      );
      localStorage.setItem('uepg_cached_projects', JSON.stringify(newProjects));
      if (currentUser?.id) {
        localStorage.setItem(`uepg_cached_projects_${currentUser.id}`, JSON.stringify(newProjects));
      }
    } catch (e) {}

    // 3. Sincronização em segundo plano com o servidor
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/projects/${targetProject.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: editProjectName.trim(),
          description: editProjectDesc.trim() || null,
          status: editProjectStatus,
          anamnesisTemplate: updatedTemplate,
        }),
      });

      if (!res.ok) {
        // Reverte se houve erro do servidor
        setProjects(previousProjects);
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erro ao salvar alterações do projeto.');
      }
    } catch (err) {
      console.error('Erro ao atualizar projeto em segundo plano:', err);
      setProjects(previousProjects);
      alert('Erro de conexão ao salvar alterações do projeto.');
    }
  };

  // Exclusão definitiva de projeto por ADMIN
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      setDeletingProject(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // Remove do estado e do cache
        const remaining = projects.filter((p) => p.id !== projectToDelete.id);
        setProjects(remaining);
        try {
          localStorage.setItem('uepg_cached_projects', JSON.stringify(remaining));
          if (currentUser?.id) {
            localStorage.setItem(`uepg_cached_projects_${currentUser.id}`, JSON.stringify(remaining));
          }
        } catch (e) {}

        setProjectToDelete(null);
        if (editingProject?.id === projectToDelete.id) {
          setEditingProject(null);
        }
      } else {
        setDeleteError(data.error || 'Não foi possível excluir este projeto.');
      }
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
      setDeleteError('Erro de conexão ao tentar excluir o projeto.');
    } finally {
      setDeletingProject(false);
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
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
    }
    throw lastError;
  };

  const loadData = async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    setLoadError(null);

    try {
      const res = await fetchWithRetry('/api/projects', 35000, 2);

      // Se a sessão expirou, redireciona para o login
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('uepg_auth_token');
          localStorage.removeItem('uepg_cached_user');
          localStorage.removeItem('uepg_cached_projects');
          window.location.href = '/login?from=/';
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const projectList = data.projects || [];
        setProjects(projectList);
        setCurrentUser(data.currentUser || null);

        // Salva no cache local particionado pelo ID do usuário autenticado
        try {
          if (data.currentUser?.id) {
            localStorage.setItem(`uepg_cached_projects_${data.currentUser.id}`, JSON.stringify(projectList));
            localStorage.setItem('uepg_cached_user', JSON.stringify(data.currentUser));
          }
          localStorage.setItem('uepg_cached_projects', JSON.stringify(projectList));
        } catch (e) {}

        setLoading(false);

        // Se for admin, carrega aprovações em segundo plano
        if (data.currentUser?.role === 'ADMIN') {
          const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
          fetch('/api/admin/users', {
            credentials: 'include',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((uData) => {
              if (uData?.users) {
                const pending = uData.users.filter((u: any) => !u.isApproved);
                setPendingUsers(pending);
              }
            })
            .catch(() => {});
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (projects.length === 0) {
          setLoadError(errData.error || 'Não foi possível carregar os dados mais recentes do servidor.');
        }
      }
    } catch (e: any) {
      console.error('Erro ao carregar projetos:', e);
      if (projects.length === 0) {
        if (e.name === 'AbortError') {
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
    // 1. Interceptar e registrar auth_token da URL caso tenha vindo do redirecionamento do login
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

    // 2. Carregamento seguro particionado por usuário via Cache Local
    if (typeof window !== 'undefined') {
      try {
        const cachedUserStr = localStorage.getItem('uepg_cached_user');
        const cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
        if (cachedUser) {
          setCurrentUser(cachedUser);
          const userKey = `uepg_cached_projects_${cachedUser.id}`;
          const cached = localStorage.getItem(userKey) || localStorage.getItem('uepg_cached_projects');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Verificação defensiva de segurança: garante que pesquisadores não vejam projetos alheios em hipótese alguma
              const isUserAdmin = cachedUser.role === 'ADMIN' || cachedUser.email === 'admin@uepg.br';
              const validProjects = isUserAdmin
                ? parsed
                : parsed.filter((p: Project) =>
                    p.members?.some((m) => m.user?.id === cachedUser.id || (m as any).userId === cachedUser.id)
                  );
              if (validProjects.length > 0) {
                setProjects(validProjects);
                setLoading(false);
              }
            }
          }
        } else {
          // Fallback: se cachedUser ainda não foi sincronizado, renderiza os projetos em cache imediatamente (0 ms)
          const cached = localStorage.getItem('uepg_cached_projects');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setProjects(parsed);
              setLoading(false);
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao ler cache local de projetos:', e);
      }
    }

    loadData();
  }, []);

  const handleAddProjectGroup = (name?: string) => {
    const groupName = (name || newGroupInput).trim();
    if (!groupName) return;
    if (newProjectGroups.includes(groupName)) {
      setNewGroupInput('');
      return;
    }
    setNewProjectGroups((prev) => [...prev, groupName]);
    setNewGroupInput('');
  };

  const handleRemoveProjectGroup = (index: number) => {
    setNewProjectGroups((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleApplyNewProjectGroupPreset = (preset: 'parallel' | 'split' | 'three') => {
    if (preset === 'parallel') {
      setNewProjectGroups(['Grupo A: Controle (HP 35%)', 'Grupo B: Teste (Gel Experimental)']);
    } else if (preset === 'split') {
      setNewProjectGroups([
        'Hemiarco Direito: HP 35% / Hemiarco Esquerdo: CP 16%',
        'Hemiarco Direito: CP 16% / Hemiarco Esquerdo: HP 35%',
      ]);
    } else if (preset === 'three') {
      setNewProjectGroups([
        'Grupo 1: HP 35% convencional',
        'Grupo 2: HP 20% com luz violeta/LED',
        'Grupo 3: CP 37% de consultório',
      ]);
    }
  };

  const handleNextCreateStep = () => {
    setCreateStepError(null);
    if (createStep === 1) {
      if (!newProjectName.trim()) {
        setCreateStepError('O nome do estudo / ensaio clínico é obrigatório para avançar.');
        return;
      }
      setCreateStep(2);
    } else if (createStep === 2) {
      setCreateStep(3);
    } else if (createStep === 3) {
      setCreateStep(4);
    } else if (createStep === 4) {
      setCreateStep(5);
    }
  };

  const handlePrevCreateStep = () => {
    setCreateStepError(null);
    if (createStep > 1) {
      setCreateStep((prev) => prev - 1);
    }
  };

  const handleCreateProject = async (
    e: React.FormEvent,
    targetDestination: 'anamnese' | 'dashboard' = 'dashboard'
  ) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newProjectName.trim()) {
      setCreateStep(1);
      setCreateStepError('O nome do estudo / ensaio clínico é obrigatório.');
      return;
    }

    try {
      setCreating(true);
      const parsedN = parseInt(newProjectTargetParticipants) || 30;
      const initialTemplate = {
        targetSampleSize: parsedN,
        plannedParticipants: parsedN,
        enableOdontogram,
        odontogramScope,
        enablePeriodontogram,
        periodontogramFields: {
          bleedingOnProbing: true,
          visiblePlaque: true,
          probingDepth: false,
          gingivalRecession: true,
          furcationOrMobility: false,
        },
        enableAnamnesis,
        questions: enableAnamnesis ? newProjectQuestions : [],
        studyProtocol: {
          specialty: newProjectSpecialty,
          targetSampleSize: parsedN,
          plannedParticipants: parsedN,
          totalSessions: studySessions.length,
          sessions: studySessions,
          forms: formTargets.filter((f) => f.id !== 'anamnesis' && f.id !== 'odontogram'),
          groups: newProjectGroups.map((g) => g.trim()).filter(Boolean),
        },
      };

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          status: newProjectStatus,
          anamnesisTemplate: initialTemplate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsCreateModalOpen(false);
        setCreateStep(1);
        setCreateStepError(null);
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectGroups(['Grupo 1: Convencional (HP 35%)', 'Grupo 2: Experimental (HP 20%)']);
        setNewGroupInput('');
        setNewProjectTargetParticipants('30');
        setNewProjectQuestions(DEFAULT_PROJECT_ANAMNESIS_QUESTIONS);
        setNewQuestionTitle('');
        setNewCustomFormTitle('');
        setEnableOdontogram(true);
        setOdontogramScope('anterior');
        setNewProjectStatus('ACTIVE');
        setNewProjectSpecialty('GENERAL');
        setStudySessions(DEFAULT_STUDY_SESSIONS);
        setFormTargets(DEFAULT_FORM_TARGETS);
        if (data.project?.id) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_active_project_id', data.project.id);
          }
          if (targetDestination === 'anamnese') {
            router.push(`/anamnese?projectId=${data.project.id}&new=true`);
          } else {
            router.push(`/dashboard?projectId=${data.project.id}`);
          }
        } else {
          loadData();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Erro ao criar projeto.');
      }
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
      alert('Erro de comunicação ao criar projeto.');
    } finally {
      setCreating(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ userId, isApproved: true }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Erro ao aprovar usuário:', err);
    }
  };

  // Estatísticas de contagem por status e participantes
  const counts = useMemo(() => {
    const total = projects.length;
    let active = 0;
    let completed = 0;
    let cancelled = 0;
    let totalApproved = 0;
    let totalPending = 0;

    for (const p of projects) {
      const st = p.status || 'ACTIVE';
      if (st === 'ACTIVE') active++;
      else if (st === 'COMPLETED') completed++;
      else if (st === 'CANCELLED') cancelled++;

      for (const part of p.participants || []) {
        if (part.status === 'APPROVED') totalApproved++;
        else if (part.status === 'PENDING') totalPending++;
      }
    }

    return { total, active, completed, cancelled, totalApproved, totalPending };
  }, [projects]);

  // Filtragem combinada por Status e Busca
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const projectStatus = project.status || 'ACTIVE';

      // Filtro de status
      if (statusFilter !== 'ALL' && projectStatus !== statusFilter) {
        return false;
      }

      // Filtro de busca textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = project.name.toLowerCase().includes(query);
        const matchDesc = (project.description || '').toLowerCase().includes(query);
        if (!matchName && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-800">
      {/* Conteúdo Principal */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 flex-1">
        {/* Painel do Administrador: Aprovações Pendentes */}
        {currentUser?.role === 'ADMIN' && pendingUsers.length > 0 && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-amber-900">
                    Novos pesquisadores aguardando aprovação
                  </h2>
                  <p className="text-xs text-amber-700">
                    Pesquisadores ou alunos cadastrados que necessitam de autorização prévia.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-bold">
                {pendingUsers.length} pendente(s)
              </span>
            </div>

            <div className="space-y-3">
              {pendingUsers.map((u) => (
                <div
                  key={u.id}
                  className="bg-white p-4 rounded-xl border border-amber-100 flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <button
                    onClick={() => handleApproveUser(u.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar acesso</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topo Limpo & Intuitivo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Projetos de pesquisa</span>
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing || loading}
                title="Recarregar projetos"
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Selecione um estudo para realizar atendimentos clínicos ou gerenciar voluntários.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow transition flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo estudo clínico</span>
          </button>
        </div>

        {/* Barra de Filtros, Busca e Alternador de Visão */}
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Abas de Filtros por Status */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Todos</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === 'ALL' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ativos</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === 'ACTIVE' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-200/70 text-emerald-900'
                }`}
              >
                {counts.active}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'COMPLETED'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Finalizados</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === 'COMPLETED' ? 'bg-blue-700 text-blue-100' : 'bg-blue-200/70 text-blue-900'
                }`}
              >
                {counts.completed}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'CANCELLED'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Cancelados</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === 'CANCELLED' ? 'bg-slate-600 text-slate-100' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.cancelled}
              </span>
            </button>
          </div>

          {/* Campo de Busca Rápida + Alternador de Visualização */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] sm:min-w-[240px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou descrição..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Alternador Grade / Lista */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => handleChangeViewMode('grid')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Visualização em grade compacta"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleChangeViewMode('list')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Visualização em lista / tabela"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Alerta de Erro de Conexão (quando temos versão em cache) */}
        {loadError && projects.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{loadError} Exibindo versão local em cache.</span>
            </div>
            <button
              onClick={() => loadData(true)}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 font-bold rounded-lg transition shrink-0 cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Estado de Carregamento Inicial (Sem cache) */}
        {loading && projects.length === 0 && (
          <div className="py-20 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Carregando projetos de pesquisa...</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Conectando com segurança ao banco de dados clínico da UEPG.
            </p>
          </div>
        )}

        {/* Estado de Erro Grave (Sem cache e falha) */}
        {!loading && loadError && projects.length === 0 && (
          <div className="py-12 text-center text-slate-700 bg-white rounded-2xl border border-red-200 p-8 shadow-xs max-w-lg mx-auto my-8">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Não foi possível carregar os projetos</h3>
            <p className="text-xs text-slate-500 mb-6">{loadError}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => loadData(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>
              <Link
                href="/login?from=/"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar novamente</span>
              </Link>
            </div>
          </div>
        )}

        {/* Grid de Projetos */}
        {(projects.length > 0 || (!loading && !loadError)) && (
          <>
            {filteredProjects.length === 0 && projects.length > 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto my-6">
                <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Nenhum projeto encontrado</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Nenhum estudo corresponde aos filtros selecionados. Tente limpar os filtros ou o termo de busca.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* Visualização em Grade Compacta */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredProjects.map((project) => {
                  const myMember = (project.members || []).find(
                    (m) => m.user?.id === currentUser?.id
                  );
                  const roleLabels: Record<string, string> = {
                    COORDINATOR: 'Coordenador',
                    CO_ADVISOR: 'Co-orientador',
                    OPERATOR: 'Operador',
                    EVALUATOR: 'Avaliador',
                  };
                  const roleName = roleLabels[myMember?.role || ''] || 'Pesquisador';
                  const isBlinded = myMember?.isBlinded ?? false;
                  const approvedCount = (project.participants || []).filter((p) => p.status === 'APPROVED').length;
                  const pendingCount = (project.participants || []).filter((p) => p.status === 'PENDING').length;
                  const formsCount = (project.forms || []).length;
                  const pStatus = project.status || 'ACTIVE';
                  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br';
                  const proto = parseStudyProtocol(project.anamnesisTemplate);

                  return (
                    <div key={project.id} className="block group">
                      <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-slate-200/90 hover:border-blue-400/80 p-5 h-full transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
                        {/* Indicador sutil de topo */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                          pStatus === 'ACTIVE'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : pStatus === 'COMPLETED'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-500'
                            : 'bg-slate-300'
                        }`} />

                        <div>
                          {/* Linha de Badges de Status e Papel */}
                          <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {pStatus === 'ACTIVE' && (
                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold rounded-full flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Ativo</span>
                                </span>
                              )}
                              {pStatus === 'COMPLETED' && (
                                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-bold rounded-full flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                  <span>Finalizado</span>
                                </span>
                              )}
                              {pStatus === 'CANCELLED' && (
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold rounded-full flex items-center gap-1.5">
                                  <X className="w-3 h-3 text-slate-500" />
                                  <span>Cancelado</span>
                                </span>
                              )}
                            </div>

                            <div>
                              {isBlinded ? (
                                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/80 text-[11px] font-bold rounded-full flex items-center space-x-1">
                                  <EyeOff className="w-3 h-3 text-purple-600" />
                                  <span>Avaliador cego</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-full border border-slate-200/60">
                                  {roleName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Título e Descrição */}
                          <Link href={`/dashboard?projectId=${project.id}`} className="block">
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug" title={project.name}>
                              {project.name}
                            </h3>
                          </Link>

                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 min-h-[34px] leading-relaxed">
                            {project.description || 'Ensaio clínico odontológico registrado no sistema.'}
                          </p>

                          {/* Chips Compactos de Métricas */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px] font-medium">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              <strong className="text-slate-900">{approvedCount}</strong> voluntários
                            </span>
                            {pendingCount > 0 && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-medium">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <strong className="text-amber-900">{pendingCount}</strong> triagem
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 border border-indigo-100 text-indigo-700 text-[11px] font-medium">
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{formsCount} {formsCount === 1 ? 'eCRF' : 'eCRFs'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Barra de Ações em Linha Única */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                          <Link
                            href={`/dashboard?projectId=${project.id}`}
                            className="flex-1 py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 shadow-xs hover:shadow"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Abrir prontuário</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(project);
                            }}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 transition cursor-pointer shrink-0"
                            title="Configurar particularidades do estudo, Odontograma e eCRF"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteError(null);
                                setProjectToDelete(project);
                              }}
                              title="Excluir projeto de pesquisa (apenas administrador)"
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Card Compacto para Criar Novo Projeto */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-slate-50/70 hover:bg-blue-50/40 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 min-h-[190px] flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-slate-200 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white text-slate-500 flex items-center justify-center mb-2.5 transition-all">
                    <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                    Criar Novo Estudo
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 max-w-[210px] leading-snug">
                    Configurar protocolo clínico, cronograma e formulários
                  </span>
                </button>
              </div>
            ) : (
              /* Visualização em Lista / Tabela de Alta Densidade */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                      <tr>
                        <th scope="col" className="px-4 sm:px-6 py-3">Estudo / descrição</th>
                        <th scope="col" className="px-4 py-3 hidden md:table-cell">Papel</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                        <th scope="col" className="px-4 py-3 hidden sm:table-cell">Participantes</th>
                        <th scope="col" className="px-4 py-3 hidden lg:table-cell">eCRFs</th>
                        <th scope="col" className="px-4 sm:px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProjects.map((project) => {
                        const myMember = (project.members || []).find(
                          (m) => m.user?.id === currentUser?.id
                        );
                        const roleLabels: Record<string, string> = {
                          COORDINATOR: 'Coordenador',
                          CO_ADVISOR: 'Co-orientador',
                          OPERATOR: 'Operador',
                          EVALUATOR: 'Avaliador',
                        };
                        const roleName = roleLabels[myMember?.role || ''] || 'Pesquisador';
                        const isBlinded = myMember?.isBlinded ?? false;
                        const approvedCount = (project.participants || []).filter((p) => p.status === 'APPROVED').length;
                        const pendingCount = (project.participants || []).filter((p) => p.status === 'PENDING').length;
                        const formsCount = (project.forms || []).length;
                        const pStatus = project.status || 'ACTIVE';
                        const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br';

                        return (
                          <tr key={project.id} className="hover:bg-slate-50/70 transition-colors group">
                            <td className="px-4 sm:px-6 py-3.5">
                              <Link href={`/dashboard?projectId=${project.id}`} className="block">
                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                                  {project.name}
                                </span>
                                {project.description && (
                                  <p className="text-slate-400 text-xs truncate max-w-xs sm:max-w-md mt-1">
                                    {project.description}
                                  </p>
                                )}
                              </Link>
                            </td>
                            <td className="px-4 py-3.5 hidden md:table-cell whitespace-nowrap">
                              {isBlinded ? (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 text-[11px] font-bold rounded-full inline-flex items-center gap-1">
                                  <EyeOff className="w-3 h-3" />
                                  <span>Avaliador cego</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full">
                                  {roleName}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {pStatus === 'ACTIVE' && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-bold rounded-full inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Ativo</span>
                                </span>
                              )}
                              {pStatus === 'COMPLETED' && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 text-[11px] font-bold rounded-full inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                  <span>Finalizado</span>
                                </span>
                              )}
                              {pStatus === 'CANCELLED' && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold rounded-full inline-flex items-center gap-1">
                                  <X className="w-3 h-3 text-slate-500" />
                                  <span>Cancelado</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  <strong>{approvedCount}</strong> ativos
                                </span>
                                {pendingCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-medium">
                                    {pendingCount} triagem
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 hidden lg:table-cell whitespace-nowrap text-slate-600">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50/60 border border-blue-100 text-blue-700 text-[11px] font-medium">
                                <FileText className="w-3 h-3 text-blue-500" />
                                {formsCount} {formsCount === 1 ? 'eCRF' : 'eCRFs'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  href={`/dashboard?projectId=${project.id}`}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition shadow-2xs"
                                >
                                  <Activity className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Prontuário</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(project);
                                  }}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 transition cursor-pointer"
                                  title="Configurar particularidades do estudo, Odontograma e eCRF"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteError(null);
                                      setProjectToDelete(project);
                                    }}
                                    title="Excluir projeto de pesquisa (apenas administrador)"
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Rodapé da tabela com botão rápido para novo projeto */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>Exibindo <strong>{filteredProjects.length}</strong> de <strong>{counts.total}</strong> estudos</span>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar novo estudo</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Criação de Projeto por Etapas (Wizard em Tela Inteira) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* Header Superior em Tela Cheia */}
          <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Novo estudo clínico por etapas</h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Etapa {createStep} de 5
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Preenchimento em 5 etapas para padronização do protocolo clínico, eCRF e cronograma.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setCreateStep(1);
                setCreateStepError(null);
              }}
              className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-slate-200 shadow-2xs"
            >
              <X className="w-4 h-4" />
              <span>Sair / cancelar</span>
            </button>
          </div>

          {/* Stepper / Indicador das 5 Etapas em Largura Ampla */}
          <div className="bg-white border-b border-slate-200 shrink-0 shadow-2xs">
            <div className="max-w-6xl mx-auto grid grid-cols-5 text-xs">
              {[
                { num: 1, title: '1. Identificação', sub: 'Nome e código' },
                { num: 2, title: '2. Desenho do estudo', sub: 'Grupos do estudo' },
                { num: 3, title: '3. Construtor de eCRF', sub: 'Questionários e escalas' },
                { num: 4, title: '4. Ficha clínica', sub: 'Anamnese e odontograma' },
                { num: 5, title: '5. Cronograma', sub: 'Consultas e diários' },
              ].map((step) => {
                const isCurrent = createStep === step.num;
                const isPast = createStep > step.num;
                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => {
                      if (step.num > 1 && !newProjectName.trim()) {
                        setCreateStepError('Preencha o nome do estudo antes de avançar.');
                        setCreateStep(1);
                        return;
                      }
                      setCreateStepError(null);
                      setCreateStep(step.num);
                    }}
                    className={`py-3.5 px-3 text-left border-b-2 transition flex items-center gap-2.5 cursor-pointer ${
                      isCurrent
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-2xs font-bold'
                        : isPast
                        ? 'border-emerald-500 text-emerald-800 hover:bg-slate-50'
                        : 'border-transparent text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isPast
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPast ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.num}
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <p className="font-bold text-xs truncate leading-tight">{step.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{step.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mensagem de Erro de Etapa */}
          {createStepError && (
            <div className="bg-red-50 border-b border-red-200 text-xs text-red-700 shrink-0">
              <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-medium">{createStepError}</span>
              </div>
            </div>
          )}

          {/* Conteúdo com Scroll da Etapa Atual em Container Centralizado Amplo */}
          <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto w-full pb-10 space-y-4">
              {/* ETAPA 1: DADOS DO ESTUDO */}
              {createStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Etapa 1 de 5: Identificação do estudo de clareamento</p>
                      <p className="text-blue-800 text-[11px] mt-0.5">
                        Defina o título do ensaio clínico de clareamento dental e prefixo dos voluntários.
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 text-blue-800 text-xs font-bold border border-blue-200">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Linha de pesquisa: Clareamento dental</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Nome do estudo / ensaio clínico de clareamento *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newProjectName}
                      onChange={(e) => {
                        setNewProjectName(e.target.value);
                        if (createStepError) setCreateStepError(null);
                      }}
                      placeholder="Ex: Eficácia e sensibilidade dental de clareamento com HP 35% vs 20%: ensaio clínico randomizado"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Descrição / hipótese / metodologia (opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="Descreva brevemente o protocolo de clareamento, concentrações dos géis, critérios de inclusão/exclusão ou hipótese..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ETAPA 2: DESENHO DO ESTUDO & GRUPOS */}
              {createStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                    <Shuffle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Etapa 2 de 5: Desenho do estudo e grupos experimentais</p>
                      <p className="text-indigo-800 text-[11px] mt-0.5">
                        Defina os grupos ou braços de tratamento deste estudo. Eles ficarão salvos no protocolo e prontos para seleção rápida ao randomizar qualquer paciente.
                      </p>
                    </div>
                  </div>

                  {/* Modelos Rápidos */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Modelos rápidos pré-configurados (clique para carregar):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyNewProjectGroupPreset('parallel')}
                        className="p-2.5 border border-slate-200 rounded-xl text-left bg-white hover:bg-indigo-50/50 hover:border-indigo-300 transition text-xs cursor-pointer shadow-2xs"
                      >
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>2 grupos paralelos</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Grupo A: Controle / Grupo B: Teste</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyNewProjectGroupPreset('split')}
                        className="p-2.5 border border-slate-200 rounded-xl text-left bg-white hover:bg-indigo-50/50 hover:border-indigo-300 transition text-xs cursor-pointer shadow-2xs"
                      >
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Boca dividida (split-mouth)</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Direita vs Esquerda (HP vs CP)</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyNewProjectGroupPreset('three')}
                        className="p-2.5 border border-slate-200 rounded-xl text-left bg-white hover:bg-indigo-50/50 hover:border-indigo-300 transition text-xs cursor-pointer shadow-2xs"
                      >
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                          <span>3 grupos / doses</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Controle + Interv. A + Interv. B</p>
                      </button>
                    </div>
                  </div>

                  {/* Lista de Grupos Atualmente Configurados */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Grupos configurados no estudo ({newProjectGroups.length})
                      </label>
                      {newProjectGroups.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewProjectGroups([])}
                          className="text-[11px] text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                        >
                          Limpar todos
                        </button>
                      )}
                    </div>

                    {newProjectGroups.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                        Nenhum grupo cadastrado ainda. Use os modelos acima ou digite abaixo para adicionar.
                      </div>
                    ) : (
                      <div className="space-y-2 p-1">
                        {newProjectGroups.map((grp, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-indigo-200">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">{grp}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveProjectGroup(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="Remover grupo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campo para Criar Mais Grupos */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      + Adicionar outro grupo personalizado
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newGroupInput}
                        onChange={(e) => setNewGroupInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddProjectGroup();
                          }
                        }}
                        placeholder="Ex: Grupo C: Terapia Fotodinâmica aPDT"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddProjectGroup()}
                        disabled={!newGroupInput.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Grupo</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 3: CONSTRUTOR DE eCRF & QUESTIONÁRIOS */}
              {createStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Etapa 3 de 5: Construtor de eCRF, questionários e escalas</p>
                      <p className="text-emerald-800 text-[11px] mt-0.5">
                        Defina quais questionários, escalas clínicas (EVA, OES, OHIP) e diários serão preenchidos durante a pesquisa e personalize as perguntas e quem responde (paciente ou pesquisador).
                      </p>
                    </div>
                  </div>

                  {/* Formulários e Questionários do Protocolo */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-blue-600" />
                          <span>Questionários e escalas clínicas (eCRF)</span>
                        </label>
                        <span className="text-[11px] text-slate-500">
                          Personalize as perguntas e itens de cada escala diretamente aqui antes de criar o estudo.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setAddMethodTab('presets');
                            setShowAddMethodModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar instrumento ou questionário</span>
                        </button>
                      </div>
                    </div>

                    {/* Toast de Feedback de Modelos Salvos */}
                    {templateToast && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{templateToast}</span>
                      </div>
                    )}

                    {/* Lista de Instrumentos / Questionários do eCRF */}
                    <div className="space-y-3 p-1">
                      {formTargets.filter((f) => f.id !== 'anamnesis' && f.id !== 'odontogram').map((f) => {
                        const qList = Array.isArray(f.questions) && f.questions.length > 0
                          ? f.questions
                          : getPresetQuestionsForMethod(f.id);
                        const isExpanded = Boolean(expandedFormQuestions[f.id]);

                        return (
                          <div
                            key={f.id}
                            className={`border rounded-2xl transition-all shadow-2xs space-y-2.5 p-3.5 ${
                              f.enabled
                                ? 'bg-white border-blue-200 hover:border-blue-300'
                                : 'bg-slate-50/70 border-slate-200 opacity-75'
                            }`}
                          >
                            {/* Cabeçalho do Card do Instrumento */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  id={`chk_${f.id}`}
                                  checked={f.enabled}
                                  onChange={(e) => handleUpdateFormTarget(f.id, 'enabled', e.target.checked, false)}
                                  className="w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0"
                                />
                                <label
                                  htmlFor={`chk_${f.id}`}
                                  className="font-bold text-slate-900 text-xs cursor-pointer hover:text-blue-600 transition flex items-center gap-2 flex-wrap"
                                >
                                  <span>{f.title}</span>
                                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    {qList.length} {qList.length === 1 ? 'pergunta' : 'perguntas'}
                                  </span>
                                </label>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                                <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (
                                  f.respondent === 'PATIENT' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                )}>
                                  {f.respondent === 'PATIENT' ? '👤 Paciente (Celular)' : '🩺 Pesquisador (eCRF)'}
                                </span>

                                {/* Botão Personalizar Perguntas */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleFormQuestions(f.id)}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                                    isExpanded
                                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                  }`}
                                  title="Ver e personalizar perguntas deste questionário"
                                >
                                  <Edit3 className="w-3 h-3 text-blue-600" />
                                  <span>{isExpanded ? 'Ocultar Perguntas' : 'Personalizar Perguntas'}</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>

                                {/* Botão Salvar como Modelo */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenSaveTemplateModal(f.id)}
                                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition cursor-pointer"
                                  title="Salvar este questionário como modelo reutilizável"
                                >
                                  <BookmarkPlus className="w-3.5 h-3.5" />
                                </button>

                                {/* Botão Excluir (apenas para customizados ou adicionados) */}
                                {!f.isPreset && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFormTarget(f.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition cursor-pointer"
                                    title="Remover este instrumento do estudo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Descrição e Frequência */}
                            {f.description && (
                              <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                                {f.description}
                              </p>
                            )}

                            {f.enabled && f.respondent === 'PATIENT' && (
                              <div className="pt-1.5 pl-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                <span className="text-slate-600 font-bold shrink-0">Frequência no celular:</span>
                                <input
                                  type="text"
                                  value={f.frequencyDescription || ''}
                                  onChange={(e) => {
                                    handleUpdateFormTarget(f.id, 'frequency', 'CUSTOM', false);
                                    handleUpdateFormTarget(f.id, 'frequencyDescription', e.target.value, false);
                                  }}
                                  placeholder="Ex: Diário de sensibilidade (0h a 48h) ou na sessão final"
                                  className="flex-1 px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}

                            {/* ========================================================
                                EDITOR EXPANSÍVEL DE PERGUNTAS DO INSTRUMENTO
                                ======================================================== */}
                            {isExpanded && (
                              <div className="mt-2.5 pt-3 border-t border-blue-100 bg-slate-50/70 -mx-3.5 -mb-3.5 p-3.5 rounded-b-2xl space-y-3 animate-in fade-in duration-150">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">
                                      Perguntas e itens de avaliação ({qList.length})
                                    </span>
                                    <span className="text-[10px] text-slate-400 italic">
                                      (Perguntas configuradas para este estudo)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                    {f.isPreset && (
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreFormQuestions(f.id)}
                                        className="text-[10px] text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
                                        title="Restaurar as perguntas padrão validadas da literatura"
                                      >
                                        <RotateCcw className="w-3 h-3 text-slate-500" />
                                        <span>Restaurar padrão</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleAddQuestionToForm(f.id)}
                                      className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Nova pergunta</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Lista de Perguntas */}
                                {qList.length === 0 ? (
                                  <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                                    Nenhuma pergunta cadastrada neste questionário. Clique em <strong>Nova pergunta</strong> para começar.
                                  </div>
                                ) : (
                                  <div className="space-y-2.5 p-0.5">
                                    {qList.map((q: any, qIdx: number) => (
                                      <div
                                        key={q.id || qIdx}
                                        className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs"
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-blue-200 mt-1">
                                            {qIdx + 1}
                                          </span>

                                          <div className="flex-1 space-y-2">
                                            {/* Enunciado da Pergunta */}
                                            <input
                                              type="text"
                                              value={q.title || ''}
                                              onChange={(e) => handleUpdateQuestionInForm(f.id, qIdx, 'title', e.target.value)}
                                              placeholder="Enunciado da pergunta ou escala..."
                                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white"
                                            />

                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                              {/* Tipo da Pergunta */}
                                              <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-500 font-bold">Tipo:</span>
                                                <select
                                                  value={q.type || 'text'}
                                                  onChange={(e) => handleUpdateQuestionInForm(f.id, qIdx, 'type', e.target.value)}
                                                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none"
                                                >
                                                  <option value="vas">⚡ Escala EVA (0.0 a 10.0)</option>
                                                  <option value="likert">📊 Escala Likert (5 pontos)</option>
                                                  <option value="choice">🔘 Múltipla escolha</option>
                                                  <option value="boolean">✅ Sim / não (booleana)</option>
                                                  <option value="text">📝 Resposta em texto</option>
                                                  <option value="number">🔢 Numérico</option>
                                                </select>
                                              </div>

                                              {/* Checkbox Obrigatória */}
                                              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer ml-auto">
                                                <input
                                                  type="checkbox"
                                                  checked={Boolean(q.required)}
                                                  onChange={(e) => handleUpdateQuestionInForm(f.id, qIdx, 'required', e.target.checked)}
                                                  className="w-3.5 h-3.5 text-blue-600 rounded"
                                                />
                                                <span>Obrigatória</span>
                                              </label>

                                              {/* Excluir Pergunta */}
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveQuestionFromForm(f.id, qIdx)}
                                                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                                title="Excluir pergunta"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            {/* Configurações Específicas: Escala EVA / VAS */}
                                            {q.type === 'vas' && (
                                              <div className="space-y-2 pt-1 border-t border-slate-100 text-[11px]">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500 font-semibold shrink-0">Rótulo Mínimo (0):</span>
                                                    <input
                                                      type="text"
                                                      value={q.minLabel || ''}
                                                      onChange={(e) => handleUpdateQuestionInForm(f.id, qIdx, 'minLabel', e.target.value)}
                                                      placeholder="Ex: 0 - Sem Dor"
                                                      className="w-full px-2 py-0.5 border border-slate-200 rounded text-[11px] bg-slate-50"
                                                    />
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500 font-semibold shrink-0">Rótulo Máximo (10):</span>
                                                    <input
                                                      type="text"
                                                      value={q.maxLabel || ''}
                                                      onChange={(e) => handleUpdateQuestionInForm(f.id, qIdx, 'maxLabel', e.target.value)}
                                                      placeholder="Ex: 10 - Pior Dor"
                                                      className="w-full px-2 py-0.5 border border-slate-200 rounded text-[11px] bg-slate-50"
                                                    />
                                                  </div>
                                                </div>

                                                {/* Pergunta preliminar Sim / Não condicional */}
                                                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                                                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={Boolean(q.enableGateQuestion)}
                                                      onChange={(e) => {
                                                        handleUpdateQuestionInForm(f.id, qIdx, 'enableGateQuestion', e.target.checked);
                                                        if (e.target.checked && !q.gateQuestionTitle) {
                                                          handleUpdateQuestionInForm(f.id, qIdx, 'gateQuestionTitle', 'Você teve dor ou sensibilidade?');
                                                        }
                                                      }}
                                                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                    />
                                                    <span className="text-xs">Exigir pergunta preliminar (Sim / Não) antes de liberar a escala</span>
                                                  </label>
                                                  <p className="text-[10px] text-slate-500 pl-6 leading-tight">
                                                    Se ativado, a régua de intensidade só abre se o paciente responder &quot;Sim&quot;. Se responder &quot;Não&quot;, a escala permanece bloqueada com nota 0.0.
                                                  </p>

                                                  {Boolean(q.enableGateQuestion) && (
                                                    <div className="pl-6 pt-1 space-y-1">
                                                      <label className="block text-[10px] font-bold text-slate-700">
                                                        Personalizar texto da pergunta preliminar:
                                                      </label>
                                                      <input
                                                        type="text"
                                                        value={q.gateQuestionTitle || ''}
                                                        onChange={(e) => handleUpdateQuestionInForm(f.id, qIdx, 'gateQuestionTitle', e.target.value)}
                                                        placeholder="Ex: Você teve dor ou sensibilidade?"
                                                        className="w-full px-2.5 py-1 border border-blue-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-blue-500"
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Configurações Específicas: Múltipla Escolha / Likert */}
                                            {(q.type === 'choice' || q.type === 'likert') && (
                                              <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                    Alternativas de Resposta:
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleAddOptionToQuestion(f.id, qIdx)}
                                                    className="text-[10px] text-blue-600 font-bold hover:text-blue-800 cursor-pointer"
                                                  >
                                                    + Adicionar Opção
                                                  </button>
                                                </div>

                                                <div className="space-y-1">
                                                  {(Array.isArray(q.options) ? q.options : []).map((opt: any, optIdx: number) => (
                                                    <div key={optIdx} className="flex items-center gap-1.5">
                                                      <span className="text-[10px] text-slate-400 font-mono w-4 shrink-0">
                                                        {optIdx + 1}.
                                                      </span>
                                                      <input
                                                        type="text"
                                                        value={opt.label || ''}
                                                        onChange={(e) => handleUpdateOptionInQuestion(f.id, qIdx, optIdx, 'label', e.target.value)}
                                                        placeholder="Rótulo da opção..."
                                                        className="flex-1 px-2 py-0.5 border border-slate-200 rounded text-[11px] bg-slate-50"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRemoveOptionFromQuestion(f.id, qIdx, optIdx)}
                                                        className="text-slate-300 hover:text-red-500 p-0.5 transition cursor-pointer"
                                                        title="Remover opção"
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 4: FICHA CLÍNICA, ANAMNESE & ODONTOGRAMA */}
              {createStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                    <Stethoscope className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Etapa 4 de 5: Ficha clínica, anamnese e critérios de inclusão</p>
                      <p className="text-indigo-800 text-[11px] mt-0.5">
                        Defina a meta de voluntários (tamanho amostral), configure o odontograma e personalize os critérios de inclusão/exclusão e perguntas da anamnese do projeto.
                      </p>
                    </div>
                  </div>

                  {/* 1. Meta Amostral / Participantes */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Número de participantes do estudo (tamanho amostral N) *
                      </label>
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Meta Regulatória / Amostra
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={newProjectTargetParticipants}
                        onChange={(e) => setNewProjectTargetParticipants(e.target.value)}
                        placeholder="Ex: 30"
                        className="w-32 px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs bg-white"
                      />
                      <span className="text-xs text-slate-500">
                        voluntários planejados para inclusão no ensaio clínico
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Orienta a taxa de recrutamento, balanceamento da alocação nos grupos de estudo e capacidade de atendimento clínico.
                    </p>
                  </div>

                  {/* 2. Odontograma Clínico */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enable-odontogram-toggle"
                          checked={enableOdontogram}
                          onChange={(e) => setEnableOdontogram(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <label htmlFor="enable-odontogram-toggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                          Deseja utilizar odontograma clínico neste estudo?
                        </label>
                      </div>
                      <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (enableOdontogram ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')}>
                        {enableOdontogram ? 'Ativado' : 'Desativado'}
                      </span>
                    </div>

                    {enableOdontogram && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Selecione o Modelo de Odontograma:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div
                            onClick={() => setOdontogramScope('anterior')}
                            className={'p-3 rounded-xl border-2 cursor-pointer transition text-xs flex flex-col justify-between ' + (
                              odontogramScope === 'anterior'
                                ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900">Setor Anterior (13-23 e 33-43)</span>
                                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  Recomendado Clareamento
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                12 dentes estéticos anteriores (incisivos e caninos). Ideal para ensaios de clareamento dental, facetas e dentística estética.
                              </p>
                            </div>
                            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold">
                              <div className={'w-3.5 h-3.5 rounded-full border flex items-center justify-center ' + (odontogramScope === 'anterior' ? 'border-blue-600 bg-blue-600' : 'border-slate-300')}>
                                {odontogramScope === 'anterior' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span>Modelo setor anterior</span>
                            </div>
                          </div>

                          <div
                            onClick={() => setOdontogramScope('full')}
                            className={'p-3 rounded-xl border-2 cursor-pointer transition text-xs flex flex-col justify-between ' + (
                              odontogramScope === 'full'
                                ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900">Arcada completa (18 a 48)</span>
                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  32 dentes
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Mapeamento integral de todos os dentes superiores e inferiores, incluindo pré-molares e molares.
                              </p>
                            </div>
                            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                              <div className={'w-3.5 h-3.5 rounded-full border flex items-center justify-center ' + (odontogramScope === 'full' ? 'border-blue-600 bg-blue-600' : 'border-slate-300')}>
                                {odontogramScope === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span>Modelo arcada completa</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Ficha de Anamnese & Critérios Personalizáveis */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enable-anamnesis-toggle"
                          checked={enableAnamnesis}
                          onChange={(e) => setEnableAnamnesis(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <label htmlFor="enable-anamnesis-toggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                          Ativar Ficha de Anamnese & Critérios de Elegibilidade
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleRestoreDefaultQuestions}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                      >
                        Restaurar Perguntas Padrão
                      </button>
                    </div>

                    {enableAnamnesis && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Perguntas & Critérios do Estudo ({newProjectQuestions.length})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Personalize perguntas e critérios para este projeto
                          </span>
                        </div>

                        {/* Lista das Perguntas */}
                        <div className="space-y-2 p-1">
                          {newProjectQuestions.map((q, idx) => (
                            <div
                              key={q.id || idx}
                              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2 shadow-2xs hover:bg-white transition text-xs"
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-white text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 text-xs leading-snug">{q.title}</p>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {q.isCriterion ? (
                                      <span className={'px-1.5 py-0.2 rounded text-[10px] font-bold ' + (
                                        q.disqualifyIf === 'nao'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : 'bg-red-100 text-red-800 border border-red-200'
                                      )}>
                                        {q.disqualifyIf === 'nao' ? 'Critério de Inclusão' : 'Critério de Exclusão'}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                        Pergunta de Anamnese
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400">
                                      Tipo: {q.type === 'boolean' ? 'Sim / Não' : q.type === 'text' ? 'Texto Livre' : q.type === 'vita_shade' ? 'Escala VITA' : q.type === 'sensitivity_scale' ? 'Escala EVA (0-10)' : q.type}
                                    </span>
                                    {q.required && <span className="text-[10px] text-amber-600 font-bold">• Obrigatória</span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(idx)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                                title="Remover pergunta da anamnese"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Adicionar Pergunta Personalizada */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            + Adicionar Nova Pergunta / Critério Personalizado
                          </span>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={newQuestionTitle}
                              onChange={(e) => setNewQuestionTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddQuestion();
                                }
                              }}
                              placeholder="Ex: O voluntário possui histórico de dor com alimentos frios?"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tipo de Campo</label>
                                <select
                                  value={newQuestionType}
                                  onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                                >
                                  <option value="boolean">Sim / Não (Booleano)</option>
                                  <option value="text">Texto Livre</option>
                                  <option value="sensitivity_scale">Escala de Sensibilidade (0-10)</option>
                                  <option value="vita_shade">Cor Escala VITA Classical</option>
                                  <option value="number">Numérico</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Classificação</label>
                                <select
                                  value={newQuestionIsCriterion ? (newQuestionDisqualifyIf === 'nao' ? 'INC' : 'EXC') : 'NONE'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'INC') {
                                      setNewQuestionIsCriterion(true);
                                      setNewQuestionDisqualifyIf('nao');
                                    } else if (val === 'EXC') {
                                      setNewQuestionIsCriterion(true);
                                      setNewQuestionDisqualifyIf('sim');
                                    } else {
                                      setNewQuestionIsCriterion(false);
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                                >
                                  <option value="INC">Critério de Inclusão (Sim é obrigatório)</option>
                                  <option value="EXC">Critério de Exclusão (Sim desqualifica)</option>
                                  <option value="NONE">Pergunta Geral (Não elimina)</option>
                                </select>
                              </div>

                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={handleAddQuestion}
                                  disabled={!newQuestionTitle.trim()}
                                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Adicionar</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ETAPA 5: CRONOGRAMA DE CONSULTAS CLÍNICAS & REVISÃO FINAL */}
              {createStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Etapa 5 de 5: Cronograma de Consultas Clínicas & Revisão Final</p>
                      <p className="text-blue-800 text-[11px] mt-0.5">
                        Defina as consultas presenciais de clareamento, os exames clínicos da consulta e os questionários do eCRF que o paciente responderá no celular com a periodicidade entre consultas.
                      </p>
                    </div>
                  </div>

                  {/* Modelos Rápidos de Protocolo de Clareamento */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Modelos de protocolos de clareamento (clique para aplicar):</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Aplicação com 1 clique</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyBleachingPreset('office_standard', false)}
                        className="p-2.5 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                      >
                        <p className="font-bold text-slate-800 text-xs group-hover:text-blue-700 flex items-center gap-1">
                          <span>Consultório padrão</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          3 consultas: 1ª Aplicação (Dia 0) → 2ª Aplicação (7d) → Retorno de Cor (14d)
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyBleachingPreset('home_supervised', false)}
                        className="p-2.5 bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                      >
                        <p className="font-bold text-slate-800 text-xs group-hover:text-purple-700 flex items-center gap-1">
                          <span>Caseiro supervisionado</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          3 consultas: Moldagem/Géis (Dia 0) → Acompanhamento (7d) → Retorno Final (21d)
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyBleachingPreset('office_single', false)}
                        className="p-2.5 bg-white border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                      >
                        <p className="font-bold text-slate-800 text-xs group-hover:text-amber-700 flex items-center gap-1">
                          <span>Consultório em sessão única</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          2 consultas: Aplicação Única (Dia 0) → Avaliação de Cor (7d)
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Lista de Consultas Clínicas */}
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Consultas programadas ({studySessions.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddSession(false)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar consulta</span>
                      </button>
                    </div>
                    <div className="space-y-3 p-1">
                      {studySessions.map((s, idx) => renderSessionCard(s, idx, false))}
                    </div>
                  </div>

                  {/* Resumo Geral de Revisão */}
                  <div className="p-4 bg-slate-50 border-2 border-blue-200 rounded-2xl space-y-2.5 text-xs text-slate-800 shadow-2xs">
                    <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-blue-600" />
                      <span>Resumo do protocolo do estudo</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Nome da pesquisa:</span>
                        <strong className="text-slate-900">{newProjectName || 'Não informado'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Meta amostral (nº de voluntários):</span>
                        <strong className="text-blue-700">{newProjectTargetParticipants || '30'} participantes planejados</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Linha de pesquisa:</span>
                        <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Clareamento dental</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Desenho do estudo e grupos:</span>
                        <strong className="text-indigo-700">
                          {newProjectGroups.length > 0 ? (newProjectGroups.length + ' grupos (' + newProjectGroups.join(', ') + ')') : 'Nenhum grupo pré-configurado'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Cronograma clínico:</span>
                        <strong className="text-slate-900">{studySessions.length} consultas presenciais configuradas</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Ficha clínica e anamnese:</span>
                        <strong className="text-slate-900">
                          {enableAnamnesis ? (newProjectQuestions.length + ' critérios/perguntas') : 'Desativada'} • Odontograma: {enableOdontogram ? (odontogramScope === 'anterior' ? 'Setor Anterior (12 dentes)' : 'Arcada Completa (32 dentes)') : 'Não'}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 text-[11px] block">Questionários ativos (eCRF):</span>
                        <strong className="text-emerald-700">
                          {formTargets.filter((f) => f.enabled && f.id !== 'anamnesis' && f.id !== 'odontogram').length} instrumentos habilitados ({formTargets.filter((f) => f.enabled && f.id !== 'anamnesis' && f.id !== 'odontogram').map((f) => f.title).join(', ')})
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé Fixo de Navegação em Tela Cheia com Botões de Etapas */}
          <footer className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-lg">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div>
                {createStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreateStep(1);
                      setCreateStepError(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePrevCreateStep}
                    className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold mr-1">
                  Etapa {createStep} de 5
                </span>

                {createStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextCreateStep}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs hover:shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Avançar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleCreateProject(e, 'dashboard')}
                    disabled={creating || !newProjectName.trim()}
                    className="px-7 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Criando estudo...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Concluir e criar estudo clínico</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </footer>
        </div>
      )}

      
      {/* ========================================================
          MODAL: ADICIONAR MÉTODO DE AVALIAÇÃO / INSTRUMENTO
          Exibe escalas validadas, modelos salvos e opção "Outro..."
          ======================================================== */}
      {showAddMethodModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Cabeçalho */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Adicionar Método ou Instrumento de Avaliação</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione uma escala validada, reutilize um modelo salvo ou cadastre um novo instrumento personalizado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMethodModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas do Seletor */}
            <div className="px-5 pt-3 border-b border-slate-200 flex gap-2 bg-white">
              <button
                type="button"
                onClick={() => setAddMethodTab('presets')}
                className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  addMethodTab === 'presets'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Escalas validadas</span>
              </button>
              <button
                type="button"
                onClick={() => setAddMethodTab('saved')}
                className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  addMethodTab === 'saved'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Meus modelos salvos ({customTemplatesList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAddMethodTab('custom')}
                className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  addMethodTab === 'custom'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Outro... (Personalizado)</span>
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* ABA 1: ESCALAS VALIDADAS */}
              {addMethodTab === 'presets' && (
                <div className="grid grid-cols-1 gap-2.5">
                  {PRESET_QUESTIONNAIRES_CATALOG.map((cat) => {
                    const alreadyAdded = formTargets.some((f) => f.id === cat.id && f.enabled);

                    return (
                      <div
                        key={cat.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base">{cat.icon}</span>
                            <span className="font-bold text-slate-900 text-xs">{cat.title}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
                              {cat.badge}
                            </span>
                            <span className={'text-[10px] font-semibold px-2 py-0.2 rounded-full ' + (
                              cat.defaultRespondent === 'PATIENT' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            )}>
                              {cat.defaultRespondent === 'PATIENT' ? '👤 Paciente' : '🩺 Pesquisador'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectPresetMethod(cat.id)}
                          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs ${
                            alreadyAdded
                              ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{alreadyAdded ? 'Já Adicionado (Abrir)' : 'Adicionar ao Estudo'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ABA 2: MEUS MODELOS SALVOS */}
              {addMethodTab === 'saved' && (
                <div className="space-y-3">
                  {customTemplatesList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 space-y-2">
                      <Bookmark className="w-8 h-8 text-slate-400 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-xs">Nenhum modelo salvo ainda</h4>
                      <p className="text-[11px] max-w-sm mx-auto">
                        Ao personalizar qualquer questionário, clique no ícone de <strong>Salvar como Modelo</strong> para que ele fique registrado e reutilizável aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {customTemplatesList.map((tpl: any, idx: number) => (
                        <div
                          key={tpl.id || idx}
                          className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{tpl.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {tpl.category || 'Modelo Salvo'}
                              </span>
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.2 rounded-full">
                                {Array.isArray(tpl.questions) ? tpl.questions.length : 0} perguntas
                              </span>
                            </div>
                            {tpl.description && (
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                {tpl.description}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplySavedTemplateAsMethod(tpl)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar ao Estudo</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: OUTRO... (PERSONALIZADO) */}
              {addMethodTab === 'custom' && (
                <form onSubmit={handleCreateCustomMethodSubmit} className="space-y-3.5">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                    <p className="font-bold">Cadastrar novo instrumento de avaliação</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Crie um questionário ou método específico para o seu protocolo de pesquisa. Você poderá personalizar todas as perguntas e escalas em seguida.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome do instrumento / questionário *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCustomMethodTitle}
                      onChange={(e) => setNewCustomMethodTitle(e.target.value)}
                      placeholder="Ex: Escala de Ansiedade Dental (MDAS) ou Questionário de Hábitos Alimentares"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descrição ou Objetivo Clínico
                    </label>
                    <input
                      type="text"
                      value={newCustomMethodDesc}
                      onChange={(e) => setNewCustomMethodDesc(e.target.value)}
                      placeholder="Ex: Avaliação de ansiedade pré-operatória antes do clareamento de consultório."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quem deve responder?
                      </label>
                      <select
                        value={newCustomMethodRespondent}
                        onChange={(e) => setNewCustomMethodRespondent(e.target.value as 'PATIENT' | 'RESEARCHER')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none"
                      >
                        <option value="PATIENT">👤 Paciente (Pelo Celular / WhatsApp)</option>
                        <option value="RESEARCHER">🩺 Pesquisador (Durante o Atendimento Clínico)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Frequência / Momento da Coleta
                      </label>
                      <input
                        type="text"
                        value={newCustomMethodFreq}
                        onChange={(e) => setNewCustomMethodFreq(e.target.value)}
                        placeholder="Ex: Na sessão inicial e aos 30 dias"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMethodModal(false)}
                      className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!newCustomMethodTitle.trim()}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Criar Instrumento e Personalizar</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SALVAR QUESTIONÁRIO COMO MODELO REUTILIZÁVEL
          ======================================================== */}
      {showSaveTemplateModal && templateToSave && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-indigo-600" />
                <span>Salvar como Modelo Reutilizável</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSaveTemplate} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={templateToSave.name}
                  onChange={(e) => setTemplateToSave({ ...templateToSave, name: e.target.value })}
                  placeholder="Ex: Escala EVA Sensibilidade UEPG"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={templateToSave.category}
                  onChange={(e) => setTemplateToSave({ ...templateToSave, category: e.target.value })}
                  placeholder="Ex: Clareamento Dental ou Dentística"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={templateToSave.description}
                  onChange={(e) => setTemplateToSave({ ...templateToSave, description: e.target.value })}
                  placeholder="Descreva quando este modelo deve ser reutilizado..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800">
                <span>Contém <strong>{templateToSave.questions.length} perguntas/itens</strong> configurados que serão salvos no modelo.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!templateToSave.name.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Salvar Modelo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração / Edição de Estudo Existente */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Configurar Protocolo do Estudo</h2>
                <p className="text-xs text-slate-500">
                  Ajuste o cronograma de sessões clínicas, tempo de consulta e quem preenche cada formulário.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navegação entre Abas do Modal */}
            <div className="flex border-b border-slate-200 mb-5 gap-1">
              <button
                type="button"
                onClick={() => setEditTab('GENERAL')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'GENERAL'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📋 1. Identificação</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('GROUPS')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'GROUPS'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>🔀 2. Desenho do Estudo ({editProjectGroups.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('FORMS')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'FORMS'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📝 3. Construtor de eCRF ({editFormTargets.filter(f => f.enabled && f.id !== 'anamnesis' && f.id !== 'odontogram').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('SESSIONS')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'SESSIONS'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>⏱️ 4. Cronograma de Consultas ({editStudySessions.length})</span>
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-4">
              {/* ABA 1: DADOS DO ESTUDO */}
              {editTab === 'GENERAL' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Nome do Estudo *
                    </label>
                    <input
                      type="text"
                      required
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Descrição / Hipótese (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={editProjectDesc}
                      onChange={(e) => setEditProjectDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Status do Projeto */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Status do Estudo
                    </label>
                    <select
                      value={editProjectStatus}
                      onChange={(e) => setEditProjectStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="ACTIVE">🟢 Em Andamento / Ativo</option>
                      <option value="COMPLETED">🔵 Finalizado / Concluído</option>
                      <option value="CANCELLED">⚪ Cancelado / Interrompido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Prefixo do Código dos Voluntários (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editProjectPrefix}
                      onChange={(e) => setEditProjectPrefix(e.target.value.toUpperCase())}
                      placeholder="Ex: P01, EXP, CLAR (Padrão automático: P01, P02...)"
                      maxLength={8}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Garante códigos únicos para cada paciente (Ex: P01-001, P07-001), eliminando qualquer conflito com outros projetos.
                    </p>
                  </div>

                  {/* Ações Específicas dos Instrumentos */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Editores Especializados deste Estudo
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <Link
                        href={`/anamnese?projectId=${editingProject.id}`}
                        className="p-2.5 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-blue-900 font-semibold transition flex items-center justify-between"
                      >
                        <span>Editar Perguntas & Critérios</span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                      </Link>

                      <Link
                        href={`/construtor?projectId=${editingProject.id}`}
                        className="p-2.5 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl text-indigo-900 font-semibold transition flex items-center justify-between"
                      >
                        <span>Construtor de eCRFs</span>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                      </Link>
                    </div>
                  </div>

                  {/* Opção de Exclusão para Administrador */}
                  {(currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br') && (
                    <div className="pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setProjectToDelete(editingProject);
                        }}
                        className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span>Excluir este projeto definitivamente (admin)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: DESENHO DO ESTUDO / GRUPOS */}
              {editTab === 'GROUPS' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Desenho do Estudo & Grupos Experimentais</span>
                      </h4>
                      <p className="text-[11px] text-indigo-800 mt-0.5">
                        Gerencie os grupos cadastrados neste estudo. Eles ficam salvos e disponíveis para seleção em qualquer voluntário.
                      </p>
                    </div>
                  </div>

                  {/* Modelos Rápidos */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Modelos Rápidos (Clique para adicionar):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const toAdd = ['Grupo A: Controle', 'Grupo B: Teste'];
                          setEditProjectGroups((prev) => Array.from(new Set([...prev, ...toAdd])));
                        }}
                        className="p-2 border border-slate-200 rounded-lg text-left bg-white hover:bg-indigo-50 transition text-xs cursor-pointer shadow-2xs"
                      >
                        <p className="font-bold text-slate-800 text-xs">👥 2 Grupos Paralelos</p>
                        <p className="text-[10px] text-slate-500">Controle vs Teste</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const toAdd = [
                            'Direita: HP 6% / Esquerda: CP 37%',
                            'Direita: CP 37% / Esquerda: HP 6%',
                          ];
                          setEditProjectGroups((prev) => Array.from(new Set([...prev, ...toAdd])));
                        }}
                        className="p-2 border border-slate-200 rounded-lg text-left bg-white hover:bg-indigo-50 transition text-xs cursor-pointer shadow-2xs"
                      >
                        <p className="font-bold text-slate-800 text-xs">👄 Boca Dividida</p>
                        <p className="text-[10px] text-slate-500">Direita vs Esquerda</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const toAdd = [
                            'Grupo 1: Controle (Placebo)',
                            'Grupo 2: Intervenção A',
                            'Grupo 3: Intervenção B',
                          ];
                          setEditProjectGroups((prev) => Array.from(new Set([...prev, ...toAdd])));
                        }}
                        className="p-2 border border-slate-200 rounded-lg text-left bg-white hover:bg-indigo-50 transition text-xs cursor-pointer shadow-2xs"
                      >
                        <p className="font-bold text-slate-800 text-xs">📊 3 Grupos</p>
                        <p className="text-[10px] text-slate-500">Controle + A + B</p>
                      </button>
                    </div>
                  </div>

                  {/* Lista de Grupos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Grupos Cadastrados ({editProjectGroups.length})
                      </label>
                      {editProjectGroups.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setEditProjectGroups([])}
                          className="text-[11px] text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                        >
                          Limpar todos
                        </button>
                      )}
                    </div>

                    {editProjectGroups.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                        Nenhum grupo cadastrado ainda. Use os modelos acima ou adicione abaixo.
                      </div>
                    ) : (
                      <div className="space-y-2 p-1">
                        {editProjectGroups.map((grp, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-indigo-200">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">{grp}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditProjectGroups((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="Remover grupo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Adicionar Grupo */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      + Adicionar Mais Grupos
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editNewGroupInput}
                        onChange={(e) => setEditNewGroupInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const clean = editNewGroupInput.trim();
                            if (clean && !editProjectGroups.includes(clean)) {
                              setEditProjectGroups((prev) => [...prev, clean]);
                              setEditNewGroupInput('');
                            }
                          }
                        }}
                        placeholder="Ex: Grupo C: Terapia Fotodinâmica aPDT"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = editNewGroupInput.trim();
                          if (clean && !editProjectGroups.includes(clean)) {
                            setEditProjectGroups((prev) => [...prev, clean]);
                            setEditNewGroupInput('');
                          }
                        }}
                        disabled={!editNewGroupInput.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: CONSTRUTOR DE eCRF & QUESTIONÁRIOS */}
              {editTab === 'FORMS' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                    <h4 className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Formulários: Quem Preenche e Frequência</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Escolha se cada instrumento será preenchido pelo <strong>Pesquisador</strong> (eCRF) ou pelo <strong>Paciente</strong> (PROMs no celular), e com qual periodicidade.
                    </p>
                  </div>

                  {/* Instrumentos Clínicos do Pesquisador */}
                  <div className="space-y-2.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Instrumentos Clínicos da Equipe de Pesquisa
                    </h5>

                    {/* Odontograma */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={editEnableOdontogram}
                            onChange={(e) => setEditEnableOdontogram(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span>Odontograma clínico anatômico</span>
                        </label>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          🩺 Preenchido pelo pesquisador
                        </span>
                      </div>
                      {editEnableOdontogram && (
                        <div className="pl-6 flex items-center gap-4 text-[11px] text-slate-600">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="editOdontogramScope"
                              value="anterior"
                              checked={editOdontogramScope === 'anterior'}
                              onChange={() => setEditOdontogramScope('anterior')}
                            />
                            <span>Dentes Anteriores (13 a 23 e 33 a 43)</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="editOdontogramScope"
                              value="full"
                              checked={editOdontogramScope === 'full'}
                              onChange={() => setEditOdontogramScope('full')}
                            />
                            <span>Arcada Completa</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Anamnese */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={editEnableAnamnesis}
                          onChange={(e) => setEditEnableAnamnesis(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>Ficha Clínica & Critérios de Inclusão/Exclusão</span>
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        🩺 Preenchido pelo Pesquisador
                      </span>
                    </div>
                  </div>

                  {/* Questionários Validados e Avaliações de Pacientes (PROMs) */}
                  <div className="pt-2 space-y-2.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Questionários de Desfecho & Avaliação do Paciente (PROMs)
                    </h5>

                    <div className="space-y-3">
                      {editFormTargets.filter((f) => f.id !== 'anamnesis' && f.id !== 'odontogram').map((f) => (
                        <div
                          key={f.id}
                          className={`p-3 rounded-xl border transition ${
                            f.enabled
                              ? 'border-blue-300 bg-blue-50/30'
                              : 'border-slate-200 bg-slate-50/40 opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={f.enabled}
                                onChange={(e) => handleUpdateFormTarget(f.id, 'enabled', e.target.checked, true)}
                                className="w-4 h-4 text-blue-600 rounded mt-0.5 shrink-0"
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{f.title}</span>
                                <span className="text-[11px] text-slate-500 block leading-tight">{f.description}</span>
                              </div>
                            </label>
                          </div>

                          {f.enabled && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Quem Preenche */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Quem responde este questionário?
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateFormTarget(f.id, 'respondent', 'PATIENT', true)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                                      f.respondent === 'PATIENT'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>👤 Paciente (Celular)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateFormTarget(f.id, 'respondent', 'RESEARCHER', true)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                                      f.respondent === 'RESEARCHER'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>🩺 Pesquisador</span>
                                  </button>
                                </div>
                              </div>

                              {/* Frequência de Preenchimento */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Frequência de preenchimento
                                </label>
                                <select
                                  value={f.frequency}
                                  onChange={(e) => handleUpdateFormTarget(f.id, 'frequency', e.target.value as any, true)}
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                                >
                                  {f.respondent === 'PATIENT' ? (
                                    <>
                                      <option value="CUSTOM">⏱️ Personalizado (Definir cronograma em casa)</option>
                                      <option value="DAILY">🟢 Todos os dias (Diário — ex: dor/sensibilidade)</option>
                                      <option value="WEEKLY">🔵 1 vez por semana</option>
                                      <option value="BIWEEKLY">🟡 A cada 15 dias</option>
                                      <option value="PER_SESSION">🟣 A cada sessão clínica (no retorno)</option>
                                      <option value="ONCE">⚪ Única vez (Pontual / Admissão / Final)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="PER_SESSION">🏥 A cada sessão clínica</option>
                                      <option value="ONCE">🏥 Na 1ª sessão (Linha de base)</option>
                                      <option value="WEEKLY">🏥 1 vez por semana</option>
                                      <option value="DAILY">🏥 Diariamente</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              {/* Cronograma Domiciliar Personalizado para o Paciente */}
                              {f.respondent === 'PATIENT' && (
                                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <label className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px]">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Personalizar Períodos / Cronograma de Resposta em Casa:</span>
                                      </label>
                                      <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.2 rounded-full">
                                        Acompanhamento Domiciliar
                                      </span>
                                    </div>

                                    <input
                                      type="text"
                                      value={f.frequencyDescription || ''}
                                      onChange={(e) => {
                                        handleUpdateFormTarget(f.id, 'frequency', 'CUSTOM', true);
                                        handleUpdateFormTarget(f.id, 'frequencyDescription', e.target.value, true);
                                      }}
                                      placeholder="Ex: 24h, 48h, 7d, 14d e 21d (clareamento caseiro) / A cada 3 dias / Diário por 14 dias..."
                                      className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500 font-medium"
                                    />

                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-[10px] text-amber-900 font-bold">Modelos mais usados:</span>
                                      {[
                                        '24h, 48h, 7d, 14d e 21d (Clareamento Caseiro)',
                                        'Diariamente durante 14 dias',
                                        'Diariamente durante 21 dias',
                                        '24h, 48h e 7 dias (Pós-Op)',
                                        'A cada 48 horas durante 14 dias',
                                        'Semanal por 4 semanas (7d, 14d, 21d e 28d)',
                                      ].map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => {
                                            handleUpdateFormTarget(f.id, 'frequency', 'CUSTOM', true);
                                            handleUpdateFormTarget(f.id, 'frequencyDescription', preset, true);
                                          }}
                                          className="text-[9px] px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-950 rounded-md border border-amber-200 transition font-medium cursor-pointer"
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 4: CRONOGRAMA DE CONSULTAS CLÍNICAS */}
              {editTab === 'SESSIONS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cronograma de Consultas de Clareamento</span>
                      </h4>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Defina as consultas presenciais de clareamento, os intervalos em dias e o que será avaliado no consultório e pelo paciente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSession(true)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Consulta</span>
                    </button>
                  </div>

                  {/* Modelos Rápidos de Clareamento */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyBleachingPreset('office_standard', true)}
                      className="p-2.5 border border-slate-200 rounded-xl text-left bg-white hover:bg-blue-50/60 transition text-xs cursor-pointer shadow-2xs"
                    >
                      <p className="font-bold text-slate-800 text-xs">🔵 Consultório Padrão</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">3 sessões (0d, 7d, 14d)</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBleachingPreset('home_supervised', true)}
                      className="p-2.5 border border-slate-200 rounded-xl text-left bg-white hover:bg-purple-50/60 transition text-xs cursor-pointer shadow-2xs"
                    >
                      <p className="font-bold text-slate-800 text-xs">🟣 Caseiro Supervisionado</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">3 sessões (0d, 7d, 21d)</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBleachingPreset('office_single', true)}
                      className="p-2.5 border border-slate-200 rounded-xl text-left bg-white hover:bg-amber-50/60 transition text-xs cursor-pointer shadow-2xs"
                    >
                      <p className="font-bold text-slate-800 text-xs">⚡ Consultório Única</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">2 sessões (0d, 7d)</p>
                    </button>
                  </div>

                  {/* Lista de cards de cada sessão */}
                  <div className="space-y-3">
                    {editStudySessions.map((s, idx) => renderSessionCard(s, idx, true))}
                  </div>
                </div>
              )}

              {/* RODAPÉ DO MODAL */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  {editTab === 'GENERAL' && (
                    <button
                      type="button"
                      onClick={() => setEditTab('GROUPS')}
                      className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Avançar: Grupos</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {editTab === 'GROUPS' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditTab('GENERAL')}
                        className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditTab('FORMS')}
                        className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Avançar: eCRF</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {editTab === 'FORMS' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditTab('GROUPS')}
                        className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditTab('SESSIONS')}
                        className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Avançar: Cronograma</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {editTab === 'SESSIONS' && (
                    <button
                      type="button"
                      onClick={() => setEditTab('FORMS')}
                      className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      ← Voltar
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{savingEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Projeto (Exclusivo para ADMIN) */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-200">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Excluir Projeto de Pesquisa</h2>
                <p className="text-xs text-red-600 font-semibold">Ação Restrita ao Administrador</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Estudo a ser excluído:</p>
                <p className="text-sm font-bold text-slate-900">{projectToDelete.name}</p>
                {projectToDelete.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{projectToDelete.description}</p>
                )}
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1 text-red-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Atenção: Esta ação é definitiva e irreversível!</span>
                </p>
                <p className="text-[11px] text-red-700 leading-relaxed">
                  Todos os dados vinculados a este projeto serão permanentemente apagados do banco de dados:
                </p>
                <ul className="list-disc pl-4 text-[11px] text-red-700 space-y-0.5 pt-1">
                  <li>Formulários eCRF e todas as respostas coletadas</li>
                  <li>Termos de Consentimento (TCLE) e assinaturas digitais</li>
                  <li>Registros clínicos de voluntários, odontogramas e sessões</li>
                  <li>Alertas de sensibilidade e trilhas de auditoria</li>
                </ul>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs font-semibold">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingProject}
                onClick={() => {
                  setProjectToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingProject}
                onClick={handleDeleteProject}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                {deletingProject ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo Estudo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
