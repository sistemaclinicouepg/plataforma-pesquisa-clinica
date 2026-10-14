'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { OdontogramChart } from '@/components/odontogram';

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [projectName, setProjectName] = useState('Projeto de Pesquisa');
  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string }>>([]);

  // Configuração Principal da Ficha Clínica
  const [activeTab, setActiveTab] = useState<'odontogram' | 'periodontogram' | 'questions'>('odontogram');

  const [enableOdontogram, setEnableOdontogram] = useState(false);
  const [odontogramScope, setOdontogramScope] = useState<'anterior' | 'full'>('anterior');

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
            setEnableOdontogram(Boolean(tmpl.enableOdontogram));
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
            // Nenhum template configurado: começa limpo conforme instrução do usuário
            setEnableOdontogram(false);
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
  const handleSave = async () => {
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
                className="block p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left font-bold text-slate-800 transition"
              >
                📁 {p.name}
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/projetos" className="text-sm font-bold text-blue-600 hover:underline">
              ← Voltar para Todos os Projetos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20">
      {/* Barra Superior */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard?projectId=${projectId}`}
            className="text-slate-500 hover:text-blue-600 transition text-sm font-bold"
          >
            ← Painel da Pesquisa
          </Link>
          <span className="text-slate-300">|</span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center">
              <span>Construtor de Ficha Clínica & Anamnese</span>
              {saveSuccess && (
                <span className="ml-3 px-3 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full animate-pulse">
                  ✓ Configuração Salva!
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
            <span>📚</span>
            <span>Biblioteca de Perguntas Clínicas</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center space-x-2"
          >
            <span>💾</span>
            <span>{saving ? 'Gravando...' : 'Salvar Ficha Clínica'}</span>
          </button>
        </div>
      </header>

      {/* Navegação por Abas Modulares */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 space-x-2">
          <button
            onClick={() => setActiveTab('odontogram')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'odontogram'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🦷</span>
            <span>Odontograma</span>
            {enableOdontogram && (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('periodontogram')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'periodontogram'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🩺</span>
            <span>Periograma (Exame Periodontal)</span>
            {enablePeriodontogram && (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'questions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📋</span>
            <span>Anamnese & Critérios de Elegibilidade ({questions.length})</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 p-8 shadow-sm">
          {/* ===================== ABA 1: ODONTOGRAMA ===================== */}
          {activeTab === 'odontogram' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-5 rounded-xl border border-slate-200 gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center">
                    <span className="mr-2">🦷</span> Módulo de Odontograma Interativo
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
                    <span className="mr-2">🩺</span> Módulo de Periograma (Exame Periodontal)
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
                    <span className="mr-2">📋</span> Perguntas de Anamnese & Critérios de Elegibilidade
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Crie perguntas personalizadas ou selecione da biblioteca clínica. Defina se a resposta atua como critério de exclusão imediato.
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowLibraryModal(true)}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  >
                    <span>📚</span>
                    <span>Inserir da Biblioteca</span>
                  </button>
                  <button
                    onClick={addCustomQuestion}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1"
                  >
                    <span>+</span>
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
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300">
                              ⚠️ Critério de Elegibilidade (Desqualifica se: {q.disqualifyIf?.toUpperCase()})
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="text-slate-400 hover:text-red-600 text-xs font-bold transition"
                          title="Remover pergunta"
                        >
                          ✕ Excluir
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
        </div>
      </main>

      {/* Modal da Biblioteca de Perguntas Clínicas */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <span className="mr-2">📚</span> Biblioteca Odontológica de Perguntas
                </h3>
                <p className="text-xs text-slate-500">
                  Clique para adicionar qualquer pergunta ou critério relevante ao seu estudo.
                </p>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
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
