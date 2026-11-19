'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
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
  Sparkles,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import {
  StudyProtocolConfig,
  StudySessionProtocol,
} from '@/lib/studyProtocol';

type ParticipantSession = {
  id: string;
  sessionNumber: number;
  sessionType: string;
  sessionDate: string;
  createdAt?: string;
  notes?: string | null;
  unlockedMoments?: string[];
  releaseMode?: 'AUTO' | 'MANUAL';
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
  enableGateQuestion?: boolean;
  gateQuestionTitle?: string;
};

type FormAnswerValue = string | number | boolean | null | undefined;

type FormItem = {
  id: string;
  title: string;
  description: string | null;
  occurrence?: string;
  modality?: 'SESSION' | 'TIME_BASED';
  questions: FormQuestionItem[];
  expirationHours: number;
  allowLate: boolean;
  createdAt: string;
  isCompleted: boolean;
  isUnlocked?: boolean;
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

function cleanFormDescription(desc: string | null | undefined) {
  if (!desc) return '';
  return desc
    .replace(/^modalidade:\s*[^|]+\|\s*/i, '')
    .replace(/^frequência:\s*[^|]+\|\s*/i, '')
    .replace(/^frequencia:\s*[^|]+\|\s*/i, '')
    .replace(/^preenchido por:\s*[^|]+\|\s*/i, '')
    .replace(/^ocorrência:\s*[^|]+\|\s*/i, '')
    .trim();
}

/**
 * Converte títulos, descrições e ocorrências científicas/técnicas (ex: OHIP-14, EVA, Linha de Base)
 * em linguagem amigável, clara e acessível para o paciente voluntário da pesquisa.
 */
function getPatientFriendlyForm(form: FormItem) {
  const originalTitle = form.title || '';
  const originalDesc = form.description || '';
  const originalOcc = form.occurrence || '';

  const lowerTitle = originalTitle.toLowerCase();
  const lowerDesc = originalDesc.toLowerCase();

  let friendlyTitle = originalTitle;
  let friendlyDesc = cleanFormDescription(originalDesc);
  let friendlyOccurrence = originalOcc;
  let technicalTag: string | null = null;

  // 1. OHIP-14 (Oral Health Impact Profile)
  if (lowerTitle.includes('ohip') || lowerDesc.includes('ohip')) {
    friendlyTitle = 'Qualidade de Vida e Saúde Bucal';
    friendlyDesc =
      'Avalia como seus dentes e sua saúde bucal influenciam sua alimentação, fala e bem-estar no seu dia a dia.';
    technicalTag = 'Instrumento OHIP-14';
  }
  // 2. EVA / VAS / Dor e Sensibilidade
  else if (lowerTitle.includes('eva') || lowerTitle.includes('sensib') || lowerTitle.includes('dor')) {
    friendlyTitle = 'Acompanhamento de Sensibilidade e Dor';
    friendlyDesc =
      'Avalia a intensidade de qualquer sensibilidade ou desconforto que você tenha sentido após o atendimento.';
    technicalTag = 'Escala EVA';
  }
  // 3. Satisfação / OES / Estética
  else if (
    lowerTitle.includes('satisfa') ||
    lowerTitle.includes('oes') ||
    lowerTitle.includes('estét') ||
    lowerTitle.includes('estet')
  ) {
    friendlyTitle = 'Satisfação com o Tratamento e Sorriso';
    friendlyDesc = 'Avalia sua percepção e satisfação com a estética e o resultado do seu tratamento.';
    if (lowerTitle.includes('oes')) technicalTag = 'Escala OES';
  }
  // 4. Hábitos
  else if (lowerTitle.includes('hábito') || lowerTitle.includes('habito')) {
    friendlyTitle = 'Hábitos e Cuidados Diários';
    friendlyDesc = 'Perguntas sobre sua rotina diária de alimentação, consumo e higiene bucal.';
  }
  // 5. Anamnese
  else if (
    lowerTitle.includes('anamnese') ||
    lowerTitle.includes('critérios') ||
    lowerTitle.includes('criterios')
  ) {
    friendlyTitle = 'Questionário Inicial de Saúde';
    friendlyDesc = 'Perguntas sobre seu histórico de saúde para o início da sua participação na pesquisa.';
  } else {
    // Limpeza genérica de siglas em outros formulários
    friendlyTitle = originalTitle
      .replace(/\s*\([^)]*Likert[^)]*\)/gi, '')
      .replace(/\s*\([^)]*eCRF[^)]*\)/gi, '')
      .replace(/\s*\([^)]*Oral Health Impact Profile[^)]*\)/gi, '')
      .trim();

    friendlyDesc = friendlyDesc
      .replace(/Escala Likert\s*\d+\s*pontos\.?/gi, '')
      .replace(
        /Avalia as \d+ dimensões do impacto da saúde bucal[^.]*\.?/gi,
        'Avalia a influência da saúde bucal no seu dia a dia.'
      )
      .trim();
  }

  // Ocorrência / Momento amigável
  if (
    originalOcc.toLowerCase().includes('linha de base') ||
    originalOcc.toLowerCase().includes('admissão') ||
    originalOcc.toLowerCase().includes('admissao')
  ) {
    friendlyOccurrence = 'Avaliação Inicial';
  } else if (originalOcc.toLowerCase().includes('24h') || originalOcc.toLowerCase().includes('24 horas')) {
    friendlyOccurrence = 'Acompanhamento 24 Horas';
  } else if (originalOcc.toLowerCase().includes('48h') || originalOcc.toLowerCase().includes('48 horas')) {
    friendlyOccurrence = 'Acompanhamento 48 Horas';
  } else if (originalOcc.toLowerCase().includes('7 dias')) {
    friendlyOccurrence = 'Acompanhamento 7 Dias';
  } else if (originalOcc.toLowerCase().includes('14 dias')) {
    friendlyOccurrence = 'Acompanhamento 14 Dias';
  } else if (originalOcc.toLowerCase().includes('21 dias')) {
    friendlyOccurrence = 'Acompanhamento 21 Dias';
  } else if (
    originalOcc.toLowerCase().includes('a cada consulta') ||
    originalOcc.toLowerCase().includes('a cada sessão')
  ) {
    friendlyOccurrence = 'A cada Consulta';
  } else if (originalOcc.toLowerCase().includes('conclusão') || originalOcc.toLowerCase().includes('final')) {
    friendlyOccurrence = 'Consulta Final';
  }

  return {
    friendlyTitle,
    friendlyDesc: friendlyDesc || 'Responda as perguntas a seguir sobre o acompanhamento da sua saúde.',
    friendlyOccurrence,
    technicalTag,
  };
}

function PacienteContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');
  const partIdParam = searchParams.get('participantId');
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

  // Estados do Questionário Selecionado e Modo Passo a Passo (Wizard)
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepHint, setStepHint] = useState<string | null>(null);
  const [showCompletedHistory, setShowCompletedHistory] = useState(false);
  const [formAnswers, setFormAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formRedAlert, setFormRedAlert] = useState<{
    isRedAlert: boolean;
    maxVasScore: number | null;
    severeDesc?: string | null;
  } | null>(null);

  const activateForm = (form: FormItem) => {
    setSelectedForm(form);
    setCurrentStepIndex(0);
    setStepHint(null);
    setFormError(null);
    setFormSuccessMessage(null);
    setFormRedAlert(null);

    const initialAnswers: Record<string, FormAnswerValue> = { ...(form.myAnswers || {}) };

    // Inicializa perguntas VAS caso não haja resposta prévia, respeitando perguntas-filtro (gate questions)
    (form.questions || []).forEach((q: FormQuestionItem) => {
      const qKey = String(q.id);
      if (q.type === 'vas') {
        if (!q.enableGateQuestion) {
          if (initialAnswers[qKey] === undefined && initialAnswers[q.id] === undefined) {
            initialAnswers[qKey] = 0;
            initialAnswers[q.id] = 0;
          }
        } else {
          // Se já havia resposta salva anteriormente, reconstrói o estado do gate
          const existingScore = initialAnswers[qKey] ?? initialAnswers[q.id];
          const existingGate = initialAnswers[`${qKey}_gate`] ?? initialAnswers[`${q.id}_gate`];
          if (existingGate === undefined && existingScore !== undefined && existingScore !== null) {
            const num = Number(existingScore);
            if (num > 0) {
              initialAnswers[`${qKey}_gate`] = 'sim';
              initialAnswers[`${q.id}_gate`] = 'sim';
            } else if (form.myAnswers) {
              initialAnswers[`${qKey}_gate`] = 'nao';
              initialAnswers[`${q.id}_gate`] = 'nao';
            }
          }
        }
      }
    });

    setFormAnswers(initialAnswers);
  };

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

      const formsList: FormItem[] = data.participant.forms || [];

      if (formIdParam && formsList.length > 0) {
        const found = formsList.find((f: FormItem) => f.id === formIdParam);
        if (found) {
          activateForm(found);
        }
      } else if (formsList.length > 0) {
        setSelectedForm((prev) => {
          if (!prev) return null;
          const refreshed = formsList.find((f: FormItem) => f.id === prev.id);
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

  // Carrega participante na montagem se houver parâmetro
  useEffect(() => {
    if (codeParam || partIdParam) {
      const timer = setTimeout(() => {
        loadParticipant(codeParam, partIdParam, projectIdParam);
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam, partIdParam, projectIdParam]);

  const handleSearchParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;
    loadParticipant(clean);
  };

  const handleFormAnswerChange = (questionId: string | number, value: FormAnswerValue) => {
    // Se estiver em modo somente leitura (bloqueado), não permite alterações
    if (selectedForm?.isCompleted && !selectedForm?.isUnlocked) return;

    const key = String(questionId);
    setFormAnswers((prev) => ({ ...prev, [key]: value, [questionId]: value }));
    setStepHint(null);
    setFormError(null);
  };

  // Verifica se a pergunta especificada está respondida de forma válida
  const isStepAnswered = (q: FormQuestionItem | undefined): boolean => {
    if (!q) return true;
    if (q.type === 'instruction') return true;
    if (!q.required) return true;

    const key = String(q.id);
    const val = formAnswers[key] ?? formAnswers[q.id];

    if (q.type === 'vas') {
      if (q.enableGateQuestion) {
        const gateVal = formAnswers[`${key}_gate`] ?? formAnswers[`${q.id}_gate`];
        if (!gateVal) return false;
        if (gateVal === 'sim') {
          return val !== undefined && val !== null && val !== '';
        }
        return true; // 'nao' registrou 0.0 de dor, totalmente válido
      }
      return val !== undefined && val !== null && val !== '';
    }

    if (q.type === 'text') {
      return typeof val === 'string' && val.trim().length > 0;
    }

    if (q.type === 'number') {
      return val !== undefined && val !== null && val !== '';
    }

    return val !== undefined && val !== null && val !== '';
  };

  const handleNextStep = () => {
    if (!selectedForm) return;
    const currentQ = selectedForm.questions[currentStepIndex];
    if (currentQ && !isStepAnswered(currentQ)) {
      setStepHint('Por favor, selecione sua resposta para continuar.');
      return;
    }
    setStepHint(null);
    if (currentStepIndex < selectedForm.questions.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStepHint(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSubmitCustomForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedForm || !participant) return;

    // Se o formulário já foi respondido e NÃO foi liberado pelo pesquisador, impede envio
    if (selectedForm.isCompleted && !selectedForm.isUnlocked) {
      setFormError('Este questionário já foi enviado e está bloqueado para edições.');
      return;
    }

    // Validação preventiva de todas as perguntas obrigatórias
    const missing = selectedForm.questions.filter((q) => {
      if (q.type === 'instruction') return false;
      if (!q.required) return false;
      return !isStepAnswered(q);
    });

    if (missing.length > 0) {
      const firstMissingIndex = selectedForm.questions.findIndex((q) => q.id === missing[0].id);
      if (firstMissingIndex !== -1) {
        setCurrentStepIndex(firstMissingIndex);
      }
      setStepHint('Por favor, responda a esta pergunta obrigatória antes de finalizar.');
      return;
    }

    try {
      setSubmittingForm(true);
      setFormError(null);
      setFormRedAlert(null);

      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: selectedForm.id,
          participantId: participant.id,
          answers: formAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar questionário.');
      }

      setFormSuccessMessage(`Suas respostas foram gravadas com sucesso!`);

      if (data.isRedAlert) {
        setFormRedAlert({
          isRedAlert: true,
          maxVasScore: data.maxVasScore,
          severeDesc: data.severeSymptomDesc,
        });
      }

      // Atualiza os dados do participante
      await loadParticipant(participant.researchCode, participant.id);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erro ao gravar questionário. Tente novamente.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // TELA 1: DESAMBIGUAÇÃO DE COLISÃO DE CÓDIGOS (EX: P001 EM MÚLTIPLOS ESTUDOS)
  if (collisionOptions && collisionOptions.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 font-sans text-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-card border border-slate-200/90 p-6 sm:p-8 transition-all">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mb-2 border border-amber-200 shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Confirmação de segurança</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              O código informado participa de mais de um estudo clínico na plataforma.
              Para proteger seus dados (LGPD), confirme um dado pessoal abaixo:
            </p>
          </div>

          <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">Estudos localizados:</span>
            {collisionOptions.map((opt) => (
              <div key={opt.participantId} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0">
                <span className="font-semibold text-slate-800 truncate max-w-[220px]">{opt.projectName}</span>
                <span className="text-[10px] text-slate-400 font-mono">CPF final {opt.maskedCpf.slice(-3)}</span>
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadParticipant(inputCode, null, null, disambigCpf, disambigBirth);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Informe os 3 primeiros dígitos do seu CPF:
              </label>
              <input
                type="text"
                maxLength={3}
                placeholder="Ex: 123"
                value={disambigCpf}
                onChange={(e) => setDisambigCpf(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-center font-mono font-bold text-sm tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">ou</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Informe o ano de nascimento (4 dígitos):
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="Ex: 1995"
                value={disambigBirth}
                onChange={(e) => setDisambigBirth(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-center font-mono font-bold text-sm tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCollisionOptions(null);
                  setErrorMsg(null);
                  setDisambigCpf('');
                  setDisambigBirth('');
                }}
                className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                ← Voltar
              </button>
              <button
                type="submit"
                disabled={loading || (!disambigCpf && !disambigBirth)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Verificando...' : 'Confirmar e Entrar'}
              </button>
            </div>
          </form>
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
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portal do participante</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Universidade Estadual de Ponta Grossa • UEPG <br />
              Pesquisa clínica e instrumentos de avaliação
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
                Você pode entrar com o código único fornecido pelo pesquisador ou com seu CPF cadastrado.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{loading ? 'Identificando...' : 'Acessar meus questionários'}</span>
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

  // TELA 3: PORTAL PRINCIPAL DO ESTUDO OU QUESTIONÁRIO PASSO A PASSO
  const pendingForms = (participant.forms || []).filter((f) => !f.isCompleted);
  const completedForms = (participant.forms || []).filter((f) => f.isCompleted);
  const primaryPendingForm = pendingForms[0];
  const otherPendingForms = pendingForms.slice(1);

  // Variáveis para o Wizard Passo a Passo
  const questions = selectedForm?.questions || [];
  const totalSteps = questions.length;
  const currentQuestion = questions[currentStepIndex];
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Regra de Permissão de Edição: se já foi enviado e NÃO foi liberado pelo pesquisador, é somente leitura
  const isReadOnly = Boolean(selectedForm?.isCompleted && !selectedForm?.isUnlocked);
  const isUnlockedByResearcher = Boolean(selectedForm?.isCompleted && selectedForm?.isUnlocked);

  // Metadados Amigáveis para o Formulário Ativo
  const friendlyActiveForm = selectedForm ? getPatientFriendlyForm(selectedForm) : null;

  // Numeração de perguntas reais (excluindo telas de orientação do contador)
  const nonInstructionQuestions = questions.filter((q) => q.type !== 'instruction');
  const totalQuestionsCount = nonInstructionQuestions.length;
  const currentQuestionNumber =
    currentQuestion?.type === 'instruction'
      ? null
      : questions.slice(0, currentStepIndex + 1).filter((q) => q.type !== 'instruction').length;

  const progressPercent =
    totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex justify-center">
      {/* Contêiner Mobile Responsivo (Estilo App Nativo) */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col justify-between">
        
        {/* ========================================== */}
        {/* CABEÇALHO CONDICIONAL                      */}
        {/* ========================================== */}
        {!selectedForm ? (
          // Cabeçalho da Página Inicial do Participante
          <header className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 rounded-b-3xl shadow-lg shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>UEPG • Pesquisa Clínica</span>
                </div>
                <h1 className="text-xl font-black mt-0.5 leading-snug tracking-tight">
                  Olá, {participant.patientName.split(' ')[0]}!
                </h1>
                <p className="text-blue-100 text-xs mt-0.5 truncate max-w-[220px]">
                  {participant.projectName}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/25 text-white rounded-full text-xs font-mono font-bold tracking-wider">
                  {participant.researchCode}
                </span>
                {participant.id && (
                  <a
                    href={`/tcle/${participant.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                    title="Visualizar documento oficial do TCLE assinado em PDF"
                  >
                    <FileText className="w-3 h-3" />
                    <span>TCLE (PDF)</span>
                  </a>
                )}
              </div>
            </div>
          </header>
        ) : (
          // Cabeçalho Focado do Modo Passo a Passo (Wizard Stepper)
          <header className="bg-white border-b border-slate-200 px-5 pt-4 pb-3 shrink-0 sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedForm(null);
                  setCurrentStepIndex(0);
                  setStepHint(null);
                }}
                className="py-1 px-2.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Sair do questionário e voltar ao portal"
              >
                <X className="w-4 h-4" />
                <span>Sair</span>
              </button>

              <div className="text-center min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {currentQuestion?.type === 'instruction'
                    ? 'Orientações'
                    : `Pergunta ${currentQuestionNumber} de ${totalQuestionsCount}`}
                </span>
                <span className="text-xs font-extrabold text-slate-800 truncate block max-w-[200px]">
                  {friendlyActiveForm?.friendlyTitle || selectedForm.title}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isReadOnly && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">Bloqueado</span>
                  </span>
                )}
                {isUnlockedByResearcher && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <Unlock className="w-3 h-3 text-emerald-600" />
                    <span className="hidden sm:inline">Liberado</span>
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Barra de Progresso Animada */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </header>
        )}

        {/* ========================================== */}
        {/* CORPO DO CONTEÚDO                          */}
        {/* ========================================== */}
        <main className="p-5 flex-1 flex flex-col justify-between overflow-y-auto">

          {/* VISTA 1: FEEDBACK DE SUCESSO APÓS GRAVAR */}
          {formSuccessMessage && (
            <div className="my-auto p-6 bg-white rounded-3xl border border-emerald-200 text-center space-y-4 shadow-sm animate-fadeIn">
              <div
                className={`w-16 h-16 ${
                  formRedAlert ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'
                } rounded-full flex items-center justify-center mx-auto`}
              >
                {formRedAlert ? <AlertTriangle className="w-9 h-9" /> : <CheckCircle2 className="w-9 h-9" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {formRedAlert ? 'Questionário gravado com alerta prioritário' : 'Questionário gravado com sucesso!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {formSuccessMessage}
                </p>
              </div>

              {formRedAlert && (
                <div className="p-4 bg-red-50 border-2 border-red-400 rounded-2xl text-left text-xs space-y-2.5">
                  <h4 className="font-black text-red-900 flex items-center space-x-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Orientações de suporte clínico:</span>
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
                      `[ALERTA CLÍNICO UEPG] Olá! Sou o voluntário ${participant?.patientName} (${participant?.researchCode}) da pesquisa "${participant?.projectName}". Registrei agora desconforto no questionário "${friendlyActiveForm?.friendlyTitle || selectedForm?.title}" e gostaria de suporte da equipe de pesquisa.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Falar com o pesquisador responsável (WhatsApp)</span>
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedForm(null);
                  setCurrentStepIndex(0);
                  setFormSuccessMessage(null);
                  setFormRedAlert(null);
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
              >
                ← Voltar ao início
              </button>
            </div>
          )}

          {/* VISTA 2: PÁGINA INICIAL SIMPLIFICADA DO PORTAL */}
          {!formSuccessMessage && !selectedForm && (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* 1. SE HOUVER QUESTIONÁRIO PENDENTE: CARTÃO DE DESTAQUE COM NOMENCLATURA AMIGÁVEL */}
                {primaryPendingForm ? (() => {
                  const friendly = getPatientFriendlyForm(primaryPendingForm);

                  return (
                    <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white rounded-3xl p-6 border-2 border-blue-200/90 shadow-md space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          Disponível para preenchimento
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                          {friendly.friendlyOccurrence}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                            {friendly.friendlyTitle}
                          </h3>
                          {friendly.technicalTag && (
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              {friendly.technicalTag}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {friendly.friendlyDesc}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Leva cerca de 2 minutos
                          </span>
                          <span>•</span>
                          <span>
                            {primaryPendingForm.questions.filter((q) => q.type !== 'instruction').length} perguntas focadas
                          </span>
                        </div>
                      </div>

                      {/* BOTÃO PRINCIPAL DE INÍCIO */}
                      <button
                        type="button"
                        onClick={() => activateForm(primaryPendingForm)}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-base rounded-2xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        <span>Iniciar questionário</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })() : (
                  // SE NÃO HOUVER NENHUM PENDENTE
                  <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base">Tudo em dia!</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Você não possui questionários pendentes de resposta no momento. Sua participação no estudo <strong>{participant.projectName}</strong> está regularizada.
                    </p>
                  </div>
                )}

                {/* 2. OUTROS QUESTIONÁRIOS PENDENTES (CASO O ESTUDO TENHA MAIS DE UM SIMULTÂNEO) */}
                {otherPendingForms.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                      Outros questionários aguardando resposta:
                    </p>
                    {otherPendingForms.map((f) => {
                      const friendly = getPatientFriendlyForm(f);
                      return (
                        <div
                          key={f.id}
                          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate">{friendly.friendlyTitle}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{friendly.friendlyOccurrence}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => activateForm(f)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                          >
                            Iniciar →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. HISTÓRICO DE QUESTIONÁRIOS JÁ RESPONDIDOS (COM STATUS DE BLOQUEIO / LIBERAÇÃO) */}
                {completedForms.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCompletedHistory(!showCompletedHistory)}
                      className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Questionários já respondidos ({completedForms.length})
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {showCompletedHistory ? 'Ocultar ▲' : 'Ver histórico ▼'}
                      </span>
                    </button>

                    {showCompletedHistory && (
                      <div className="mt-2.5 space-y-2 animate-fadeIn">
                        {completedForms.map((f) => {
                          const friendly = getPatientFriendlyForm(f);
                          return (
                            <div
                              key={f.id}
                              className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-800 truncate text-xs">{friendly.friendlyTitle}</p>
                                  {f.isUnlocked ? (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5 shrink-0">
                                      <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>Liberado</span>
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-0.5 shrink-0">
                                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                                      <span>Bloqueado</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {friendly.friendlyOccurrence} • {f.submittedAt ? `Enviado em ${f.submittedAt}` : 'Concluído'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => activateForm(f)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition flex items-center gap-1 ${
                                  f.isUnlocked
                                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {f.isUnlocked ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Editar</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    <span>Consultar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RODAPÉ INFORMATIVO */}
              <div className="pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
                Seus dados estão protegidos conforme as diretrizes éticas da UEPG e a LGPD.
              </div>
            </div>
          )}

          {/* VISTA 3: RESPOSTA AO QUESTIONÁRIO SELECIONADO - 1 QUESTÃO POR TELA (WIZARD) */}
          {!formSuccessMessage && selectedForm && currentQuestion && (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              
              {/* CARTÃO DA QUESTÃO ATUAL */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex-1 flex flex-col justify-between space-y-4 animate-fadeIn">
                
                {/* TOPO DA PERGUNTA: TÍTULO, AVISO DE BLOQUEIO/LIBERAÇÃO E ORIENTAÇÕES */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {currentQuestion.type === 'instruction'
                        ? 'Orientações'
                        : `Etapa ${currentStepIndex + 1} de ${totalSteps}`}
                    </span>
                    {currentQuestion.required && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Obrigatória
                      </span>
                    )}
                  </div>

                  {/* AVISO QUANDO O QUESTIONÁRIO ESTIVER BLOQUEADO (RESPOSTAS ANTERIORES) */}
                  {isReadOnly && (
                    <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="leading-snug">
                        <span className="font-bold block">Respostas já enviadas (edição bloqueada)</span>
                        <span className="text-[11px] text-amber-800">
                          Este questionário já foi finalizado. Caso precise alterar alguma resposta, solicite a liberação da edição ao pesquisador.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* AVISO QUANDO O PESQUISADOR LIBEROU A EDIÇÃO */}
                  {isUnlockedByResearcher && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900">
                      <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="leading-snug">
                        <span className="font-bold block">Edição liberada pelo pesquisador</span>
                        <span className="text-[11px] text-emerald-800">
                          Você pode alterar suas respostas. Ao concluir a última etapa, clique em &quot;Salvar alterações&quot;.
                        </span>
                      </div>
                    </div>
                  )}

                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {currentQuestion.title}
                  </h3>

                  {currentQuestion.observation && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{currentQuestion.observation}</span>
                    </div>
                  )}
                </div>

                {/* ÁREA DE RESPOSTA INTERATIVA (ESPECÍFICA DO TIPO) */}
                <div className="my-auto py-2">
                  {/* 1. LIKERT */}
                  {currentQuestion.type === 'likert' && (() => {
                    const options =
                      currentQuestion.options && currentQuestion.options.length > 0
                        ? currentQuestion.options
                        : [
                            { label: 'Nunca', value: '0' },
                            { label: 'Raramente', value: '1' },
                            { label: 'Às vezes', value: '2' },
                            { label: 'Frequentemente', value: '3' },
                            { label: 'Sempre', value: '4' },
                          ];
                    const currentAnswer = formAnswers[String(currentQuestion.id)] ?? formAnswers[currentQuestion.id];

                    return (
                      <div className="space-y-2.5">
                        {options.map((opt) => {
                          const isSelected = String(currentAnswer) === String(opt.value);
                          const cleanLabel = opt.label.replace(/\s*\(\d+\)/g, '').trim();
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => !isReadOnly && handleFormAnswerChange(currentQuestion.id, opt.value)}
                              className={`w-full p-4 rounded-2xl border-2 text-left transition flex items-center justify-between ${
                                isReadOnly ? 'cursor-default' : 'cursor-pointer'
                              } ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-md ring-2 ring-blue-300 scale-[1.01]'
                                  : isReadOnly
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-sm font-semibold">{cleanLabel}</span>
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-white bg-white text-blue-600' : 'border-slate-300'
                                }`}
                              >
                                {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* 2. MÚLTIPLA ESCOLHA (CHOICE) */}
                  {currentQuestion.type === 'choice' && (() => {
                    const options =
                      currentQuestion.options && currentQuestion.options.length > 0
                        ? currentQuestion.options
                        : [
                            { label: 'Opção 1', value: '1' },
                            { label: 'Opção 2', value: '2' },
                          ];
                    const currentAnswer = formAnswers[String(currentQuestion.id)] ?? formAnswers[currentQuestion.id];

                    return (
                      <div className="space-y-2.5">
                        {options.map((opt) => {
                          const isSelected = String(currentAnswer) === String(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => !isReadOnly && handleFormAnswerChange(currentQuestion.id, opt.value)}
                              className={`w-full p-4 rounded-2xl border-2 text-left transition flex items-center justify-between ${
                                isReadOnly ? 'cursor-default' : 'cursor-pointer'
                              } ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-md ring-2 ring-blue-300 scale-[1.01]'
                                  : isReadOnly
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-sm font-semibold">{opt.label}</span>
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-white bg-white text-blue-600' : 'border-slate-300'
                                }`}
                              >
                                {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* 3. BINÁRIO (SIM / NÃO) */}
                  {currentQuestion.type === 'boolean' && (() => {
                    const currentAnswer = formAnswers[String(currentQuestion.id)] ?? formAnswers[currentQuestion.id];
                    return (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {[
                          { label: 'Sim', val: 'Sim', bgActive: 'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-300' },
                          { label: 'Não', val: 'Não', bgActive: 'bg-slate-700 border-slate-700 text-white ring-2 ring-slate-300' },
                        ].map((item) => {
                          const isSelected = currentAnswer === item.val;
                          return (
                            <button
                              key={item.val}
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => !isReadOnly && handleFormAnswerChange(currentQuestion.id, item.val)}
                              className={`py-4 px-3 rounded-2xl border-2 text-center text-sm font-black transition flex items-center justify-center gap-2 ${
                                isReadOnly ? 'cursor-default' : 'cursor-pointer'
                              } ${
                                isSelected
                                  ? `${item.bgActive} shadow-md scale-[1.02]`
                                  : isReadOnly
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* 4. ESCALA VISUAL ANALÓGICA (EVA / VAS) */}
                  {currentQuestion.type === 'vas' && (() => {
                    const qIdStr = String(currentQuestion.id);
                    const gateKey = `${qIdStr}_gate`;
                    const gateVal = formAnswers[gateKey] ?? formAnswers[`${currentQuestion.id}_gate`];
                    const isGateEnabled = Boolean(currentQuestion.enableGateQuestion);
                    const hasPain = gateVal === 'sim';
                    const isBlockedNoPain = isGateEnabled && gateVal === 'nao';

                    const currentAnswer = formAnswers[qIdStr] ?? formAnswers[currentQuestion.id];
                    const vasVal =
                      typeof currentAnswer === 'number'
                        ? currentAnswer
                        : typeof currentAnswer === 'string' && !isNaN(Number(currentAnswer))
                        ? Number(currentAnswer)
                        : 0;

                    const cleanMinLabel =
                      (currentQuestion.minLabel || 'Ausente / Mínimo')
                        .replace(/^[0-9\s=.:-]+/g, '')
                        .trim() || 'Ausente / Mínimo';
                    const cleanMaxLabel =
                      (currentQuestion.maxLabel || 'Severo / Máximo')
                        .replace(/^[0-9\s=.:-]+/g, '')
                        .trim() || 'Severo / Máximo';

                    return (
                      <div className="py-2 space-y-4">
                        {/* Pergunta preliminar Sim / Não condicional */}
                        {isGateEnabled && (
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                              <span className="text-xs sm:text-sm font-black text-slate-800">
                                {currentQuestion.gateQuestionTitle || 'Você sentiu dor ou sensibilidade?'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  handleFormAnswerChange(gateKey, 'sim');
                                  handleFormAnswerChange(`${currentQuestion.id}_gate`, 'sim');
                                  if (currentAnswer === undefined || currentAnswer === null) {
                                    handleFormAnswerChange(currentQuestion.id, 0);
                                  }
                                }}
                                className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 border-2 ${
                                  isReadOnly ? 'cursor-default' : 'cursor-pointer'
                                } ${
                                  hasPain
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                                    : isReadOnly
                                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {hasPain && <Check className="w-4 h-4 stroke-[3]" />}
                                <span>Sim (tive dor)</span>
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  handleFormAnswerChange(gateKey, 'nao');
                                  handleFormAnswerChange(`${currentQuestion.id}_gate`, 'nao');
                                  handleFormAnswerChange(currentQuestion.id, 0);
                                }}
                                className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 border-2 ${
                                  isReadOnly ? 'cursor-default' : 'cursor-pointer'
                                } ${
                                  isBlockedNoPain
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                                    : isReadOnly
                                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {isBlockedNoPain && <Check className="w-4 h-4 stroke-[3]" />}
                                <span>Não (sem dor)</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Alerta de confirmação quando responder "Não" (sem dor) */}
                        {isBlockedNoPain && (
                          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs animate-fadeIn">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="leading-snug">
                              <span className="font-bold block text-xs">Ausência de dor registrada</span>
                              <span className="text-emerald-700 text-[11px]">
                                {isReadOnly
                                  ? 'Você informou ausência de dor nesta etapa.'
                                  : 'Você informou que não sentiu dor. Clique em "Próxima" para continuar.'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Régua Contínua EVA (Metodologia Científica: Apenas a escala visual, sem números ou notas visíveis para o paciente) */}
                        {(!isGateEnabled || hasPain) && (
                          <div className="space-y-4 pt-2">
                            <p className="text-xs text-slate-500 italic text-center">
                              {isReadOnly
                                ? 'Posição assinalada na escala visual contínua:'
                                : 'Deslize o marcador na linha até o ponto que melhor representa o que você sentiu:'}
                            </p>

                            <div className="relative flex items-center py-4 px-1">
                              <div className="w-1.5 h-8 bg-slate-400 rounded-full shrink-0 -mr-1 z-10" />
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.1"
                                value={vasVal}
                                disabled={isReadOnly}
                                onTouchStart={() => !isReadOnly && handleFormAnswerChange(currentQuestion.id, vasVal)}
                                onMouseDown={() => !isReadOnly && handleFormAnswerChange(currentQuestion.id, vasVal)}
                                onChange={(e) =>
                                  !isReadOnly &&
                                  handleFormAnswerChange(
                                    currentQuestion.id,
                                    parseFloat(parseFloat(e.target.value).toFixed(1))
                                  )
                                }
                                className={`w-full h-3.5 bg-slate-200 border border-slate-300 rounded-lg appearance-none accent-blue-600 focus:outline-none ${
                                  isReadOnly ? 'cursor-default opacity-80' : 'cursor-pointer'
                                }`}
                              />
                              <div className="w-1.5 h-8 bg-slate-400 rounded-full shrink-0 -ml-1 z-10" />
                            </div>

                            <div className="flex justify-between items-start text-xs font-bold text-slate-700 px-1">
                              <span className="max-w-[48%] text-left">{cleanMinLabel}</span>
                              <span className="max-w-[48%] text-right">{cleanMaxLabel}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 5. MATRIZ 1 A 10 + NA */}
                  {currentQuestion.type === 'matrix' && (() => {
                    const options =
                      currentQuestion.options && currentQuestion.options.length > 0
                        ? currentQuestion.options
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
                    const currentAnswer = formAnswers[String(currentQuestion.id)] ?? formAnswers[currentQuestion.id];

                    return (
                      <div className="pt-2 space-y-3">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-0.5">
                          <span>1 = pior / mínimo</span>
                          <span>10 = excelente / máximo</span>
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                          {options.map((opt) => {
                            const isSelected = String(currentAnswer) === String(opt.value);
                            const isNA = opt.value === 'NA';
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => !isReadOnly && handleFormAnswerChange(currentQuestion.id, opt.value)}
                                className={`h-12 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                                  isReadOnly ? 'cursor-default' : 'cursor-pointer'
                                } ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-md ring-2 ring-blue-300 scale-[1.05]'
                                    : isReadOnly
                                    ? 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60'
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
                          <div className="flex justify-end items-center text-xs font-bold text-emerald-700 pt-0.5">
                            <span>
                              {currentAnswer === 'NA' ? '✓ NA (Não se aplica)' : `✓ Opção ${currentAnswer} selecionada`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 6. TEXTO ABERTO */}
                  {currentQuestion.type === 'text' && (() => {
                    const currentAnswer = formAnswers[String(currentQuestion.id)] ?? formAnswers[currentQuestion.id];
                    return (
                      <div className="pt-2">
                        <textarea
                          rows={4}
                          disabled={isReadOnly}
                          readOnly={isReadOnly}
                          value={(currentAnswer as string | undefined) ?? ''}
                          onChange={(e) => handleFormAnswerChange(currentQuestion.id, e.target.value)}
                          placeholder={isReadOnly ? 'Nenhum texto informado.' : 'Digite sua resposta detalhada aqui...'}
                          className={`w-full p-4 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm transition ${
                            isReadOnly ? 'bg-slate-50 text-slate-600' : 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none'
                          }`}
                        />
                      </div>
                    );
                  })()}

                  {/* 7. NÚMERO */}
                  {currentQuestion.type === 'number' && (() => {
                    const currentAnswer = formAnswers[String(currentQuestion.id)] ?? formAnswers[currentQuestion.id];
                    return (
                      <div className="pt-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          disabled={isReadOnly}
                          readOnly={isReadOnly}
                          value={(currentAnswer as string | number | undefined) ?? ''}
                          onChange={(e) => handleFormAnswerChange(currentQuestion.id, e.target.value)}
                          placeholder="Informe um número..."
                          className={`w-full p-4 border-2 border-slate-200 rounded-2xl text-base font-mono font-bold transition text-center ${
                            isReadOnly ? 'bg-slate-50 text-slate-600' : 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none'
                          }`}
                        />
                      </div>
                    );
                  })()}

                  {/* 8. INSTRUÇÃO / ORIENTAÇÃO */}
                  {currentQuestion.type === 'instruction' && (
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl space-y-3 text-center my-auto">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                        <Info className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-black text-blue-950">
                        {currentQuestion.title || 'Orientações do Estudo'}
                      </h4>
                      <p className="text-xs text-blue-800 leading-relaxed max-w-sm mx-auto">
                        {currentQuestion.description ||
                          currentQuestion.observation ||
                          'Leia com atenção as perguntas a seguir e selecione as opções que melhor descrevem o que você observou.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* ALERTA INLINE CASO TENTE AVANÇAR SEM RESPONDER */}
                {stepHint && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{stepHint}</span>
                  </div>
                )}

                {/* NAVEGAÇÃO DO WIZARD: ANTERIOR / PRÓXIMA / FINALIZAR */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {currentStepIndex > 0 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Anterior</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedForm(null)}
                      className="py-3 px-3.5 text-slate-400 hover:text-slate-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Sair</span>
                    </button>
                  )}

                  {!isLastStep ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={!isStepAnswered(currentQuestion)}
                      className="py-3 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ml-auto"
                    >
                      <span>{currentQuestion?.type === 'instruction' ? 'Continuar' : 'Próxima'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : isReadOnly ? (
                    // MODO SOMENTE LEITURA (QUESTIONÁRIO JÁ ENVIADO E BLOQUEADO)
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedForm(null);
                        setCurrentStepIndex(0);
                      }}
                      className="py-3 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer ml-auto flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Concluído • Voltar ao início</span>
                    </button>
                  ) : isUnlockedByResearcher ? (
                    // MODO EDIÇÃO AUTORIZADA PELO PESQUISADOR
                    <button
                      type="button"
                      onClick={() => handleSubmitCustomForm()}
                      disabled={submittingForm || !isStepAnswered(currentQuestion)}
                      className="py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ml-auto"
                    >
                      {submittingForm ? (
                        <span>Salvando alterações...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Salvar alterações autorizadas</span>
                        </>
                      )}
                    </button>
                  ) : (
                    // MODO NORMAL DE PRIMEIRO ENVIO
                    <button
                      type="button"
                      onClick={() => handleSubmitCustomForm()}
                      disabled={submittingForm || !isStepAnswered(currentQuestion)}
                      className="py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ml-auto"
                    >
                      {submittingForm ? (
                        <span>Gravando...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Finalizar e enviar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default function PacientePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando questionários do estudo...</div>}>
      <PacienteContent />
    </Suspense>
  );
}
