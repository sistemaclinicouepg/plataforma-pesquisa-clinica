'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Download,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  User,
  AlertTriangle,
  Calendar,
  FileText,
  ChevronRight,
  Activity,
  Copy,
  Check,
  ShieldCheck,
  Stethoscope,
  Share2,
} from 'lucide-react';
import {
  parseUnlockMeta,
  extractDiaryMomentDetails,
  generateParticipantTabularExport,
} from '@/lib/unlockProtocol';

interface FormQuestion {
  id: string;
  type: string;
  title?: string;
  label?: string;
  observation?: string;
  required?: boolean;
  minLabel?: string;
  maxLabel?: string;
  leftAnchor?: string;
  rightAnchor?: string;
  options?: Array<{ label: string; value: string }>;
}

interface FormItem {
  id: string;
  title: string;
  description?: string | null;
  questionsJson?: string | null;
  expirationHours?: number;
  allowLate?: boolean;
}

interface ParticipantData {
  id: string;
  researchCode: string;
  status: string;
  group?: string | null;
  anamnesisData?: string | null;
  patient: {
    fullName: string;
    cpf: string;
    birthDate?: string | null;
    biologicalSex: string;
    phoneWhatsApp?: string | null;
  };
  sessions?: Array<{
    id: string;
    sessionNumber: number;
    sessionType?: string | null;
    sessionDate: string | Date;
    operatorName?: string | null;
    evaluatorName?: string | null;
    notes?: string | null;
    painScore0h?: number | null;
    painScore1h?: number | null;
    painScore24h?: number | null;
    painScore48h?: number | null;
  }>;
  responses?: Array<{
    id: string;
    formId: string;
    submittedAt: string | Date;
    answersJson: string;
    form?: FormItem | null;
  }>;
}

interface ProjectData {
  id: string;
  name: string;
  description?: string | null;
  isBlinded?: boolean;
  anamnesisTemplate?: string | null;
  forms?: FormItem[];
  participants?: ParticipantData[];
}

function ResultadosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const participantId = searchParams.get('participantId');
  const projectIdParam = searchParams.get('projectId');
  const initialTab = searchParams.get('tab') as 'scales' | 'forms' | 'export' | null;

  const [activeTab, setActiveTab] = useState<'scales' | 'forms' | 'export'>(initialTab || 'scales');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectData | null>(null);
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [overrideBlindedView, setOverrideBlindedView] = useState<boolean | null>(null);
  const [unlockingAction, setUnlockingAction] = useState<string | null>(null);
  const [copiedTSV, setCopiedTSV] = useState(false);

  // Carregar dados principais
  const loadData = async (isManualRefresh = false) => {
    if (!participantId) {
      setError('Identificador de participante não informado na URL.');
      setLoading(false);
      return;
    }

    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      // 1. Se tiver projectIdParam, busca detalhes do projeto
      let currentProj: ProjectData | null = null;
      let targetPart: ParticipantData | null = null;

      if (projectIdParam) {
        const projRes = await fetch(`/api/projects/${projectIdParam}`);
        if (projRes.ok) {
          const projData = await projRes.json();
          currentProj = projData.project;
          targetPart = (currentProj?.participants || []).find((p) => p.id === participantId) || null;
        }
      }

      // 2. Busca respostas em tempo real da API de respostas
      const respRes = await fetch(
        `/api/responses?participantId=${participantId}&projectId=${projectIdParam || currentProj?.id || ''}`
      );

      let freshResponses: any[] = [];
      let freshSessions: any[] = [];
      if (respRes.ok) {
        const respData = await respRes.json();
        freshResponses = respData.responses || [];
        freshSessions = respData.sessions || [];
      }

      // 3. Se ainda não tiver os dados do participante (ex: acessou sem projectId na URL)
      if (!targetPart) {
        const partRes = await fetch(`/api/participants/${participantId}`);
        if (partRes.ok) {
          const partData = await partRes.json();
          targetPart = partData.participant;
          if (targetPart && (targetPart as any).project && !currentProj) {
            currentProj = (targetPart as any).project;
          }
        }
      }

      if (!targetPart) {
        setError('Participante não encontrado ou sem permissão de acesso.');
        return;
      }

      // Mesclar sessões e respostas atualizadas
      const mergedParticipant: ParticipantData = {
        ...targetPart,
        responses: freshResponses.length > 0 ? freshResponses : targetPart.responses || [],
        sessions: freshSessions.length > 0 ? freshSessions : targetPart.sessions || [],
      };

      setParticipant(mergedParticipant);
      if (currentProj) setProject(currentProj);

      // Auto-seleção de aba: se veio sem tab explícita e tem questionários respondidos, sugere questionários se não tiver sessões
      if (!initialTab && freshResponses.length > 0 && mergedParticipant.sessions?.length === 0) {
        setActiveTab('forms');
      }
    } catch (err) {
      console.error('Erro ao carregar resultados do participante:', err);
      setError('Falha ao conectar com o servidor e carregar os dados clínicos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [participantId, projectIdParam]);

  // Ações de desbloqueio / modo
  const handleToggleUnlock = async (
    sessionNumber: number,
    action: 'UNLOCK_MOMENT' | 'LOCK_MOMENT' | 'UNLOCK_ALL' | 'SET_MODE',
    moment?: string,
    mode?: 'AUTO' | 'MANUAL'
  ) => {
    if (!participant) return;
    const actionKey = `${sessionNumber}-${moment || action}`;
    setUnlockingAction(actionKey);

    try {
      const res = await fetch(`/api/participants/${participant.id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionNumber,
          action,
          moment,
          mode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setParticipant((prev) => {
            if (!prev) return prev;
            const updatedSessions = (prev.sessions || []).map((s) =>
              s.sessionNumber === sessionNumber ? { ...s, notes: data.session.notes } : s
            );
            return { ...prev, sessions: updatedSessions };
          });
        }
      }
    } catch (err) {
      console.error('Erro ao alternar desbloqueio:', err);
    } finally {
      setUnlockingAction(null);
    }
  };

  const handleToggleUnlockForm = async (
    formId: string,
    action: 'UNLOCK_FORM' | 'LOCK_FORM'
  ) => {
    if (!participant) return;
    const sessionNumber = participant.sessions?.[0]?.sessionNumber || 1;
    const actionKey = `form-${formId}`;
    setUnlockingAction(actionKey);

    try {
      const res = await fetch(`/api/participants/${participant.id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionNumber,
          action,
          formId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setParticipant((prev) => {
            if (!prev) return prev;
            const updatedSessions = (prev.sessions || []).map((s) =>
              s.sessionNumber === sessionNumber ? { ...s, notes: data.session.notes } : s
            );
            return { ...prev, sessions: updatedSessions };
          });
        }
      }
    } catch (err) {
      console.error('Erro ao desbloquear formulário:', err);
    } finally {
      setUnlockingAction(null);
    }
  };

  // WhatsApp
  const openWhatsApp = (phone: string | null | undefined, text: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Processamento e unificação dos questionários e respostas
  const { allForms, parsedFormResponses, isCurrentBlinded } = useMemo(() => {
    const isBlinded = overrideBlindedView !== null ? overrideBlindedView : (project?.isBlinded ?? false);
    const projectForms = project?.forms || [];
    const responses = participant?.responses || [];

    const formsList = [...projectForms];

    // Incluir anamnese customizada se existir
    let anamnesisQuestions: FormQuestion[] = [];
    if (project?.anamnesisTemplate) {
      try {
        const tmpl = JSON.parse(project.anamnesisTemplate);
        if (Array.isArray(tmpl.questions) && tmpl.questions.length > 0) {
          anamnesisQuestions = tmpl.questions;
        }
      } catch {}
    }

    if (anamnesisQuestions.length > 0 && project?.id) {
      formsList.unshift({
        id: `anamnesis_${project.id}`,
        title: 'Ficha de Anamnese & Critérios de Participação',
        description: 'Questionário inicial com critérios e perguntas específicas do estudo clínico.',
        questionsJson: JSON.stringify(anamnesisQuestions),
      });
    }

    // Formulários presentes nas respostas
    responses.forEach((r) => {
      if (r.form && !formsList.some((f) => f.id === r.formId)) {
        formsList.push(r.form);
      }
    });

    // Mapeamento estruturado das respostas
    const parsed = responses.map((r) => {
      let answers: Record<string, any> = {};
      try {
        answers = JSON.parse(r.answersJson || '{}');
      } catch {}

      let questions: FormQuestion[] = [];
      const matchingForm = formsList.find((f) => f.id === r.formId);
      try {
        if (matchingForm?.questionsJson) {
          questions = JSON.parse(matchingForm.questionsJson);
        } else if (r.form?.questionsJson) {
          questions = JSON.parse(r.form.questionsJson);
        }
      } catch {}

      const items: Array<{
        id: string;
        title: string;
        type: string;
        observation?: string;
        value: any;
        displayValue: string;
        options?: any[];
      }> = [];

      let extractedVas: number | null = null;
      let analgesicUsed: string | null = null;
      let painTypeVal: string | null = null;

      questions.forEach((q, idx) => {
        const val = answers[q.id];
        if (val !== undefined && val !== null && val !== '') {
          let displayValue = String(val);
          const lowerTitle = (q.title || q.label || '').toLowerCase();

          if (q.type === 'vas' || lowerTitle.includes('sensib') || lowerTitle.includes('dor')) {
            const num = Number(val);
            if (!isNaN(num)) {
              extractedVas = num;
              displayValue = `${num.toFixed(1)} / 10.0`;
            }
          } else if (q.type === 'likert' || q.type === 'choice') {
            const opt = q.options?.find((o: any) => String(o.value) === String(val));
            displayValue = opt ? `${opt.label} (${val})` : String(val);
            if (lowerTitle.includes('sensação') || lowerTitle.includes('tipo')) {
              painTypeVal = displayValue;
            }
          } else if (q.type === 'matrix') {
            displayValue = val === 'NA' ? 'NA (Não se aplica)' : `Nota ${val}`;
          } else if (q.type === 'boolean') {
            displayValue = val === 'Sim' || val === true || val === 'sim' ? 'Sim' : 'Não';
            if (lowerTitle.includes('analgés') || lowerTitle.includes('medic')) {
              analgesicUsed = displayValue;
            }
          }

          items.push({
            id: q.id || `q_${idx}`,
            title: q.title || q.label || `Pergunta ${idx + 1}`,
            type: q.type,
            observation: q.observation,
            value: val,
            displayValue,
            options: q.options,
          });
        }
      });

      // Se não havia perguntas definidas no form mas há respostas salvas
      if (items.length === 0 && Object.keys(answers).length > 0) {
        Object.entries(answers).forEach(([key, val], idx) => {
          items.push({
            id: key,
            title: `Item Respondido ${idx + 1} (${key})`,
            type: 'text',
            value: val,
            displayValue: typeof val === 'object' ? JSON.stringify(val) : String(val),
          });
        });
      }

      return {
        responseId: r.id,
        formId: r.formId,
        formTitle: matchingForm?.title || r.form?.title || 'Questionário Clínico',
        formDescription: matchingForm?.description || r.form?.description || '',
        submittedAt: r.submittedAt,
        extractedVas,
        analgesicUsed,
        painTypeVal,
        items,
        answers,
      };
    });

    return {
      allForms: formsList,
      parsedFormResponses: parsed,
      isCurrentBlinded: isBlinded,
    };
  }, [project, participant, overrideBlindedView]);

  // Exportação tabular
  const exportData = useMemo(() => {
    if (!participant) return { tsv: '', json: '', summaryRows: [] };
    return generateParticipantTabularExport(participant as any, allForms);
  }, [participant, allForms]);

  const firstSessionNotes = participant?.sessions?.[0]?.notes || null;
  const globalUnlockMeta = parseUnlockMeta(firstSessionNotes);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <h2 className="text-base font-bold text-slate-800">Carregando Resultados Clínicos...</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Sincronizando escores de sensibilidade (EVA), questionários e histórico do voluntário.
        </p>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Não foi possível carregar os resultados</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
        >
          Voltar à tela anterior
        </button>
      </div>
    );
  }

  const sessions = participant.sessions || [];
  const projectUrl = project?.id ? `/dashboard?id=${project.id}` : '/projetos';

  return (
    <div className="min-h-screen bg-slate-100/60 pb-16">
      {/* Barra Superior / Breadcrumb */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link
              href={projectUrl}
              className="inline-flex items-center space-x-1.5 font-bold text-blue-600 hover:text-blue-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Painel do Estudo</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-700 truncate max-w-[200px]">
              {project?.name || 'Estudo Clínico'}
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900">Resultados & Respostas</span>
          </div>

          {/* Ações Rápidas do Cabeçalho */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => loadData(true)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Recarregar respostas e diários em tempo real"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Atualizando...' : 'Recarregar Dados'}</span>
            </button>

            <a
              href={`/paciente?code=${participant.researchCode}&projectId=${project?.id || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
              title="Abrir o portal do paciente em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Portal do Voluntário</span>
            </a>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Card de Identificação do Paciente & Protocolo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wider shadow-2xs">
                  {participant.researchCode}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {participant.patient.fullName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {participant.status === 'ACTIVE' ? 'Ativo no Protocolo' : participant.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 mt-2">
                <span>
                  <strong>Grupo de Alocação:</strong>{' '}
                  <span className="font-semibold text-blue-700">
                    {isCurrentBlinded ? 'OCULTO (Avaliador Cego)' : participant.group || 'Pendente'}
                  </span>
                </span>
                <span>•</span>
                <span>
                  <strong>Sexo Biológico:</strong> {participant.patient.biologicalSex || 'Não informado'}
                </span>
                <span>•</span>
                <span>
                  <strong>WhatsApp:</strong> {participant.patient.phoneWhatsApp || 'Não informado'}
                </span>
              </div>
            </div>

            {/* Simulador Interativo de Cegamento (ICH E6 / GCP) */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Simular Papel:
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setOverrideBlindedView(false)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    !isCurrentBlinded
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pesquisador Não-Cego (Ver Respostas)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideBlindedView(true)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    isCurrentBlinded
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Avaliador Cego (Mascarado)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex border-b border-slate-200 mt-6 -mb-5 sm:-mb-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('scales')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'scales'
                  ? 'border-indigo-600 text-indigo-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Escalas Clínicas & Diários de Dor (EVA)</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800 font-bold">
                {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('forms')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'forms'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Questionários & eCRF</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  parsedFormResponses.length > 0
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {parsedFormResponses.length > 0
                  ? `${parsedFormResponses.length} respondido(s)`
                  : `${parsedFormResponses.length}/${allForms.length}`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'export'
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Bioestatística & Exportação (Excel / SPSS)</span>
            </button>
          </div>
        </div>

        {/* ABA 1: ESCALAS CLÍNICAS & DIÁRIOS DE DOR (EVA) */}
        {activeTab === 'scales' && (
          <div className="space-y-6">
            {parsedFormResponses.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-start space-x-3.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {parsedFormResponses.length} Questionário(s) Respondido(s) Encontrado(s)
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                      Os escores de dor (EVA), respostas de escalas Likert e tabelas de avaliação submetidas pelo voluntário estão correlacionados nas sessões abaixo e detalhados na aba de Questionários.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('forms')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Ver Todos os Questionários</span>
                </button>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8 shadow-xs">
                <Activity className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Nenhuma sessão clínica registrada ainda</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Inicie o primeiro atendimento deste participante no painel para registrar a Sessão 1 e liberar os diários de sensibilidade (0h, 1h, 24h, 48h).
                </p>
                <Link
                  href={projectUrl}
                  className="inline-block mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Ir para Atendimento no Painel
                </Link>
              </div>
            ) : (
              sessions.map((sess) => {
                const unlockMeta = parseUnlockMeta(sess.notes);
                const isManualMode = unlockMeta.releaseMode === 'MANUAL';
                const moments: Array<'0h' | '1h' | '24h' | '48h'> = ['0h', '1h', '24h', '48h'];

                return (
                  <div
                    key={sess.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    {/* Cabeçalho da Sessão */}
                    <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-mono font-bold">
                            Sessão {sess.sessionNumber}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base">
                            {sess.sessionType || `Atendimento Clínico ${sess.sessionNumber}`}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Realizada em: <strong className="text-slate-800">{new Date(sess.sessionDate).toLocaleDateString('pt-BR')}</strong>
                          {sess.operatorName && ` • Operador: ${sess.operatorName}`}
                          {sess.evaluatorName && ` • Avaliador: ${sess.evaluatorName}`}
                        </p>
                      </div>

                      {/* Controles de Liberação da Sessão */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold border bg-white border-slate-200 text-slate-700">
                          {isManualMode ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Modo Manual</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Liberação Automática (GCP)</span>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={unlockingAction === `${sess.sessionNumber}-SET_MODE`}
                          onClick={() =>
                            handleToggleUnlock(
                              sess.sessionNumber,
                              'SET_MODE',
                              undefined,
                              isManualMode ? 'AUTO' : 'MANUAL'
                            )
                          }
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
                        >
                          {isManualMode ? 'Mudar p/ Automático' : 'Mudar p/ Manual'}
                        </button>

                        <button
                          type="button"
                          disabled={unlockingAction === `${sess.sessionNumber}-UNLOCK_ALL`}
                          onClick={() => handleToggleUnlock(sess.sessionNumber, 'UNLOCK_ALL')}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition cursor-pointer flex items-center space-x-1"
                        >
                          <Unlock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Liberar Todos os Momentos</span>
                        </button>
                      </div>
                    </div>

                    {/* Grid dos 4 Momentos de Sensibilidade (EVA) */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {moments.map((m) => {
                        const details = extractDiaryMomentDetails(sess, m);
                        const hasDirectScore = details.score !== null && details.score !== undefined;
                        const isZeroWithoutDiary =
                          details.score === 0 &&
                          !details.painType &&
                          !details.usedAnalgesic &&
                          !details.gingivalSensation &&
                          !details.otherSymptoms;

                        // Correlaciona com formulário submetido contendo EVA se o momento for 0h
                        const matchingFormResp =
                          m === '0h' ? parsedFormResponses.find((pr) => pr.extractedVas !== null) : null;

                        const scoreToShow =
                          matchingFormResp?.extractedVas !== null &&
                          matchingFormResp?.extractedVas !== undefined &&
                          (isZeroWithoutDiary || !hasDirectScore)
                            ? matchingFormResp.extractedVas
                            : details.score;

                        const hasScore = scoreToShow !== null && scoreToShow !== undefined;
                        const isUnlocked = unlockMeta.unlockedMoments.includes(m);
                        const isActionLoading = unlockingAction === `${sess.sessionNumber}-${m}`;

                        const painTypeToShow = details.painType || matchingFormResp?.painTypeVal;
                        const usedAnalgesicToShow = details.usedAnalgesic || matchingFormResp?.analgesicUsed;
                        const submittedAtToShow =
                          details.submittedAt ||
                          (matchingFormResp?.submittedAt
                            ? new Date(matchingFormResp.submittedAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : undefined);

                        const momentLabels: Record<string, { title: string; subtitle: string }> = {
                          '0h': { title: 'Imediato (0h)', subtitle: 'Durante a sessão clínica' },
                          '1h': { title: '1 Hora Pós', subtitle: '45min a 1h pós-atendimento' },
                          '24h': { title: '24 Horas Pós', subtitle: 'No dia seguinte' },
                          '48h': { title: '48 Horas Pós', subtitle: 'Dois dias pós-atendimento' },
                        };

                        return (
                          <div
                            key={m}
                            className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
                              hasScore
                                ? 'bg-slate-50/70 border-slate-200'
                                : isUnlocked
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">
                                  {momentLabels[m].title}
                                </span>
                                {hasScore ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Respondido
                                  </span>
                                ) : isUnlocked ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Liberado
                                  </span>
                                ) : isManualMode ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    Aguardando Manual
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    Por Tempo (GCP)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{momentLabels[m].subtitle}</p>

                              {/* Escore e Detalhes da Dor */}
                              <div className="mt-4">
                                {hasScore ? (
                                  isCurrentBlinded ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                                      <Lock className="w-5 h-5 text-amber-700 mx-auto mb-1" />
                                      <span className="text-xs font-bold text-amber-900 block">
                                        EVA Mascarada
                                      </span>
                                      <span className="text-[11px] text-amber-700">Avaliador Cego</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-baseline justify-between">
                                        <span className="text-xs text-slate-500 font-semibold">EVA:</span>
                                        <span className="text-2xl font-black font-mono text-indigo-700">
                                          {Number(scoreToShow).toFixed(1)}
                                          <span className="text-xs text-slate-400 font-normal"> / 10.0</span>
                                        </span>
                                      </div>

                                      {/* Barra de Intensidade */}
                                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            (scoreToShow || 0) <= 2
                                              ? 'bg-emerald-500'
                                              : (scoreToShow || 0) <= 5
                                              ? 'bg-amber-500'
                                              : 'bg-red-500'
                                          }`}
                                          style={{
                                            width: `${Math.min(
                                              Math.max(((scoreToShow || 0) / 10) * 100, 0),
                                              100
                                            )}%`,
                                          }}
                                        />
                                      </div>

                                      {/* Detalhes Clínicos do Relato */}
                                      <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 space-y-1">
                                        {painTypeToShow && (
                                          <p>
                                            <strong className="text-slate-800">Tipo:</strong> {painTypeToShow}
                                          </p>
                                        )}
                                        {usedAnalgesicToShow && (
                                          <p>
                                            <strong className="text-slate-800">Analgésico:</strong>{' '}
                                            <span
                                              className={
                                                usedAnalgesicToShow === 'Sim'
                                                  ? 'text-red-600 font-bold'
                                                  : 'text-slate-600'
                                              }
                                            >
                                              {usedAnalgesicToShow}
                                            </span>{' '}
                                            {details.analgesicDetails ? `(${details.analgesicDetails})` : ''}
                                          </p>
                                        )}
                                        {details.gingivalSensation && (
                                          <p>
                                            <strong className="text-slate-800">Gengiva:</strong> {details.gingivalSensation}
                                          </p>
                                        )}
                                        {details.otherSymptoms && (
                                          <p>
                                            <strong className="text-slate-800">Obs:</strong> {details.otherSymptoms}
                                          </p>
                                        )}
                                        {submittedAtToShow && (
                                          <p className="text-[11px] text-slate-400 pt-1">
                                            Envio: {submittedAtToShow}
                                          </p>
                                        )}

                                        {/* Perguntas e respostas do questionário vinculado */}
                                        {matchingFormResp && matchingFormResp.items.length > 0 && (
                                          <div className="pt-2 mt-2 border-t border-slate-200/80 space-y-1.5">
                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                                              Respostas ({matchingFormResp.formTitle}):
                                            </span>
                                            <div className="space-y-1">
                                              {matchingFormResp.items.map((item, itemIdx) => (
                                                <div
                                                  key={itemIdx}
                                                  className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex justify-between items-center gap-2 shadow-2xs"
                                                >
                                                  <span className="text-slate-700 font-medium truncate" title={item.title}>
                                                    {item.title}
                                                  </span>
                                                  <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[11px] shrink-0 font-mono">
                                                    {item.displayValue}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <div className="text-center py-6 text-slate-400 text-xs">
                                    <span>Ainda não respondido pelo paciente.</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Botões de Ação para o Momento Pendente */}
                            {!hasScore && (
                              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                {isUnlocked ? (
                                  <button
                                    type="button"
                                    disabled={isActionLoading}
                                    onClick={() =>
                                      handleToggleUnlock(sess.sessionNumber, 'LOCK_MOMENT', m)
                                    }
                                    className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                                  >
                                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{isActionLoading ? 'Processando...' : 'Bloquear Acesso'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isActionLoading}
                                    onClick={() =>
                                      handleToggleUnlock(sess.sessionNumber, 'UNLOCK_MOMENT', m)
                                    }
                                    className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition flex items-center justify-center space-x-1 cursor-pointer"
                                  >
                                    <Unlock className="w-3.5 h-3.5 text-white" />
                                    <span>{isActionLoading ? 'Liberando...' : 'Liberar Agora'}</span>
                                  </button>
                                )}

                                {participant.patient.phoneWhatsApp && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                      const link = `${origin}/paciente?code=${participant.researchCode}&tab=diary`;
                                      openWhatsApp(
                                        participant.patient.phoneWhatsApp,
                                        `Olá ${participant.patient.fullName}! Seu diário de sensibilidade (${momentLabels[m].title}) da Sessão ${sess.sessionNumber} está disponível para preenchimento: ${link}`
                                      );
                                    }}
                                    className="w-full py-1.5 px-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Lembrar no WhatsApp</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bloco de Respostas Detalhadas dos Questionários */}
                    {parsedFormResponses.length > 0 && (
                      <div className="p-5 border-t border-slate-200/80 bg-slate-50/70">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                          <div className="flex items-center space-x-2">
                            <ClipboardList className="w-5 h-5 text-blue-600" />
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                              Respostas Completas dos Questionários ({parsedFormResponses.length})
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('forms')}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Ver todos na aba Questionários</span>
                            <span>→</span>
                          </button>
                        </div>

                        <div className="space-y-4">
                          {parsedFormResponses.map((pfr) => (
                            <div
                              key={pfr.responseId}
                              className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                                <div className="flex items-center space-x-2.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                  <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                                    {pfr.formTitle}
                                  </h5>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Respondido
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(pfr.submittedAt).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>

                              {/* Lista de Questões e Respostas Espaçosas */}
                              <div className="space-y-3">
                                {pfr.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                  >
                                    <div className="min-w-0 pr-4">
                                      <span className="text-[11px] uppercase font-bold text-slate-400 block mb-0.5">
                                        Item {idx + 1}
                                      </span>
                                      <p className="text-sm font-semibold text-slate-900">
                                        {it.title}
                                      </p>
                                      {it.observation && (
                                        <p className="text-xs text-slate-500 mt-0.5 italic">
                                          Obs: {it.observation}
                                        </p>
                                      )}
                                    </div>
                                    <div className="shrink-0 text-left sm:text-right">
                                      <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                                        {it.displayValue}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ABA 2: QUESTIONÁRIOS DE PESQUISA & eCRF */}
        {activeTab === 'forms' && (
          <div className="space-y-6">
            {allForms.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">Nenhum questionário cadastrado para este projeto.</h3>
                <Link
                  href={`/construtor?projectId=${project?.id || ''}`}
                  className="inline-block mt-3 text-xs font-bold text-blue-600 hover:underline"
                >
                  + Criar questionários no Construtor de Fichas
                </Link>
              </div>
            ) : (
              allForms.map((form) => {
                const rawResp = participant.responses?.find((r) => r.formId === form.id);
                let anAnswers: Record<string, any> = {};
                if (participant.anamnesisData) {
                  try {
                    const d = JSON.parse(participant.anamnesisData);
                    anAnswers = d.answers || (typeof d === 'object' ? d : {});
                  } catch {}
                }
                const resp =
                  rawResp ||
                  (form.id === `anamnesis_${project?.id}` && Object.keys(anAnswers).length > 0
                    ? {
                        id: `anamnesis_resp_${participant.id}`,
                        formId: form.id,
                        submittedAt: new Date().toISOString(),
                        answersJson: JSON.stringify(anAnswers),
                      }
                    : null);

                const isUnlocked = globalUnlockMeta.unlockedForms.includes(form.id);
                const isActionLoading = unlockingAction === `form-${form.id}`;

                let parsedQuestions: FormQuestion[] = [];
                try {
                  if (form.questionsJson) {
                    parsedQuestions = JSON.parse(form.questionsJson);
                  } else if ((resp as any)?.form?.questionsJson) {
                    parsedQuestions = JSON.parse((resp as any).form.questionsJson);
                  }
                } catch {
                  parsedQuestions = [];
                }

                let answers: Record<string, any> = {};
                if (resp) {
                  try {
                    answers = JSON.parse(resp.answersJson || '{}');
                  } catch {
                    answers = {};
                  }
                }

                return (
                  <div
                    key={form.id}
                    className={`rounded-2xl border transition p-6 ${
                      resp
                        ? 'border-blue-200 bg-white shadow-xs'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              (form.description || '').toLowerCase().includes('tempo') ||
                              (form.description || '').toLowerCase().includes('domiciliar')
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {(form.description || '').toLowerCase().includes('tempo') ||
                            (form.description || '').toLowerCase().includes('domiciliar')
                              ? '⏱️ Acompanhamento Domiciliar por Tempo'
                              : '🩺 Vinculado à Consulta Clínica'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                          <span>{form.title}</span>
                        </h3>
                        {form.description && (
                          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
                            {form.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {resp ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
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
                          <>
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>Pendente</span>
                            </span>

                            {isUnlocked ? (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleToggleUnlockForm(form.id, 'LOCK_FORM')}
                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                <span>{isActionLoading ? '...' : 'Bloquear'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleToggleUnlockForm(form.id, 'UNLOCK_FORM')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5 text-white" />
                                <span>{isActionLoading ? '...' : 'Liberar Questionário Agora'}</span>
                              </button>
                            )}

                            {participant.patient.phoneWhatsApp && (
                              <button
                                type="button"
                                onClick={() => {
                                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                  const link = `${origin}/paciente?code=${participant.researchCode}&tab=forms`;
                                  openWhatsApp(
                                    participant.patient.phoneWhatsApp,
                                    `Olá ${participant.patient.fullName}! O questionário "${form.title}" está disponível para você responder no portal: ${link}`
                                  );
                                }}
                                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#25D366] hover:bg-[#128C7E] text-white shadow-xs transition cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Lembrar no WhatsApp</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Perguntas e Respostas */}
                    {resp ? (
                      isCurrentBlinded ? (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 text-left">
                          <div className="flex items-start space-x-3.5">
                            <Lock className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-bold text-amber-900">
                                Conteúdo Mascarado — Avaliador Cego
                              </h4>
                              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                Conforme as normas de ensaio clínico duplo-cego (GCP / ICH E6), avaliadores cegos não têm acesso aos escores ou respostas relatadas pelo paciente para evitar quebra de imparcialidade na avaliação clínica.
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-md border border-emerald-300 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Status: Respondido
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setOverrideBlindedView(false)}
                                  className="text-xs font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1 cursor-pointer"
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
                          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-900">
                            <span className="font-semibold flex items-center space-x-2">
                              <Eye className="w-4 h-4 text-blue-700" />
                              <span>Acesso Não-Cego / Coordenação: Visualização integral das respostas</span>
                            </span>
                            <span className="font-mono text-xs text-blue-600">ID: {resp.id.slice(0, 8)}</span>
                          </div>

                          {parsedQuestions.length === 0 ? (
                            <div className="space-y-2">
                              {Object.entries(answers).map(([k, v], idx) => (
                                <div
                                  key={k}
                                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs"
                                >
                                  <span className="font-semibold text-slate-700">
                                    Resposta {idx + 1} ({k})
                                  </span>
                                  <span className="font-bold font-mono text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            parsedQuestions.map((q, idx) => {
                              const val = answers[q.id];
                              const hasAnswer = val !== undefined && val !== null && val !== '';

                              return (
                                <div
                                  key={q.id || idx}
                                  className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2"
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <div>
                                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Questão {idx + 1}
                                      </span>
                                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
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
                                          <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-base font-bold font-mono">
                                            {hasAnswer ? `${Number(val).toFixed(1)} / 10.0` : '—'}
                                          </span>
                                          <span className="text-[11px] text-slate-400 mt-0.5">
                                            Escala Visual Analógica (EVA)
                                          </span>
                                        </div>
                                      ) : q.type === 'matrix' ? (
                                        <span className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold border border-purple-200">
                                          {hasAnswer ? (val === 'NA' ? 'NA (Não se aplica)' : `Nota ${val}`) : 'Não respondido'}
                                        </span>
                                      ) : q.type === 'boolean' ? (
                                        <span
                                          className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                            val === 'Sim' || val === true
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                              : 'bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          {hasAnswer ? String(val) : 'Não respondido'}
                                        </span>
                                      ) : q.type === 'choice' || q.type === 'likert' ? (
                                        <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
                                          {hasAnswer ? String(val) : 'Não respondido'}
                                        </span>
                                      ) : (
                                        <span className="text-sm font-semibold text-slate-800">
                                          {hasAnswer ? String(val) : '—'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Barra visual para EVA */}
                                  {q.type === 'vas' && hasAnswer && (
                                    <div className="pt-2">
                                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
                                        <div
                                          className="h-full bg-indigo-600 rounded-full transition-all"
                                          style={{
                                            width: `${Math.min(
                                              Math.max((Number(val) / 10) * 100, 0),
                                              100
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                      <div className="flex justify-between text-xs text-slate-400 mt-1 font-medium">
                                        <span>{q.leftAnchor || q.minLabel || '0.0 (Mínimo)'}</span>
                                        <span>{q.rightAnchor || q.maxLabel || '10.0 (Máximo)'}</span>
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
                      <div className="text-center py-8 text-slate-400 text-xs">
                        <span>Ainda não respondido pelo participante.</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ABA 3: BIOESTATÍSTICA & EXPORTAÇÃO */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Download className="w-5 h-5 text-emerald-600" />
                    <span>Matriz de Dados Tabular (Excel / SPSS / R)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Os dados longitudinais das sessões e questionários estão prontos para análise estatística.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(exportData.tsv);
                      setCopiedTSV(true);
                      setTimeout(() => setCopiedTSV(false), 2500);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                  >
                    {copiedTSV ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedTSV ? 'Copiado para a Área de Transferência!' : 'Copiar TSV (Excel)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([exportData.tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `dados_${participant.researchCode}_${new Date().toISOString().split('T')[0]}.tsv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Baixar Arquivo TSV</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Amostra */}
              <div className="mt-5 overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      {exportData.summaryRows.length > 0 &&
                        Object.keys(exportData.summaryRows[0]).map((h) => (
                          <th key={h} className="px-3.5 py-2.5 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exportData.summaryRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition font-mono">
                        {Object.values(row).map((v, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2 whitespace-nowrap text-slate-800">
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bloco de Código JSON Bruto */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Exportação em JSON Estruturado:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(exportData.json);
                      alert('JSON copiado com sucesso!');
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Copiar JSON
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono max-h-56 overflow-y-auto">
                  <pre>{exportData.json}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultadosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-600">Abrindo Resultados Clínicos...</p>
        </div>
      }
    >
      <ResultadosContent />
    </Suspense>
  );
}
