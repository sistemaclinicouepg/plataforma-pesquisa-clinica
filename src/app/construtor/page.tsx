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
  Info,
  BookmarkPlus,
  Bookmark,
  Sparkles,
  Trash2,
  Plus,
  FolderKanban,
  Search,
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

const PAIN_SENSITIVITY_QUESTIONS: FormQuestion[] = [
  {
    id: 'pain_1',
    type: 'vas',
    title: '1. Nível de Sensibilidade / Dor Dental Imediata no Consultório (0h)',
    required: true,
    minLabel: 'Nenhuma dor',
    maxLabel: 'Pior dor possível',
    observation: 'Aferida imediatamente após o término do procedimento clínico.',
  },
  {
    id: 'pain_2',
    type: 'vas',
    title: '2. Nível de Sensibilidade Espontânea após 24 Horas',
    required: true,
    minLabel: 'Nenhuma dor',
    maxLabel: 'Pior dor possível',
    observation: 'Sensibilidade percebida no repouso ou nas primeiras 24 horas.',
  },
  {
    id: 'pain_3',
    type: 'choice',
    title: '3. Qual estímulo provocou ou intensificou a sensibilidade?',
    required: true,
    options: [
      { label: 'Nenhum estímulo (ausência total de dor)', value: 'nenhum' },
      { label: 'Líquidos ou alimentos frios / gelados', value: 'frio' },
      { label: 'Líquidos ou alimentos quentes', value: 'quente' },
      { label: 'Escovação dental / toque', value: 'escovacao' },
      { label: 'Espontânea constante', value: 'espontanea' },
    ],
  },
  {
    id: 'pain_4',
    type: 'likert',
    title: '4. Como você classifica o impacto dessa sensibilidade no seu dia a dia?',
    required: true,
    options: [
      { label: 'Ausente', value: '0' },
      { label: 'Leve (não atrapalhou)', value: '1' },
      { label: 'Moderada (incomodou mas tolerável)', value: '2' },
      { label: 'Intensa (dificultou atividades)', value: '3' },
      { label: 'Severa (muito desconfortável)', value: '4' },
    ],
  },
  {
    id: 'pain_5',
    type: 'choice',
    title: '5. Foi necessário utilizar algum analgésico para alívio?',
    required: true,
    options: [
      { label: 'Não utilizei medicamentos', value: 'nao' },
      { label: 'Sim, Dipirona ou Paracetamol (1 dose)', value: 'analgesico_1' },
      { label: 'Sim, Dipirona ou Paracetamol (2 ou mais doses)', value: 'analgesico_multi' },
      { label: 'Sim, Anti-inflamatório (Ibuprofeno, Cetoprofeno, etc.)', value: 'antiinflamatorio' },
    ],
  },
];

const FDI_RESTORATION_QUESTIONS: FormQuestion[] = [
  {
    id: 'fdi_1',
    type: 'choice',
    title: '1. Fratura do Material Restaurador e Retenção',
    required: true,
    options: [
      { label: 'Restauração totalmente íntegra e retida', value: 'integra' },
      { label: 'Pequena lasca marginal sem perda da função', value: 'lasca_pequena' },
      { label: 'Fratura parcial com necessidade de reparo', value: 'fratura_parcial' },
      { label: 'Perda total da restauração', value: 'perda_total' },
    ],
  },
  {
    id: 'fdi_2',
    type: 'choice',
    title: '2. Adaptação Marginal na Interface Dente-Restauração',
    required: true,
    options: [
      { label: 'Margem contínua, imperceptível e sem fenda', value: 'excelente' },
      { label: 'Pequeno degrau explorável sem pigmentação', value: 'degrau_leve' },
      { label: 'Degrau com acúmulo de biofilme / pigmentação', value: 'degrau_pigmentado' },
      { label: 'Infiltração ou desadaptação evidente', value: 'desadaptada' },
    ],
  },
  {
    id: 'fdi_3',
    type: 'choice',
    title: '3. Descoloração Marginal',
    required: true,
    options: [
      { label: 'Ausente (cor homogênea)', value: 'ausente' },
      { label: 'Pigmentação superficial polível', value: 'superficial' },
      { label: 'Pigmentação profunda que penetra a interface', value: 'profunda' },
    ],
  },
  {
    id: 'fdi_4',
    type: 'choice',
    title: '4. Sensibilidade Pós-Operatória do Dente Restaurado',
    required: true,
    options: [
      { label: 'Nenhuma sensibilidade', value: 'ausente' },
      { label: 'Leve e transitória aos estímulos', value: 'leve' },
      { label: 'Moderada à mastigação', value: 'moderada' },
      { label: 'Dor aguda espontânea', value: 'aguda' },
    ],
  },
  {
    id: 'fdi_5',
    type: 'boolean',
    title: '5. Evidência clínica ou radiográfica de Cárie Secundária adjacente?',
    required: true,
  },
];

type CustomTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  questions: FormQuestion[];
  createdAt: string;
};

type ExternalProjectForm = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  questionsJson: string;
  createdAt: string;
  project?: {
    id: string;
    name: string;
  };
};

function FormBuilderContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || '');
  const [formTitle, setFormTitle] = useState('Questionário de Impacto na Qualidade de Vida (OHIP-14)');
  const [formDescription, setFormDescription] = useState('Instrumento padronizado de desfechos relatados pelo paciente (PROMs) para acompanhamento no ensaio clínico.');
  const [occurrence, setOccurrence] = useState<string>('Linha de Base / Admissão');
  const [isCustomFrequency, setIsCustomFrequency] = useState(false);
  const [customFrequencyText, setCustomFrequencyText] = useState('24h, 48h, 7d, 14d e 21d (Clareamento Caseiro)');
  const [expirationHours, setExpirationHours] = useState('48');
  const [allowLate, setAllowLate] = useState(false);
  const [questions, setQuestions] = useState<FormQuestion[]>(OHIP_14_QUESTIONS);

  // Modo de visualização: Edição ou Prévia do Paciente
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Estados de teste interativo na prévia
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  // Estados da Biblioteca e Modelos Reutilizáveis
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'validated' | 'custom' | 'external'>('validated');
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [saveTemplateForm, setSaveTemplateForm] = useState({
    name: '',
    description: '',
    category: 'Clareamento & Estética',
  });
  const [templateToast, setTemplateToast] = useState<string | null>(null);
  const [externalForms, setExternalForms] = useState<ExternalProjectForm[]>([]);
  const [loadingExternalForms, setLoadingExternalForms] = useState(false);
  const [externalSearchQuery, setExternalSearchQuery] = useState('');

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

    try {
      const saved = localStorage.getItem('uepg_custom_questionnaire_templates');
      if (saved) {
        setCustomTemplates(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Erro ao carregar modelos salvos locais:', e);
    }
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

  const handleApplyTemplate = (
    name: string,
    description: string,
    templateQuestions: FormQuestion[],
    mode: 'replace' | 'append' = 'replace'
  ) => {
    if (mode === 'replace') {
      if (
        questions.length > 0 &&
        !confirm('Deseja substituir todas as perguntas atuais pelas deste modelo?')
      ) {
        return;
      }
      setFormTitle(name);
      setFormDescription(description);
      setQuestions(JSON.parse(JSON.stringify(templateQuestions)));
    } else {
      // Modo Append: Adiciona ao final com novos IDs
      const newItems = templateQuestions.map((q, idx) => ({
        ...q,
        id: `q_${Date.now()}_${idx}`,
        options: q.options ? q.options.map((o) => ({ ...o })) : undefined,
      }));
      setQuestions((prev) => [...prev, ...newItems]);
    }
    setShowLibraryModal(false);
    setTemplateToast(`Modelo "${name}" ${mode === 'replace' ? 'carregado' : 'acrescentado'} com sucesso!`);
    setTimeout(() => setTemplateToast(null), 4000);
  };

  const handleOpenSaveTemplateModal = () => {
    if (questions.length === 0) {
      alert('Adicione pelo menos uma pergunta ao questionário antes de salvá-lo como modelo.');
      return;
    }
    setSaveTemplateForm({
      name: formTitle,
      description: formDescription,
      category: 'Clareamento & Estética',
    });
    setShowSaveTemplateModal(true);
  };

  const handleConfirmSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTemplateForm.name.trim()) {
      alert('Por favor, informe o nome do modelo.');
      return;
    }
    const newTemplate: CustomTemplate = {
      id: `tpl_${Date.now()}`,
      name: saveTemplateForm.name.trim(),
      description: saveTemplateForm.description.trim(),
      category: saveTemplateForm.category || 'Geral',
      questions: JSON.parse(JSON.stringify(questions)),
      createdAt: new Date().toISOString(),
    };
    const updated = [newTemplate, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('uepg_custom_questionnaire_templates', JSON.stringify(updated));
    } catch (err) {
      console.error('Erro ao salvar modelo:', err);
    }
    setShowSaveTemplateModal(false);
    setTemplateToast(`Modelo "${newTemplate.name}" salvo com sucesso! Você pode reutilizá-lo em qualquer pesquisa.`);
    setTimeout(() => setTemplateToast(null), 5000);
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    if (!confirm('Deseja excluir este modelo personalizado?')) return;
    const updated = customTemplates.filter((t) => t.id !== templateId);
    setCustomTemplates(updated);
    try {
      localStorage.setItem('uepg_custom_questionnaire_templates', JSON.stringify(updated));
    } catch (err) {
      console.error('Erro ao excluir modelo:', err);
    }
  };

  const fetchExternalForms = async () => {
    try {
      setLoadingExternalForms(true);
      const res = await fetch('/api/forms');
      if (res.ok) {
        const data = await res.json();
        if (data.forms) {
          setExternalForms(data.forms);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar formulários de outras pesquisas:', err);
    } finally {
      setLoadingExternalForms(false);
    }
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

      const effectiveOccurrence = (isCustomFrequency || occurrence === 'CUSTOM_HOME') && customFrequencyText.trim()
        ? customFrequencyText.trim()
        : occurrence;

      const isTimeBased =
        isCustomFrequency ||
        occurrence === 'CUSTOM_HOME' ||
        effectiveOccurrence.toLowerCase().includes('tempo') ||
        effectiveOccurrence.toLowerCase().includes('domiciliar') ||
        effectiveOccurrence.toLowerCase().includes('caseiro');

      const modalityTag = isTimeBased ? 'Modalidade: TEMPO' : 'Modalidade: SESSAO';
      const formattedDesc = effectiveOccurrence
        ? `${modalityTag} | Frequência: ${effectiveOccurrence} | Ocorrência: ${effectiveOccurrence} | ${formDescription.trim()}`
        : formDescription.trim();

      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: formTitle.trim(),
          description: formattedDesc,
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

            {/* Modelos Validados & Salvos com MAIOR DESTAQUE */}
            <button
              type="button"
              onClick={() => {
                setActiveLibraryTab('validated');
                setShowLibraryModal(true);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer ring-2 ring-indigo-200"
              title="Abrir biblioteca de modelos validados da odontologia e modelos salvos"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Modelos Validados</span>
            </button>

            {/* Salvar como Modelo Reutilizável */}
            <button
              type="button"
              onClick={handleOpenSaveTemplateModal}
              disabled={questions.length === 0}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
              title="Salvar este questionário como um modelo reutilizável em outras pesquisas"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salvar como Modelo</span>
            </button>

            {/* Iniciar em Branco */}
            <button
              type="button"
              onClick={handleClearForm}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
              title="Limpar e criar ficha em branco"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Em Branco</span>
            </button>

            {/* Salvar Ficha */}
            <button
              onClick={() => handleSaveForm()}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
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

      {/* Toast Informativo de Modelos */}
      {templateToast && (
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mt-6 animate-fadeIn">
          <div className="p-4 bg-indigo-50 border border-indigo-300 rounded-2xl text-indigo-950 text-xs font-bold flex items-center space-x-2 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>{templateToast}</span>
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
            
            {/* ============================================================== */}
            {/* BANNER DE DESTAQUE NO TOPO: MODELOS VALIDADOS & SALVOS         */}
            {/* ============================================================== */}
            <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-purple-50/90 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start sm:items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      Modelos de Questionários da Odontologia
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                      Validados & Prontos
                    </span>
                    {customTemplates.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-extrabold rounded-full">
                        {customTemplates.length} {customTemplates.length === 1 ? 'modelo salvo' : 'modelos salvos'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Carregue instrumentos científicos da literatura (OHIP-14, Hábitos Cromogênicos, Satisfação Estética, Sensibilidade) ou reutilize questionários salvos de outras pesquisas com 1 clique.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveLibraryTab('validated');
                    setShowLibraryModal(true);
                  }}
                  className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Ver Modelos Validados da Odontologia</span>
                </button>
                {questions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenSaveTemplateModal}
                    className="w-full md:w-auto px-3.5 py-2.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    title="Salvar questionário atual como um modelo reutilizável"
                  >
                    <BookmarkPlus className="w-4 h-4 text-indigo-600" />
                    <span>Salvar como Modelo</span>
                  </button>
                )}
              </div>
            </div>

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
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none text-xs cursor-pointer max-w-[180px] truncate"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ocorrência no Estudo */}
                  <div className="flex items-center space-x-1.5 bg-blue-50/70 border border-blue-200 rounded-xl px-3 py-1.5 shadow-2xs">
                    <span className="text-blue-600 font-bold">Ocorrência:</span>
                    <select
                      value={occurrence}
                      onChange={(e) => {
                        setOccurrence(e.target.value);
                        if (e.target.value === 'CUSTOM_HOME') {
                          setIsCustomFrequency(true);
                        }
                      }}
                      className="bg-transparent font-semibold text-blue-950 focus:outline-none text-xs cursor-pointer max-w-[210px] truncate"
                    >
                      <optgroup label="🩺 Vinculado à Consulta Clínica (Presencial)">
                        <option value="Sessão Clínica Presencial">Sessão Clínica (Liberado na Consulta)</option>
                        <option value="Linha de Base / Admissão">Linha de Base / Admissão (Consulta Inicial)</option>
                        <option value="A cada Consulta Clínica">A cada Consulta Clínica</option>
                        <option value="Retorno Final / Conclusão">Retorno Final / Conclusão Presencial</option>
                      </optgroup>
                      <optgroup label="⏱️ Domiciliar por Tempo (Sem Consulta - Clareamento/Remoto)">
                        <option value="CUSTOM_HOME">✏️ Personalizar Frequência / Cronograma...</option>
                        <option value="Tempo: 24h, 48h, 7d, 14d e 21d (Clareamento Caseiro)">Clareamento Caseiro (24h, 48h, 7d, 14d, 21d)</option>
                        <option value="Tempo: 24 Horas (Domiciliar)">Tempo: 24 Horas (Domiciliar)</option>
                        <option value="Tempo: 48 Horas (Domiciliar)">Tempo: 48 Horas (Domiciliar)</option>
                        <option value="Tempo: 7 Dias (Domiciliar)">Tempo: 7 Dias / 1ª Sem (Domiciliar)</option>
                        <option value="Tempo: 14 Dias (Domiciliar)">Tempo: 14 Dias / 2ª Sem (Domiciliar)</option>
                        <option value="Tempo: 21 Dias (Domiciliar)">Tempo: 21 Dias / 3ª Sem (Domiciliar)</option>
                        <option value="Tempo: 30 Dias (Domiciliar)">Tempo: 30 Dias / 1 Mês (Domiciliar)</option>
                        <option value="Tempo: Contínuo / Livre">Tempo: Contínuo / Livre (A qualquer momento)</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Botão de Personalizar Frequência Domiciliar */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomFrequency(!isCustomFrequency);
                      if (!isCustomFrequency) setOccurrence('CUSTOM_HOME');
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                      isCustomFrequency || occurrence === 'CUSTOM_HOME'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/20 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Definir dias e horários exatos para o paciente responder em casa"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isCustomFrequency || occurrence === 'CUSTOM_HOME' ? 'Frequência Personalizada' : 'Personalizar Frequência'}</span>
                  </button>

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

              {/* Bloco de Frequência e Períodos Domiciliares Personalizados */}
              {(isCustomFrequency || occurrence === 'CUSTOM_HOME') && (
                <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl space-y-2.5 shadow-2xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Cronograma & Frequência de Resposta Domiciliar (em Casa):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomFrequency(false)}
                      className="text-[10px] text-amber-700 hover:text-amber-900 font-bold hover:underline cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>

                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Personalize os períodos exatos em que o paciente responderá a este questionário no celular sem precisar de consulta presencial.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={customFrequencyText}
                      onChange={(e) => setCustomFrequencyText(e.target.value)}
                      placeholder="Ex: 24h, 48h, 7d, 14d e 21d (Clareamento Caseiro) / A cada 3 dias / Diário por 14 dias..."
                      className="flex-1 w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-amber-900 font-bold">Modelos mais usados:</span>
                    {[
                      '24h, 48h, 7d, 14d e 21d (Clareamento Caseiro)',
                      'Diariamente durante 14 dias',
                      'Diariamente durante 21 dias',
                      '24h, 48h e 7 dias (Pós-Operatório)',
                      'A cada 48 horas durante 14 dias',
                      'Semanal por 4 semanas (7d, 14d, 21d e 28d)',
                      'A cada 3 dias nos primeiros 15 dias',
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setCustomFrequencyText(sug);
                          setIsCustomFrequency(true);
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg text-[10px] font-medium text-amber-950 transition cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

              {/* Botões de Rodapé para Salvar e Modelos */}
              <div className="pt-6 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLibraryTab('validated');
                      setShowLibraryModal(true);
                    }}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ver Modelos Validados da Odontologia</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenSaveTemplateModal}
                    disabled={questions.length === 0}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-700 flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
                    title="Salvar questionário atual como um modelo reutilizável"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Salvar como Modelo</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveForm()}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
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
      {/* MODAL: BIBLIOTECA DE MODELOS (VALIDADOS & MEUS MODELOS)        */}
      {/* ============================================================== */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            
            {/* Header do Modal */}
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-start shrink-0">
              <div>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono">
                  Biblioteca de Questionários
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Modelos de Fichas e Instrumentos Odontológicos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Carregue questionários consagrados da literatura ou reutilize modelos salvos de suas pesquisas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas da Biblioteca */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-4 shrink-0 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveLibraryTab('validated')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  activeLibraryTab === 'validated'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Modelos Validados (Odontologia)</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">5</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLibraryTab('custom')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  activeLibraryTab === 'custom'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Meus Modelos Salvos</span>
                {customTemplates.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded-full text-[10px]">
                    {customTemplates.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveLibraryTab('external');
                  if (externalForms.length === 0) fetchExternalForms();
                }}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  activeLibraryTab === 'external'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Importar de Outras Pesquisas</span>
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* ABA 1: MODELOS VALIDADOS DA ODONTOLOGIA */}
              {activeLibraryTab === 'validated' && (
                <div className="space-y-3.5">
                  {[
                    {
                      id: 'ohip',
                      badge: 'PROMs Odontológico (Padrão Ouro)',
                      badgeColor: 'bg-indigo-100 text-indigo-800',
                      title: 'OHIP-14 (Oral Health Impact Profile)',
                      description: 'Avalia as 7 dimensões do impacto da saúde bucal (dor física, limitação funcional, desconforto e incapacidade psicológica/social). Escala Likert 5 pontos.',
                      questions: OHIP_14_QUESTIONS,
                    },
                    {
                      id: 'cromo',
                      badge: 'Protocolo de Clareamento Dental',
                      badgeColor: 'bg-amber-100 text-amber-800',
                      title: 'Hábitos Cromogênicos e Dieta Pigmentante',
                      description: 'Mapeia café, chimarrão, vinho tinto, chá preto e tabagismo/vape para controle de variáveis intervenientes durante o tratamento clareador.',
                      questions: CROMOGENIC_HABITS_QUESTIONS,
                    },
                    {
                      id: 'aes',
                      badge: 'Desfecho Subjetivo / Estética',
                      badgeColor: 'bg-emerald-100 text-emerald-800',
                      title: 'Satisfação Estética Orofacial',
                      description: 'Avalia a percepção de melhora do sorriso através de escalas analógicas visuais EVA, superação de expectativas e recomendação do tratamento.',
                      questions: AESTHETICS_QUESTIONS,
                    },
                    {
                      id: 'pain',
                      badge: 'Sensibilidade & Dor Clínica',
                      badgeColor: 'bg-red-100 text-red-800',
                      title: 'Escala de Sensibilidade e Dor Dental (EVA 0h e 24h)',
                      description: 'Mapeia dor imediata na cadeira (EVA 0h), dor tardia 24h, estímulos provocadores (frio/quente/toque) e necessidade de analgésicos.',
                      questions: PAIN_SENSITIVITY_QUESTIONS,
                    },
                    {
                      id: 'fdi',
                      badge: 'Dentística Restauradora (FDI)',
                      badgeColor: 'bg-purple-100 text-purple-800',
                      title: 'Critérios FDI de Avaliação de Restaurações',
                      description: 'Avaliação clínica padronizada de fratura/retenção, adaptação marginal, mancha marginal, sensibilidade e cárie secundária.',
                      questions: FDI_RESTORATION_QUESTIONS,
                    },
                  ].map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-4 sm:p-5 border border-slate-200 hover:border-indigo-400 rounded-2xl transition bg-slate-50/70 hover:bg-slate-50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tpl.badgeColor}`}>
                              {tpl.badge}
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">
                              {tpl.questions.length} perguntas
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {tpl.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate(tpl.title, tpl.description, tpl.questions, 'replace')}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                          >
                            Carregar (Substituir)
                          </button>
                          {questions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate(tpl.title, tpl.description, tpl.questions, 'append')}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition cursor-pointer"
                              title="Adiciona as perguntas deste modelo no final do formulário atual"
                            >
                              + Acrescentar
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA 2: MEUS MODELOS SALVOS */}
              {activeLibraryTab === 'custom' && (
                <div className="space-y-3.5">
                  {customTemplates.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <Bookmark className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                      <h4 className="text-sm font-bold text-slate-800">Nenhum modelo personalizado salvo</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                        Ao montar ou editar qualquer formulário na prancheta, clique em <strong>"Salvar como Modelo"</strong> no topo da página. O questionário ficará disponível aqui para ser adicionado em qualquer pesquisa!
                      </p>
                      {questions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowLibraryModal(false);
                            handleOpenSaveTemplateModal();
                          }}
                          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                          <span>Salvar Questionário Atual como Modelo</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    customTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="p-4 sm:p-5 border border-slate-200 hover:border-indigo-400 rounded-2xl transition bg-slate-50/70 hover:bg-slate-50 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                {tpl.category || 'Personalizado'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-semibold">
                                {tpl.questions.length} perguntas
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Salvo em {new Date(tpl.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">
                              {tpl.name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate(tpl.name, tpl.description, tpl.questions, 'replace')}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                            >
                              Carregar (Substituir)
                            </button>
                            {questions.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleApplyTemplate(tpl.name, tpl.description, tpl.questions, 'append')}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition cursor-pointer"
                                title="Adiciona as perguntas deste modelo ao final do questionário atual"
                              >
                                + Acrescentar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomTemplate(tpl.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                              title="Excluir este modelo salvo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {tpl.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {tpl.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ABA 3: IMPORTAR DE OUTRAS PESQUISAS */}
              {activeLibraryTab === 'external' && (
                <div className="space-y-3.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar questionários de outros projetos..."
                      value={externalSearchQuery}
                      onChange={(e) => setExternalSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {loadingExternalForms ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <Clock className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                      <span>Consultando formulários cadastrados em outras pesquisas...</span>
                    </div>
                  ) : externalForms.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Nenhum formulário encontrado em outras pesquisas.
                    </div>
                  ) : (
                    externalForms
                      .filter(
                        (f) =>
                          !externalSearchQuery ||
                          f.title.toLowerCase().includes(externalSearchQuery.toLowerCase()) ||
                          (f.project?.name && f.project.name.toLowerCase().includes(externalSearchQuery.toLowerCase()))
                      )
                      .map((form) => {
                        let parsedQuestions: FormQuestion[] = [];
                        try {
                          parsedQuestions = JSON.parse(form.questionsJson);
                        } catch {}

                        return (
                          <div
                            key={form.id}
                            className="p-4 sm:p-5 border border-slate-200 hover:border-indigo-400 rounded-2xl transition bg-slate-50/70 hover:bg-slate-50 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                                    📁 {form.project?.name || 'Pesquisa UEPG'}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-semibold">
                                    {parsedQuestions.length} perguntas
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 mt-1">
                                  {form.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleApplyTemplate(form.title, form.description || '', parsedQuestions, 'replace')}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                                >
                                  Importar (Substituir)
                                </button>
                                {questions.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleApplyTemplate(form.title, form.description || '', parsedQuestions, 'append')}
                                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition cursor-pointer"
                                  >
                                    + Acrescentar
                                  </button>
                                )}
                              </div>
                            </div>
                            {form.description && (
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {form.description}
                              </p>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="mt-5 flex justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SALVAR QUESTIONÁRIO COMO MODELO REUTILIZÁVEL            */}
      {/* ============================================================== */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Salvar como Modelo</h3>
                  <p className="text-xs text-slate-500">Reutilize este questionário em outras pesquisas com 1 clique</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Modelo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saveTemplateForm.name}
                  onChange={(e) => setSaveTemplateForm({ ...saveTemplateForm, name: e.target.value })}
                  placeholder="Ex: Questionário de Sensibilidade Pós-Clareamento..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoria Clínica
                </label>
                <select
                  value={saveTemplateForm.category}
                  onChange={(e) => setSaveTemplateForm({ ...saveTemplateForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Clareamento & Estética">Clareamento & Estética</option>
                  <option value="Sensibilidade & Dor">Sensibilidade & Dor</option>
                  <option value="Dentística Restauradora">Dentística Restauradora</option>
                  <option value="Periodontia & Tecidos">Periodontia & Tecidos</option>
                  <option value="Ortodontia & Oclusão">Ortodontia & Oclusão</option>
                  <option value="Qualidade de Vida (PROMs)">Qualidade de Vida (PROMs)</option>
                  <option value="Anamnese Geral">Anamnese Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição e Orientações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={saveTemplateForm.description}
                  onChange={(e) => setSaveTemplateForm({ ...saveTemplateForm, description: e.target.value })}
                  placeholder="Finalidade do instrumento, momento de aplicação (ex: pós-operatório 24h)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
                <span className="font-semibold">Perguntas a serem salvas no modelo:</span>
                <span className="font-bold px-2 py-0.5 bg-white rounded-lg border border-indigo-200">
                  {questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Salvar Modelo Reutilizável</span>
                </button>
              </div>
            </form>
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
