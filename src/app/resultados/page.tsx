'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Table as TableIcon,
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
  Activity,
  Copy,
  Check,
  Stethoscope,
  Info,
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

      // Se não há sessões mas há questionários, sugere a aba de questionários
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

  // Ações de desbloqueio
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

  const openWhatsApp = (phone: string | null | undefined, text: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Processamento dos questionários
  const { allForms, parsedFormResponses, isCurrentBlinded } = useMemo(() => {
    const isBlinded = overrideBlindedView !== null ? overrideBlindedView : (project?.isBlinded ?? false);
    const projectForms = project?.forms || [];
    const responses = participant?.responses || [];

    const formsList = [...projectForms];

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

    responses.forEach((r) => {
      if (r.form && !formsList.some((f) => f.id === r.formId)) {
        formsList.push(r.form);
      }
    });

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
        leftAnchor?: string;
        rightAnchor?: string;
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
            leftAnchor: q.leftAnchor || q.minLabel,
            rightAnchor: q.rightAnchor || q.maxLabel,
          });
        }
      });

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
        <h2 className="text-base font-bold text-slate-800">Carregando Tabela de Resultados...</h2>
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
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
        >
          Voltar à tela anterior
        </button>
      </div>
    );
  }

  const sessions = participant.sessions || [];
  const projectUrl = project?.id ? `/dashboard?id=${project.id}` : '/projetos';

  // Renderizador de célula de momento de dor (EVA)
  const renderMomentCell = (sess: any, m: '0h' | '1h' | '24h' | '48h', unlockMeta: any) => {
    const details = extractDiaryMomentDetails(sess, m);
    const hasDirectScore = details.score !== null && details.score !== undefined;
    const isZeroWithoutDiary =
      details.score === 0 &&
      !details.painType &&
      !details.usedAnalgesic &&
      !details.gingivalSensation &&
      !details.otherSymptoms;

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

    if (hasScore) {
      if (isCurrentBlinded) {
        return (
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs">
            <Lock className="w-3 h-3 text-amber-600" />
            <span className="font-semibold text-[11px]">Mascarado (Cego)</span>
          </div>
        );
      }

      const scoreNum = Number(scoreToShow);
      const badgeColor =
        scoreNum <= 2
          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
          : scoreNum <= 5
          ? 'bg-amber-50 text-amber-900 border-amber-200'
          : 'bg-red-50 text-red-900 border-red-200';

      const barColor =
        scoreNum <= 2 ? 'bg-emerald-500' : scoreNum <= 5 ? 'bg-amber-500' : 'bg-red-500';

      const painTypeToShow = details.painType || matchingFormResp?.painTypeVal;

      return (
        <div className="space-y-1 min-w-[130px]">
          <div className={`inline-flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg border font-mono text-xs font-bold ${badgeColor}`}>
            <span>EVA {scoreNum.toFixed(1)}</span>
            <span className="text-[10px] font-normal text-slate-500">/ 10</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor}`}
              style={{ width: `${Math.min(Math.max((scoreNum / 10) * 100, 0), 100)}%` }}
            />
          </div>
          {painTypeToShow && (
            <p className="text-[10px] text-slate-600 truncate max-w-[140px]" title={painTypeToShow}>
              {painTypeToShow}
            </p>
          )}
        </div>
      );
    }

    // Se pendente
    return (
      <div className="space-y-1.5 min-w-[120px]">
        {isUnlocked ? (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>Liberado</span>
          </span>
        ) : unlockMeta.releaseMode === 'MANUAL' ? (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-2.5 h-2.5 text-amber-600" />
            <span>Aguardando</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100 border border-slate-200">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            <span>Tempo (GCP)</span>
          </span>
        )}

        <div className="flex items-center gap-1">
          {isUnlocked ? (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => handleToggleUnlock(sess.sessionNumber, 'LOCK_MOMENT', m)}
              className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Bloquear
            </button>
          ) : (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => handleToggleUnlock(sess.sessionNumber, 'UNLOCK_MOMENT', m)}
              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition cursor-pointer"
            >
              Liberar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16 text-slate-800">
      {/* Barra de Navegação Compacta / Breadcrumb */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link
              href={projectUrl}
              className="inline-flex items-center space-x-1.5 font-bold text-blue-600 hover:text-blue-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Painel do Estudo</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-700 truncate max-w-[200px]">
              {project?.name || 'Estudo Clínico'}
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900">Tabela de Resultados</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => loadData(true)}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Recarregar respostas em tempo real"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Atualizando...' : 'Recarregar'}</span>
            </button>

            <a
              href={`/paciente?code=${participant.researchCode}&projectId=${project?.id || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Portal do Paciente</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Card Resumo do Participante (Compacto e Funcional) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono text-xs font-bold rounded uppercase">
                  {participant.researchCode}
                </span>
                <h1 className="text-lg font-bold text-slate-900">
                  {participant.patient.fullName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {participant.status === 'ACTIVE' ? 'Ativo no Estudo' : participant.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1.5">
                <span>
                  <strong>Grupo:</strong>{' '}
                  <span className="font-semibold text-blue-700">
                    {isCurrentBlinded ? 'OCULTO (Avaliador Cego)' : participant.group || 'Pendente'}
                  </span>
                </span>
                <span>•</span>
                <span>
                  <strong>Sexo:</strong> {participant.patient.biologicalSex || 'Não informado'}
                </span>
                <span>•</span>
                <span>
                  <strong>WhatsApp:</strong> {participant.patient.phoneWhatsApp || 'Não informado'}
                </span>
                {participant.patient.phoneWhatsApp && (
                  <button
                    type="button"
                    onClick={() =>
                      openWhatsApp(
                        participant.patient.phoneWhatsApp,
                        `Olá ${participant.patient.fullName}! Entramos em contato a respeito da sua participação na pesquisa clínica da UEPG.`
                      )
                    }
                    className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                    <span>Conversar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Simulador de Cegamento */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Simular Papel:</span>
              <button
                type="button"
                onClick={() => setOverrideBlindedView(false)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  !isCurrentBlinded
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Não-Cego</span>
              </button>
              <button
                type="button"
                onClick={() => setOverrideBlindedView(true)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  isCurrentBlinded
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cego (Mascarado)</span>
              </button>
            </div>
          </div>

          {/* Abas Tabulares */}
          <div className="flex border-b border-slate-200 mt-4 -mb-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('scales')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'scales'
                  ? 'border-indigo-600 text-indigo-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Tabela Longitudinal de Dor & Sensibilidade (EVA)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
                {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('forms')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'forms'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Tabela de Questionários & eCRF</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
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
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'export'
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Bioestatística (Excel / SPSS / TSV)</span>
            </button>
          </div>
        </div>

        {/* TABELA 1: ACOMPANHAMENTO LONGITUDINAL DE DOR (EVA) */}
        {activeTab === 'scales' && (
          <div className="space-y-4">
            {parsedFormResponses.length > 0 && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>{parsedFormResponses.length} questionário(s) respondido(s)</strong> registrado(s). As respostas completas das perguntas e escalas estão alinhadas na aba de Questionários.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('forms')}
                  className="font-bold text-blue-700 hover:text-blue-900 underline shrink-0 cursor-pointer"
                >
                  Ver na Tabela de Questionários →
                </button>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6 text-slate-500 text-xs">
                <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Nenhuma sessão clínica registrada para este participante.</p>
                <Link href={projectUrl} className="inline-block mt-2 text-blue-600 font-bold hover:underline">
                  Ir para Atendimento no Painel do Estudo
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                    <TableIcon className="w-4 h-4 text-indigo-600" />
                    <span>Acompanhamento Longitudinal de Dor e Sensibilidade (EVA) por Sessão</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Padrão GCP: 0h imediato, 1h pós, 24h dia seguinte, 48h 2 dias pós
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Sessão / Procedimento</th>
                        <th className="px-4 py-3 whitespace-nowrap">Data</th>
                        <th className="px-4 py-3 whitespace-nowrap min-w-[140px]">Imediato (0h)</th>
                        <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">1 Hora Pós (1h)</th>
                        <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">24 Horas Pós (24h)</th>
                        <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">48 Horas Pós (48h)</th>
                        <th className="px-4 py-3 whitespace-nowrap">Analgésico / Detalhes</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right">Controles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessions.map((sess) => {
                        const unlockMeta = parseUnlockMeta(sess.notes);
                        const isManualMode = unlockMeta.releaseMode === 'MANUAL';

                        const d0 = extractDiaryMomentDetails(sess, '0h');
                        const d1 = extractDiaryMomentDetails(sess, '1h');
                        const d24 = extractDiaryMomentDetails(sess, '24h');
                        const d48 = extractDiaryMomentDetails(sess, '48h');

                        const usedAnalgesic =
                          d0.usedAnalgesic || d1.usedAnalgesic || d24.usedAnalgesic || d48.usedAnalgesic;
                        const analgesicDetails =
                          d0.analgesicDetails || d1.analgesicDetails || d24.analgesicDetails || d48.analgesicDetails;

                        return (
                          <tr key={sess.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-mono font-bold">
                                  S{sess.sessionNumber}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 block">
                                    {sess.sessionType || `Sessão ${sess.sessionNumber}`}
                                  </span>
                                  {sess.operatorName && (
                                    <span className="text-[10px] text-slate-400 block">
                                      Op: {sess.operatorName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                              {new Date(sess.sessionDate).toLocaleDateString('pt-BR')}
                            </td>

                            {/* Células dos 4 Momentos */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {renderMomentCell(sess, '0h', unlockMeta)}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {renderMomentCell(sess, '1h', unlockMeta)}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {renderMomentCell(sess, '24h', unlockMeta)}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {renderMomentCell(sess, '48h', unlockMeta)}
                            </td>

                            {/* Analgésico de Resgate */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                              {usedAnalgesic ? (
                                <div>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                      usedAnalgesic === 'Sim'
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {usedAnalgesic === 'Sim' ? 'Uso Declarado' : 'Sem Uso'}
                                  </span>
                                  {analgesicDetails && (
                                    <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]">
                                      {analgesicDetails}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>

                            {/* Ações da Sessão */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-right">
                              <div className="inline-flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  disabled={unlockingAction === `${sess.sessionNumber}-UNLOCK_ALL`}
                                  onClick={() => handleToggleUnlock(sess.sessionNumber, 'UNLOCK_ALL')}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold transition cursor-pointer inline-flex items-center space-x-1"
                                  title="Liberar todos os momentos desta sessão de uma vez"
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>Liberar Todos</span>
                                </button>

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
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[10px] font-bold transition cursor-pointer"
                                  title="Alternar entre Liberação Automática (GCP) e Manual"
                                >
                                  {isManualMode ? 'Modo Manual' : 'GCP Automático'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TABELA 2: QUESTIONÁRIOS DE PESQUISA & eCRF ALINHADOS EM TABELA */}
        {activeTab === 'forms' && (
          <div className="space-y-5">
            {allForms.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium">Nenhum questionário cadastrado para este estudo.</p>
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
                    className={`rounded-xl border transition overflow-hidden shadow-2xs ${
                      resp ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    {/* Cabeçalho da Tabela do Questionário */}
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-sm">{form.title}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              (form.description || '').toLowerCase().includes('tempo') ||
                              (form.description || '').toLowerCase().includes('domiciliar')
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {(form.description || '').toLowerCase().includes('tempo') ||
                            (form.description || '').toLowerCase().includes('domiciliar')
                              ? 'Acompanhamento Domiciliar'
                              : 'Consulta Clínica'}
                          </span>
                        </div>
                        {form.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{form.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {resp ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
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
                          <>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>Pendente</span>
                            </span>

                            {isUnlocked ? (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleToggleUnlockForm(form.id, 'LOCK_FORM')}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold transition cursor-pointer"
                              >
                                Bloquear
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleToggleUnlockForm(form.id, 'UNLOCK_FORM')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition cursor-pointer"
                              >
                                Liberar Agora
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
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold bg-[#25D366] hover:bg-[#128C7E] text-white transition cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Lembrar no WhatsApp</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo em Tabela de Perguntas e Respostas */}
                    {resp ? (
                      isCurrentBlinded ? (
                        <div className="p-4 bg-amber-50/70 text-xs text-amber-900 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Lock className="w-4 h-4 text-amber-700" />
                            <span>
                              <strong>Conteúdo Mascarado (Avaliador Cego):</strong> Respostas e escores ocultos para manter o cegamento do ensaio clínico (GCP).
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOverrideBlindedView(false)}
                            className="font-bold text-blue-700 hover:underline cursor-pointer"
                          >
                            Ver Respostas (Não-Cego)
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                              <tr>
                                <th className="px-3.5 py-2.5 w-12 text-center">#</th>
                                <th className="px-3.5 py-2.5 min-w-[280px]">Pergunta / Item Clínico</th>
                                <th className="px-3.5 py-2.5 w-32">Tipo</th>
                                <th className="px-3.5 py-2.5 min-w-[220px]">Resposta Registrada do Voluntário</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parsedQuestions.length === 0 ? (
                                Object.entries(answers).map(([k, v], idx) => (
                                  <tr key={k} className="hover:bg-slate-50/70 transition">
                                    <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-400">
                                      {idx + 1}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-medium text-slate-800">{k}</td>
                                    <td className="px-3.5 py-2.5 text-slate-400">Genérica</td>
                                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                parsedQuestions.map((q, idx) => {
                                  const val = answers[q.id];
                                  const hasAnswer = val !== undefined && val !== null && val !== '';

                                  return (
                                    <tr key={q.id || idx} className="hover:bg-slate-50/80 transition">
                                      {/* Número */}
                                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-400">
                                        {idx + 1}
                                      </td>

                                      {/* Pergunta */}
                                      <td className="px-3.5 py-2.5">
                                        <p className="font-semibold text-slate-900 text-xs">
                                          {q.label || q.title || `Item ${idx + 1}`}
                                        </p>
                                        {q.observation && (
                                          <p className="text-[11px] text-slate-500 italic mt-0.5">
                                            Obs: {q.observation}
                                          </p>
                                        )}
                                      </td>

                                      {/* Tipo */}
                                      <td className="px-3.5 py-2.5">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                          {q.type === 'vas'
                                            ? 'EVA (0-10)'
                                            : q.type === 'likert'
                                            ? 'Likert'
                                            : q.type === 'matrix'
                                            ? 'Matriz'
                                            : q.type === 'boolean'
                                            ? 'Sim / Não'
                                            : q.type === 'choice'
                                            ? 'Opções'
                                            : 'Texto'}
                                        </span>
                                      </td>

                                      {/* Resposta do Voluntário */}
                                      <td className="px-3.5 py-2.5">
                                        {!hasAnswer ? (
                                          <span className="text-slate-400 italic text-[11px]">Não respondido</span>
                                        ) : q.type === 'vas' ? (
                                          <div className="space-y-1 max-w-[200px]">
                                            <div className="flex items-center justify-between font-mono font-bold text-xs text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                              <span>Score: {Number(val).toFixed(1)}</span>
                                              <span className="text-[10px] font-normal text-slate-500">/ 10</span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-indigo-600"
                                                style={{
                                                  width: `${Math.min(
                                                    Math.max((Number(val) / 10) * 100, 0),
                                                    100
                                                  )}%`,
                                                }}
                                              />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400">
                                              <span>{q.leftAnchor || q.minLabel || '0.0 (Mín)'}</span>
                                              <span>{q.rightAnchor || q.maxLabel || '10.0 (Máx)'}</span>
                                            </div>
                                          </div>
                                        ) : q.type === 'likert' || q.type === 'choice' ? (
                                          (() => {
                                            const opt = q.options?.find(
                                              (o: any) => String(o.value) === String(val)
                                            );
                                            const label = opt ? `${opt.label} (${val})` : String(val);
                                            return (
                                              <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded font-semibold text-xs shadow-2xs">
                                                {label}
                                              </span>
                                            );
                                          })()
                                        ) : q.type === 'matrix' ? (
                                          <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded font-bold text-xs">
                                            {val === 'NA' ? 'NA (Não se aplica)' : `Nota ${val}`}
                                          </span>
                                        ) : q.type === 'boolean' ? (
                                          <span
                                            className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                                              val === 'Sim' || val === true
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                          >
                                            {val === 'Sim' || val === true ? 'Sim' : 'Não'}
                                          </span>
                                        ) : (
                                          <span className="font-medium text-slate-800 text-xs">
                                            {String(val)}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        <span>Ainda não respondido pelo participante.</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TABELA 3: MATRIZ BIOESTATÍSTICA & EXPORTAÇÃO */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Matriz de Dados Longitudinal (Pronta para Excel, SPSS e R)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Linhas estruturadas por sessão clínica prontas para bioestatística.
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
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-2xs cursor-pointer"
                  >
                    {copiedTSV ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTSV ? 'Copiado!' : 'Copiar TSV (Excel)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([exportData.tsv], {
                        type: 'text/tab-separated-values;charset=utf-8;',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `dados_${participant.researchCode}_${
                        new Date().toISOString().split('T')[0]
                      }.tsv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Baixar Arquivo TSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      {exportData.summaryRows.length > 0 &&
                        Object.keys(exportData.summaryRows[0]).map((h) => (
                          <th key={h} className="px-3.5 py-2.5 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {exportData.summaryRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
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
          <p className="text-xs font-semibold text-slate-600">Carregando Resultados...</p>
        </div>
      }
    >
      <ResultadosContent />
    </Suspense>
  );
}
