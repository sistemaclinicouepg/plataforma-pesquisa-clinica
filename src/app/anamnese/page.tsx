'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { OdontogramChart, ToothStatus } from '@/components/odontogram';
import {
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Save,
  Plus,
  Trash2,
  X,
  Sparkles,
  Stethoscope,
  ClipboardList,
  AlertTriangle,
  Clock,
  Folder,
  FileText,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export type QuestionType =
  | 'boolean'
  | 'vita_shade'
  | 'sensitivity_scale'
  | 'text'
  | 'choice'
  | 'number';

export type AnamnesisQuestion = {
  id: string;
  title: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  isCriterion?: boolean;
  disqualifyIf?: 'sim' | 'nao';
};

export type PeriodontogramConfig = {
  bleedingOnProbing: boolean; // Sangramento à Sondagem (SS / BOP)
  visiblePlaque: boolean; // Índice de Placa Visível (IPV)
  probingDepth: boolean; // Profundidade de Sondagem (PS > 3mm)
  gingivalRecession: boolean; // Recessão Gengival / Exposição Radicular
  furcationOrMobility: boolean; // Envolvimento de Furca ou Mobilidade
};

export type AnamnesisConfig = {
  enableOdontogram: boolean;
  odontogramScope: 'anterior' | 'full'; // anterior: 13-23 e 33-43; full: 18-48
  enablePeriodontogram: boolean;
  periodontogramFields: PeriodontogramConfig;
  questions: AnamnesisQuestion[];
};

const CLINICAL_LIBRARY_PRESETS: Array<{
  category: string;
  title: string;
  type: QuestionType;
  required: boolean;
  isCriterion: boolean;
  disqualifyIf?: 'sim' | 'nao';
  options?: string[];
}> = [
  {
    category: 'Critérios de Inclusão',
    title: 'Idade entre 18 e 35 anos?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'nao',
  },
  {
    category: 'Critérios de Inclusão',
    title: 'Incisivos e caninos hígidos (sem cárie ativa ou restaurações amplas)?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'nao',
  },
  {
    category: 'Critérios de Inclusão',
    title: 'Cor inicial basal elegível (A2 ou mais escura na Escala Vita)?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'nao',
  },
  {
    category: 'Critérios de Exclusão',
    title: 'Alergia prévia a peróxido de hidrogênio, carbamida ou componentes do gel?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    category: 'Critérios de Exclusão',
    title: 'Histórico de hipersensibilidade dentinária prévia moderada a severa?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    category: 'Critérios de Exclusão',
    title: 'Recessão gengival com exposição radicular nos dentes anteriores?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    category: 'Critérios de Exclusão',
    title: 'Uso de aparelho ortodôntico fixo atual ou nos últimos 6 meses?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    category: 'Critérios de Exclusão',
    title: 'Gestante ou lactante?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    category: 'Critérios de Exclusão',
    title: 'Tratamento clareador dental prévio nos últimos 12 meses?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    category: 'Critérios de Exclusão',
    title: 'Hábito de tabagismo ativo (fumante crônico)?',
    type: 'boolean',
    required: true,
    isCriterion: true,
    disqualifyIf: 'sim',
  },
  {
    category: 'Saúde Geral & Anamnese',
    title: 'Histórico de doenças sistêmicas crônicas (Diabetes, Hipertensão, Cardiopatias):',
    type: 'text',
    required: false,
    isCriterion: false,
  },
  {
    category: 'Saúde Geral & Anamnese',
    title: 'Uso contínuo de medicações (Analgésicos, Anti-inflamatórios, Psicotrópicos):',
    type: 'text',
    required: false,
    isCriterion: false,
  },
  {
    category: 'Avaliação Inicial Odontológica',
    title: 'Cor Inicial dos Incisivos Superiores (Escala Vita Classical):',
    type: 'vita_shade',
    required: true,
    isCriterion: false,
  },
  {
    category: 'Avaliação Inicial Odontológica',
    title: 'Sensibilidade Dentinária Basal ao Jato de Ar (0 a 10):',
    type: 'sensitivity_scale',
    required: true,
    isCriterion: false,
  },
];

function AnamnesisBuilderContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const isNewProject = searchParams.get('new') === 'true';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [projectName, setProjectName] = useState('Projeto de Pesquisa');
  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string }>>([]);

  // Configuração Principal da Ficha Clínica
  const [activeTab, setActiveTab] = useState<'odontogram' | 'periodontogram' | 'questions' | 'forms'>('odontogram');

  const [enableOdontogram, setEnableOdontogram] = useState(true);
  const [odontogramScope, setOdontogramScope] = useState<'anterior' | 'full'>('anterior');
  const [previewOdontogram, setPreviewOdontogram] = useState<Record<string, ToothStatus>>({});

  const [enablePeriodontogram, setEnablePeriodontogram] = useState(false);
  const [periodontogramFields, setPeriodontogramFields] = useState<PeriodontogramConfig>({
    bleedingOnProbing: true,
    visiblePlaque: true,
    probingDepth: false,
    gingivalRecession: true,
    furcationOrMobility: false,
  });

  const [questions, setQuestions] = useState<AnamnesisQuestion[]>([]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  // Formulários / eCRFs vinculados a este projeto
  const [projectForms, setProjectForms] = useState<Array<{
    id: string;
    title: string;
    description: string | null;
    questionsJson: string;
    expirationHours: number;
    allowLate: boolean;
    _count?: { responses: number };
  }>>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [creatingFormPreset, setCreatingFormPreset] = useState<string | null>(null);

  const loadProjectForms = async () => {
    if (!projectId) return;
    try {
      setLoadingForms(true);
      const res = await fetch(`/api/forms?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectForms(data.forms || []);
      }
    } catch (e) {
      console.error('Erro ao buscar formulários do projeto:', e);
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    loadProjectForms();
  }, [projectId]);

  // Carregar dados do projeto
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjectsList(data.projects || []);
        }
      } catch (e) {
        console.error('Erro ao buscar lista de projetos:', e);
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    async function loadTemplate() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/anamnesis`);
        if (res.ok) {
          const data = await res.json();
          setProjectName(data.projectName || 'Projeto');

          if (data.anamnesisTemplate) {
            const tmpl: AnamnesisConfig = data.anamnesisTemplate;
            setEnableOdontogram(tmpl.enableOdontogram !== undefined ? Boolean(tmpl.enableOdontogram) : true);
            setOdontogramScope(tmpl.odontogramScope || 'anterior');
            setEnablePeriodontogram(Boolean(tmpl.enablePeriodontogram));
            setPeriodontogramFields(
              tmpl.periodontogramFields || {
                bleedingOnProbing: true,
                visiblePlaque: true,
                probingDepth: false,
                gingivalRecession: true,
                furcationOrMobility: false,
              }
            );
            setQuestions(tmpl.questions || []);
          } else {
            // Padrão clínico odontológico: Odontograma ativo para o estudo
            setEnableOdontogram(true);
            setEnablePeriodontogram(false);
            setQuestions([]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar template:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [projectId]);

  // Salvar no Banco de Dados
  const handleSave = async (redirectAfter: boolean = false) => {
    if (!projectId) {
      alert('Por favor, selecione um projeto válido.');
      return;
    }

    try {
      setSaving(true);
      setSaveSuccess(false);

      const payload: AnamnesisConfig = {
        enableOdontogram,
        odontogramScope,
        enablePeriodontogram,
        periodontogramFields,
        questions,
      };

      const res = await fetch(`/api/projects/${projectId}/anamnesis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anamnesisTemplate: payload }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        if (redirectAfter) {
          window.location.href = `/dashboard?projectId=${projectId}`;
          return;
        }
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert('Erro ao gravar configuração da anamnese.');
      }
    } catch (err) {
      console.error('Erro ao salvar anamnese:', err);
      alert('Ocorreu um erro ao salvar a ficha clínica.');
    } finally {
      setSaving(false);
    }
  };

  // Criação rápida de questionários validados (1 clique)
  const handleCreateFormPreset = async (presetType: 'eva' | 'ohip' | 'satisfaction') => {
    if (!projectId) return;
    try {
      setCreatingFormPreset(presetType);
      let title = '';
      let description = '';
      let questionsPayload: any[] = [];

      if (presetType === 'eva') {
        title = 'Escala Visual Analógica de Sensibilidade (EVA)';
        description = 'Monitoramento longitudinal de sensibilidade dentinária (0h, 1h, 24h, 48h).';
        questionsPayload = [
          {
            id: 'q_sens_vas',
            type: 'vas',
            title: 'Qual a intensidade da sua sensibilidade dentária neste exato momento?',
            minLabel: '0 - Sem Dor',
            maxLabel: '10 - Dor Severa',
            required: true,
          },
          {
            id: 'q_sens_desc',
            type: 'choice',
            title: 'Qual a principal sensação observada?',
            required: false,
            options: [
              { label: 'Dor rápida em pontada', value: 'pontada' },
              { label: 'Latejamento persistente', value: 'latejamento' },
              { label: 'Sensibilidade com água/vento frio', value: 'frio' },
              { label: 'Ardência ou queimação gengival', value: 'gengival' },
            ],
          },
          {
            id: 'q_medication',
            type: 'boolean',
            title: 'Precisou tomar algum analgésico nas últimas 12 horas?',
            required: true,
          },
        ];
      } else if (presetType === 'ohip') {
        title = 'OHIP-14 (Qualidade de Vida em Saúde Bucal)';
        description = 'Oral Health Impact Profile reduzido para avaliar impactos psicossociais e funcionais.';
        questionsPayload = [
          { id: 'ohip_1', type: 'likert', title: '1. Teve problemas para pronunciar palavras por causa dos dentes ou da boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_2', type: 'likert', title: '2. Sentiu que o sabor dos alimentos piorou por causa de seus dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_3', type: 'likert', title: '3. Já sentiu dores agudas ou dolorimentos em sua boca ou dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_4', type: 'likert', title: '4. Achou desconfortável comer algum alimento por causa de seus dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_5', type: 'likert', title: '5. Já se sentiu preocupado(a) por causa de problemas em seus dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_6', type: 'likert', title: '6. Já se sentiu tenso(a) ou estressado(a) por causa de dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_7', type: 'likert', title: '7. Sua alimentação ficou prejudicada por causa de seus dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_8', type: 'likert', title: '8. Teve que interromper suas refeições por causa de problemas bucais?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_9', type: 'likert', title: '9. Achou difícil relaxar por causa de desconforto em dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_10', type: 'likert', title: '10. Já se sentiu envergonhado(a) ao sorrir ou falar por causa de seus dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_11', type: 'likert', title: '11. Foi um pouco intolerante com familiares ou amigos por causa de incômodo bucal?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_12', type: 'likert', title: '12. Teve dificuldades para realizar seu trabalho ou estudos por causa de dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_13', type: 'likert', title: '13. Sentiu que a vida em geral ficou menos satisfatória por causa dos dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
          { id: 'ohip_14', type: 'likert', title: '14. Ficou totalmente incapaz de exercer suas funções diárias normais?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
        ];
      } else if (presetType === 'satisfaction') {
        title = 'Avaliação de Satisfação Estética do Sorriso';
        description = 'Percepção do participante quanto à estética dental, clareamento e impacto no sorriso.';
        questionsPayload = [
          {
            id: 'q_sat_color',
            type: 'vas',
            title: 'O quanto você está satisfeito(a) com a cor obtida em seus dentes?',
            minLabel: '0 - Totalmente Insatisfeito',
            maxLabel: '10 - Extremamente Satisfeito',
            required: true,
          },
          {
            id: 'q_sat_conf',
            type: 'vas',
            title: 'O tratamento clareador melhorou sua autoconfiança ao sorrir?',
            minLabel: '0 - Não mudou',
            maxLabel: '10 - Melhorou significativamente',
            required: true,
          },
          {
            id: 'q_sat_rec',
            type: 'boolean',
            title: 'Você recomendaria este procedimento clínico para amigos ou familiares?',
            required: true,
          },
          {
            id: 'q_sat_com',
            type: 'text',
            title: 'Comentários ou impressões pessoais sobre sua experiência no estudo:',
            required: false,
          },
        ];
      }

      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          description,
          questions: questionsPayload,
          expirationHours: 24,
          allowLate: false,
        }),
      });

      if (res.ok) {
        await loadProjectForms();
        alert(`Questionário "${title}" adicionado a este projeto com sucesso!`);
      } else {
        alert('Erro ao criar o modelo de questionário.');
      }
    } catch (err) {
      console.error('Erro ao adicionar questionário padrão:', err);
      alert('Erro de conexão ao criar formulário.');
    } finally {
      setCreatingFormPreset(null);
    }
  };

  // Gerenciamento de Perguntas
  const addCustomQuestion = () => {
    const newQ: AnamnesisQuestion = {
      id: 'q_' + Date.now(),
      title: 'Nova Pergunta Clínica',
      type: 'boolean',
      required: true,
      isCriterion: false,
      disqualifyIf: 'sim',
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, partial: Partial<AnamnesisQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...partial } : q)));
  };

  const addFromLibrary = (item: (typeof CLINICAL_LIBRARY_PRESETS)[0]) => {
    const newQ: AnamnesisQuestion = {
      id: 'q_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      title: item.title,
      type: item.type,
      required: item.required,
      isCriterion: item.isCriterion,
      disqualifyIf: item.disqualifyIf,
      options: item.options,
    };
    setQuestions([...questions, newQ]);
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Selecione um Projeto</h2>
          <p className="text-slate-600 text-sm mb-6">
            Para configurar a Ficha Clínica e Anamnese, escolha para qual pesquisa deseja personalizar os módulos:
          </p>
          <div className="space-y-3">
            {projectsList.map((p) => (
              <Link
                key={p.id}
                href={`/anamnese?projectId=${p.id}`}
                className="flex items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left font-bold text-slate-800 transition"
              >
                <Folder className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span>{p.name}</span>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline">
              <ArrowLeft className="w-4 h-4" /> Voltar para Meus Projetos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20">
      {/* Barra Superior */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 xl:px-10 py-4 relative shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard?projectId=${projectId}`}
            className="text-slate-500 hover:text-blue-600 transition text-sm font-bold inline-flex items-center"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Painel da Pesquisa</span>
          </Link>
          <span className="text-slate-300">|</span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center">
              <span>Construtor de Ficha Clínica & Anamnese</span>
              {saveSuccess && (
                <span className="ml-3 px-3 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full inline-flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Configuração Salva!</span>
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500">
              Projeto: <strong>{projectName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowLibraryModal(true)}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Biblioteca de Perguntas Clínicas</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={saving || loading}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center space-x-1.5"
          >
            {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Gravando...' : 'Salvar Ficha'}</span>
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving || loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5"
          >
            <span>Concluir & Abrir Painel</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Navegação por Abas Modulares */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-6">
        <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('odontogram')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'odontogram'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Odontograma</span>
            {enableOdontogram && (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('periodontogram')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'periodontogram'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Periograma (Exame Periodontal)</span>
            {enablePeriodontogram && (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'questions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Anamnese & Critérios ({questions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'forms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Questionários & eCRFs ({projectForms.length})</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        {isNewProject && (
          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl flex flex-col md:flex-row items-start md:md-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                ✨
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  <span>Configuração Inicial do Estudo</span>
                  <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-[10px] uppercase tracking-wider font-extrabold rounded-full">Novo</span>
                </h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  Defina os módulos clínicos ativos nesta pesquisa (Odontograma, Periograma, Anamnese e Questionários). Cada estudo possui suas escolhas isoladas e vinculadas exclusivamente a ele.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              <button
                onClick={() => handleSave(true)}
                disabled={saving || loading}
                className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <span>Concluir e Abrir Painel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 p-4 sm:p-8 shadow-sm">
          {/* ===================== ABA 1: ODONTOGRAMA ===================== */}
          {activeTab === 'odontogram' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-5 rounded-xl border border-slate-200 gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center">
                    <Sparkles className="w-4 h-4 text-blue-600 mr-2" /> Módulo de Odontograma Interativo
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Permite ao examinador marcar dentes hígidos, restaurados, ausentes ou cariados durante a triagem.
                  </p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <span className="mr-3 text-sm font-bold text-slate-700">
                    {enableOdontogram ? 'Habilitado' : 'Desabilitado'}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={enableOdontogram}
                      onChange={(e) => setEnableOdontogram(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`block w-12 h-6 rounded-full transition ${
                        enableOdontogram ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    ></div>
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                        enableOdontogram ? 'translate-x-6' : ''
                      }`}
                    ></div>
                  </div>
                </label>
              </div>

              {enableOdontogram ? (
                <div className="space-y-6 pt-2">
                  <div className="bg-blue-50/60 border border-blue-200 p-5 rounded-xl">
                    <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                      Escopo do Odontograma na Triagem:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                          odontogramScope === 'anterior'
                            ? 'bg-white border-blue-500 shadow-sm'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="odontogramScope"
                          checked={odontogramScope === 'anterior'}
                          onChange={() => setOdontogramScope('anterior')}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Foco em Dentes Anteriores (13 a 23 e 33 a 43)
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Recomendado para ensaios clínicos de clareamento dental, facetas estéticas e resinas anteriores (12 dentes analisados).
                          </p>
                        </div>
                      </label>

                      <label
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                          odontogramScope === 'full'
                            ? 'bg-white border-blue-500 shadow-sm'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="odontogramScope"
                          checked={odontogramScope === 'full'}
                          onChange={() => setOdontogramScope('full')}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Arcada Completa (18 a 48 - 32 dentes)
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Indicado para estudos de reabilitação oral completa, periodontia ampla ou mapeamento integral de cárie (CPO-D).
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Pré-visualização Ilustrativa da Arcada com Desenhos Anatômicos */}
                  <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50 space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Pré-visualização do Mapeamento Anatômico de Dentes na Triagem:
                      </h4>
                      <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {odontogramScope === 'anterior' ? '12 Dentes Anteriores' : 'Arcada Completa (Permanentes + Decíduos)'}
                      </span>
                    </div>

                    <OdontogramChart
                      mode="clinical_status"
                      statusMap={previewOdontogram}
                      onChangeStatus={(tooth, newStatus) => {
                        setPreviewOdontogram((prev) => ({
                          ...prev,
                          [tooth]: newStatus,
                        }));
                      }}
                      scope={odontogramScope}
                      allowDeciduous={true}
                      readOnly={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-sm">O Odontograma está desabilitado para este projeto.</p>
                  <p className="text-xs mt-1 text-slate-400">
                    Ative a chave acima se a sua pesquisa exigir mapeamento dentário na triagem.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ===================== ABA 2: PERIOGRAMA ===================== */}
          {activeTab === 'periodontogram' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-5 rounded-xl border border-slate-200 gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center">
                    <Stethoscope className="w-4 h-4 text-blue-600 mr-2" /> Módulo de Periograma (Exame Periodontal)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure quais parâmetros de saúde periodontal e gengival o examinador deverá aferir na triagem.
                  </p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <span className="mr-3 text-sm font-bold text-slate-700">
                    {enablePeriodontogram ? 'Habilitado' : 'Desabilitado'}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={enablePeriodontogram}
                      onChange={(e) => setEnablePeriodontogram(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`block w-12 h-6 rounded-full transition ${
                        enablePeriodontogram ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    ></div>
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                        enablePeriodontogram ? 'translate-x-6' : ''
                      }`}
                    ></div>
                  </div>
                </label>
              </div>

              {enablePeriodontogram ? (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Selecione os Parâmetros Periodontais que farão parte da Ficha:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={periodontogramFields.bleedingOnProbing}
                        onChange={(e) =>
                          setPeriodontogramFields({
                            ...periodontogramFields,
                            bleedingOnProbing: e.target.checked,
                          })
                        }
                        className="mt-1 rounded text-blue-600"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Índice de Sangramento à Sondagem (SS / BOP)
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Aferição de inflamação gengival ativa (percentual % ou presente/ausente).
                        </p>
                      </div>
                    </label>

                    <label className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={periodontogramFields.visiblePlaque}
                        onChange={(e) =>
                          setPeriodontogramFields({
                            ...periodontogramFields,
                            visiblePlaque: e.target.checked,
                          })
                        }
                        className="mt-1 rounded text-blue-600"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Índice de Placa Visível (IPV)
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Presença ou percentual de biofilme dental acumulado nas superfícies.
                        </p>
                      </div>
                    </label>

                    <label className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={periodontogramFields.probingDepth}
                        onChange={(e) =>
                          setPeriodontogramFields({
                            ...periodontogramFields,
                            probingDepth: e.target.checked,
                          })
                        }
                        className="mt-1 rounded text-blue-600"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Profundidade de Sondagem (PS &gt; 3mm)
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Detecção de bolsas periodontais patológicas ou perda de inserção clínica.
                        </p>
                      </div>
                    </label>

                    <label className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={periodontogramFields.gingivalRecession}
                        onChange={(e) =>
                          setPeriodontogramFields({
                            ...periodontogramFields,
                            gingivalRecession: e.target.checked,
                          })
                        }
                        className="mt-1 rounded text-blue-600"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Recessão Gengival / Lesão Cervical Não Cariosa
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Exposição radicular e retração marginal que podem desencadear hipersensibilidade dentinária.
                        </p>
                      </div>
                    </label>

                    <label className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={periodontogramFields.furcationOrMobility}
                        onChange={(e) =>
                          setPeriodontogramFields({
                            ...periodontogramFields,
                            furcationOrMobility: e.target.checked,
                          })
                        }
                        className="mt-1 rounded text-blue-600"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Envolvimento de Furca & Mobilidade Dental
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Grau de mobilidade fisiológica/patológica e lesões inter-radiculares.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-sm">O Periograma está desabilitado para este projeto.</p>
                  <p className="text-xs mt-1 text-slate-400">
                    Ative a chave acima se o protocolo de pesquisa exigir exame periodontal na triagem.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ===================== ABA 3: PERGUNTAS E CRITÉRIOS ===================== */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-5 rounded-xl border border-slate-200 gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center">
                    <ClipboardList className="w-4 h-4 text-blue-600 mr-2" /> Perguntas de Anamnese & Critérios de Elegibilidade
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Crie perguntas personalizadas ou selecione da biblioteca clínica. Defina se a resposta atua como critério de exclusão imediato.
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowLibraryModal(true)}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Inserir da Biblioteca</span>
                  </button>
                  <button
                    onClick={addCustomQuestion}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Pergunta</span>
                  </button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-sm font-bold text-slate-600">Nenhuma pergunta adicionada ainda.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Clique em <strong>+ Nova Pergunta</strong> para criar perguntas personalizadas ou use a <strong>Biblioteca Odontológica</strong> para adicionar itens rápidos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`p-5 rounded-xl border transition-all ${
                        q.isCriterion
                          ? 'bg-amber-50/40 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Pergunta Clínica
                          </span>
                          {q.isCriterion && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>Critério de Elegibilidade (Desqualifica se: {q.disqualifyIf?.toUpperCase()})</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="text-slate-400 hover:text-red-600 text-xs font-bold transition inline-flex items-center gap-1"
                          title="Remover pergunta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Título / Enunciado da Pergunta:
                          </label>
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
                            placeholder="Ex: Histórico de sensibilidade dentinária..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Tipo de Resposta:
                          </label>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              updateQuestion(q.id, { type: e.target.value as QuestionType })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="boolean">Sim / Não</option>
                            <option value="vita_shade">Escala de Cor Vita (A1-D4)</option>
                            <option value="sensitivity_scale">Escala de Sensibilidade (0 a 10)</option>
                            <option value="text">Texto Aberto (Observação)</option>
                            <option value="number">Valor Numérico</option>
                            <option value="choice">Múltipla Escolha</option>
                          </select>
                        </div>
                      </div>

                      {/* Configurações Avançadas da Pergunta */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                              className="rounded text-blue-600"
                            />
                            <span className="font-semibold text-slate-700">Preenchimento Obrigatório</span>
                          </label>

                          {q.type === 'boolean' && (
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(q.isCriterion)}
                                onChange={(e) =>
                                  updateQuestion(q.id, {
                                    isCriterion: e.target.checked,
                                    disqualifyIf: e.target.checked ? q.disqualifyIf || 'sim' : undefined,
                                  })
                                }
                                className="rounded text-amber-600"
                              />
                              <span className="font-semibold text-amber-900">
                                Definir como Critério de Inclusão/Exclusão
                              </span>
                            </label>
                          )}
                        </div>

                        {q.isCriterion && q.type === 'boolean' && (
                          <div className="flex items-center space-x-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                            <span className="text-amber-800 font-bold">
                              Alertar inelegibilidade / exclusão se responder:
                            </span>
                            <select
                              value={q.disqualifyIf || 'sim'}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  disqualifyIf: e.target.value as 'sim' | 'nao',
                                })
                              }
                              className="px-2 py-0.5 border border-amber-300 rounded font-bold text-xs bg-white text-amber-900"
                            >
                              <option value="sim">SIM (Ex: Tem alergia)</option>
                              <option value="nao">NÃO (Ex: Dentes não são hígidos)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===================== ABA 4: QUESTIONÁRIOS / eCRFs ===================== */}
          {activeTab === 'forms' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-5 rounded-xl border border-slate-200 gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center">
                    <FileText className="w-4 h-4 text-blue-600 mr-2" /> Questionários Eletrônicos & eCRFs (PROMs)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Formulários preenchidos remotamente pelos voluntários (via WhatsApp ou Portal do Paciente) ou pela equipe de pesquisa.
                  </p>
                </div>
                <Link
                  href={`/construtor?projectId=${projectId}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Formulário Personalizado</span>
                </Link>
              </div>

              {/* Modelos Científicos Rápidos (1-Clique) */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Adicionar Instrumentos Científicos Validados (1 Clique):
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Preset 1: EVA */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                        <h5 className="font-bold text-slate-800 text-sm">Escala Visual Analógica (EVA)</h5>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Mensuração de dor e sensibilidade dentinária (0 a 10), tipo de sensação e uso de analgésicos nos intervalos de 0h, 1h, 24h e 48h.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateFormPreset('eva')}
                      disabled={creatingFormPreset !== null}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {creatingFormPreset === 'eva' ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Adicionando...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar EVA ao Estudo</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Preset 2: OHIP-14 */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-xs transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                        <h5 className="font-bold text-slate-800 text-sm">OHIP-14 Odontológico</h5>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Oral Health Impact Profile com 14 itens validados internacionalmente (Slade, 1997) para avaliar qualidade de vida relacionada à saúde bucal.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateFormPreset('ohip')}
                      disabled={creatingFormPreset !== null}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {creatingFormPreset === 'ohip' ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Adicionando...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar OHIP-14</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Preset 3: Satisfação */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-xs transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                        <h5 className="font-bold text-slate-800 text-sm">Satisfação & Estética</h5>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Avaliação da percepção estética do sorriso, contentamento com a alteração de cor, autoconfiança e recomendação do tratamento.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateFormPreset('satisfaction')}
                      disabled={creatingFormPreset !== null}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {creatingFormPreset === 'satisfaction' ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Adicionando...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Satisfação</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Formulários Existentes */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Questionários Ativos Neste Projeto ({projectForms.length}):
                  </h4>
                  <button
                    onClick={loadProjectForms}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Atualizar lista
                  </button>
                </div>

                {loadingForms ? (
                  <div className="p-8 text-center text-slate-500 text-xs">Carregando questionários do projeto...</div>
                ) : projectForms.length === 0 ? (
                  <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">Nenhum questionário vinculado a este estudo ainda</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Clique em um dos modelos padronizados acima (como a escala EVA ou OHIP-14) ou abra o Construtor para criar formulários personalizados.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectForms.map((form) => {
                      let qCount = 0;
                      try {
                        const parsed = JSON.parse(form.questionsJson);
                        qCount = Array.isArray(parsed) ? parsed.length : 0;
                      } catch (e) {}

                      return (
                        <div
                          key={form.id}
                          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-blue-400 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h5 className="font-bold text-slate-900 text-sm">{form.title}</h5>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded">
                                {qCount} questões
                              </span>
                            </div>
                            {form.description && (
                              <p className="text-xs text-slate-500 mb-3">{form.description}</p>
                            )}
                            <div className="text-[11px] text-slate-500 space-x-3 mb-4">
                              <span>Janela de resposta: <strong>{form.expirationHours}h</strong></span>
                              <span>•</span>
                              <span>Envios recebidos: <strong>{form._count?.responses || 0}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                            <Link
                              href={`/construtor?projectId=${projectId}&formId=${form.id}`}
                              className="flex-1 text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <span>Editar no Construtor</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barra de Conclusão / Salvar Rodapé */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl">
            <div className="text-xs text-slate-600">
              {isNewProject ? (
                <span>As opções selecionadas acima ficam registradas exclusivamente no estudo <strong>{projectName}</strong>.</span>
              ) : (
                <span>Altere os módulos a qualquer momento conforme as especificidades do projeto <strong>{projectName}</strong>.</span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => handleSave(false)}
                disabled={saving || loading}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {saving ? 'Gravando...' : 'Salvar Alterações'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Salvar e Ir para o Painel do Estudo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal da Biblioteca de Perguntas Clínicas */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <BookOpen className="w-4 h-4 text-indigo-600 mr-2" /> Biblioteca Odontológica de Perguntas
                </h3>
                <p className="text-xs text-slate-500">
                  Clique para adicionar qualquer pergunta ou critério relevante ao seu estudo.
                </p>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {CLINICAL_LIBRARY_PRESETS.map((preset, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition flex justify-between items-center gap-4"
                >
                  <div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                      {preset.category}
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">{preset.title}</p>
                    <p className="text-xs text-slate-500">
                      Tipo: {preset.type === 'boolean' ? 'Sim / Não' : preset.type}
                      {preset.isCriterion && ` • Desqualifica se: ${preset.disqualifyIf?.toUpperCase()}`}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      addFromLibrary(preset);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0 transition"
                  >
                    + Adicionar
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowLibraryModal(false)}
                className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnamnesisBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando Construtor...</div>}>
      <AnamnesisBuilderContent />
    </Suspense>
  );
}
