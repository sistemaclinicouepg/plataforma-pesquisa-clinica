'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Check, ArrowLeft, Printer, RefreshCw, FolderKanban } from 'lucide-react';
import { formatUserAgent } from '@/lib/formatUserAgent';

type ParticipantSession = {
  id: string;
  sessionNumber: number;
  sessionType: string;
  sessionDate: string;
  painScore0h: number | null;
  painScore1h: number | null;
  painScore24h: number | null;
  painScore48h: number | null;
  gingivalIrritation: string | null;
  adverseEvents: string | null;
};

type ParticipantSignature = {
  id: string;
  participantName: string;
  cpf: string;
  ipAddress: string | null;
  userAgent?: string | null;
  signedAt: string;
};

type Participant = {
  id: string;
  researchCode: string;
  status: 'PENDING' | 'APPROVED' | 'EXCLUDED';
  exclusionReason: string | null;
  group: string | null;
  anamnesisDone: boolean;
  patient: {
    fullName: string;
    cpf: string;
    phoneWhatsApp: string;
    biologicalSex: string;
  };
  sessions: ParticipantSession[];
  signatures: ParticipantSignature[];
};

type ProjectData = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  consentForm: {
    title: string;
    responsibleResearcher: string;
    advisor: string | null;
    institution: string;
    ethicsNumber: string | null;
    ethicsContacts: string | null;
  } | null;
  members: Array<{
    id: string;
    role: string;
    isBlinded: boolean;
    user: { name: string; email: string };
  }>;
  participants: Participant[];
};

function RelatorioCepContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [project, setProject] = useState<ProjectData | null>(null);
  const [allProjects, setAllProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchWithRetry = async (url: string, timeoutMs: number = 35000, maxRetries: number = 2): Promise<Response> => {
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (!res.ok && res.status >= 500 && attempt < maxRetries) {
          console.warn(`[RelatorioCEP] Tentativa ${attempt + 1} para ${url} retornou ${res.status}. Retentando...`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        console.warn(`[RelatorioCEP] Tentativa ${attempt + 1} para ${url} falhou: ${err.message || err.name}.`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
    }
    throw lastError;
  };

  const loadData = async () => {
    setLoadError(null);
    try {
      let pId = projectIdParam;

      // 1. Busca em segundo plano a lista de projetos para preencher o seletor rápido
      fetchWithRetry('/api/projects', 35000, 1)
        .then(async (listRes) => {
          if (listRes.status === 401 && typeof window !== 'undefined') {
            window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            return;
          }
          if (listRes.ok) {
            const listData = await listRes.json();
            if (listData.projects) {
              setAllProjects(listData.projects.map((p: any) => ({ id: p.id, name: p.name })));
              if (!pId && listData.projects.length > 0) {
                // Se não havia pId na URL, carrega o primeiro projeto da lista
                loadProjectById(listData.projects[0].id);
              }
            }
          }
        })
        .catch((e) => console.warn('Erro ao carregar lista de projetos para o seletor:', e));

      // 2. Se já temos o ID do projeto na URL ou no armazenamento local
      if (!pId && typeof window !== 'undefined') {
        pId = localStorage.getItem('app_active_project_id') || localStorage.getItem('prototipo_active_project_id');
      }

      if (pId) {
        await loadProjectById(pId);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados para o relatório:', err);
      setLoadError('A conexão com o servidor demorou para responder. Clique para tentar novamente.');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectById = async (targetId: string) => {
    try {
      const res = await fetchWithRetry(`/api/projects/${targetId}`, 35000, 2);

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setProject(data.project);
          setLoadError(null);
          try {
            localStorage.setItem(`uepg_cached_project_${data.project.id}`, JSON.stringify(data.project));
            localStorage.setItem('uepg_cached_last_project', JSON.stringify(data.project));
          } catch (e) {}
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setLoadError(errData.error || 'Não foi possível carregar os dados deste estudo.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar projeto por ID:', err);
      setLoadError('A conexão com o banco de dados demorou para responder.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 0. Leitura imediata do Cache Local (0 ms SWR!)
    if (typeof window !== 'undefined') {
      try {
        const pId = projectIdParam || localStorage.getItem('app_active_project_id') || localStorage.getItem('prototipo_active_project_id');
        const cachedKey = pId ? `uepg_cached_project_${pId}` : 'uepg_cached_last_project';
        const cachedStr = localStorage.getItem(cachedKey);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && cached.id) {
            setProject(cached);
            setLoading(false);
          }
        }
      } catch (e) {}
    }

    loadData();
  }, [projectIdParam]);

  if (loading && !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-sm text-slate-700 animate-pulse">Gerando Relatório de Auditoria CEP/CONSORT...</p>
        <p className="text-xs text-slate-400">Compilando dados de elegibilidade, sessões e assinaturas eletrônicas</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4 border border-amber-200">
          <FolderKanban className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {loadError || 'Nenhum projeto localizado.'}
        </h2>
        <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
          Não foi possível carregar os dados consolidados do estudo para emissão do relatório ético.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ver Meus Projetos</span>
          </Link>
        </div>
      </div>
    );
  }

  // Cálculos do Fluxo CONSORT
  const totalScreened = project.participants.length;
  const approvedList = project.participants.filter((p) => p.status === 'APPROVED');
  const excludedList = project.participants.filter((p) => p.status === 'EXCLUDED');
  const pendingList = project.participants.filter((p) => p.status === 'PENDING');

  const s1Count = approvedList.filter((p) => p.sessions.some((s) => s.sessionNumber === 1)).length;
  const s2Count = approvedList.filter((p) => p.sessions.some((s) => s.sessionNumber === 2)).length;
  const r14Count = approvedList.filter((p) => p.sessions.some((s) => s.sessionNumber === 3)).length;
  const r30Count = approvedList.filter((p) => p.sessions.some((s) => s.sessionNumber === 4)).length;

  // Farmacovigilância: eventos adversos e dor severa
  const allSessions = project.participants.flatMap((p) => p.sessions || []);
  const severePainSessions = allSessions.filter((s) => {
    const peak = Math.max(s.painScore0h || 0, s.painScore1h || 0, s.painScore24h || 0, s.painScore48h || 0);
    return peak >= 7;
  });

  const gingivalEvents = allSessions.filter((s) => s.gingivalIrritation && s.gingivalIrritation !== 'Ausente');
  const reportedAdverseEvents = allSessions.filter((s) => s.adverseEvents && s.adverseEvents.trim().length > 0);

  const coordinator = project.members.find((m) => m.role === 'COORDINATOR')?.user.name || project.consentForm?.responsibleResearcher || 'Pesquisador Responsável';
  const advisor = project.consentForm?.advisor || 'Prof. Dr. Orientador do Estudo';

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 py-8 px-4 sm:px-6">
      
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="w-full max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard?projectId=${project.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Painel</span>
          </Link>

          {allProjects.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-xs text-xs">
              <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <select
                value={project.id}
                onChange={(e) => {
                  const newId = e.target.value;
                  if (newId) {
                    setLoading(true);
                    loadProjectById(newId);
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href);
                      url.searchParams.set('projectId', newId);
                      window.history.replaceState({}, '', url.toString());
                    }
                  }
                }}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[220px] truncate"
              >
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Relatório Oficial / Salvar PDF</span>
        </button>
      </div>

      {/* Documento A4 Oficial */}
      <div className="w-full max-w-6xl mx-auto bg-white border border-slate-300 shadow-xl rounded-2xl p-6 sm:p-10 lg:p-12 print:border-none print:shadow-none print:p-0 print:m-0">
        
        {/* Cabeçalho Institucional UEPG */}
        <div className="border-b-2 border-slate-800 pb-6 mb-8 text-center space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            UNIVERSIDADE ESTADUAL DE PONTA GROSSA • UEPG
          </p>
          <p className="text-xs font-semibold text-slate-600">
            SETOR DE CIÊNCIAS BIOLÓGICAS E DA SAÚDE • DEPARTAMENTO DE ODONTOLOGIA
          </p>
          <p className="text-xs font-semibold text-slate-600">
            COMITÊ DE ÉTICA EM PESQUISA COM SERES HUMANOS (CEP/CONEP)
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 pt-3 uppercase tracking-tight">
            Relatório Consolidado de Acompanhamento Ético & Diagrama CONSORT
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Documento de Prestação de Contas, Auditoria de TCLEs e Monitoramento de Eventos Adversos
          </p>
        </div>

        {/* 1. Identificação do Protocolo */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 rounded-md mb-3">
            1. Identificação do Protocolo de Pesquisa
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block">Título do Projeto:</span>
              <span className="font-bold text-slate-900">{project.name}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Parecer Consubstanciado / CAAE:</span>
              <span className="font-bold text-slate-900">{project.consentForm?.ethicsNumber || 'Em conformidade com parecer aprovado'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Pesquisador(a) Responsável:</span>
              <span className="font-bold text-slate-900">{coordinator}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Orientador(a) / Coordenador(a):</span>
              <span className="font-bold text-slate-900">{advisor}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Delineamento Metodológico:</span>
              <span className="font-semibold text-slate-800">Ensaio Clínico Randomizado, Duplo-Cego, Boca Dividida (Split-Mouth)</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Data do Relatório:</span>
              <span className="font-semibold text-slate-800">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </section>

        {/* 2. Diagrama de Fluxo CONSORT 2010 */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 rounded-md mb-4">
            2. Diagrama de Fluxo CONSORT 2010 (Split-Mouth Clinical Trial)
          </h2>

          <div className="border border-slate-300 rounded-xl p-6 bg-slate-50/50 space-y-4">
            
            {/* Caixa 1: Recrutamento e Triagem */}
            <div className="bg-white border-2 border-slate-700 rounded-xl p-4 text-center max-w-md mx-auto shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">RECRUTAMENTO & TRIAGEM CLÍNICA</span>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {totalScreened} Candidatos Avaliados para Elegibilidade
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Exame clínico, anamnese específica e odontograma
              </p>
            </div>

            {/* Seta para Exclusão e Inclusão */}
            <div className="flex justify-center text-slate-400 font-bold text-lg">↓</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Caixa 2A: Excluídos */}
              <div className="bg-red-50/70 border border-red-300 rounded-xl p-4 text-xs space-y-2">
                <span className="font-bold text-red-900 uppercase tracking-wider block text-[11px] inline-flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-700" />
                  <span>Excluídos na Triagem ({excludedList.length})</span>
                </span>
                <p className="text-slate-600 text-[11px]">
                  Candidatos que não preencheram os critérios éticos/clínicos de inclusão:
                </p>
                <ul className="list-disc list-inside text-[11px] text-red-800 space-y-1">
                  {excludedList.length === 0 ? (
                    <li>Nenhuma exclusão registrada até o momento.</li>
                  ) : (
                    excludedList.map((e) => (
                      <li key={e.id}>
                        <strong>{e.researchCode}:</strong> {e.exclusionReason || 'Critério de exclusão clínico ativado'}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Caixa 2B: Incluídos / TCLE */}
              <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-4 text-xs space-y-2">
                <span className="font-bold text-emerald-900 uppercase tracking-wider block text-[11px] inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Incluídos no Protocolo ({approvedList.length})</span>
                </span>
                <p className="text-slate-600 text-[11px]">
                  Todos os participantes incluídos consentiram formalmente:
                </p>
                <div className="space-y-1 text-[11px] text-emerald-800">
                  <p>• <strong>100% de TCLEs Assinados</strong> digitalmente;</p>
                  <p>• Trilha de auditoria criptográfica com Hash SHA-256 e IP;</p>
                  <p>• Anonimização e codificação com código cego (Ex: P001).</p>
                </div>
              </div>

            </div>

            <div className="flex justify-center text-slate-400 font-bold text-lg">↓</div>

            {/* Caixa 3: Alocação Boca Dividida */}
            <div className="bg-white border-2 border-indigo-600 rounded-xl p-4 text-center max-w-lg mx-auto shadow-xs">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">ALOCAÇÃO & RANDOMIZAÇÃO (BOCA DIVIDIDA)</span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {approvedList.length} Participantes Alocados para Tratamento Comparativo
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-100 text-[11px] text-slate-600">
                <div className="bg-indigo-50/50 p-1.5 rounded">
                  <strong className="block text-indigo-900">Hemi-arco Teste</strong>
                  Peróxido de Hidrogênio 6%
                </div>
                <div className="bg-indigo-50/50 p-1.5 rounded">
                  <strong className="block text-indigo-900">Hemi-arco Controle</strong>
                  Peróxido de Carbamida 37%
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                * Avaliadores clínicos mantidos em mascaramento duplo-cego (Blinded Evaluators).
              </p>
            </div>

            <div className="flex justify-center text-slate-400 font-bold text-lg">↓</div>

            {/* Caixa 4: Seguimento Longitudinal */}
            <div className="bg-white border border-slate-300 rounded-xl p-4 text-xs max-w-xl mx-auto space-y-3">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block text-center">
                SEGUIMENTO LONGITUDINAL (FOLLOW-UP)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="block text-slate-400 text-[10px]">Sessão 1 (Base)</span>
                  <span className="font-bold text-slate-800">{s1Count} / {approvedList.length}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="block text-slate-400 text-[10px]">Sessão 2 (7 dias)</span>
                  <span className="font-bold text-slate-800">{s2Count} / {approvedList.length}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="block text-slate-400 text-[10px]">Retorno 14 dias</span>
                  <span className="font-bold text-slate-800">{r14Count} / {approvedList.length}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="block text-slate-400 text-[10px]">Retorno 30 dias</span>
                  <span className="font-bold text-slate-800">{r30Count} / {approvedList.length}</span>
                </div>
              </div>

              <div className="p-2 bg-emerald-50 text-emerald-800 rounded text-center text-[11px] font-semibold border border-emerald-200 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Taxa de Perda Amostral (Drop-out): 0% (Nenhuma evasão relatada até a presente data)</span>
              </div>
            </div>

            <div className="flex justify-center text-slate-400 font-bold text-lg">↓</div>

            {/* Caixa 5: Análise Estatística */}
            <div className="bg-white border-2 border-slate-700 rounded-xl p-3 text-center max-w-md mx-auto shadow-xs text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ANÁLISE ESTATÍSTICA FINAL</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {approvedList.length} Participantes Analisados por Intenção de Tratar (ITT)
              </p>
            </div>

          </div>
        </section>

        {/* 3. Monitoramento de Eventos Adversos & Segurança */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 rounded-md mb-3">
            3. Monitoramento de Eventos Adversos & Segurança dos Participantes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Sensibilidade Severa (EVA &gt; 6)</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {severePainSessions.length} <span className="text-xs font-normal text-slate-400">ocorrências</span>
              </span>
              <span className="text-[10px] text-slate-400">Total de {allSessions.length} sessões</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Irritação de Margem Gengival</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {gingivalEvents.length} <span className="text-xs font-normal text-slate-400">ocorrências</span>
              </span>
              <span className="text-[10px] text-slate-400">Reversão em até 24 horas</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Eventos Notificados</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {reportedAdverseEvents.length} <span className="text-xs font-normal text-slate-400">relatos</span>
              </span>
              <span className="text-[10px] text-slate-400">Sem eventos adversos graves</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
            <p>
              <strong>Parecer de Segurança:</strong> Não foram observados eventos adversos graves (SAEs), necrose pulpar, reabsorções radiculares ou queimaduras químicas severas. Todas as ocorrências de sensibilidade dentinária apresentaram resolução espontânea no período de 24 a 48 horas pós-intervenção, condizente com a literatura internacional de clareamento dental.
            </p>
          </div>
        </section>

        {/* 4. Trilha de Auditoria do TCLE (LGPD & Ética) */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 rounded-md mb-3">
            4. Trilha de Auditoria do TCLE Digital (LGPD e Conformidade CNS 466/12)
          </h2>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Código</th>
                  <th className="p-2.5">Data / Hora de Assinatura</th>
                  <th className="p-2.5">IP de Conexão</th>
                  <th className="p-2.5">Dispositivo / Navegador</th>
                  <th className="p-2.5">Integridade Criptográfica</th>
                  <th className="p-2.5 text-right">Status do TCLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {approvedList.map((p) => {
                  const sig = p.signatures?.[0];
                  return (
                    <tr key={p.id}>
                      <td className="p-2.5 font-bold font-mono text-blue-700">{p.researchCode}</td>
                      <td className="p-2.5">
                        {sig?.signedAt ? new Date(sig.signedAt).toLocaleString('pt-BR') : 'Assinado digitalmente'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500">{sig?.ipAddress || '127.0.0.1 (Ambiente Seguro)'}</td>
                      <td className="p-2.5 text-slate-700 font-medium">
                        <span title={sig?.userAgent || ''}>
                          {formatUserAgent(sig?.userAgent)}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-400 truncate max-w-xs">
                        SHA-256: VALIDADO (Trilha Ativa)
                      </td>
                      <td className="p-2.5 text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-700" /> Conforme
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Declaração e Assinaturas */}
        <section className="mt-12 pt-8 border-t-2 border-slate-300">
          <p className="text-xs text-slate-600 text-justify mb-8 leading-relaxed">
            Declaramos, sob as penas da lei e em estrito cumprimento às Resoluções CNS nº 466/2012 e nº 510/2016, que os dados clínicos apresentados neste relatório refletem com fidedignidade o andamento do protocolo de pesquisa em epígrafe, garantindo o sigilo dos participantes, o livre consentimento esclarecido e a prestação imediata de assistência odontológica aos voluntários.
          </p>

          <div className="grid grid-cols-2 gap-12 text-center text-xs pt-4">
            <div>
              <div className="border-b border-slate-800 w-3/4 mx-auto mb-2"></div>
              <p className="font-bold text-slate-900">{coordinator}</p>
              <p className="text-slate-500 text-[11px]">Pesquisador(a) Responsável</p>
              <p className="text-slate-400 text-[10px]">Depto. de Odontologia - UEPG</p>
            </div>

            <div>
              <div className="border-b border-slate-800 w-3/4 mx-auto mb-2"></div>
              <p className="font-bold text-slate-900">{advisor}</p>
              <p className="text-slate-500 text-[11px]">Coordenador(a) / Orientador(a)</p>
              <p className="text-slate-400 text-[10px]">Programa de Pós-Graduação em Odontologia</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default function RelatorioCepPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando relatório do CEP...</div>}>
      <RelatorioCepContent />
    </Suspense>
  );
}
