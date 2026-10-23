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

  // Estados do Questionário Selecionado
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

  const activateForm = (form: FormItem) => {
    setSelectedForm(form);
    const initialAnswers: Record<string, FormAnswerValue> = { ...(form.myAnswers || {}) };

    // Inicializa perguntas VAS para 0.0 caso não haja resposta prévia, evitando bloqueio do voluntário
    (form.questions || []).forEach((q: FormQuestionItem) => {
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

  const handleSelectForm = (form: FormItem) => {
    activateForm(form);
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
      setFormError(`Por favor, responda a todas as perguntas obrigatórias antes de enviar (${missing.length} pendente${missing.length > 1 ? 's' : ''}).`);
      const firstMissing = missing[0];
      if (typeof window !== 'undefined') {
        const el = document.getElementById(`question-card-${firstMissing.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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

      setFormSuccessMessage(`Suas respostas para "${selectedForm.title}" foram gravadas com sucesso!`);

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
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Confirmação de Segurança</h1>
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
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portal do Participante</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Universidade Estadual de Ponta Grossa • UEPG <br />
              Pesquisa Clínica & Instrumentos de Avaliação
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
              <span>{loading ? 'Identificando...' : 'Acessar Meus Questionários'}</span>
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

  // TELA 3: PORTAL EXCLUSIVO DE QUESTIONÁRIOS DO ESTUDO
  const pendingFormsCount = participant.forms?.filter((f) => !f.isCompleted).length || 0;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex justify-center">
      {/* Contêiner Mobile Responsivo */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col justify-between">
        
        {/* Cabeçalho do Participante */}
        <header className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 rounded-b-3xl shadow-lg shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span>UEPG • Pesquisa Clínica</span>
              </div>
              <h1 className="text-lg font-extrabold mt-0.5 leading-snug tracking-tight">
                {selectedForm ? selectedForm.title : 'Questionários do Estudo'}
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
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 border border-white/25 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                  title="Visualizar ou imprimir documento oficial do TCLE assinado em PDF"
                >
                  <FileText className="w-3 h-3" />
                  <span>TCLE (PDF)</span>
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Barra de Status e Ocorrência */}
        <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span>Formulários Atribuídos ao seu Estudo</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
            {participant.forms?.length || 0} {(participant.forms?.length === 1) ? 'questionário' : 'questionários'}
          </span>
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
                Responda com atenção aos questionários formatados para o seu acompanhamento clínico.
              </p>
            </div>

            {pendingFormsCount > 0 && selectedForm && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-xl text-[10px] font-bold shrink-0 border border-amber-200">
                {pendingFormsCount} pendente{pendingFormsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* VISTA 1: FEEDBACK DE SUCESSO APÓS GRAVAR QUESTIONÁRIO */}
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
                  {formRedAlert ? 'Questionário Gravado com Alerta Prioritário!' : 'Questionário Gravado com Sucesso!'}
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
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                ← Voltar à Lista de Questionários
              </button>
            </div>
          )}

          {/* VISTA 2: LISTA DE QUESTIONÁRIOS FORMATADOS DO ESTUDO */}
          {!formSuccessMessage && !selectedForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Questionários Formatados</h3>
                  <p className="text-[11px] text-slate-500">
                    Selecione o instrumento correspondente à ocorrência desta etapa do estudo.
                  </p>
                </div>
              </div>

              {(!participant.forms || participant.forms.length === 0) ? (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Nenhum Questionário Pendente</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Você está cadastrado(a) no estudo <strong>{participant.projectName}</strong>. No momento, não há questionários pendentes de resposta para o seu perfil. Sua participação está regularizada!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participant.forms.map((f) => {
                    const isHome =
                      f.modality === 'TIME_BASED' ||
                      (f.occurrence || '').toLowerCase().includes('tempo') ||
                      (f.occurrence || '').toLowerCase().includes('domiciliar') ||
                      (f.description || '').toLowerCase().includes('domiciliar');

                    const cleanDesc = (f.description || '')
                      .replace(/^modalidade:\s*[^|]+\|\s*/i, '')
                      .replace(/^frequência:\s*[^|]+\|\s*/i, '')
                      .replace(/^frequencia:\s*[^|]+\|\s*/i, '')
                      .replace(/^preenchido por:\s*[^|]+\|\s*/i, '')
                      .replace(/^ocorrência:\s*[^|]+\|\s*/i, '')
                      .trim();

                    return (
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
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              {isHome ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>⏱️ Acompanhamento Domiciliar por Tempo</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1 shadow-2xs">
                                  <Stethoscope className="w-3 h-3 text-blue-600" />
                                  <span>🩺 Consulta Clínica Presencial</span>
                                </span>
                              )}
                              {f.occurrence && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  <span>{f.occurrence}</span>
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs leading-snug">{f.title}</h4>
                            {cleanDesc && (
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                {cleanDesc}
                              </p>
                            )}
                            <span className="inline-block mt-1 text-[10px] text-slate-400 font-mono">
                              {f.questions.length} perguntas formatadas
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
                            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                              f.isCompleted
                                ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            }`}
                          >
                            {f.isCompleted ? 'Revisar Respostas' : 'Responder Questionário →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISTA 3: RESPOSTA AO QUESTIONÁRIO SELECIONADO COM TODAS AS PERGUNTAS FORMATADAS */}
          {!formSuccessMessage && selectedForm && (
            <form onSubmit={handleSubmitCustomForm} className="space-y-6 pb-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setSelectedForm(null)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
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
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {selectedForm.modality === 'TIME_BASED' ||
                  (selectedForm.occurrence || '').toLowerCase().includes('tempo') ||
                  (selectedForm.occurrence || '').toLowerCase().includes('domiciliar') ||
                  (selectedForm.description || '').toLowerCase().includes('domiciliar') ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>⏱️ Acompanhamento Domiciliar por Tempo</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1 shadow-2xs">
                      <Stethoscope className="w-3 h-3 text-blue-600" />
                      <span>🩺 Consulta Clínica Presencial</span>
                    </span>
                  )}
                  {selectedForm.occurrence && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{selectedForm.occurrence}</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{selectedForm.title}</h3>
                {selectedForm.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {selectedForm.description
                      .replace(/^modalidade:\s*[^|]+\|\s*/i, '')
                      .replace(/^frequência:\s*[^|]+\|\s*/i, '')
                      .replace(/^frequencia:\s*[^|]+\|\s*/i, '')
                      .replace(/^preenchido por:\s*[^|]+\|\s*/i, '')
                      .replace(/^ocorrência:\s*[^|]+\|\s*/i, '')
                      .trim()}
                  </p>
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

                    // 1. INSTRUÇÃO / ORIENTAÇÃO CLÍNICA
                    if (isInstruction) {
                      return (
                        <div
                          key={q.id}
                          className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs">
                            <Info className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>{q.title || 'Orientações do Estudo'}</span>
                          </div>
                          <p className="text-[11px] text-blue-800 leading-relaxed">
                            {q.description ||
                              q.observation ||
                              'Leia com atenção as perguntas a seguir e selecione as opções que melhor descrevem suas observações.'}
                          </p>
                        </div>
                      );
                    }

                    const isMissing = Boolean(
                      formError &&
                      q.required &&
                      (currentAnswer === undefined || currentAnswer === null || currentAnswer === '')
                    );

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

                        {/* Matriz 1 a 10 + NA */}
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
                                      className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
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

                        {/* Escala Likert */}
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
                                    className={`p-2.5 rounded-xl border text-left text-xs transition flex justify-between items-center cursor-pointer ${
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

                        {/* Múltipla Escolha */}
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
                                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex justify-between items-center cursor-pointer ${
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

                        {/* Binário (Sim / Não) */}
                        {q.type === 'boolean' && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {['Sim', 'Não'].map((val) => {
                              const isSelected = currentAnswer === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => handleFormAnswerChange(q.id, val)}
                                  className={`py-2.5 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
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

                        {/* Escala Visual Analógica (EVA) */}
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

                        {/* Texto Aberto */}
                        {q.type === 'text' && (
                          <textarea
                            rows={3}
                            value={(currentAnswer as string | undefined) ?? ''}
                            onChange={(e) => handleFormAnswerChange(q.id, e.target.value)}
                            placeholder="Digite sua resposta aqui..."
                            className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        )}

                        {/* Número */}
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
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
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
