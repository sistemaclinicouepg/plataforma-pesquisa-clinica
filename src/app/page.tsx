'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Activity,
  FileEdit,
  Smartphone,
  ArrowRight,
  ExternalLink,
  FolderKanban,
  FileSpreadsheet,
  Sparkles,
  Stethoscope,
} from 'lucide-react';

type ProjectItem = {
  id: string;
  name: string;
  description: string | null;
  _count?: {
    participants: number;
    forms: number;
  };
};

export default function HomePage() {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('b4360782-3701-4fad-8af4-263f0bd397ba');

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects);
          setSelectedProjectId(data.projects[0].id);
        }
      })
      .catch((e) => console.error('Erro ao buscar projetos:', e));
  }, []);

  const handleQuickLoginAndNavigate = async (email: string, pass: string, targetUrl: string) => {
    try {
      setSwitching(true);
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      router.push(targetUrl);
    } catch (err) {
      console.error(err);
      router.push(targetUrl);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* Topo Institucional Limpo */}
      <section className="bg-white border-b border-slate-200/90 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold tracking-tight shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>UEPG • Pós-Graduação em Odontologia Clínica • Ensaio Clínico Randomizado</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Plataforma de Pesquisa Clínica & Prontuário Digital
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Ambiente prático para condução de estudos odontológicos, gestão de prontuários clínicos dos voluntários, 
            coleta padronizada de desfechos (eCRF / EVA) e conformidade científica.
          </p>

          {/* Seletor Rápido do Estudo em Andamento */}
          <div className="pt-2 max-w-md mx-auto">
            <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 pl-2">Estudo Atual:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex-1 bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </section>

      {/* Grid de Módulos Principais do Sistema */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-10 space-y-8">
        
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Módulos de Acesso Rápido para Atendimento e Pesquisa:
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Prontuário & Dashboard */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 group-hover:scale-105 transition">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                  Prontuário & Dashboard
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gerencie a fila de voluntários, aprove na triagem com base na anamnese, acompanhe as janelas de retorno das 4 sessões clínicas e registre os atendimentos.
                </p>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => handleQuickLoginAndNavigate('pesquisadora@uepg.br', '123', `/dashboard?projectId=${selectedProjectId}`)}
                  disabled={switching}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <span>Acessar Prontuário Clínico</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 2: Odontograma & Ficha Clínica */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-100 group-hover:scale-105 transition">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition">
                  Odontograma & Ficha
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mapeamento anatômico dos 32 dentes permanentes e decíduos, exame periodontal e critérios de elegibilidade para triagem clínica.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href={`/anamnese?projectId=${selectedProjectId}`}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <span>Abrir Odontograma</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 3: Construtor de Fichas eCRF */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 group-hover:scale-105 transition">
                  <FileEdit className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  Prancheta de Fichas eCRF
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Crie ou edite questionários clínicos com escalas visuais analógicas (EVA de dor/sensibilidade), escalas Likert e modelos validados (OHIP-14).
                </p>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => handleQuickLoginAndNavigate('pesquisadora@uepg.br', '123', `/construtor?projectId=${selectedProjectId}`)}
                  disabled={switching}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <span>Abrir Prancheta Digital</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 4: Portal do Voluntário */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 group-hover:scale-105 transition">
                  <Smartphone className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition">
                  Portal do Paciente
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Experiência móvel do participante da pesquisa para responder aos questionários de dor e satisfação, assinar TCLE e acompanhar seus agendamentos.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href="/paciente?code=P001"
                  target="_blank"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <span>Simular Portal Móvel (P001)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Lista dos Estudos Ativos */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Estudos Clínicos Ativos no Sistema
              </h3>
              <p className="text-xs text-slate-500">
                Selecione qualquer pesquisa abaixo para abrir seu prontuário e ficha eCRF.
              </p>
            </div>
            <Link
              href="/projetos"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1"
            >
              <span>Ver Todos os Projetos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {projects.map((proj) => (
              <div key={proj.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {proj.name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate max-w-lg mt-0.5">
                    {proj.description || 'Ensaio clínico odontológico protocolado.'}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Link
                    href={`/dashboard?projectId=${proj.id}`}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Activity className="w-3 h-3 text-blue-600" />
                    <span>Prontuário</span>
                  </Link>
                  <Link
                    href={`/construtor?projectId=${proj.id}`}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                  >
                    <FileEdit className="w-3 h-3 text-indigo-600" />
                    <span>eCRF</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
}

