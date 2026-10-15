'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Clock,
  Plus,
  Check,
  Activity,
  FileSpreadsheet,
  EyeOff,
  ArrowRight,
  FolderPlus,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  LogIn,
  Sliders,
  X,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  ShieldAlert,
} from 'lucide-react';

import {
  DEFAULT_STUDY_SESSIONS,
  DEFAULT_FORM_TARGETS,
  parseStudyProtocol,
  StudySessionProtocol,
  FormTargetProtocol,
} from '@/lib/studyProtocol';

type Project = {
  id: string;
  name: string;
  description: string | null;
  status?: string | null;
  anamnesisTemplate?: string | null;
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

type StatusFilterType = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros de status e busca textual
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de criação de projeto
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTab, setCreateTab] = useState<'GENERAL' | 'SESSIONS' | 'FORMS'>('GENERAL');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectPrefix, setNewProjectPrefix] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [enableOdontogram, setEnableOdontogram] = useState(true);
  const [odontogramScope, setOdontogramScope] = useState<'anterior' | 'full'>('anterior');
  const [enablePeriodontogram, setEnablePeriodontogram] = useState(false);
  const [enableAnamnesis, setEnableAnamnesis] = useState(true);
  const [studySessions, setStudySessions] = useState<StudySessionProtocol[]>(DEFAULT_STUDY_SESSIONS);
  const [formTargets, setFormTargets] = useState<FormTargetProtocol[]>(DEFAULT_FORM_TARGETS);
  const [creating, setCreating] = useState(false);

  // Modal de edição / configuração do estudo
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTab, setEditTab] = useState<'GENERAL' | 'SESSIONS' | 'FORMS'>('GENERAL');
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectPrefix, setEditProjectPrefix] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [editEnableOdontogram, setEditEnableOdontogram] = useState(true);
  const [editOdontogramScope, setEditOdontogramScope] = useState<'anterior' | 'full'>('anterior');
  const [editEnablePeriodontogram, setEditEnablePeriodontogram] = useState(false);
  const [editEnableAnamnesis, setEditEnableAnamnesis] = useState(true);
  const [editStudySessions, setEditStudySessions] = useState<StudySessionProtocol[]>(DEFAULT_STUDY_SESSIONS);
  const [editFormTargets, setEditFormTargets] = useState<FormTargetProtocol[]>(DEFAULT_FORM_TARGETS);
  const [savingEdit, setSavingEdit] = useState(false);

  // Manipulação dinâmica de sessões
  const handleAddSession = (isEdit: boolean) => {
    const list = isEdit ? editStudySessions : studySessions;
    const nextNum = list.length + 1;
    const newSession: StudySessionProtocol = {
      id: `sess_${Date.now()}`,
      sessionNumber: nextNum,
      name: `Sessão ${nextNum}: Avaliação Clínica / Retorno`,
      type: 'EVALUATION',
      daysFromPrevious: 7,
      durationMinutes: 30,
      toleranceDays: 2,
      description: `Consulta clínica de acompanhamento (${nextNum}ª sessão).`,
    };
    if (isEdit) {
      setEditStudySessions([...list, newSession]);
    } else {
      setStudySessions([...list, newSession]);
    }
  };

  const handleRemoveSession = (index: number, isEdit: boolean) => {
    const list = isEdit ? editStudySessions : studySessions;
    if (list.length <= 1) return;
    const updated = list
      .filter((_, i) => i !== index)
      .map((s, idx) => ({
        ...s,
        sessionNumber: idx + 1,
      }));
    if (isEdit) {
      setEditStudySessions(updated);
    } else {
      setStudySessions(updated);
    }
  };

  const handleUpdateSession = (
    index: number,
    field: keyof StudySessionProtocol,
    value: any,
    isEdit: boolean
  ) => {
    const list = isEdit ? editStudySessions : studySessions;
    const updated = list.map((s, idx) => {
      if (idx !== index) return s;
      return { ...s, [field]: value };
    });
    if (isEdit) {
      setEditStudySessions(updated);
    } else {
      setStudySessions(updated);
    }
  };

  const handleUpdateFormTarget = (
    id: string,
    field: keyof FormTargetProtocol,
    value: any,
    isEdit: boolean
  ) => {
    const list = isEdit ? editFormTargets : formTargets;
    const updated = list.map((f) => {
      if (f.id !== id) return f;
      return { ...f, [field]: value };
    });
    if (isEdit) {
      setEditFormTargets(updated);
    } else {
      setFormTargets(updated);
    }
  };

  // Modal de exclusão de projeto (Exclusivo para ADMIN)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setEditTab('GENERAL');
    setEditProjectName(p.name);
    setEditProjectDesc(p.description || '');
    setEditProjectStatus(
      p.status === 'COMPLETED' ? 'COMPLETED' : p.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE'
    );

    let tpl: any = {};
    if (p.anamnesisTemplate) {
      try {
        tpl = typeof p.anamnesisTemplate === 'string' ? JSON.parse(p.anamnesisTemplate) : p.anamnesisTemplate;
      } catch (e) {}
    }

    setEditEnableOdontogram(tpl.enableOdontogram !== false);
    setEditOdontogramScope(tpl.odontogramScope || 'anterior');
    setEditEnablePeriodontogram(Boolean(tpl.enablePeriodontogram));
    setEditEnableAnamnesis(tpl.enableAnamnesis !== false);

    const protocol = parseStudyProtocol(p.anamnesisTemplate);
    setEditStudySessions(protocol.sessions);
    setEditFormTargets(protocol.forms);
    setEditProjectPrefix(protocol.projectPrefix || '');
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectName.trim()) return;

    const targetProject = editingProject;
    const previousProjects = [...projects];

    let existingTemplate: any = {};
    if (targetProject.anamnesisTemplate) {
      try {
        existingTemplate =
          typeof targetProject.anamnesisTemplate === 'string'
            ? JSON.parse(targetProject.anamnesisTemplate)
            : targetProject.anamnesisTemplate;
      } catch (e) {}
    }

    const updatedTemplate = {
      ...existingTemplate,
      enableOdontogram: editEnableOdontogram,
      odontogramScope: editOdontogramScope,
      enablePeriodontogram: editEnablePeriodontogram,
      enableAnamnesis: editEnableAnamnesis,
      studyProtocol: {
        projectPrefix: editProjectPrefix.trim().toUpperCase() || undefined,
        totalSessions: editStudySessions.length,
        sessions: editStudySessions,
        forms: editFormTargets,
      },
    };

    const updatedProjectLocally: Project = {
      ...targetProject,
      name: editProjectName.trim(),
      description: editProjectDesc.trim() || null,
      status: editProjectStatus,
      anamnesisTemplate: updatedTemplate,
    };

    // 1. Resposta imediata em 0 ms: fecha modal e atualiza interface
    setProjects((prev) =>
      prev.map((p) => (p.id === targetProject.id ? { ...p, ...updatedProjectLocally } : p))
    );
    setEditingProject(null);
    setSavingEdit(false);

    // 2. Persiste no cache local de forma atômica
    try {
      const newProjects = projects.map((p) =>
        p.id === targetProject.id ? { ...p, ...updatedProjectLocally } : p
      );
      localStorage.setItem('uepg_cached_projects', JSON.stringify(newProjects));
      if (currentUser?.id) {
        localStorage.setItem(`uepg_cached_projects_${currentUser.id}`, JSON.stringify(newProjects));
      }
    } catch (e) {}

    // 3. Sincronização em segundo plano com o servidor
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/projects/${targetProject.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: editProjectName.trim(),
          description: editProjectDesc.trim() || null,
          status: editProjectStatus,
          anamnesisTemplate: updatedTemplate,
        }),
      });

      if (!res.ok) {
        // Reverte se houve erro do servidor
        setProjects(previousProjects);
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erro ao salvar alterações do projeto.');
      }
    } catch (err) {
      console.error('Erro ao atualizar projeto em segundo plano:', err);
      setProjects(previousProjects);
      alert('Erro de conexão ao salvar alterações do projeto.');
    }
  };

  // Exclusão definitiva de projeto por ADMIN
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      setDeletingProject(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // Remove do estado e do cache
        const remaining = projects.filter((p) => p.id !== projectToDelete.id);
        setProjects(remaining);
        try {
          localStorage.setItem('uepg_cached_projects', JSON.stringify(remaining));
          if (currentUser?.id) {
            localStorage.setItem(`uepg_cached_projects_${currentUser.id}`, JSON.stringify(remaining));
          }
        } catch (e) {}

        setProjectToDelete(null);
        if (editingProject?.id === projectToDelete.id) {
          setEditingProject(null);
        }
      } else {
        setDeleteError(data.error || 'Não foi possível excluir este projeto.');
      }
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
      setDeleteError('Erro de conexão ao tentar excluir o projeto.');
    } finally {
      setDeletingProject(false);
    }
  };

  const fetchWithRetry = async (url: string, timeoutMs: number = 15000, maxRetries: number = 1): Promise<Response> => {
    let lastError: any = null;
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
    const reqHeaders: Record<string, string> = {
      'Cache-Control': 'no-cache',
    };
    if (authToken) {
      reqHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include',
          headers: reqHeaders,
        });
        clearTimeout(timer);
        if (!res.ok && res.status >= 500 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
    }
    throw lastError;
  };

  const loadData = async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    setLoadError(null);

    try {
      const res = await fetchWithRetry('/api/projects', 35000, 2);

      // Se a sessão expirou, redireciona para o login
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('uepg_auth_token');
          localStorage.removeItem('uepg_cached_user');
          localStorage.removeItem('uepg_cached_projects');
          window.location.href = '/login?from=/';
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const projectList = data.projects || [];
        setProjects(projectList);
        setCurrentUser(data.currentUser || null);

        // Salva no cache local particionado pelo ID do usuário autenticado
        try {
          if (data.currentUser?.id) {
            localStorage.setItem(`uepg_cached_projects_${data.currentUser.id}`, JSON.stringify(projectList));
            localStorage.setItem('uepg_cached_user', JSON.stringify(data.currentUser));
          }
          localStorage.setItem('uepg_cached_projects', JSON.stringify(projectList));
        } catch (e) {}

        setLoading(false);

        // Se for admin, carrega aprovações em segundo plano
        if (data.currentUser?.role === 'ADMIN') {
          const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
          fetch('/api/admin/users', {
            credentials: 'include',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((uData) => {
              if (uData?.users) {
                const pending = uData.users.filter((u: any) => !u.isApproved);
                setPendingUsers(pending);
              }
            })
            .catch(() => {});
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setLoadError(errData.error || 'Não foi possível carregar os dados mais recentes do servidor.');
      }
    } catch (e: any) {
      console.error('Erro ao carregar projetos:', e);
      if (e.name === 'AbortError') {
        setLoadError('A conexão com o banco de dados demorou para responder. Clique para tentar novamente.');
      } else {
        setLoadError('Não foi possível conectar ao banco de dados no momento.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. Interceptar e registrar auth_token da URL caso tenha vindo do redirecionamento do login
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('auth_token');
        if (urlToken) {
          localStorage.setItem('uepg_auth_token', urlToken);
          const isHttps = window.location.protocol === 'https:';
          const secureFlag = isHttps ? '; Secure; SameSite=None' : '; SameSite=Lax';
          document.cookie = `auth_session=${urlToken}; path=/; max-age=604800${secureFlag}`;
          document.cookie = `auth_token_client=${urlToken}; path=/; max-age=604800${secureFlag}`;
          urlParams.delete('auth_token');
          const cleanQuery = urlParams.toString();
          const cleanPath = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '');
          window.history.replaceState({}, '', cleanPath);
        }
      } catch (e) {}
    }

    // 2. Carregamento seguro particionado por usuário via Cache Local
    if (typeof window !== 'undefined') {
      try {
        const cachedUserStr = localStorage.getItem('uepg_cached_user');
        const cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
        if (cachedUser) {
          setCurrentUser(cachedUser);
          const userKey = `uepg_cached_projects_${cachedUser.id}`;
          const cached = localStorage.getItem(userKey) || localStorage.getItem('uepg_cached_projects');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Verificação defensiva de segurança: garante que pesquisadores não vejam projetos alheios em hipótese alguma
              const isUserAdmin = cachedUser.role === 'ADMIN' || cachedUser.email === 'admin@uepg.br';
              const validProjects = isUserAdmin
                ? parsed
                : parsed.filter((p: Project) =>
                    p.members?.some((m) => m.user?.id === cachedUser.id || (m as any).userId === cachedUser.id)
                  );
              if (validProjects.length > 0) {
                setProjects(validProjects);
                setLoading(false);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao ler cache local de projetos:', e);
      }
    }

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
        studyProtocol: {
          projectPrefix: newProjectPrefix.trim().toUpperCase() || undefined,
          totalSessions: studySessions.length,
          sessions: studySessions,
          forms: formTargets,
        },
      };

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          status: newProjectStatus,
          anamnesisTemplate: initialTemplate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsCreateModalOpen(false);
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectPrefix('');
        setNewProjectStatus('ACTIVE');
        if (data.project?.id) {
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
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ userId, isApproved: true }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Erro ao aprovar usuário:', err);
    }
  };

  // Estatísticas de contagem por status
  const counts = useMemo(() => {
    const total = projects.length;
    let active = 0;
    let completed = 0;
    let cancelled = 0;

    for (const p of projects) {
      const st = p.status || 'ACTIVE';
      if (st === 'ACTIVE') active++;
      else if (st === 'COMPLETED') completed++;
      else if (st === 'CANCELLED') cancelled++;
    }

    return { total, active, completed, cancelled };
  }, [projects]);

  // Filtragem combinada por Status e Busca
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const projectStatus = project.status || 'ACTIVE';

      // Filtro de status
      if (statusFilter !== 'ALL' && projectStatus !== statusFilter) {
        return false;
      }

      // Filtro de busca textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = project.name.toLowerCase().includes(query);
        const matchDesc = (project.description || '').toLowerCase().includes(query);
        if (!matchName && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Conteúdo Principal */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
        {/* Painel do Administrador: Aprovações Pendentes */}
        {currentUser?.role === 'ADMIN' && pendingUsers.length > 0 && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-xs">
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
                <div
                  key={u.id}
                  className="bg-white p-4 rounded-xl border border-amber-100 flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <button
                    onClick={() => handleApproveUser(u.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar Acesso</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topo: Título + Botão Novo Projeto */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>Meus Projetos</span>
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing || loading}
                title="Recarregar projetos do banco de dados"
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Selecione uma pesquisa para acessar o prontuário, triagem clínica ou configurar formulários.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow transition flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>

        {/* Barra de Filtros e Busca de Projetos */}
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Abas de Filtros por Status */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Todos</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === 'ALL' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ativos</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === 'ACTIVE' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-200/70 text-emerald-900'
                }`}
              >
                {counts.active}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'COMPLETED'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Finalizados</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === 'COMPLETED' ? 'bg-blue-700 text-blue-100' : 'bg-blue-200/70 text-blue-900'
                }`}
              >
                {counts.completed}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'CANCELLED'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Cancelados</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === 'CANCELLED' ? 'bg-slate-600 text-slate-100' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.cancelled}
              </span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou descrição..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Alerta de Erro de Conexão (quando temos versão em cache) */}
        {loadError && projects.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{loadError} Exibindo versão local em cache.</span>
            </div>
            <button
              onClick={() => loadData(true)}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 font-bold rounded-lg transition shrink-0 cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Estado de Carregamento Inicial (Sem cache) */}
        {loading && projects.length === 0 && (
          <div className="py-20 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Carregando projetos de pesquisa...</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Conectando com segurança ao banco de dados clínico da UEPG.
            </p>
          </div>
        )}

        {/* Estado de Erro Grave (Sem cache e falha) */}
        {!loading && loadError && projects.length === 0 && (
          <div className="py-12 text-center text-slate-700 bg-white rounded-2xl border border-red-200 p-8 shadow-xs max-w-lg mx-auto my-8">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Não foi possível carregar os projetos</h3>
            <p className="text-xs text-slate-500 mb-6">{loadError}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => loadData(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>
              <Link
                href="/login?from=/"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar Novamente</span>
              </Link>
            </div>
          </div>
        )}

        {/* Grid de Projetos */}
        {(projects.length > 0 || (!loading && !loadError)) && (
          <>
            {filteredProjects.length === 0 && projects.length > 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto my-6">
                <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Nenhum projeto encontrado</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Nenhum estudo corresponde aos filtros selecionados. Tente limpar os filtros ou o termo de busca.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => {
                  const myMember = (project.members || []).find(
                    (m) => m.user?.id === currentUser?.id
                  );
                  const roleLabels: Record<string, string> = {
                    COORDINATOR: 'Coordenador',
                    CO_ADVISOR: 'Co-orientador',
                    OPERATOR: 'Operador',
                    EVALUATOR: 'Avaliador',
                  };
                  const roleName = roleLabels[myMember?.role || ''] || 'Pesquisador';
                  const isBlinded = myMember?.isBlinded ?? false;
                  const approvedCount = (project.participants || []).filter((p) => p.status === 'APPROVED').length;
                  const pendingCount = (project.participants || []).filter((p) => p.status === 'PENDING').length;

                  const pStatus = project.status || 'ACTIVE';

                  return (
                    <div key={project.id} className="block group">
                      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 h-full hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4 gap-2">
                            {/* Badge de Status do Projeto */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {pStatus === 'ACTIVE' && (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Ativo</span>
                                </span>
                              )}
                              {pStatus === 'COMPLETED' && (
                                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                  <span>Finalizado</span>
                                </span>
                              )}
                              {pStatus === 'CANCELLED' && (
                                <span className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full flex items-center gap-1">
                                  <X className="w-3 h-3 text-slate-500" />
                                  <span>Cancelado</span>
                                </span>
                              )}
                            </div>

                            {/* Badge do Papel do Usuário */}
                            <div>
                              {isBlinded ? (
                                <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full flex items-center space-x-1">
                                  <EyeOff className="w-3 h-3" />
                                  <span>Avaliador Cego</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                  {roleName}
                                </span>
                              )}
                            </div>
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
                              <span className="text-slate-600">
                                <strong>{approvedCount}</strong> Ativos
                              </span>
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

                          {/* Botões de Acesso Rápido Direto + Botão de Excluir para ADMIN */}
                          <div className="flex items-center gap-2 pt-1 text-xs font-bold">
                            <Link
                              href={`/dashboard?projectId=${project.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-center border border-blue-200 transition flex items-center justify-center space-x-1.5"
                            >
                              <Activity className="w-3.5 h-3.5 text-blue-600" />
                              <span>Prontuário & Atendimento</span>
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(project);
                              }}
                              className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-center border border-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                              title="Configurar particularidades do estudo, Odontograma e eCRF"
                            >
                              <Sliders className="w-3.5 h-3.5 text-slate-600" />
                              <span>Configurar</span>
                            </button>

                            {/* Botão de Excluir Exclusivo para Administrador */}
                            {(currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteError(null);
                                  setProjectToDelete(project);
                                }}
                                title="Excluir Projeto de Pesquisa (Apenas Administrador)"
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Card para Criar Novo Projeto */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-300 p-6 h-full min-h-[200px] hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 group cursor-pointer"
                >
                  <div className="p-4 rounded-full bg-white shadow-2xs group-hover:bg-blue-100 mb-3 transition-colors border border-slate-200">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-700 group-hover:text-blue-600">Criar Novo Projeto</h3>
                  <p className="text-xs text-center text-slate-400 mt-1 max-w-[200px]">
                    Defina os objetivos, cegamento da equipe e formulários do estudo.
                  </p>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Criação de Projeto */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Cadastrar Novo Estudo Clínico</h2>
                <p className="text-xs text-slate-500">
                  Configure os dados gerais, o cronograma de sessões/avaliações e os formulários do protocolo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navegação entre Abas do Modal */}
            <div className="flex border-b border-slate-200 mb-5 gap-1">
              <button
                type="button"
                onClick={() => setCreateTab('GENERAL')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  createTab === 'GENERAL'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📋 1. Dados do Estudo</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateTab('SESSIONS')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  createTab === 'SESSIONS'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>⏱️ 2. Sessões & Consultas ({studySessions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateTab('FORMS')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  createTab === 'FORMS'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📝 3. Formulários & Quem Preenche</span>
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {/* ABA 1: DADOS GERAIS */}
              {createTab === 'GENERAL' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Nome do Projeto / Ensaio Clínico *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Ex: Eficácia de Agentes Dessensibilizantes em Clareamento Dental"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Descrição / Hipótese do Estudo (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="Breve resumo da metodologia, grupos experimentais, critérios e intervenções clínicas..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Status Inicial do Estudo
                    </label>
                    <select
                      value={newProjectStatus}
                      onChange={(e) => setNewProjectStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="ACTIVE">🟢 Em Andamento / Ativo</option>
                      <option value="COMPLETED">🔵 Finalizado / Concluído</option>
                      <option value="CANCELLED">⚪ Cancelado / Interrompido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Prefixo do Código dos Voluntários (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newProjectPrefix}
                      onChange={(e) => setNewProjectPrefix(e.target.value.toUpperCase())}
                      placeholder="Ex: P01, EXP, CLAR (Padrão automático: P01, P02...)"
                      maxLength={8}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Garante códigos únicos para cada paciente (Ex: P01-001, P07-001), eliminando qualquer conflito com outros projetos.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Estrutura do Protocolo Personalizado:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Este estudo está pré-configurado com <strong>{studySessions.length} sessões/consultas clínicas</strong> e{' '}
                      <strong>{formTargets.filter((f) => f.enabled).length} formulários ativos</strong>. Você pode personalizar o número de consultas, o tempo de atendimento e quem responde cada questionário nas abas acima.
                    </p>
                  </div>
                </div>
              )}

              {/* ABA 2: SESSÕES & AVALIAÇÕES CLÍNICAS */}
              {createTab === 'SESSIONS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cronograma de Consultas e Avaliações Clínicas</span>
                      </h4>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Defina quantas consultas serão realizadas, o intervalo de dias entre elas e a duração estimada.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSession(false)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Sessão</span>
                    </button>
                  </div>

                  {/* Seleção rápida de quantidade */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 font-bold text-[11px]">Quantidade rápida:</span>
                    {[1, 2, 3, 4, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          const presets = DEFAULT_STUDY_SESSIONS.slice(0, count);
                          while (presets.length < count) {
                            const num = presets.length + 1;
                            presets.push({
                              id: `sess_${Date.now()}_${num}`,
                              sessionNumber: num,
                              name: `Sessão ${num}: Avaliação Clínica / Retorno`,
                              type: 'EVALUATION',
                              daysFromPrevious: 7,
                              durationMinutes: 30,
                              toleranceDays: 2,
                            });
                          }
                          setStudySessions(presets);
                        }}
                        className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                          studySessions.length === count
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {count} {count === 1 ? 'Sessão' : 'Sessões'}
                      </button>
                    ))}
                  </div>

                  {/* Lista de cards de cada sessão */}
                  <div className="space-y-3">
                    {studySessions.map((s, idx) => (
                      <div key={s.id || idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                              Sessão {s.sessionNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {s.sessionNumber === 1
                                ? 'Linha de Base / 1º Atendimento'
                                : `Retorno (${s.daysFromPrevious} dias após a sessão anterior)`}
                            </span>
                          </div>
                          {studySessions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSession(idx, false)}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Remover esta sessão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Nome / Identificação da Sessão
                            </label>
                            <input
                              type="text"
                              value={s.name}
                              onChange={(e) => handleUpdateSession(idx, 'name', e.target.value, false)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Tipo de Atendimento Clínico
                            </label>
                            <select
                              value={s.type}
                              onChange={(e) => handleUpdateSession(idx, 'type', e.target.value as any, false)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="CLINICAL">🩺 Intervenção Clínica / Aplicação</option>
                              <option value="EVALUATION">🔍 Avaliação Clínica / Exame</option>
                              <option value="FOLLOW_UP">🔄 Consulta de Retorno / Follow-up</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Tempo / Duração Estimada da Consulta</span>
                            </label>
                            <select
                              value={s.durationMinutes}
                              onChange={(e) => handleUpdateSession(idx, 'durationMinutes', Number(e.target.value), false)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                            >
                              <option value={15}>15 minutos (Consulta Rápida)</option>
                              <option value={30}>30 minutos (Padrão)</option>
                              <option value={45}>45 minutos</option>
                              <option value={60}>60 minutos (1 hora)</option>
                              <option value={90}>90 minutos (1h 30min)</option>
                              <option value={120}>120 minutos (2 horas)</option>
                            </select>
                          </div>

                          {s.sessionNumber > 1 ? (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>Intervalo Após a Sessão Anterior</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={365}
                                  value={s.daysFromPrevious}
                                  onChange={(e) => handleUpdateSession(idx, 'daysFromPrevious', Math.max(1, Number(e.target.value)), false)}
                                  className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-600 font-medium">dias (tolerância: ±{s.toleranceDays || 2}d)</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-end text-xs text-slate-500 pb-1.5 font-medium">
                              <span>Início do estudo (Dia 0 / Linha de base)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA 3: FORMULÁRIOS & QUEM PREENCHE */}
              {createTab === 'FORMS' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                    <h4 className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Formulários: Quem Preenche e Frequência</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Escolha se cada instrumento será preenchido pelo <strong>Pesquisador</strong> (eCRF) ou pelo <strong>Paciente</strong> (PROMs no celular), e com qual periodicidade.
                    </p>
                  </div>

                  {/* Instrumentos Clínicos do Pesquisador */}
                  <div className="space-y-2.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Instrumentos Clínicos da Equipe de Pesquisa
                    </h5>

                    {/* Odontograma */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={enableOdontogram}
                            onChange={(e) => setEnableOdontogram(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span>Odontograma Clínico Anatômico</span>
                        </label>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          🩺 Preenchido pelo Pesquisador
                        </span>
                      </div>
                      {enableOdontogram && (
                        <div className="pl-6 flex items-center gap-4 text-[11px] text-slate-600">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="odontogramScopeModal"
                              value="anterior"
                              checked={odontogramScope === 'anterior'}
                              onChange={() => setOdontogramScope('anterior')}
                            />
                            <span>Dentes Anteriores (13 a 23 e 33 a 43)</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
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
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={enablePeriodontogram}
                          onChange={(e) => setEnablePeriodontogram(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>Exame Periodontal (Periograma - SS / IPV)</span>
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        🩺 Preenchido pelo Pesquisador
                      </span>
                    </div>

                    {/* Anamnese */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={enableAnamnesis}
                          onChange={(e) => setEnableAnamnesis(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>Ficha Clínica & Critérios de Inclusão/Exclusão</span>
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        🩺 Preenchido pelo Pesquisador
                      </span>
                    </div>
                  </div>

                  {/* Questionários Validados e Avaliações de Pacientes (PROMs) */}
                  <div className="pt-2 space-y-2.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Questionários de Desfecho & Avaliação do Paciente (PROMs)
                    </h5>

                    <div className="space-y-3">
                      {formTargets.map((f) => (
                        <div
                          key={f.id}
                          className={`p-3 rounded-xl border transition ${
                            f.enabled
                              ? 'border-blue-300 bg-blue-50/30'
                              : 'border-slate-200 bg-slate-50/40 opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={f.enabled}
                                onChange={(e) => handleUpdateFormTarget(f.id, 'enabled', e.target.checked, false)}
                                className="w-4 h-4 text-blue-600 rounded mt-0.5 shrink-0"
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{f.title}</span>
                                <span className="text-[11px] text-slate-500 block leading-tight">{f.description}</span>
                              </div>
                            </label>
                          </div>

                          {f.enabled && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Quem Preenche */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Quem responde este questionário?
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateFormTarget(f.id, 'respondent', 'PATIENT', false)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                                      f.respondent === 'PATIENT'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>👤 Paciente (Celular)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateFormTarget(f.id, 'respondent', 'RESEARCHER', false)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                                      f.respondent === 'RESEARCHER'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>🩺 Pesquisador</span>
                                  </button>
                                </div>
                              </div>

                              {/* Frequência de Preenchimento */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Frequência de preenchimento
                                </label>
                                <select
                                  value={f.frequency}
                                  onChange={(e) => handleUpdateFormTarget(f.id, 'frequency', e.target.value as any, false)}
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                                >
                                  {f.respondent === 'PATIENT' ? (
                                    <>
                                      <option value="DAILY">🟢 Todos os dias (Diário — ex: dor/sensibilidade)</option>
                                      <option value="WEEKLY">🔵 1 vez por semana</option>
                                      <option value="BIWEEKLY">🟡 A cada 15 dias</option>
                                      <option value="PER_SESSION">🟣 A cada sessão clínica (no retorno)</option>
                                      <option value="ONCE">⚪ Única vez (Pontual / Admissão / Final)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="PER_SESSION">🏥 A cada sessão clínica</option>
                                      <option value="ONCE">🏥 Na 1ª sessão (Linha de base)</option>
                                      <option value="WEEKLY">🏥 1 vez por semana</option>
                                      <option value="DAILY">🏥 Diariamente</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* RODAPÉ DO MODAL */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  {createTab === 'GENERAL' && (
                    <button
                      type="button"
                      onClick={() => setCreateTab('SESSIONS')}
                      className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Avançar: Sessões Clínicas</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {createTab === 'SESSIONS' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCreateTab('GENERAL')}
                        className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateTab('FORMS')}
                        className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Avançar: Formulários</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {createTab === 'FORMS' && (
                    <button
                      type="button"
                      onClick={() => setCreateTab('SESSIONS')}
                      className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      ← Voltar
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{creating ? 'Criando Projeto...' : 'Criar Estudo & Salvar Protocolo'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração / Edição de Estudo Existente */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Configurar Protocolo do Estudo</h2>
                <p className="text-xs text-slate-500">
                  Ajuste o cronograma de sessões clínicas, tempo de consulta e quem preenche cada formulário.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navegação entre Abas do Modal */}
            <div className="flex border-b border-slate-200 mb-5 gap-1">
              <button
                type="button"
                onClick={() => setEditTab('GENERAL')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'GENERAL'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📋 1. Dados do Estudo</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('SESSIONS')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'SESSIONS'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>⏱️ 2. Sessões & Consultas ({editStudySessions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('FORMS')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'FORMS'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📝 3. Formulários & Quem Preenche</span>
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-4">
              {/* ABA 1: DADOS DO ESTUDO */}
              {editTab === 'GENERAL' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Nome do Estudo *
                    </label>
                    <input
                      type="text"
                      required
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Descrição / Hipótese (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={editProjectDesc}
                      onChange={(e) => setEditProjectDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Status do Projeto */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Status do Estudo
                    </label>
                    <select
                      value={editProjectStatus}
                      onChange={(e) => setEditProjectStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="ACTIVE">🟢 Em Andamento / Ativo</option>
                      <option value="COMPLETED">🔵 Finalizado / Concluído</option>
                      <option value="CANCELLED">⚪ Cancelado / Interrompido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Prefixo do Código dos Voluntários (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editProjectPrefix}
                      onChange={(e) => setEditProjectPrefix(e.target.value.toUpperCase())}
                      placeholder="Ex: P01, EXP, CLAR (Padrão automático: P01, P02...)"
                      maxLength={8}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Garante códigos únicos para cada paciente (Ex: P01-001, P07-001), eliminando qualquer conflito com outros projetos.
                    </p>
                  </div>

                  {/* Ações Específicas dos Instrumentos */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Editores Especializados deste Estudo
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <Link
                        href={`/anamnese?projectId=${editingProject.id}`}
                        className="p-2.5 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-blue-900 font-semibold transition flex items-center justify-between"
                      >
                        <span>Editar Perguntas & Critérios</span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                      </Link>

                      <Link
                        href={`/construtor?projectId=${editingProject.id}`}
                        className="p-2.5 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl text-indigo-900 font-semibold transition flex items-center justify-between"
                      >
                        <span>Construtor de eCRFs</span>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                      </Link>
                    </div>
                  </div>

                  {/* Opção de Exclusão para Administrador */}
                  {(currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br') && (
                    <div className="pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setProjectToDelete(editingProject);
                        }}
                        className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span>Excluir Este Projeto Definitivamente (Admin)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: SESSÕES & AVALIAÇÕES CLÍNICAS */}
              {editTab === 'SESSIONS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cronograma de Consultas e Avaliações Clínicas</span>
                      </h4>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Defina quantas consultas serão realizadas, o intervalo de dias entre elas e a duração estimada.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSession(true)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Sessão</span>
                    </button>
                  </div>

                  {/* Seleção rápida de quantidade */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 font-bold text-[11px]">Quantidade rápida:</span>
                    {[1, 2, 3, 4, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          const presets = DEFAULT_STUDY_SESSIONS.slice(0, count);
                          while (presets.length < count) {
                            const num = presets.length + 1;
                            presets.push({
                              id: `sess_${Date.now()}_${num}`,
                              sessionNumber: num,
                              name: `Sessão ${num}: Avaliação Clínica / Retorno`,
                              type: 'EVALUATION',
                              daysFromPrevious: 7,
                              durationMinutes: 30,
                              toleranceDays: 2,
                            });
                          }
                          setEditStudySessions(presets);
                        }}
                        className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                          editStudySessions.length === count
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {count} {count === 1 ? 'Sessão' : 'Sessões'}
                      </button>
                    ))}
                  </div>

                  {/* Lista de cards de cada sessão */}
                  <div className="space-y-3">
                    {editStudySessions.map((s, idx) => (
                      <div key={s.id || idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                              Sessão {s.sessionNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {s.sessionNumber === 1
                                ? 'Linha de Base / 1º Atendimento'
                                : `Retorno (${s.daysFromPrevious} dias após a sessão anterior)`}
                            </span>
                          </div>
                          {editStudySessions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSession(idx, true)}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Remover esta sessão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Nome / Identificação da Sessão
                            </label>
                            <input
                              type="text"
                              value={s.name}
                              onChange={(e) => handleUpdateSession(idx, 'name', e.target.value, true)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Tipo de Atendimento Clínico
                            </label>
                            <select
                              value={s.type}
                              onChange={(e) => handleUpdateSession(idx, 'type', e.target.value as any, true)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="CLINICAL">🩺 Intervenção Clínica / Aplicação</option>
                              <option value="EVALUATION">🔍 Avaliação Clínica / Exame</option>
                              <option value="FOLLOW_UP">🔄 Consulta de Retorno / Follow-up</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Tempo / Duração Estimada da Consulta</span>
                            </label>
                            <select
                              value={s.durationMinutes}
                              onChange={(e) => handleUpdateSession(idx, 'durationMinutes', Number(e.target.value), true)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                            >
                              <option value={15}>15 minutos (Consulta Rápida)</option>
                              <option value={30}>30 minutos (Padrão)</option>
                              <option value={45}>45 minutos</option>
                              <option value={60}>60 minutos (1 hora)</option>
                              <option value={90}>90 minutos (1h 30min)</option>
                              <option value={120}>120 minutos (2 horas)</option>
                            </select>
                          </div>

                          {s.sessionNumber > 1 ? (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>Intervalo Após a Sessão Anterior</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={365}
                                  value={s.daysFromPrevious}
                                  onChange={(e) => handleUpdateSession(idx, 'daysFromPrevious', Math.max(1, Number(e.target.value)), true)}
                                  className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-600 font-medium">dias (tolerância: ±{s.toleranceDays || 2}d)</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-end text-xs text-slate-500 pb-1.5 font-medium">
                              <span>Início do estudo (Dia 0 / Linha de base)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA 3: FORMULÁRIOS & QUEM PREENCHE */}
              {editTab === 'FORMS' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                    <h4 className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Formulários: Quem Preenche e Frequência</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Escolha se cada instrumento será preenchido pelo <strong>Pesquisador</strong> (eCRF) ou pelo <strong>Paciente</strong> (PROMs no celular), e com qual periodicidade.
                    </p>
                  </div>

                  {/* Instrumentos Clínicos do Pesquisador */}
                  <div className="space-y-2.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Instrumentos Clínicos da Equipe de Pesquisa
                    </h5>

                    {/* Odontograma */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={editEnableOdontogram}
                            onChange={(e) => setEditEnableOdontogram(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span>Odontograma Clínico Anatômico</span>
                        </label>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          🩺 Preenchido pelo Pesquisador
                        </span>
                      </div>
                      {editEnableOdontogram && (
                        <div className="pl-6 flex items-center gap-4 text-[11px] text-slate-600">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="editOdontogramScope"
                              value="anterior"
                              checked={editOdontogramScope === 'anterior'}
                              onChange={() => setEditOdontogramScope('anterior')}
                            />
                            <span>Dentes Anteriores (13 a 23 e 33 a 43)</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="editOdontogramScope"
                              value="full"
                              checked={editOdontogramScope === 'full'}
                              onChange={() => setEditOdontogramScope('full')}
                            />
                            <span>Arcada Completa</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Periograma */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={editEnablePeriodontogram}
                          onChange={(e) => setEditEnablePeriodontogram(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>Exame Periodontal (Periograma - SS / IPV)</span>
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        🩺 Preenchido pelo Pesquisador
                      </span>
                    </div>

                    {/* Anamnese */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={editEnableAnamnesis}
                          onChange={(e) => setEditEnableAnamnesis(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>Ficha Clínica & Critérios de Inclusão/Exclusão</span>
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        🩺 Preenchido pelo Pesquisador
                      </span>
                    </div>
                  </div>

                  {/* Questionários Validados e Avaliações de Pacientes (PROMs) */}
                  <div className="pt-2 space-y-2.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Questionários de Desfecho & Avaliação do Paciente (PROMs)
                    </h5>

                    <div className="space-y-3">
                      {editFormTargets.map((f) => (
                        <div
                          key={f.id}
                          className={`p-3 rounded-xl border transition ${
                            f.enabled
                              ? 'border-blue-300 bg-blue-50/30'
                              : 'border-slate-200 bg-slate-50/40 opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={f.enabled}
                                onChange={(e) => handleUpdateFormTarget(f.id, 'enabled', e.target.checked, true)}
                                className="w-4 h-4 text-blue-600 rounded mt-0.5 shrink-0"
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{f.title}</span>
                                <span className="text-[11px] text-slate-500 block leading-tight">{f.description}</span>
                              </div>
                            </label>
                          </div>

                          {f.enabled && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Quem Preenche */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Quem responde este questionário?
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateFormTarget(f.id, 'respondent', 'PATIENT', true)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                                      f.respondent === 'PATIENT'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>👤 Paciente (Celular)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateFormTarget(f.id, 'respondent', 'RESEARCHER', true)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                                      f.respondent === 'RESEARCHER'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>🩺 Pesquisador</span>
                                  </button>
                                </div>
                              </div>

                              {/* Frequência de Preenchimento */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Frequência de preenchimento
                                </label>
                                <select
                                  value={f.frequency}
                                  onChange={(e) => handleUpdateFormTarget(f.id, 'frequency', e.target.value as any, true)}
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                                >
                                  {f.respondent === 'PATIENT' ? (
                                    <>
                                      <option value="DAILY">🟢 Todos os dias (Diário — ex: dor/sensibilidade)</option>
                                      <option value="WEEKLY">🔵 1 vez por semana</option>
                                      <option value="BIWEEKLY">🟡 A cada 15 dias</option>
                                      <option value="PER_SESSION">🟣 A cada sessão clínica (no retorno)</option>
                                      <option value="ONCE">⚪ Única vez (Pontual / Admissão / Final)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="PER_SESSION">🏥 A cada sessão clínica</option>
                                      <option value="ONCE">🏥 Na 1ª sessão (Linha de base)</option>
                                      <option value="WEEKLY">🏥 1 vez por semana</option>
                                      <option value="DAILY">🏥 Diariamente</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* RODAPÉ DO MODAL */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  {editTab === 'GENERAL' && (
                    <button
                      type="button"
                      onClick={() => setEditTab('SESSIONS')}
                      className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Avançar: Sessões Clínicas</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {editTab === 'SESSIONS' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditTab('GENERAL')}
                        className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditTab('FORMS')}
                        className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Avançar: Formulários</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {editTab === 'FORMS' && (
                    <button
                      type="button"
                      onClick={() => setEditTab('SESSIONS')}
                      className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      ← Voltar
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{savingEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Projeto (Exclusivo para ADMIN) */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-200">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Excluir Projeto de Pesquisa</h2>
                <p className="text-xs text-red-600 font-semibold">Ação Restrita ao Administrador</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Estudo a ser excluído:</p>
                <p className="text-sm font-bold text-slate-900">{projectToDelete.name}</p>
                {projectToDelete.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{projectToDelete.description}</p>
                )}
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1 text-red-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Atenção: Esta ação é definitiva e irreversível!</span>
                </p>
                <p className="text-[11px] text-red-700 leading-relaxed">
                  Todos os dados vinculados a este projeto serão permanentemente apagados do banco de dados:
                </p>
                <ul className="list-disc pl-4 text-[11px] text-red-700 space-y-0.5 pt-1">
                  <li>Formulários eCRF e todas as respostas coletadas</li>
                  <li>Termos de Consentimento (TCLE) e assinaturas digitais</li>
                  <li>Registros clínicos de voluntários, odontogramas e sessões</li>
                  <li>Alertas de sensibilidade e trilhas de auditoria</li>
                </ul>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs font-semibold">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingProject}
                onClick={() => {
                  setProjectToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingProject}
                onClick={handleDeleteProject}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                {deletingProject ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo Estudo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
