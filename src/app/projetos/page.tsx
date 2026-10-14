'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Clock,
  Plus,
  Check,
  Activity,
  FileEdit,
  FileSpreadsheet,
  EyeOff,
  ArrowRight,
  FolderPlus,
  Users,
  Sparkles,
} from 'lucide-react';

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members: Array<{
    id: string;
    role: string;
    isBlinded: boolean;
    user: { id: string; name: string; email: string };
  }>;
  participants: Array<{ id: string; status: string }>;
  forms: Array<{ id: string; title: string }>;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type PendingUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export default function ProjetosPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de criação de projeto com particularidades da pesquisa
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [enableOdontogram, setEnableOdontogram] = useState(true);
  const [odontogramScope, setOdontogramScope] = useState<'anterior' | 'full'>('anterior');
  const [enablePeriodontogram, setEnablePeriodontogram] = useState(false);
  const [enableAnamnesis, setEnableAnamnesis] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setCurrentUser(data.currentUser || null);

        // Se for admin, busca usuários pendentes de aprovação
        if (data.currentUser?.role === 'ADMIN') {
          const usersRes = await fetch('/api/admin/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            const pending = (usersData.users || []).filter((u: any) => !u.isApproved);
            setPendingUsers(pending);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar projetos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setCreating(true);
      const initialTemplate = {
        enableOdontogram,
        odontogramScope,
        enablePeriodontogram,
        periodontogramFields: {
          bleedingOnProbing: true,
          visiblePlaque: true,
          probingDepth: false,
          gingivalRecession: true,
          furcationOrMobility: false,
        },
        questions: [],
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          anamnesisTemplate: initialTemplate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsCreateModalOpen(false);
        setNewProjectName('');
        setNewProjectDesc('');
        if (data.project?.id) {
          // Direciona imediatamente para configurar os itens particulares desta pesquisa!
          router.push(`/anamnese?projectId=${data.project.id}&new=true`);
        } else {
          loadData();
        }
      }
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isApproved: true }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Erro ao aprovar usuário:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">

      {/* Conteúdo Principal */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
        
        {/* Painel do Administrador: Aprovações Pendentes */}
        {currentUser?.role === 'ADMIN' && pendingUsers.length > 0 && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-amber-900">
                    Novos Pesquisadores Aguardando Sua Aprovação
                  </h2>
                  <p className="text-xs text-amber-700">
                    Pesquisadores ou alunos cadastrados que necessitam de autorização prévia.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-bold">
                {pendingUsers.length} pendente(s)
              </span>
            </div>

            <div className="space-y-3">
              {pendingUsers.map((u) => (
                <div key={u.id} className="bg-white p-4 rounded-xl border border-amber-100 flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <button
                    onClick={() => handleApproveUser(u.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar Acesso</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Meus Projetos</h1>
            <p className="text-slate-500 mt-1">
              Selecione uma pesquisa para acessar a triagem, disparar mensagens de acompanhamento ou editar formulários.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>

        {/* Estado de Carregamento */}
        {loading && (
          <div className="py-16 text-center text-slate-400">
            <p className="animate-pulse">Carregando projetos do banco de dados...</p>
          </div>
        )}

        {/* Grid de Projetos */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {projects.map((project) => {
              const myMember = project.members.find(
                (m) => m.user.id === currentUser?.id
              );
              const roleLabels: Record<string, string> = {
                COORDINATOR: 'Coordenador',
                CO_ADVISOR: 'Co-orientador',
                OPERATOR: 'Operador',
                EVALUATOR: 'Avaliador',
              };
              const roleName = roleLabels[myMember?.role || ''] || 'Coordenador';
              const isBlinded = myMember?.isBlinded ?? false;
              const approvedCount = project.participants.filter(p => p.status === 'APPROVED').length;
              const pendingCount = project.participants.filter(p => p.status === 'PENDING').length;

              return (
                <div
                  key={project.id}
                  className="block group"
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          Ativo
                        </span>
                        
                        {isBlinded ? (
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full flex items-center space-x-1">
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Avaliador (Cego)</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                            {roleName}
                          </span>
                        )}
                      </div>

                      <Link href={`/dashboard?projectId=${project.id}`} className="block">
                        <h3 className="text-xl font-bold text-slate-800 hover:text-blue-600 transition-colors leading-snug">
                          {project.name}
                        </h3>
                      </Link>
                      
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                        {project.description || 'Sem descrição cadastrada.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <div className="space-x-2 text-xs">
                          <span className="text-slate-600"><strong>{approvedCount}</strong> Ativos</span>
                          {pendingCount > 0 && (
                            <span className="text-amber-600 font-semibold">• {pendingCount} na Triagem</span>
                          )}
                        </div>
                        <Link
                          href={`/dashboard?projectId=${project.id}`}
                          className="text-blue-600 font-bold text-xs hover:underline flex items-center space-x-1"
                        >
                          <span>Acessar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {/* Botões de Acesso Rápido Direto */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] font-bold">
                        <Link
                          href={`/dashboard?projectId=${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-center border border-blue-200 transition flex items-center justify-center space-x-1"
                        >
                          <Activity className="w-3 h-3 text-blue-600" />
                          <span>Painel</span>
                        </Link>
                        <Link
                          href={`/construtor?projectId=${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-center border border-slate-200 transition flex items-center justify-center space-x-1"
                        >
                          <FileEdit className="w-3 h-3 text-slate-600" />
                          <span>eCRF</span>
                        </Link>
                        <Link
                          href={`/relatorio-cep?projectId=${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-center border border-emerald-200 transition flex items-center justify-center space-x-1"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                          <span>CEP</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Card para Criar Novo Projeto */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-300 p-6 h-full min-h-[200px] hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 group"
            >
              <div className="p-4 rounded-full bg-white shadow-xs group-hover:bg-blue-100 mb-3 transition-colors border border-slate-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <h3 className="text-base font-bold text-slate-700 group-hover:text-blue-600">Criar Novo Projeto</h3>
              <p className="text-xs text-center text-slate-400 mt-1 max-w-[200px]">
                Defina os objetivos, cegamento da equipe e formulários do estudo.
              </p>
            </button>

          </div>
        )}
      </main>

      {/* Modal de Criação de Projeto */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Cadastrar Novo Projeto</h2>
            <p className="text-xs text-slate-500 mb-6">
              O projeto será registrado no banco de dados com você como Coordenador(a).
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nome do Projeto / Ensaio Clínico
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: Eficácia de Agentes Dessensibilizantes em Clareamento"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Descrição / Hipótese do Estudo (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Breve resumo da metodologia, grupos e intervenções..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Seleção de Módulos & Particularidades do Projeto */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Módulos & Instrumentos Deste Estudo
                  </label>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Exclusivo deste projeto
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Selecione os módulos necessários para esta pesquisa. As configurações ficam isoladas por projeto:
                </p>

                <div className="space-y-2 text-xs">
                  {/* Odontograma */}
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableOdontogram}
                        onChange={(e) => setEnableOdontogram(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Odontograma Clínico Anatômico</span>
                    </label>
                    {enableOdontogram && (
                      <div className="pl-6 flex items-center space-x-4 text-[11px] text-slate-600 pt-0.5">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="odontogramScopeModal"
                            value="anterior"
                            checked={odontogramScope === 'anterior'}
                            onChange={() => setOdontogramScope('anterior')}
                          />
                          <span>Dentes Anteriores (13 a 23 e 33 a 43)</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="odontogramScopeModal"
                            value="full"
                            checked={odontogramScope === 'full'}
                            onChange={() => setOdontogramScope('full')}
                          />
                          <span>Arcada Completa</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Periograma */}
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enablePeriodontogram}
                        onChange={(e) => setEnablePeriodontogram(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Exame Periodontal (Periograma - SS / IPV)</span>
                    </label>
                  </div>

                  {/* Anamnese & Critérios */}
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableAnamnesis}
                        onChange={(e) => setEnableAnamnesis(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Anamnese & Critérios de Inclusão/Exclusão</span>
                    </label>
                  </div>

                  {/* Questionários */}
                  <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 text-[11px] text-blue-900 flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Após salvar, você será direcionado para selecionar e validar os itens e questionários deste estudo.</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {creating ? 'Criando Projeto...' : 'Criar Estudo & Configurar Itens'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
