'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StudySidebar, StudyMobileBar } from '@/components/StudySidebar';
import {
  FileText,
  FilePlus,
  Save,
  Eye,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Zap,
  BarChart2,
  CheckSquare,
  CircleDot,
  Type,
  Hash,
  X,
  ExternalLink,
  ChevronDown,
  LayoutDashboard,
  Smartphone,
  Copy,
  ChevronUp,
  Sliders,
  Check,
  Table,
  Info
} from 'lucide-react';

type QuestionType =
  | 'vas'
  | 'likert'
  | 'choice'
  | 'boolean'
  | 'text'
  | 'number'
  | 'instruction'
  | 'matrix';

type QuestionOption = {
  label: string;
  value: string;
};

type FormQuestion = {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  description?: string;
  options?: QuestionOption[];
  minLabel?: string;
  maxLabel?: string;
  observation?: string;
};

type ProjectSummary = {
  id: string;
  name: string;
};

const OHIP_14_QUESTIONS: FormQuestion[] = [
  { id: 'ohip_1', type: 'likert', title: '1. Teve problemas para pronunciar palavras por causa dos dentes ou da boca?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_2', type: 'likert', title: '2. Sentiu que o sabor dos alimentos piorou por causa de seus dentes ou boca?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_3', type: 'likert', title: '3. Já sentiu dores agudas ou dolorimentos em sua boca ou dentes?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_4', type: 'likert', title: '4. Achou desconfortável comer algum alimento por causa de seus dentes ou boca?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_5', type: 'likert', title: '5. Já se sentiu preocupado(a) por causa de problemas em seus dentes ou boca?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_6', type: 'likert', title: '6. Já se sentiu tenso(a) ou estressado(a) por causa de dentes ou boca?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_7', type: 'likert', title: '7. Sua alimentação ficou prejudicada por causa de seus dentes ou boca?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_8', type: 'likert', title: '8. Teve que interromper suas refeições por causa de problemas bucais?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_9', type: 'likert', title: '9. Achou difícil relaxar por causa de desconforto em dentes ou boca?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_10', type: 'likert', title: '10. Já se sentiu envergonhado(a) ao sorrir ou falar por causa de seus dentes?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_11', type: 'likert', title: '11. Foi um pouco intolerante com cônjuge ou amigos por causa de dor bucal?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_12', type: 'likert', title: '12. Teve dificuldades para realizar seu trabalho ou estudo por causa de dentes?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_13', type: 'likert', title: '13. Sentiu que a vida era menos satisfatória por causa de problemas bucais?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
  { id: 'ohip_14', type: 'likert', title: '14. Ficou totalmente incapaz de desenvolver atividades diárias por causa de dor bucal?', required: true, options: [
    { label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }
  ]},
];

const CROMOGENIC_HABITS_QUESTIONS: FormQuestion[] = [
  { id: 'cromo_1', type: 'choice', title: '1. Com que frequência você consome café?', required: true, options: [
    { label: 'Não consumo', value: 'nunca' },
    { label: '1 a 2 vezes por semana', value: 'raro' },
    { label: 'Diariamente (1 a 2 xícaras)', value: 'moderado' },
    { label: 'Diariamente (3 ou mais xícaras)', value: 'alto' },
  ]},
  { id: 'cromo_2', type: 'choice', title: '2. Com que frequência você consome chimarrão ou chá preto?', required: true, options: [
    { label: 'Não consumo', value: 'nunca' },
    { label: 'Consumo ocasional (fins de semana)', value: 'raro' },
    { label: 'Diariamente', value: 'diario' },
  ]},
  { id: 'cromo_3', type: 'choice', title: '3. Com que frequência você consome vinho tinto ou suco de uva integral?', required: true, options: [
    { label: 'Não consumo', value: 'nunca' },
    { label: '1 a 2 taças por semana', value: 'moderado' },
    { label: '3 ou mais taças por semana', value: 'alto' },
  ]},
  { id: 'cromo_4', type: 'choice', title: '4. Você fuma ou consome produtos derivados do tabaco / cigarro eletrônico?', required: true, options: [
    { label: 'Não sou fumante', value: 'nao' },
    { label: 'Fumo menos de 5 cigarros/dia', value: 'leve' },
    { label: 'Fumo mais de 10 cigarros/dia', value: 'moderado_alto' },
    { label: 'Uso cigarro eletrônico (Vape / Pod)', value: 'vape' },
  ]},
];

const AESTHETICS_QUESTIONS: FormQuestion[] = [
  { id: 'aes_1', type: 'vas', title: '1. Qual seu grau de satisfação com a cor final dos seus dentes?', required: true, minLabel: 'Muito Insatisfeito', maxLabel: 'Totalmente Satisfeito', observation: 'Deslize o marcador até o ponto que melhor expressa seu grau de satisfação.' },
  { id: 'aes_2', type: 'vas', title: '2. Em que medida você percebeu que seu sorriso ficou mais branco e atraente?', required: true, minLabel: 'Sem alteração', maxLabel: 'Excelente melhora', observation: 'Avalie a mudança estética percebida após o clareamento.' },
  { id: 'aes_3', type: 'choice', title: '3. O clareamento atendeu às suas expectativas prévias?', required: true, options: [
    { label: 'Superou minhas expectativas', value: 'superou' },
    { label: 'Atendeu totalmente', value: 'atendeu' },
    { label: 'Atendeu parcialmente', value: 'parcial' },
    { label: 'Ficou abaixo das expectativas', value: 'abaixo' },
  ]},
  { id: 'aes_4', type: 'boolean', title: '4. Você recomendaria este protocolo de clareamento a familiares ou amigos?', required: true },
];

function FormBuilderContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || '');
  const [formTitle, setFormTitle] = useState('Questionário de Impacto na Qualidade de Vida (OHIP-14)');
  const [formDescription, setFormDescription] = useState('Instrumento padronizado de desfechos relatados pelo paciente (PROMs) para acompanhamento no ensaio clínico.');
  const [expirationHours, setExpirationHours] = useState('48');
  const [allowLate, setAllowLate] = useState(false);
  const [questions, setQuestions] = useState<FormQuestion[]>(OHIP_14_QUESTIONS);

  // Modo de visualização: Edição ou Prévia do Paciente
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Estados de teste interativo na prévia
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) {
          setProjects(data.projects);
          if (!selectedProjectId && data.projects.length > 0) {
            setSelectedProjectId(data.projects[0].id);
          }
        }
      })
      .catch((e) => console.error('Erro ao carregar projetos:', e));
  }, []);

  const addCustomQuestion = (type: QuestionType) => {
    const id = `q_${Date.now()}`;
    let newQ: FormQuestion;

    if (type === 'vas') {
      newQ = {
        id,
        type,
        title: 'Nova Escala Visual Analógica (EVA - Dor / Sensibilidade)',
        required: true,
        minLabel: 'Sem dor ou incômodo',
        maxLabel: 'Pior dor imaginável',
        observation: 'Deslize o marcador contínuo até a posição que reflete sua dor.',
      };
    } else if (type === 'likert') {
      newQ = {
        id,
        type,
        title: 'Nova Pergunta em Escala Likert',
        required: true,
        options: [
          { label: 'Nunca', value: '0' },
          { label: 'Raramente', value: '1' },
          { label: 'Às vezes', value: '2' },
          { label: 'Frequentemente', value: '3' },
          { label: 'Sempre', value: '4' },
        ],
      };
    } else if (type === 'boolean') {
      newQ = { id, type, title: 'Pergunta Objetiva (Sim ou Não)', required: true };
    } else if (type === 'choice') {
      newQ = {
        id,
        type,
        title: 'Pergunta de Múltipla Escolha',
        required: true,
        options: [
          { label: 'Opção 1', value: 'opcao_1' },
          { label: 'Opção 2', value: 'opcao_2' },
          { label: 'Opção 3', value: 'opcao_3' },
        ],
      };
    } else if (type === 'matrix') {
      newQ = {
        id,
        type,
        title: 'Tabela de Avaliação (1 a 10 + NA)',
        required: true,
        observation: 'Avalie com notas de 1 a 10 ou declare NA se não aplicável.',
        options: [
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
        ],
      };
    } else if (type === 'instruction') {
      newQ = {
        id,
        type,
        title: 'Orientações Iniciais',
        required: false,
        observation: 'Leia atentamente as perguntas a seguir e responda de acordo com sua percepção.',
      };
    } else if (type === 'text') {
      newQ = { id, type, title: 'Pergunta Descritiva / Observações do Paciente', required: false };
    } else {
      newQ = { id, type, title: 'Parâmetro Numérico (Ex: Escores, Horas)', required: true };
    }

    setQuestions((prev) => [...prev, newQ]);
  };

  const duplicateQuestion = (idx: number) => {
    const target = questions[idx];
    const clone: FormQuestion = {
      ...target,
      id: `q_${Date.now()}`,
      title: `${target.title} (Cópia)`,
      options: target.options ? target.options.map((o) => ({ ...o })) : undefined,
    };
    const nextList = [...questions];
    nextList.splice(idx + 1, 0, clone);
    setQuestions(nextList);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestionType = (id: string, newType: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        let updated: FormQuestion = { ...q, type: newType };
        if (newType === 'vas') {
          updated.minLabel = updated.minLabel || 'Sem dor ou incômodo';
          updated.maxLabel = updated.maxLabel || 'Pior dor imaginável';
        } else if (newType === 'likert' && (!updated.options || updated.options.length === 0)) {
          updated.options = [
            { label: 'Nunca', value: '0' },
            { label: 'Raramente', value: '1' },
            { label: 'Às vezes', value: '2' },
            { label: 'Frequentemente', value: '3' },
            { label: 'Sempre', value: '4' },
          ];
        } else if (newType === 'choice' && (!updated.options || updated.options.length === 0)) {
          updated.options = [
            { label: 'Opção A', value: 'A' },
            { label: 'Opção B', value: 'B' },
          ];
        }
        return updated;
      })
    );
  };

  const updateQuestionTitle = (id: string, title: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, title } : q)));
  };

  const updateQuestionRequired = (id: string, required: boolean) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, required } : q)));
  };

  const updateQuestionMinLabel = (id: string, minLabel: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, minLabel } : q)));
  };

  const updateQuestionMaxLabel = (id: string, maxLabel: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, maxLabel } : q)));
  };

  const updateQuestionObservation = (id: string, observation: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, observation } : q)));
  };

  const addOptionToQuestion = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const currentOpts = q.options || [];
        const nextNum = currentOpts.length + 1;
        return {
          ...q,
          options: [...currentOpts, { label: `Opção ${nextNum}`, value: `opt_${Date.now()}` }],
        };
      })
    );
  };

  const updateOptionLabel = (id: string, optIndex: number, label: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id || !q.options) return q;
        const nextOpts = [...q.options];
        nextOpts[optIndex] = { ...nextOpts[optIndex], label };
        return { ...q, options: nextOpts };
      })
    );
  };

  const removeOptionFromQuestion = (id: string, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id || !q.options) return q;
        return {
          ...q,
          options: q.options.filter((_, i) => i !== optIndex),
        };
      })
    );
  };

  const moveQuestion = (idx: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === questions.length - 1)) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    const clone = [...questions];
    const temp = clone[idx];
    clone[idx] = clone[targetIdx];
    clone[targetIdx] = temp;
    setQuestions(clone);
  };

  const loadTemplate = (name: 'ohip' | 'cromo' | 'aes') => {
    if (name === 'ohip') {
      setFormTitle('Questionário de Qualidade de Vida Bucal (OHIP-14)');
      setFormDescription('Instrumento padronizado para avaliação das 7 dimensões do impacto da saúde bucal no bem-estar diário.');
      setQuestions(OHIP_14_QUESTIONS);
    } else if (name === 'cromo') {
      setFormTitle('Questionário de Hábitos Cromogênicos e Dieta');
      setFormDescription('Levantamento sistemático do consumo de pigmentos orais (café, chimarrão, vinho) e tabaco durante o clareamento.');
      setQuestions(CROMOGENIC_HABITS_QUESTIONS);
    } else if (name === 'aes') {
      setFormTitle('Escala de Satisfação Estética Orofacial');
      setFormDescription('Avaliação subjetiva do voluntário sobre percepção de cor, ganho estético e recomendação do tratamento clareador.');
      setQuestions(AESTHETICS_QUESTIONS);
    }
    setShowLibraryModal(false);
  };

  const handleClearForm = () => {
    if (questions.length > 0 && !confirm('Deseja iniciar uma nova ficha clínica em branco? Todas as questões atuais serão removidas.')) return;
    setFormTitle('Ficha Clínica de Avaliação');
    setFormDescription('Preencha os dados e parâmetros clínicos conforme o protocolo do estudo.');
    setQuestions([]);
  };

  const handleSaveForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formTitle.trim()) {
      alert('Por favor, informe o título da ficha clínica.');
      return;
    }

    try {
      setSaving(true);
      setSavedSuccess(false);
      setErrorMessage(null);

      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: formTitle.trim(),
          description: formDescription.trim(),
          expirationHours: Number(expirationHours) || 48,
          allowLate,
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao publicar formulário clínico.');
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 7000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar ficha clínica.');
    } finally {
      setSaving(false);
    }
  };

  const selectedProjectObj = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="min-h-[calc(100vh-57px)] bg-slate-50 font-sans text-slate-800 flex flex-col">
      <div className="flex-1 flex w-full relative">
        <StudySidebar
          projectId={selectedProjectId}
          activeItem="construtor"
          allProjects={projects}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="flex-1 min-w-0 flex flex-col pb-28">
          {/* Barra Superior Mobile para Abrir Sidebar */}
          <StudyMobileBar
            projectName={selectedProjectObj?.name}
            onOpenMenu={() => setMobileMenuOpen(true)}
          />

          {/* Barra Superior de Comando Clínico */}
          <header className="bg-white border-b border-slate-200/90 relative shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <Link
              href={selectedProjectId ? `/dashboard?projectId=${selectedProjectId}` : '/'}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Painel</span>
            </Link>

            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  Prancheta de Ficha Clínica (eCRF)
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                  {questions.length} {questions.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                Estudo: <strong className="text-slate-700 font-semibold">{selectedProjectObj?.name || 'Selecione o Projeto'}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle de Modo: Edição vs Prévia do Paciente */}
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                  viewMode === 'edit'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Modo Edição</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                  viewMode === 'preview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Prévia do Paciente</span>
              </button>
            </div>

            {/* Modelos Validados */}
            <button
              type="button"
              onClick={() => setShowLibraryModal(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
              title="Carregar questionários validados da literatura (OHIP-14, Hábitos Cromogênicos...)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Modelos Validados</span>
            </button>

            {/* Iniciar em Branco */}
            <button
              type="button"
              onClick={handleClearForm}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
              title="Limpar e criar ficha em branco"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Em Branco</span>
            </button>

            {/* Salvar Ficha */}
            <button
              onClick={() => handleSaveForm()}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Salvando...' : 'Salvar Ficha'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Alerta de Sucesso com Acesso Rápido */}
      {savedSuccess && (
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mt-6">
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold space-y-2 animate-fadeIn shadow-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Ficha Clínica salva com sucesso no banco de dados e vinculada ao estudo!</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href={selectedProjectId ? `/dashboard?projectId=${selectedProjectId}` : '/dashboard'}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Ver no Dashboard de Pacientes</span>
              </Link>
              <Link
                href="/paciente"
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Testar no Portal do Paciente</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mt-6">
          <div className="p-4 bg-red-50 border border-red-300 rounded-2xl text-red-800 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ÁREA CENTRAL: A PRANCHETA CLÍNICA DIGITAL (Clinical Canvas)     */}
      {/* ============================================================== */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">

        {viewMode === 'edit' ? (
          /* MODO EDIÇÃO: Prancheta Clínica Digital */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8">
            
            {/* Cabeçalho da Ficha / Prontuário */}
            <div className="border-b border-slate-200/80 pb-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Instrumento Clínico Odontológico • eCRF</span>
                </div>
                <div>
                  Código: <strong className="text-slate-600">CRF-{selectedProjectId ? selectedProjectId.slice(0, 6).toUpperCase() : 'NOVO'}</strong>
                </div>
              </div>

              {/* Título da Ficha */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Título da Ficha Clínica / Questionário:
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Ficha de Avaliação de Sensibilidade Pós-Operatória..."
                  className="w-full text-xl sm:text-2xl font-bold text-slate-900 border-b-2 border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:outline-none transition py-1 bg-transparent"
                />
              </div>

              {/* Descrição e Orientações */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Instruções aos Voluntários / Pesquisadores:
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Orientações clínicas para o preenchimento deste questionário..."
                  className="w-full text-sm text-slate-600 border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Barra de Metadados e Parâmetros Clínicos */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Seletor do Projeto */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400 font-bold">Estudo:</span>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none text-xs cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Validade */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400 font-bold">Prazo:</span>
                    <select
                      value={expirationHours}
                      onChange={(e) => setExpirationHours(e.target.value)}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none text-xs cursor-pointer"
                    >
                      <option value="12">12 horas</option>
                      <option value="24">24 horas</option>
                      <option value="48">48 horas</option>
                      <option value="72">72 horas</option>
                      <option value="168">7 dias</option>
                    </select>
                  </div>

                  {/* Atraso */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400 font-bold">Fora do prazo:</span>
                    <select
                      value={allowLate ? 'sim' : 'nao'}
                      onChange={(e) => setAllowLate(e.target.value === 'sim')}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none text-xs cursor-pointer"
                    >
                      <option value="nao">Bloquear envio</option>
                      <option value="sim">Permitir (Sinalizar desvio)</option>
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  {questions.length} questões cadastradas
                </div>
              </div>
            </div>

            {/* LISTA DE ITENS CLÍNICOS DA PRANCHETA */}
            <div className="space-y-5">
              {questions.length === 0 ? (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-3xl p-8 space-y-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Sua prancheta está em branco
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Adicione itens clínicos usando os botões abaixo ou carregue um instrumento padronizado validado da literatura odontológica.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLibraryModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Carregar Modelo Pronto (OHIP-14...)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addCustomQuestion('vas')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Adicionar Escala EVA (Dor)</span>
                    </button>
                  </div>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-slate-50/70 hover:bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 shadow-xs transition space-y-4"
                  >
                    {/* Linha Superior do Card: Numeração, Tipo e Ações */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-bold font-mono flex items-center justify-center shadow-xs">
                          {String(idx + 1).padStart(2, '0')}
                        </span>

                        {/* Dropdown de Tipo de Pergunta */}
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestionType(q.id, e.target.value as QuestionType)}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                        >
                          <option value="vas">Escala EVA (Dor / Sensibilidade)</option>
                          <option value="matrix">Tabela de Avaliação (1 a 10 + NA)</option>
                          <option value="likert">Escala Likert (Frequência / Acordo)</option>
                          <option value="boolean">Sim ou Não (Binário)</option>
                          <option value="choice">Múltipla Escolha</option>
                          <option value="instruction">Instruções / Texto Informativo</option>
                          <option value="text">Texto Aberto</option>
                          <option value="number">Valor Numérico</option>
                        </select>

                        {q.required ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            Obrigatória
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">
                            Opcional
                          </span>
                        )}
                      </div>

                      {/* Botões de Ação do Item (Subir, Descer, Duplicar, Deletar) */}
                      <div className="flex items-center space-x-1 text-slate-400">
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-600 rounded-lg transition disabled:opacity-20"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, 'down')}
                          disabled={idx === questions.length - 1}
                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-600 rounded-lg transition disabled:opacity-20"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateQuestion(idx)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-600 rounded-lg transition"
                          title="Duplicar este item clínico"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-red-50 text-red-500 rounded-lg transition font-bold"
                          title="Excluir este item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Enunciado da Pergunta */}
                    <div>
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => updateQuestionTitle(q.id, e.target.value)}
                        placeholder="Digite o enunciado da pergunta clínica ou sintoma avaliado..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    {/* Editor Específico de Cada Tipo */}
                    {/* TIPO: ESCALA EVA (Dor 0-10) */}
                    {q.type === 'vas' && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Âncora Esquerda (Valor 0.0 - Sem Dor)
                            </label>
                            <input
                              type="text"
                              value={q.minLabel ?? 'Sem dor ou incômodo'}
                              onChange={(e) => updateQuestionMinLabel(q.id, e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Âncora Direita (Valor 10.0 - Pior Dor)
                            </label>
                            <input
                              type="text"
                              value={q.maxLabel ?? 'Pior dor imaginável'}
                              onChange={(e) => updateQuestionMaxLabel(q.id, e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Prévia da Linha Contínua da EVA */}
                        <div className="pt-2">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5 font-mono">
                            <span>Escala Visual Analógica Neutra (Sem números expostos ao voluntário)</span>
                            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Gravação: 0.0 a 10.0 mm
                            </span>
                          </div>
                          <div className="relative flex items-center py-2">
                            <div className="w-1.5 h-6 bg-slate-400 rounded-full shrink-0 -mr-1 z-10" />
                            <div className="w-full h-3 bg-gradient-to-r from-emerald-100 via-amber-100 to-rose-200 border border-slate-300 rounded-lg flex items-center px-4">
                              <div className="w-4 h-4 bg-slate-800 rounded-full shadow-sm mx-auto" />
                            </div>
                            <div className="w-1.5 h-6 bg-slate-400 rounded-full shrink-0 -ml-1 z-10" />
                          </div>
                          <div className="flex justify-between text-xs text-slate-600 font-semibold px-1">
                            <span>{q.minLabel || 'Sem dor'}</span>
                            <span>{q.maxLabel || 'Pior dor possível'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TIPO: ESCALA LIKERT */}
                    {q.type === 'likert' && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Alternativas da Escala Likert:
                          </label>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions((prev) =>
                                  prev.map((item) =>
                                    item.id === q.id
                                      ? {
                                          ...item,
                                          options: [
                                            { label: 'Nunca', value: '0' },
                                            { label: 'Raramente', value: '1' },
                                            { label: 'Às vezes', value: '2' },
                                            { label: 'Frequentemente', value: '3' },
                                            { label: 'Sempre', value: '4' },
                                          ],
                                        }
                                      : item
                                  )
                                );
                              }}
                              className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold"
                            >
                              Frequência (Nunca → Sempre)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions((prev) =>
                                  prev.map((item) =>
                                    item.id === q.id
                                      ? {
                                          ...item,
                                          options: [
                                            { label: 'Discordo Totalmente', value: '1' },
                                            { label: 'Discordo Parcialmente', value: '2' },
                                            { label: 'Neutro / Indiferente', value: '3' },
                                            { label: 'Concordo Parcialmente', value: '4' },
                                            { label: 'Concordo Totalmente', value: '5' },
                                          ],
                                        }
                                      : item
                                  )
                                );
                              }}
                              className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold"
                            >
                              Concordância (Discordo → Concordo)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="relative">
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => updateOptionLabel(q.id, optIdx, e.target.value)}
                                className="w-full text-center p-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
                              />
                              <span className="block text-center text-[10px] text-slate-400 font-mono mt-0.5">
                                Escore: {opt.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TIPO: MÚLTIPLA ESCOLHA */}
                    {q.type === 'choice' && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Opções de Resposta:
                        </label>
                        <div className="space-y-2">
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-2">
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 inline-block shrink-0" />
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => updateOptionLabel(q.id, optIdx, e.target.value)}
                                className="flex-1 p-2 text-xs border border-slate-200 rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeOptionFromQuestion(q.id, optIdx)}
                                className="w-7 h-7 text-slate-400 hover:text-red-500 rounded flex items-center justify-center font-bold"
                                title="Remover opção"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addOptionToQuestion(q.id)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
                        >
                          <span>+</span>
                          <span>Adicionar Opção</span>
                        </button>
                      </div>
                    )}

                    {/* TIPO: SIM OU NÃO */}
                    {q.type === 'boolean' && (
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center space-x-4">
                        <span className="text-xs text-slate-500 font-semibold">Formato de Resposta:</span>
                        <div className="flex items-center space-x-2">
                          <span className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Sim
                          </span>
                          <span className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1">
                            <X className="w-3 h-3 text-slate-400" /> Não
                          </span>
                        </div>
                      </div>
                    )}

                    {/* TIPO: TEXTO ABERTO */}
                    {q.type === 'text' && (
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200 text-xs text-slate-400 italic">
                        Campo de texto livre multi-linhas disponível para relato aberto do voluntário.
                      </div>
                    )}

                    {/* TIPO: NUMÉRICO */}
                    {q.type === 'number' && (
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200 text-xs text-slate-400 font-mono">
                        Campo para entrada numérica estrita (ex: escore de cor Vita, horas de uso).
                      </div>
                    )}

                    {/* TIPO: TABELA DE AVALIAÇÃO / MATRIX (1 a 10 + NA) */}
                    {q.type === 'matrix' && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
                          <span>Escala Numérica Padronizada:</span>
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">
                            1 a 10 + NA (Não se Aplica)
                          </span>
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 pt-1">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'NA'].map((num) => (
                            <div
                              key={num}
                              className={`h-9 rounded-lg border text-center font-bold text-xs flex items-center justify-center ${
                                num === 'NA'
                                  ? 'bg-slate-100 text-slate-700 col-span-2 sm:col-span-1'
                                  : 'bg-slate-50 text-slate-800'
                              }`}
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 italic">
                          O voluntário poderá selecionar uma das notas de 1 a 10 ou declarar &quot;NA&quot; caso o quesito não se aplique.
                        </p>
                      </div>
                    )}

                    {/* TIPO: INSTRUÇÃO / TEXTO INFORMATIVO */}
                    {q.type === 'instruction' && (
                      <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200 space-y-2">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-blue-600" />
                          Texto Informativo de Orientação ao Voluntário (Sem campo de resposta):
                        </span>
                        <textarea
                          rows={2}
                          value={q.observation || q.description || ''}
                          onChange={(e) => updateQuestionObservation(q.id, e.target.value)}
                          placeholder="Digite as orientações para guiar o participante antes das questões..."
                          className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Orientação Clínica Adicional & Obrigatório */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 text-xs">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={q.observation || ''}
                          onChange={(e) => updateQuestionObservation(q.id, e.target.value)}
                          placeholder="Orientação clínica específica ao voluntário (opcional)..."
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 placeholder-slate-400"
                        />
                      </div>

                      <label className="flex items-center space-x-2 cursor-pointer shrink-0 font-semibold text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestionRequired(q.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span>Resposta Obrigatória</span>
                      </label>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* BARRA DE ADIÇÃO RÁPIDA DE ITENS CLÍNICOS */}
            <div className="pt-6 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                + Adicionar Item à Prancheta Clínica:
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <button
                  type="button"
                  onClick={() => addCustomQuestion('vas')}
                  className="p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-center transition flex flex-col items-center justify-center space-y-1 shadow-2xs group"
                >
                  <Zap className="w-5 h-5 text-amber-500 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Escala EVA</span>
                  <span className="text-[10px] text-slate-400 font-medium">Dor / Sensib.</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCustomQuestion('matrix')}
                  className="p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-center transition flex flex-col items-center justify-center space-y-1 shadow-2xs group"
                >
                  <Table className="w-5 h-5 text-purple-600 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Tabela 1-10</span>
                  <span className="text-[10px] text-slate-400 font-medium">1 a 10 + NA</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCustomQuestion('likert')}
                  className="p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-center transition flex flex-col items-center justify-center space-y-1 shadow-2xs group"
                >
                  <BarChart2 className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Likert</span>
                  <span className="text-[10px] text-slate-400 font-medium">1-5 / Níveis</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCustomQuestion('boolean')}
                  className="p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-center transition flex flex-col items-center justify-center space-y-1 shadow-2xs group"
                >
                  <CheckSquare className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Sim / Não</span>
                  <span className="text-[10px] text-slate-400 font-medium">Binário</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCustomQuestion('choice')}
                  className="p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-center transition flex flex-col items-center justify-center space-y-1 shadow-2xs group"
                >
                  <CircleDot className="w-5 h-5 text-blue-500 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Múltipla</span>
                  <span className="text-[10px] text-slate-400 font-medium">Opções rádio</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCustomQuestion('instruction')}
                  className="p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-center transition flex flex-col items-center justify-center space-y-1 shadow-2xs group"
                >
                  <Info className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Instrução</span>
                  <span className="text-[10px] text-slate-400 font-medium">Texto guia</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCustomQuestion('text')}
                  className="p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-center transition flex flex-col items-center justify-center space-y-1 shadow-2xs group"
                >
                  <Type className="w-5 h-5 text-slate-600 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Texto</span>
                  <span className="text-[10px] text-slate-400 font-medium">Livre relato</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCustomQuestion('number')}
                  className="p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-center transition flex flex-col items-center justify-center space-y-1 shadow-2xs group"
                >
                  <Hash className="w-5 h-5 text-purple-500 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Número</span>
                  <span className="text-[10px] text-slate-400 font-medium">Valor exato</span>
                </button>
              </div>

              {/* Botão de Rodapé para Salvar */}
              <div className="pt-6 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(true)}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Modelos Validados da Odontologia</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveForm()}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Publicando...' : 'Salvar Ficha Clínica'}</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* MODO PRÉVIA: Como o Paciente vê no Smartphone ou Computador */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-10 space-y-8 animate-fadeIn">
            
            {/* Faixa Informativa de Prévia */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-blue-900 font-semibold">
                <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Prévia do Voluntário:</strong> Esta é a experiência exata de resposta no Portal do Paciente.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className="px-3 py-1 bg-white border border-blue-300 text-blue-800 font-bold rounded-lg shadow-2xs hover:bg-blue-50"
              >
                Voltar à Edição
              </button>
            </div>

            {/* Cabeçalho do Paciente */}
            <div className="border-b border-slate-100 pb-5">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold uppercase tracking-wider font-mono">
                {selectedProjectObj?.name || 'Ensaio Clínico Odontológico'}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                {formTitle}
              </h2>
              {formDescription && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {formDescription}
                </p>
              )}
            </div>

            {/* Questões Interativas em Modo Paciente */}
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        {q.title}
                        {q.required && <span className="text-red-500 ml-1">*</span>}
                      </h4>
                      {q.observation && (
                        <p className="text-xs text-slate-500 mt-0.5">{q.observation}</p>
                      )}
                    </div>
                  </div>

                  {/* Renderização do Controle Conforme o Tipo */}
                  {q.type === 'vas' && (
                    <div className="pt-3 px-2 space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>{q.minLabel || 'Sem dor'}</span>
                        <span className="text-blue-600 font-mono">
                          {previewAnswers[q.id] !== undefined ? `${previewAnswers[q.id]} mm` : 'Toque na barra para registrar'}
                        </span>
                        <span>{q.maxLabel || 'Pior dor possível'}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={previewAnswers[q.id] || 0}
                        onChange={(e) =>
                          setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                        }
                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <p className="text-[10px] text-center text-slate-400">
                        Deslize o marcador para a posição que melhor reflete sua dor
                      </p>
                    </div>
                  )}

                  {q.type === 'likert' && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                      {q.options?.map((opt) => {
                        const isSelected = previewAnswers[q.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setPreviewAnswers({ ...previewAnswers, [q.id]: opt.value })
                            }
                            className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'choice' && (
                    <div className="space-y-2 pt-1">
                      {q.options?.map((opt) => {
                        const isSelected = previewAnswers[q.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setPreviewAnswers({ ...previewAnswers, [q.id]: opt.value })
                            }
                            className={`w-full p-3 rounded-xl border text-xs font-semibold flex items-center space-x-3 transition text-left ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'boolean' && (
                    <div className="flex items-center space-x-3 pt-2">
                      {['Sim', 'Não'].map((opt) => {
                        const isSelected = previewAnswers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setPreviewAnswers({ ...previewAnswers, [q.id]: opt })
                            }
                            className={`px-5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            {opt === 'Sim' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'text' && (
                    <div className="pt-1">
                      <textarea
                        rows={3}
                        placeholder="Digite sua resposta aqui..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        value={previewAnswers[q.id] || ''}
                        onChange={(e) =>
                          setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {q.type === 'number' && (
                    <div className="pt-1">
                      <input
                        type="number"
                        placeholder="Ex: 5"
                        className="w-48 p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        value={previewAnswers[q.id] || ''}
                        onChange={(e) =>
                          setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {q.type === 'matrix' && (
                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-0.5">
                        <span>1 = Mínimo</span>
                        <span>10 = Máximo</span>
                      </div>
                      <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'NA'].map((num) => {
                          const isSelected = previewAnswers[q.id] === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: num })}
                              className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : num === 'NA'
                                  ? 'bg-slate-100 text-slate-700 col-span-2 sm:col-span-1 border border-slate-300'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {q.type === 'instruction' && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800">
                      {q.observation || q.description || 'Texto informativo / orientações do formulário clínico.'}
                    </div>
                  )}

                </div>
              ))}
            </div>

            {/* Botão de Envio Simulado na Prévia */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Prévia interativa • Respostas não são salvas no banco
              </span>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Voltar à Edição da Ficha
              </button>
            </div>

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* MODAL: MODELOS VALIDADOS DA ODONTOLOGIA                         */}
      {/* ============================================================== */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto animate-fadeIn">
            
            <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono">
                  Biblioteca Científica
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Modelos de Fichas e Questionários Validados
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Carregue um instrumento padronizado da literatura odontológica com 1 clique.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Modelo 1: OHIP-14 */}
              <div className="p-5 border border-slate-200 hover:border-indigo-400 rounded-2xl transition bg-slate-50/60 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      PROMs Odontológico (Padrão Ouro)
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      OHIP-14 (Oral Health Impact Profile)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadTemplate('ohip')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Carregar OHIP-14
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Avalia as 7 dimensões do impacto da saúde bucal (dor física, limitação funcional, desconforto e incapacidade psicológica/social).
                </p>
              </div>

              {/* Modelo 2: Hábitos Cromogênicos */}
              <div className="p-5 border border-slate-200 hover:border-amber-400 rounded-2xl transition bg-slate-50/60 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Protocolo de Clareamento
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      Hábitos Cromogênicos e Dieta Pigmentante
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadTemplate('cromo')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Carregar Hábitos
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mapeia café, chimarrão, vinho tinto, chá preto e tabagismo/vape para controle de variáveis intervenientes no clareamento dental.
                </p>
              </div>

              {/* Modelo 3: Satisfação Estética */}
              <div className="p-5 border border-slate-200 hover:border-emerald-400 rounded-2xl transition bg-slate-50/60 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Desfecho Subjetivo
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      Satisfação Estética Orofacial
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadTemplate('aes')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Carregar Satisfação
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Avalia a percepção de melhora do sorriso através de escalas contínuas EVA e índice de recomendação pós-clareamento.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}

export default function FormBuilderPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Carregando prancheta de formulários clínicos...</div>}>
      <FormBuilderContent />
    </Suspense>
  );
}
