'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  Info,
  ShieldCheck,
  Search,
  FileText,
  Phone,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import {
  StudyProtocolConfig,
  StudySessionProtocol,
  PRESET_QUESTIONNAIRES_CATALOG,
} from '@/lib/studyProtocol';

type ParticipantSession = {
  id: string;
  sessionNumber: number;
  sessionType: string;
  sessionDate: string;
  createdAt?: string;
  painScore0h: number | null;
  painScore1h: number | null;
  painScore24h: number | null;
  painScore48h: number | null;
  gingivalIrritation: string | null;
};

type FormQuestionItem = {
  id: string | number;
  type: 'vas' | 'likert' | 'choice' | 'boolean' | 'text' | 'number' | 'instruction' | 'matrix' | string;
  title: string;
  required: boolean;
  description?: string;
  options?: { label: string; value: string }[];
  minLabel?: string;
  maxLabel?: string;
  observation?: string;
};

type FormAnswerValue = string | number | boolean | null | undefined;

type FormItem = {
  id: string;
  title: string;
  description: string | null;
  questions: FormQuestionItem[];
  expirationHours: number;
  allowLate: boolean;
  createdAt: string;
  isCompleted: boolean;
  submittedAt: string | null;
  myAnswers: Record<string, FormAnswerValue> | null;
};

type OtherStudyOption = {
  participantId: string;
  researchCode: string;
  projectId: string;
  projectName: string;
};

type ParticipantData = {
  id: string;
  researchCode: string;
  patientName: string;
  projectName: string;
  projectId: string;
  responsibleResearcher: string;
  ethicsNumber: string;
  ethicsContacts: string;
  researcherPhone?: string | null;
  totalSessions?: number;
  maxCompletedSession?: number;
  sessions: ParticipantSession[];
  latestSession: ParticipantSession | null;
  forms: FormItem[];
  otherStudies?: OtherStudyOption[];
  studyProtocol?: StudyProtocolConfig;
  specialty?: string;
};

type CollisionOption = {
  participantId: string;
  projectId: string;
  projectName: string;
  maskedName: string;
  maskedCpf: string;
  cpfPrefix: string;
  birthYear: number | null;
};

function PacienteContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');
  const partIdParam = searchParams.get('participantId');
  const tabParam = searchParams.get('tab');
  const formIdParam = searchParams.get('formId');
  const projectIdParam = searchParams.get('projectId');

  const [inputCode, setInputCode] = useState(codeParam || '');
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados para Desambiguação de Colisão de Códigos (P001 em múltiplos estudos)
  const [collisionOptions, setCollisionOptions] = useState<CollisionOption[] | null>(null);
  const [disambigCpf, setDisambigCpf] = useState('');
  const [disambigBirth, setDisambigBirth] = useState('');

  // Navegação entre Diário de Dor e Questionários eCRF
  const [activeTab, setActiveTab] = useState<'diary' | 'forms'>(
    tabParam === 'forms' || formIdParam ? 'forms' : 'diary'
  );
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [formAnswers, setFormAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formRedAlert, setFormRedAlert] = useState<{
    isRedAlert: boolean;
    maxVasScore: number | null;
    severeDesc?: string | null;
  } | null>(null);

  // Form states do Diário de Sensibilidade
  const [selectedSessionNumber, setSelectedSessionNumber] = useState<number>(1);
  const [timePoint, setTimePoint] = useState<'0h' | '1h' | '24h' | '48h'>('24h');
  const [painScore, setPainScore] = useState<number>(0);
  const [painType, setPainType] = useState<string>('Sensibilidade ao ingerir líquidos ou alimentos frios');
  const [gingivalSensation, setGingivalSensation] = useState<string>('Normal');
  const [usedAnalgesic, setUsedAnalgesic] = useState<'Não' | 'Sim'>('Não');
  const [analgesicDetails, setAnalgesicDetails] = useState<string>('');
  const [otherSymptoms, setOtherSymptoms] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    timePoint: string;
    painScore: number;
    sessionNumber: number;
    timestamp: string;
    isRedAlert?: boolean;
    gingivalSensation?: string;
  } | null>(null);

  const getWhatsAppTarget = () => {
    if (participant?.researcherPhone) {
      const clean = participant.researcherPhone.replace(/\D/g, '');
      if (clean.length >= 10) return clean.startsWith('55') ? clean : `55${clean}`;
    }
    if (participant?.ethicsContacts) {
      const clean = participant.ethicsContacts.replace(/\D/g, '');
      if (clean.length >= 10) return clean.startsWith('55') ? clean : `55${clean}`;
    }
    return '5542999999999';
  };

  const loadParticipant = async (
    code?: string | null,
    id?: string | null,
    projId?: string | null,
    cpfFilter?: string | null,
    birthFilter?: string | null
  ) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setCollisionOptions(null);

      let url = '/api/paciente?';
      if (id) url += `participantId=${encodeURIComponent(id)}`;
      else if (code) url += `code=${encodeURIComponent(code.trim().toUpperCase())}`;
      else return;

      const activeProjId = projId || projectIdParam;
      if (activeProjId) {
        url += `&projectId=${encodeURIComponent(activeProjId)}`;
      }
      if (cpfFilter) {
        url += `&cpf=${encodeURIComponent(cpfFilter)}`;
      }
      if (birthFilter) {
        url += `&birthDate=${encodeURIComponent(birthFilter)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Participante não localizado.');
      }

      if (data.multiple) {
        setCollisionOptions(data.options);
        return;
      }

      setParticipant(data.participant);
      if (data.participant.researchCode) {
        setInputCode(data.participant.researchCode);
      }
      if (typeof window !== 'undefined' && data.participant.id) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('participantId', data.participant.id);
        window.history.replaceState({}, '', currentUrl.toString());
      }
      if (data.participant.latestSession) {
        setSelectedSessionNumber(data.participant.latestSession.sessionNumber);
      }
      if (formIdParam && data.participant.forms) {
        const found = data.participant.forms.find((f: FormItem) => f.id === formIdParam);
        if (found) {
          setSelectedForm(found);
          const initialAnswers: Record<string, FormAnswerValue> = { ...(found.myAnswers || {}) };
          (found.questions || []).forEach((q: FormQuestionItem) => {
            const qKey = String(q.id);
            if (q.type === 'vas' && initialAnswers[qKey] === undefined && initialAnswers[q.id] === undefined) {
              initialAnswers[qKey] = 0;
              initialAnswers[q.id] = 0;
            }
          });
          setFormAnswers(initialAnswers);
          setFormError(null);
          setActiveTab('forms');
        }
      } else if (data.participant.forms) {
        setSelectedForm((prev) => {
          if (!prev) return null;
          const refreshed = data.participant.forms.find((f: FormItem) => f.id === prev.id);
          return refreshed || prev;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados do participante.';
      setErrorMsg(msg);
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch participant on mount if param exists
  useEffect(() => {
    if (codeParam || partIdParam) {
      const timer = setTimeout(() => {
        loadParticipant(codeParam, partIdParam, projectIdParam);
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam, partIdParam, projectIdParam]);

  // Auto-selecionar o primeiro momento de diário que esteja liberado e pendente de resposta
  useEffect(() => {
    if (!participant?.sessions || participant.sessions.length === 0) return;
    const active =
      participant.sessions.find((s) => s.sessionNumber === selectedSessionNumber) ||
      participant.latestSession;
    if (!active) return;

    const sessionTime = active.createdAt
      ? new Date(active.createdAt)
      : new Date(active.sessionDate);
    const now = new Date();
    const elapsedHours = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60);

    const sessionDay = new Date(
      sessionTime.getFullYear(),
      sessionTime.getMonth(),
      sessionTime.getDate()
    ).getTime();
    const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.floor((todayDay - sessionDay) / (1000 * 60 * 60 * 24));

    const moments: Array<{
      key: '0h' | '1h' | '24h' | '48h';
      available: boolean;
      recorded: boolean;
    }> = [
      {
        key: '0h',
        available: true,
        recorded: active.painScore0h !== null && active.painScore0h !== undefined,
      },
      {
        key: '1h',
        available:
          diffDays >= 1 ||
          elapsedHours >= 0.75 ||
          (active.painScore1h !== null && active.painScore1h !== undefined),
        recorded: active.painScore1h !== null && active.painScore1h !== undefined,
      },
      {
        key: '24h',
        available:
          diffDays >= 1 ||
          elapsedHours >= 18 ||
          (active.painScore24h !== null && active.painScore24h !== undefined),
        recorded: active.painScore24h !== null && active.painScore24h !== undefined,
      },
      {
        key: '48h',
        available:
          diffDays >= 2 ||
          elapsedHours >= 40 ||
          (active.painScore48h !== null && active.painScore48h !== undefined),
        recorded: active.painScore48h !== null && active.painScore48h !== undefined,
      },
    ];

    const avail = moments.filter((m) => m.available);
    const pending = avail.find((m) => !m.recorded);
    if (pending) {
      setTimePoint(pending.key);
    } else if (avail.length > 0) {
      setTimePoint(avail[avail.length - 1].key);
    }
  }, [participant, selectedSessionNumber]);


  const handleSearchParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;
    loadParticipant(clean);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant) return;

    const payload = {
      participantId: participant.id,
      sessionNumber: selectedSessionNumber,
      timePoint,
      painScore,
      painType,
      usedAnalgesic,
      analgesicDetails: usedAnalgesic === 'Sim' ? analgesicDetails : '',
      gingivalSensation,
      otherSymptoms,
    };

    const triggeredRedAlert = Boolean(
      painScore >= 7 ||
      (gingivalSensation && (
        gingivalSensation.toLowerCase().includes('queimação') ||
        gingivalSensation.toLowerCase().includes('ardência') ||
        gingivalSensation.toLowerCase().includes('moderad') ||
        gingivalSensation.toLowerCase().includes('sever')
      ))
    );

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await fetch('/api/paciente/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar diário.');
      }

      setSubmittedData({
        timePoint,
        painScore,
        sessionNumber: selectedSessionNumber,
        timestamp: new Date().toLocaleString('pt-BR'),
        isRedAlert: Boolean(data.isRedAlert || triggeredRedAlert),
        gingivalSensation,
      });
      setIsSubmitted(true);
      await loadParticipant(participant.researchCode, participant.id);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar respostas. Verifique sua conexão à internet e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectForm = (form: FormItem) => {
    setSelectedForm(form);
    const initialAnswers: Record<string, FormAnswerValue> = { ...(form.myAnswers || {}) };

    // Inicializa perguntas VAS para 0.0 caso não haja resposta prévia, evitando bloqueio do voluntário por input range
    (form.questions || []).forEach((q) => {
      const qKey = String(q.id);
      if (q.type === 'vas' && initialAnswers[qKey] === undefined && initialAnswers[q.id] === undefined) {
        initialAnswers[qKey] = 0;
        initialAnswers[q.id] = 0;
      }
    });

    setFormAnswers(initialAnswers);
    setFormError(null);
    setFormSuccessMessage(null);
  };

  const handleFormAnswerChange = (questionId: string | number, value: FormAnswerValue) => {
    const key = String(questionId);
    setFormAnswers((prev) => ({ ...prev, [key]: value, [questionId]: value }));
  };

  const handleSubmitCustomForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm || !participant) return;

    // Validação de campos obrigatórios (instruções informativas nunca bloqueiam envio)
    const missing = selectedForm.questions.filter((q) => {
      if (q.type === 'instruction') return false;
      if (!q.required) return false;
      const val = formAnswers[String(q.id)] ?? formAnswers[q.id];
      return val === undefined || val === null || val === '';
    });

    if (missing.length > 0) {
      setFormError(`Por favor, responda a todas as perguntas obrigatórias marcadas com * (${missing.length} pendente(s)).`);
      const firstMissingId = String(missing[0].id);
      setTimeout(() => {
        const el = document.getElementById(`question-card-${firstMissingId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    const payload = {
      formId: selectedForm.id,
      participantId: participant.id,
      answers: formAnswers,
    };

    // Detecção precoce de sintomas para alerta offline ou imediato
    let hasSevereSymptom = false;
    let localMaxVas: number | null = null;
    let localDesc = '';
    for (const val of Object.values(formAnswers)) {
      const num =
        typeof val === 'number'
          ? val
          : typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== ''
          ? Number(val)
          : null;
      if (num !== null && num >= 7) {
        hasSevereSymptom = true;
        if (localMaxVas === null || num > localMaxVas) localMaxVas = num;
      } else if (typeof val === 'string') {
        const lower = val.toLowerCase();
        if (
          lower.includes('muita dor') ||
          lower.includes('dor severa') ||
          lower.includes('queimação intensa') ||
          lower.includes('dor intensa') ||
          lower.includes('queimação moderada') ||
          lower.includes('queimação severa') ||
          lower.includes('irritação severa') ||
          lower.includes('irritação moderada') ||
          lower.includes('queimação gengival') ||
          lower.includes('irritação gengival') ||
          lower.includes('dor insuportável') ||
          lower.includes('afta') ||
          lower.includes('ulceração')
        ) {
          hasSevereSymptom = true;
          localDesc = val;
        }
      }
    }

    try {
      setSubmittingForm(true);
      setFormError(null);

      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar respostas.');
      }

      setFormSuccessMessage('Questionário gravado com sucesso no protocolo do estudo!');
      if (data.isRedAlert || hasSevereSymptom) {
        setFormRedAlert({
          isRedAlert: true,
          maxVasScore: data.maxVasScore ?? localMaxVas,
          severeDesc: data.severeSymptomDesc ?? localDesc,
        });
      } else {
        setFormRedAlert(null);
      }
      await loadParticipant(participant.researchCode, participant.id);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erro ao registrar respostas. Verifique sua conexão à internet e tente novamente.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // TELA 1: SUCESSO APÓS O ENVIO
  if (isSubmitted && submittedData) {
    const isRedAlertTriggered = Boolean(
      submittedData.isRedAlert ||
      submittedData.painScore >= 7 ||
      (submittedData.gingivalSensation && (
        submittedData.gingivalSensation.toLowerCase().includes('queimação') ||
        submittedData.gingivalSensation.toLowerCase().includes('ardência') ||
        submittedData.gingivalSensation.toLowerCase().includes('moderad') ||
        submittedData.gingivalSensation.toLowerCase().includes('sever')
      ))
    );

    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex justify-center p-4 sm:py-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
          <div className="text-center space-y-4">
            {isRedAlertTriggered ? (
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-md animate-pulse">
                <AlertTriangle className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            <div>
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold font-mono">
                  {participant?.researchCode}
                </span>
                {isRedAlertTriggered && (
                  <span className="px-3 py-1 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider animate-bounce">
                    Alerta Vermelho Clínico
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                {isRedAlertTriggered ? 'Relato Recebido com Prioridade!' : 'Relato Registrado!'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRedAlertTriggered
                  ? 'Identificamos dor severa ou queimação gengival acentuada. Nossa equipe foi notificada em tempo real.'
                  : 'Suas respostas foram gravadas com segurança no banco de dados do ensaio clínico da UEPG.'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Sessão:</span>
                <span className="font-bold text-slate-800">Sessão {submittedData.sessionNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Momento Avaliado:</span>
                <span className="font-bold text-slate-800">{submittedData.timePoint} pós-atendimento</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Sensibilidade Reportada:</span>
                <span className="font-semibold text-emerald-700 flex items-center space-x-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Registrada no sistema</span>
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-medium">Data e Hora:</span>
                <span className="font-medium text-slate-700">{submittedData.timestamp}</span>
              </div>
            </div>

            {isRedAlertTriggered ? (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-left text-xs space-y-2.5">
                <h4 className="font-black text-red-900 flex items-center space-x-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Orientações Imediatas de Suporte Clínico:</span>
                </h4>
                <ul className="text-red-900 text-[11px] leading-relaxed space-y-1.5 list-disc pl-4">
                  <li>
                    <strong>Cuidados pós-operatórios:</strong> Evite estímulos térmicos excessivos (alimentos muito gelados ou muito quentes) e mastigação de alimentos duros na região do atendimento.
                  </li>
                  <li>
                    <strong>Higiene suave:</strong> Realize escovação delicada; evite bochechos com força nas primeiras horas.
                  </li>
                  <li>
                    <strong>Medicação & Recomendações:</strong> Siga rigorosamente as orientações e medicações prescritas ou recomendadas pela equipe de pesquisa na consulta.
                  </li>
                  <li>
                    <strong>Prontidão Clínica:</strong> Entre em contato imediatamente com o pesquisador responsável pelo botão de emergência abaixo.
                  </li>
                </ul>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-left text-xs space-y-2">
                <h4 className="font-bold text-blue-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Suporte Clínico aos Participantes</span>
                </h4>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  O desconforto ou sensibilidade após procedimentos clínicos odontológicos é geralmente transitório e costuma regredir nas primeiras 24 a 48 horas. Se sentir qualquer dor persistente ou desconforto incomum, você tem suporte direto da equipe de pesquisa.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-3">
            <a
              href={`https://wa.me/${getWhatsAppTarget()}?text=${encodeURIComponent(
                isRedAlertTriggered
                  ? `[ALERTA VERMELHO CLÍNICO - UEPG] Olá! Sou o voluntário ${participant?.patientName} (${participant?.researchCode}) do projeto "${participant?.projectName}". Registrei agora dor severa EVA ${submittedData.painScore}/10 no momento ${submittedData.timePoint} pós-atendimento. Solicito suporte e orientação clínica imediata.`
                  : `Olá, sou participante da pesquisa ${participant?.projectName} (${participant?.researchCode}) e gostaria de tirar uma dúvida sobre o protocolo do meu atendimento.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full py-3.5 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 ${
                isRedAlertTriggered
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-[#25D366] hover:bg-[#128C7E]'
              }`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>Falar com o Pesquisador Responsável</span>
            </a>

            {participant?.id && (
              <a
                href={`/tcle/${participant.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 border border-slate-300"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Visualizar / Imprimir Meu TCLE Assinado (PDF)</span>
              </a>
            )}

            <button
              onClick={() => {
                setIsSubmitted(false);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Voltar ao Meu Diário
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TELA 2A: RESOLUÇÃO DE COLISÃO DE CÓDIGOS DE VOLUNTÁRIOS (P001 EM MÚLTIPLOS ESTUDOS)
  if (collisionOptions && !participant) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mb-2 shadow-xs">
              <Search className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Selecione seu Estudo Clínico</h1>
            <p className="text-xs text-slate-500 mt-1">
              O código <strong className="font-mono text-slate-800">{inputCode.toUpperCase()}</strong> está cadastrado em mais de uma pesquisa na UEPG. Escolha seu estudo abaixo ou confirme seus dados:
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Opção A: Seleção Direta de Projeto */}
          <div className="space-y-3 mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Selecione o Projeto correspondente:
            </label>
            {collisionOptions.map((opt) => (
              <div
                key={opt.participantId}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{opt.projectName}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                    <span>Voluntário: <strong className="text-slate-700">{opt.maskedName}</strong></span>
                    <span>CPF: <strong className="font-mono text-slate-700">{opt.maskedCpf}</strong></span>
                    {opt.birthYear && <span>Nasc.: <strong className="text-slate-700">{opt.birthYear}</strong></span>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => loadParticipant(null, opt.participantId)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
                >
                  Confirmar Acesso →
                </button>
              </div>
            ))}
          </div>

          {/* Opção B: Validação por CPF ou Data de Nascimento */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Ou valide confirmando seus dados de cadastro:
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadParticipant(inputCode.trim(), null, null, disambigCpf, disambigBirth);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Primeiros 3 dígitos do CPF:
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="Ex: 123"
                    value={disambigCpf}
                    onChange={(e) => setDisambigCpf(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-center text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Ano de Nascimento ou Data:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1995 ou DD/MM/AAAA"
                    value={disambigBirth}
                    onChange={(e) => setDisambigBirth(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-center text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCollisionOptions(null);
                    setErrorMsg(null);
                    setDisambigCpf('');
                    setDisambigBirth('');
                  }}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  ← Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading || (!disambigCpf && !disambigBirth)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Confirmar e Entrar'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // TELA 2: ENTRADA COM CÓDIGO (CASO NÃO VENHA NA URL)
  if (!participant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 font-sans text-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-card hover:shadow-card-hover border border-slate-200/90 p-6 sm:p-8 transition-all">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mb-3 shadow-md shadow-blue-500/20">
              <span className="font-black text-xl">U</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portal do Participante</h1>
            <p className="text-xs text-slate-500 mt-1">
              Universidade Estadual de Ponta Grossa • UEPG <br />
              Pesquisa Clínica Odontológica
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSearchParticipant} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Digite seu Código de Pesquisa ou CPF:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: P01FV5K ou seu CPF"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-lg font-mono font-black tracking-widest uppercase focus-ring bg-slate-50/50 focus:bg-white transition"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Você pode entrar com o código do estudo ou com seu CPF cadastrado.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{loading ? 'Identificando...' : 'Acessar Meu Diário de Pesquisa'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Dúvidas? Entre em contato com a equipe de pesquisa pelo WhatsApp institucional informado no seu Termo de Consentimento (TCLE).
          </div>
        </div>
      </div>
    );
  }

  // TELA 3: FORMULÁRIO DO DIÁRIO DE DOR E QUESTIONÁRIOS DA PESQUISA
  const pendingFormsCount = participant.forms?.filter((f) => !f.isCompleted).length || 0;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex justify-center">
      {/* Contêiner Mobile */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col justify-between">
        
        {/* Cabeçalho */}
        <header className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 rounded-b-3xl shadow-lg shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span>UEPG • Pesquisa Clínica</span>
              </div>
              <h1 className="text-lg font-extrabold mt-0.5 leading-snug tracking-tight">
                {activeTab === 'diary' ? 'Diário de Sensibilidade' : selectedForm ? selectedForm.title : 'Questionários da Pesquisa'}
              </h1>
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/25 text-white rounded-full text-xs font-mono font-bold tracking-wider">
              {participant.researchCode}
            </span>
          </div>

          <div className="relative z-10 mt-4 p-3.5 bg-white/15 rounded-2xl text-xs border border-white/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <p className="font-bold text-white truncate text-xs">{participant.patientName}</p>
              <p className="text-blue-100 text-[11px] truncate mt-0.5">{participant.projectName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {participant.id && (
                <a
                  href={`/tcle/${participant.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 border border-white/25 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1"
                  title="Visualizar ou imprimir documento oficial do TCLE assinado em PDF"
                >
                  <FileText className="w-3 h-3" />
                  <span>TCLE (PDF)</span>
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Abas Superiores do Paciente */}
        <div className="p-2 bg-slate-100 border-b border-slate-200 flex space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('diary');
              setSelectedForm(null);
              setFormSuccessMessage(null);
              setFormError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'diary'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diário de Dor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('forms');
              setFormSuccessMessage(null);
              setFormError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 relative ${
              activeTab === 'forms'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Questionários</span>
            {pendingFormsCount > 0 && (
              <span className="w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] flex items-center justify-center font-black">
                {pendingFormsCount}
              </span>
            )}
          </button>
        </div>

        {/* Corpo do Conteúdo */}
        <main className="p-5 flex-1 space-y-5 overflow-y-auto">
          
          {/* Saudação Amigável e Contexto */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-xs">
            <div>
              <p className="font-bold text-slate-800 text-xs">
                Olá, {participant.patientName.split(' ')[0]}!
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {activeTab === 'diary'
                  ? 'Acompanhe e registre sua sensibilidade pós-sessão.'
                  : 'Responda aos questionários da pesquisa clínica com tranquilidade.'}
              </p>
            </div>

            {pendingFormsCount > 0 && activeTab === 'diary' && (
              <button
                type="button"
                onClick={() => setActiveTab('forms')}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold shrink-0 transition shadow-xs flex items-center space-x-1.5"
                title="Você tem questionários aguardando resposta"
              >
                <ClipboardList className="w-3 h-3" />
                <span>{pendingFormsCount} Pendente{pendingFormsCount > 1 ? 's' : ''}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* ABA 1: DIÁRIO DE SENSIBILIDADE (EVA) */}
          {activeTab === 'diary' && (() => {
            const hasAnySession = participant?.sessions && participant.sessions.length > 0;
            if (!hasAnySession) {
              return (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Aguardando Atendimento Clínico Presencial</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Sua consulta presencial da <strong>Sessão 1</strong> ainda não foi realizada no consultório. O diário de sensibilidade será liberado para preenchimento imediatamente após o seu atendimento pela equipe de pesquisa.
                  </p>
                  {participant.forms && participant.forms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('forms')}
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Ver Questionários da Pesquisa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            }

            const activeSession = participant?.sessions?.find((s) => s.sessionNumber === selectedSessionNumber) || participant?.latestSession;
            const protoSession = participant?.studyProtocol?.sessions?.find((s: StudySessionProtocol) => s.sessionNumber === selectedSessionNumber);

            const renderSessionSwitcher = () => {
              if (!participant?.sessions || participant.sessions.length <= 1) return null;
              return (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1">
                    Consulta:
                  </span>
                  {participant.sessions.map((sess) => {
                    const isSel = sess.sessionNumber === selectedSessionNumber;
                    const pSess = participant.studyProtocol?.sessions?.find((s: StudySessionProtocol) => s.sessionNumber === sess.sessionNumber);
                    return (
                      <button
                        key={sess.id || sess.sessionNumber}
                        type="button"
                        onClick={() => setSelectedSessionNumber(sess.sessionNumber)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs ${
                          isSel
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>Sessão {sess.sessionNumber}</span>
                        {pSess?.name && (
                          <span className="text-[10px] font-normal opacity-80 max-w-[120px] truncate hidden sm:inline">
                            ({pSess.name.replace(/^Sessão\s*\d+:\s*/i, '')})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            };

            // Caso o protocolo determine que a sessão não exige questionários do paciente:
            if (protoSession && protoSession.requiresPatientQuestionnaire === false) {
              return (
                <div className="space-y-4">
                  {renderSessionSwitcher()}
                  <div className="p-8 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-3xl text-center space-y-3.5 shadow-2xs">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                        Sessão {selectedSessionNumber}: {protoSession.name}
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm mt-2">
                        Atendimento Clínico Concluído
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Sua consulta presencial foi realizada e todos os desfechos clínicos foram registrados diretamente pelo pesquisador na cadeira. <strong>Para esta sessão, não é necessário preencher diário de dor ou questionário no celular.</strong>
                    </p>
                    {protoSession.patientInstructions && (
                      <div className="p-3.5 bg-white/90 border border-blue-200 rounded-2xl text-left text-xs max-w-md mx-auto space-y-1 shadow-2xs">
                        <span className="font-bold text-blue-950 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span>Recomendações da Equipe de Pesquisa:</span>
                        </span>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          {protoSession.patientInstructions}
                        </p>
                      </div>
                    )}
                    {participant.forms && participant.forms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('forms')}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Ver Questionários da Pesquisa</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // Caso a sessão exija questionários, mas NÃO o diário de sensibilidade EVA:
            const requiresEva = !protoSession?.patientQuestionnaireIds || protoSession.patientQuestionnaireIds.includes('eva');
            if (!requiresEva) {
              return (
                <div className="space-y-4">
                  {renderSessionSwitcher()}
                  <div className="p-8 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 rounded-3xl text-center space-y-3.5 shadow-2xs">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                        Sessão {selectedSessionNumber}: {protoSession?.name || 'Avaliação Clínica'}
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm mt-2">
                        Questionários Disponíveis no Portal
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Para esta sessão, não há diário de sensibilidade/dor (EVA). Por favor, responda aos questionários de acompanhamento da pesquisa clicando no botão abaixo:
                    </p>
                    {protoSession?.patientInstructions && (
                      <div className="p-3.5 bg-white/90 border border-blue-200 rounded-2xl text-left text-xs max-w-md mx-auto space-y-1 shadow-2xs">
                        <span className="font-bold text-blue-950 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span>Recomendações da Equipe:</span>
                        </span>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          {protoSession.patientInstructions}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('forms')}
                      className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>Responder Questionários da Sessão</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            const sessionTime = activeSession?.createdAt
              ? new Date(activeSession.createdAt)
              : activeSession?.sessionDate
              ? new Date(activeSession.sessionDate)
              : new Date();
            const now = new Date();
            const elapsedHours = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60);

            const sessionDay = new Date(sessionTime.getFullYear(), sessionTime.getMonth(), sessionTime.getDate()).getTime();
            const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const diffDays = Math.floor((todayDay - sessionDay) / (1000 * 60 * 60 * 24));

            const ALL_MOMENTS = [
              { key: '0h' as const, label: '0h (Imed.)', sub: 'Na consulta' },
              { key: '1h' as const, label: '1 Hora', sub: 'Pós-atendimento' },
              { key: '24h' as const, label: '24 Horas', sub: 'Dia seguinte' },
              { key: '48h' as const, label: '48 Horas', sub: '2 dias após' },
            ];

            const getMomentState = (k: '0h' | '1h' | '24h' | '48h') => {
              if (!activeSession) return { available: false, recorded: false, unlockMessage: '' };

              const score =
                k === '0h'
                  ? activeSession.painScore0h
                  : k === '1h'
                  ? activeSession.painScore1h
                  : k === '24h'
                  ? activeSession.painScore24h
                  : activeSession.painScore48h;

              const isRecorded = score !== null && score !== undefined;

              let available = false;
              let unlockMessage = '';

              if (k === '0h') {
                available = true;
              } else if (k === '1h') {
                available = diffDays >= 1 || elapsedHours >= 0.75 || isRecorded;
                if (!available) {
                  const waitMinutes = Math.max(1, Math.round((0.75 - elapsedHours) * 60));
                  unlockMessage = `em cerca de ${waitMinutes} minutos`;
                }
              } else if (k === '24h') {
                available = diffDays >= 1 || elapsedHours >= 18 || isRecorded;
                if (!available) {
                  unlockMessage = 'amanhã (Dia seguinte)';
                }
              } else if (k === '48h') {
                available = diffDays >= 2 || elapsedHours >= 40 || isRecorded;
                if (!available) {
                  unlockMessage = 'em 2 dias';
                }
              }

              return { available, recorded: isRecorded, unlockMessage };
            };

            const availableMoments = ALL_MOMENTS.filter((m) => getMomentState(m.key).available);
            const recordedCount = availableMoments.filter((m) => getMomentState(m.key).recorded).length;
            const nextUnavailable = ALL_MOMENTS.find((m) => !getMomentState(m.key).available);
            const isCurrentMomentRecorded = getMomentState(timePoint).recorded;

            return (
              <form onSubmit={handleSubmitReport} className="space-y-6">
                {renderSessionSwitcher()}

                {/* Orientações específicas do pesquisador para esta sessão */}
                {protoSession?.patientInstructions && (
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1 shadow-2xs">
                    <span className="font-bold flex items-center gap-1.5 text-blue-900">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Recomendações da Equipe para esta Sessão:</span>
                    </span>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      {protoSession.patientInstructions}
                    </p>
                  </div>
                )}
                
                {/* Painel de Registros Confirmados do Participante */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      <span>Registros Salvos no Estudo (Sessão {selectedSessionNumber}):</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      recordedCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {recordedCount} de {availableMoments.length} preenchido{recordedCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                    {availableMoments.map((m) => {
                      const state = getMomentState(m.key);
                      const isSelected = timePoint === m.key;
                      return (
                        <div
                          key={m.key}
                          onClick={() => setTimePoint(m.key)}
                          className={`p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
                            state.recorded
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                              : 'bg-white border-blue-200 text-blue-800 hover:border-blue-300'
                          } ${isSelected ? 'ring-2 ring-blue-500 font-bold' : ''}`}
                        >
                          <span className="font-semibold text-xs">{m.label}</span>
                          <span className="font-semibold mt-1 inline-flex items-center gap-1 text-[10px]">
                            {state.recorded ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Registrado</span>
                              </span>
                            ) : (
                              <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-blue-500" />
                                <span>Pendente</span>
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Seleção do Momento da Avaliação */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    1. Momento do relato após a sessão:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableMoments.map((item) => {
                      const isSelected = timePoint === item.key;
                      const state = getMomentState(item.key);

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setTimePoint(item.key)}
                          className={`p-3 rounded-xl border text-center transition flex flex-col justify-between items-center cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                              : state.recorded
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-medium'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-full">
                            <span className="block text-xs font-bold">{item.label}</span>
                            <span className={`block text-[10px] mt-0.5 ${
                              isSelected
                                ? 'text-blue-100'
                                : state.recorded
                                ? 'text-emerald-700 font-semibold'
                                : 'text-slate-400'
                            }`}>
                              {item.sub}
                            </span>
                          </div>
                          {state.recorded && (
                            <span className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                              isSelected ? 'bg-blue-700 text-white' : 'bg-emerald-200/80 text-emerald-900'
                            }`}>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Registrado</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {nextUnavailable && (
                    <div className="mt-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        O próximo momento (<strong>{nextUnavailable.label} - {nextUnavailable.sub}</strong>) será liberado <strong>{getMomentState(nextUnavailable.key).unlockMessage}</strong>.
                      </span>
                    </div>
                  )}

                  {isCurrentMomentRecorded && (
                    <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Relato deste momento já enviado e gravado!</span>
                        <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                          Conforme o protocolo metodológico do ensaio clínico, os valores numéricos anteriores não são reexibidos para evitar viés de resposta. Você pode atualizar seu envio se necessário.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              {/* Escala Visual Analógica (EVA) Contínua e Neutra */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    2. Escala Visual Analógica (EVA) de Sensibilidade
                  </label>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Deslize o marcador na linha horizontal contínua abaixo até o ponto exato que melhor representa a sua sensibilidade agora:
                  </p>
                </div>

                {/* Linha Contínua Analógica (100mm Digital): Sem números e sem cores para evitar viés de ancoragem */}
                <div className="py-4 px-1 space-y-3">
                  <div className="relative flex items-center">
                    {/* Delimitador vertical esquerdo */}
                    <div className="w-1 h-6 bg-slate-400 rounded-full shrink-0 -mr-1 z-10" />

                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={painScore}
                      onChange={(e) => setPainScore(parseFloat(parseFloat(e.target.value).toFixed(1)))}
                      className="w-full h-3 bg-slate-200 border border-slate-300 rounded-lg appearance-none cursor-pointer accent-slate-800 focus:outline-none shadow-inner"
                    />

                    {/* Delimitador vertical direito */}
                    <div className="w-1 h-6 bg-slate-400 rounded-full shrink-0 -ml-1 z-10" />
                  </div>

                  {/* Âncoras verbais nas extremidades (sem números e sem cores chamativas) */}
                  <div className="flex justify-between items-start text-xs pt-1 px-1">
                    <div className="text-left max-w-[130px]">
                      <span className="block font-bold text-slate-800">Nenhuma dor</span>
                      <span className="text-[10px] text-slate-400 leading-tight block">Ausência total de sensibilidade</span>
                    </div>
                    <div className="text-right max-w-[130px]">
                      <span className="block font-bold text-slate-800">Pior dor possível</span>
                      <span className="text-[10px] text-slate-400 leading-tight block">Intensidade máxima suportável</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipo de Sensação / Estímulo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  3. Como você descreveria essa sensação?
                </label>
                <select
                  value={painType}
                  onChange={(e) => setPainType(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Nenhuma sensibilidade ou dor">Nenhuma sensibilidade ou dor</option>
                  <option value="Sensibilidade ao ingerir líquidos ou alimentos frios">Sensibilidade ao ingerir líquidos ou alimentos frios</option>
                  <option value="Dor espontânea / pontada transitória">Dor espontânea / pontada transitória</option>
                  <option value="Sensibilidade ao respirar ar ambiente ou vento frio">Sensibilidade ao respirar ar ambiente ou vento frio</option>
                  <option value="Sensibilidade durante a escovação dos dentes">Sensibilidade durante a escovação dos dentes</option>
                  <option value="Desconforto ou pressão ao mastigar">Desconforto ou pressão ao mastigar</option>
                </select>
              </div>

              {/* Condição Gengival */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  4. Como está sua gengiva ao redor dos dentes?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { val: 'Normal', label: 'Normal e confortável' },
                    { val: 'Leve queimação ou ardência', label: 'Leve ardência ou queimação' },
                    { val: 'Queimação / dor gengival moderada a severa', label: 'Queimação / dor gengival moderada a severa' },
                    { val: 'Vermelhidão perceptível', label: 'Vermelhidão perceptível' },
                    { val: 'Pequena afta ou mancha branca', label: 'Pequena afta / mancha branca' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setGingivalSensation(item.val)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition ${
                        gingivalSensation === item.val
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Uso de Analgésicos */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                  5. Você precisou tomar algum remédio para dor (analgésico)?
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUsedAnalgesic('Não')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      usedAnalgesic === 'Não'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Não tomei remédio
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsedAnalgesic('Sim')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      usedAnalgesic === 'Sim'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Sim, tomei analgésico
                  </button>
                </div>

                {usedAnalgesic === 'Sim' && (
                  <div className="pt-2 animate-fadeIn">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Qual medicamento e quantos comprimidos você tomou?
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Paracetamol 750mg (1 comprimido) ou Dipirona 500mg"
                      value={analgesicDetails}
                      onChange={(e) => setAnalgesicDetails(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Outros Sintomas ou Observações */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Observações adicionais (opcional):
                </label>
                <textarea
                  rows={2}
                  value={otherSymptoms}
                  onChange={(e) => setOtherSymptoms(e.target.value)}
                  placeholder="Algo mais que você gostaria de relatar à equipe de pesquisa?"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Botão de Envio */}
              <div className="pt-2 pb-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <span>Gravando Relato...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isCurrentMomentRecorded
                          ? 'Atualizar Relato deste Momento'
                          : 'Enviar Meu Diário Clínico'}
                      </span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  Conforme as diretrizes éticas, todos os dados são sigilosos e monitorados pelos pesquisadores.
                </p>
              </div>

            </form>
          );
        })()}

          {/* ABA 2: QUESTIONÁRIOS DA PESQUISA (eCRF: OHIP-14, Hábitos, Estética) */}
          {activeTab === 'forms' && (
            <div>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccessMessage && (
                <div className="p-6 bg-white rounded-2xl border border-emerald-200 text-center space-y-4 shadow-sm animate-fadeIn">
                  <div
                    className={`w-14 h-14 ${
                      formRedAlert ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'
                    } rounded-full flex items-center justify-center mx-auto`}
                  >
                    {formRedAlert ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {formRedAlert ? 'Questionário Gravado com Alerta Prioritário!' : 'Questionário Gravado!'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {formSuccessMessage}
                    </p>
                  </div>

                  {formRedAlert && (
                    <div className="p-4 bg-red-50 border-2 border-red-400 rounded-2xl text-left text-xs space-y-2.5">
                      <h4 className="font-black text-red-900 flex items-center space-x-1.5 text-xs">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Orientações Imediatas de Suporte Clínico:</span>
                      </h4>
                      <p className="text-red-900 text-[11px] leading-relaxed">
                        Seu relato identificou sintoma severo{formRedAlert.severeDesc ? ` - "${formRedAlert.severeDesc}"` : ''}. A equipe clínica foi alertada.
                      </p>
                      <ul className="text-red-900 text-[11px] leading-relaxed space-y-1 list-disc pl-4">
                        <li>Evite ingerir líquidos ou alimentos em temperaturas extremas (gelados ou muito quentes).</li>
                        <li>Escove os dentes suavemente com cerdas macias e bocheche com água morna.</li>
                        <li>Entre em contato imediatamente com o pesquisador responsável pelo botão abaixo:</li>
                      </ul>
                      <a
                        href={`https://wa.me/${getWhatsAppTarget()}?text=${encodeURIComponent(
                          `[ALERTA CLÍNICO UEPG] Olá! Sou o voluntário ${participant?.patientName} (${participant?.researchCode}) da pesquisa "${participant?.projectName}". Registrei agora dor/desconforto intenso no questionário "${selectedForm?.title}" e gostaria de suporte da equipe de pesquisa.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Falar com o Pesquisador Responsável (WhatsApp)</span>
                      </a>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedForm(null);
                      setFormSuccessMessage(null);
                      setFormRedAlert(null);
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    ← Voltar à Lista de Questionários
                  </button>
                </div>
              )}

              {!formSuccessMessage && !selectedForm && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Instrumentos Científicos</h3>
                      <p className="text-[11px] text-slate-500">
                        Questionários de acompanhamento do ensaio clínico para este participante.
                      </p>
                    </div>
                  </div>

                  {(!participant.forms || participant.forms.length === 0) ? (
                    <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-400 space-y-1">
                      <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">Nenhum questionário complementar ativo.</p>
                      <p className="text-[11px] text-slate-400">Quando a equipe cadastrar novos formulários (OHIP-14, Hábitos, Estética), eles aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {participant.forms.map((f) => (
                        <div
                          key={f.id}
                          className={`p-4 rounded-2xl border transition space-y-3 ${
                            f.isCompleted
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h4 className="font-bold text-slate-900 text-xs">{f.title}</h4>
                                {(() => {
                                  const freqMatch = f.description?.match(/Frequência:\s*([^|]+)/);
                                  const freq = freqMatch ? freqMatch[1].trim() : null;
                                  if (!freq) return null;
                                  return (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                                      📅 {freq}
                                    </span>
                                  );
                                })()}
                              </div>
                              {f.description && (
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{f.description}</p>
                              )}
                              <span className="inline-block mt-1 text-[10px] text-slate-400 font-mono">
                                {f.questions.length} perguntas
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center space-x-1 ${
                                f.isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {f.isCompleted ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>Concluído</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Pendente</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">
                              {f.isCompleted && f.submittedAt ? `Enviado em ${f.submittedAt}` : 'Aguardando preenchimento'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectForm(f)}
                              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                                f.isCompleted
                                  ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                              }`}
                            >
                              {f.isCompleted ? 'Revisar / Atualizar' : 'Responder →'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!formSuccessMessage && selectedForm && (
                <form onSubmit={handleSubmitCustomForm} className="space-y-6 pb-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <button
                      type="button"
                      onClick={() => setSelectedForm(null)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>←</span>
                      <span>Voltar aos Questionários</span>
                    </button>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {selectedForm.questions.filter((q) => q.type !== 'instruction').length} perguntas
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedForm.title}</h3>
                    {selectedForm.description && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedForm.description}</p>
                    )}
                  </div>

                  <div className="space-y-5">
                    {(() => {
                      let questionCounter = 0;
                      return selectedForm.questions.map((q) => {
                        const isInstruction = q.type === 'instruction';
                        const qNumber = !isInstruction ? ++questionCounter : null;
                        const answerKey = String(q.id);
                        const currentAnswer = formAnswers[answerKey] ?? formAnswers[q.id];

                        // CASO ESPECIAL: INSTRUÇÃO / ORIENTAÇÃO (Não é pergunta com resposta)
                        if (isInstruction) {
                          return (
                            <div
                              key={q.id}
                              className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs">
                                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>{q.title || 'Orientações Iniciais'}</span>
                              </div>
                              <p className="text-[11px] text-blue-800 leading-relaxed">
                                {q.description ||
                                  q.observation ||
                                  'Leia com atenção as perguntas a seguir e selecione as opções que melhor descrevem suas sensações.'}
                              </p>
                            </div>
                          );
                        }

                        const isMissing = Boolean(
                          formError &&
                          q.required &&
                          (currentAnswer === undefined || currentAnswer === null || currentAnswer === '')
                        );

                        // PERGUNTA COMUM
                        return (
                          <div
                            key={q.id}
                            id={`question-card-${q.id}`}
                            className={`p-4 rounded-2xl space-y-3 transition ${
                              isMissing
                                ? 'bg-red-50/60 border-2 border-red-400 ring-2 ring-red-100'
                                : 'bg-slate-50 border border-slate-200'
                            }`}
                          >
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs leading-snug">
                                {qNumber}. {q.title} {q.required && <span className="text-red-500 font-bold">*</span>}
                              </h4>
                              {q.observation && (
                                <p className="text-[11px] text-slate-600 mt-1.5 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed flex items-start space-x-1.5">
                                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                  <span>
                                    <strong>Orientação:</strong> {q.observation}
                                  </span>
                                </p>
                              )}
                            </div>

                            {/* 1. Tabela de Avaliação (Matrix 1 a 10 + NA) */}
                            {(q.type === 'matrix' || q.type === ('matrix' as any)) && (() => {
                              const options =
                                q.options && q.options.length > 0
                                  ? q.options
                                  : [
                                      { label: '1', value: '1' },
                                      { label: '2', value: '2' },
                                      { label: '3', value: '3' },
                                      { label: '4', value: '4' },
                                      { label: '5', value: '5' },
                                      { label: '6', value: '6' },
                                      { label: '7', value: '7' },
                                      { label: '8', value: '8' },
                                      { label: '9', value: '9' },
                                      { label: '10', value: '10' },
                                      { label: 'NA', value: 'NA' },
                                    ];

                              return (
                                <div className="pt-2 space-y-2.5">
                                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-0.5">
                                    <span>1 = Pior / Mínimo</span>
                                    <span>10 = Excelente / Máximo</span>
                                  </div>
                                  <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                                    {options.map((opt) => {
                                      const isSelected = String(currentAnswer) === String(opt.value);
                                      const isNA = opt.value === 'NA';
                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => handleFormAnswerChange(q.id, opt.value)}
                                          className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                                            isSelected
                                              ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-md ring-2 ring-blue-300 scale-[1.03]'
                                              : isNA
                                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                              : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                                          } ${isNA ? 'col-span-2 sm:col-span-1 text-[11px]' : ''}`}
                                        >
                                          {opt.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '' && (
                                    <div className="flex justify-end items-center text-[11px] font-semibold text-emerald-700 pt-0.5">
                                      <span>
                                        {currentAnswer === 'NA' ? '✓ NA (Não se aplica)' : '✓ Opção selecionada'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 2. Escala Likert */}
                            {(q.type === 'likert' || q.type === ('likert' as any)) && (() => {
                              const options =
                                q.options && q.options.length > 0
                                  ? q.options
                                  : [
                                      { label: 'Nunca', value: '0' },
                                      { label: 'Raramente', value: '1' },
                                      { label: 'Às vezes', value: '2' },
                                      { label: 'Frequentemente', value: '3' },
                                      { label: 'Sempre', value: '4' },
                                    ];

                              return (
                                <div className="grid grid-cols-1 gap-1.5 pt-1">
                                  {options.map((opt) => {
                                    const isSelected = String(currentAnswer) === String(opt.value);
                                    const cleanLabel = opt.label.replace(/\s*\(\d+\)/g, '').trim();
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleFormAnswerChange(q.id, opt.value)}
                                        className={`p-2.5 rounded-xl border text-left text-xs transition flex justify-between items-center ${
                                          isSelected
                                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span>{cleanLabel}</span>
                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                            {/* 3. Múltipla Escolha */}
                            {(q.type === 'choice' || q.type === ('choice' as any)) && (() => {
                              const options =
                                q.options && q.options.length > 0
                                  ? q.options
                                  : [
                                      { label: 'Opção 1', value: '1' },
                                      { label: 'Opção 2', value: '2' },
                                    ];

                              return (
                                <div className="space-y-1.5 pt-1">
                                  {options.map((opt) => {
                                    const isSelected = String(currentAnswer) === String(opt.value);
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleFormAnswerChange(q.id, opt.value)}
                                        className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex justify-between items-center ${
                                          isSelected
                                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span>{opt.label}</span>
                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                            {/* 4. Binário (Sim / Não) */}
                            {q.type === 'boolean' && (
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {['Sim', 'Não'].map((val) => {
                                  const isSelected = currentAnswer === val;
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleFormAnswerChange(q.id, val)}
                                      className={`py-2.5 rounded-xl border text-center text-xs font-bold transition ${
                                        isSelected
                                          ? val === 'Sim'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* 5. Escala Visual Analógica (EVA - Dor / Sensibilidade) */}
                            {q.type === 'vas' && (() => {
                              const vasVal =
                                typeof currentAnswer === 'number'
                                  ? currentAnswer
                                  : typeof currentAnswer === 'string' && !isNaN(Number(currentAnswer))
                                  ? Number(currentAnswer)
                                  : 0;
                              const cleanMinLabel = (q.minLabel || 'Ausente / Mínimo')
                                .replace(/^[0-9\s=.:-]+/g, '')
                                .trim() || 'Ausente / Mínimo';
                              const cleanMaxLabel = (q.maxLabel || 'Severo / Máximo')
                                .replace(/^[0-9\s=.:-]+/g, '')
                                .trim() || 'Severo / Máximo';

                              return (
                                <div className="py-3 px-1 space-y-3">
                                  <p className="text-[11px] text-slate-500 italic px-1">
                                    Deslize o marcador na linha contínua até o ponto que melhor representa o que você sente:
                                  </p>
                                  <div className="relative flex items-center py-1">
                                    <div className="w-1 h-6 bg-slate-400 rounded-full shrink-0 -mr-1 z-10" />
                                    <input
                                      type="range"
                                      min="0"
                                      max="10"
                                      step="0.1"
                                      value={vasVal}
                                      onTouchStart={() => handleFormAnswerChange(q.id, vasVal)}
                                      onMouseDown={() => handleFormAnswerChange(q.id, vasVal)}
                                      onChange={(e) =>
                                        handleFormAnswerChange(
                                          q.id,
                                          parseFloat(parseFloat(e.target.value).toFixed(1))
                                        )
                                      }
                                      className="w-full h-3 bg-slate-200 border border-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none shadow-inner"
                                    />
                                    <div className="w-1 h-6 bg-slate-400 rounded-full shrink-0 -ml-1 z-10" />
                                  </div>
                                  <div className="flex justify-between items-start text-xs pt-0.5 px-1">
                                    <span className="font-bold text-slate-800 max-w-[48%] text-left leading-snug">
                                      {cleanMinLabel}
                                    </span>
                                    <span className="font-bold text-slate-800 max-w-[48%] text-right leading-snug">
                                      {cleanMaxLabel}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 6. Texto Aberto */}
                            {q.type === 'text' && (
                              <textarea
                                rows={3}
                                value={(currentAnswer as string | undefined) ?? ''}
                                onChange={(e) => handleFormAnswerChange(q.id, e.target.value)}
                                placeholder="Digite sua resposta aqui..."
                                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            )}

                            {/* 7. Número */}
                            {q.type === 'number' && (
                              <input
                                type="number"
                                value={(currentAnswer as string | number | undefined) ?? ''}
                                onChange={(e) => handleFormAnswerChange(q.id, e.target.value)}
                                placeholder="Informe um número..."
                                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="pt-2">
                    {formError && (
                      <div className="mb-3.5 p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-800 flex items-center space-x-2 shadow-xs">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="font-semibold">{formError}</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submittingForm}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {submittingForm ? (
                        <span>Gravando Respostas...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Enviar Respostas do Questionário</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                      Dados integrados diretamente ao banco de pesquisa clínica da UEPG.
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default function PacientePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando portal do paciente...</div>}>
      <PacienteContent />
    </Suspense>
  );
}
