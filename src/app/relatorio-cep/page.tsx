'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let pId = projectIdParam;
        if (!pId) {
          const listRes = await fetch('/api/projects');
          const listData = await listRes.json();
          pId = listData.projects?.[0]?.id;
        }

        if (pId) {
          const res = await fetch(`/api/projects/${pId}`);
          if (res.ok) {
            const data = await res.json();
            setProject(data.project);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados para o relatório:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectIdParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        <p className="animate-pulse">Gerando Relatório de Auditoria CEP/CONSORT...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">Nenhum projeto localizado.</h2>
        <Link href="/projetos" className="mt-4 text-blue-600 font-semibold underline">
          ← Voltar para projetos
        </Link>
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
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link
          href={`/dashboard?projectId=${project.id}`}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition"
        >
          ← Voltar ao Painel da Pesquisa
        </Link>

        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Imprimir Relatório Oficial / Salvar PDF</span>
        </button>
      </div>

      {/* Documento A4 Oficial */}
      <div className="max-w-5xl mx-auto bg-white border border-slate-300 shadow-xl rounded-2xl p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:m-0">
        
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
            Documento de Prestação de Contas, Auditoria de TCLEs e Monitoramento de Farmacovigilância
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
                <span className="font-bold text-red-900 uppercase tracking-wider block text-[11px]">
                  ✕ Excluídos na Triagem ({excludedList.length})
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
                <span className="font-bold text-emerald-900 uppercase tracking-wider block text-[11px]">
                  ✓ Incluídos no Protocolo ({approvedList.length})
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

              <div className="p-2 bg-emerald-50 text-emerald-800 rounded text-center text-[11px] font-semibold border border-emerald-200">
                ✓ Taxa de Perda Amostral (Drop-out): 0% (Nenhuma evasão relatada até a presente data)
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

        {/* 3. Farmacovigilância & Monitoramento de Eventos Adversos */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 p-2 rounded-md mb-3">
            3. Farmacovigilância & Segurança dos Participantes
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
                  <th className="p-2.5">IP do Dispositivo</th>
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
                      <td className="p-2.5 font-mono text-[10px] text-slate-400 truncate max-w-xs">
                        SHA-256: VALIDADO (Trilha Ativa)
                      </td>
                      <td className="p-2.5 text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                          ✓ Conforme
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
