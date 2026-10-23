'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  ShieldCheck,
  EyeOff,
  Stethoscope,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderKanban,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Lock,
  Eye,
  Check,
  Shield,
} from 'lucide-react';

type ProjectMembership = {
  id: string;
  role: string;
  isBlinded: boolean;
  project: {
    id: string;
    name: string;
    status: string;
  };
};

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
  projects: ProjectMembership[];
};

type AvailableProject = {
  id: string;
  name: string;
  status: string;
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ProjectAssignmentItem = {
  projectId: string;
  role: string;
  isBlinded: boolean;
};

export default function EquipePage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'EVALUATOR' | 'OPERATOR'>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Modais de Administração
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Form Novo Membro
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RESEARCHER',
    isApproved: true,
    projects: [] as ProjectAssignmentItem[],
  });

  // Form Editar Membro
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: 'RESEARCHER',
    isApproved: true,
    password: '',
    projects: [] as ProjectAssignmentItem[],
  });

  // Excluir Membro
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);

  // Linhas expandidas na tabela (padrão compacto unificado)
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

  const toggleExpandUser = (userId: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br';

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.warn('Erro ao verificar autenticação:', e);
    }
  };

  const fetchUsers = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/team', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Falha ao carregar lista de pesquisadores.');
      }
      const data = await res.json();
      setUsers(data.users || []);
      if (data.allProjects) {
        setAvailableProjects(data.allProjects);
      }
    } catch (err: any) {
      console.error('Erro ao buscar equipe:', err);
      setError(err?.message || 'Erro ao conectar ao banco de dados.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers(true);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Estatísticas da equipe
  const stats = useMemo(() => {
    const total = users.length;
    let coordinators = 0;
    let blindEvaluators = 0;
    let operators = 0;

    users.forEach((u) => {
      if (u.role === 'ADMIN' || u.email === 'admin@uepg.br' || u.email === 'pesquisadora@uepg.br') {
        coordinators++;
      }
      if (u.projects.some((p) => p.isBlinded) || u.email === 'carlos@uepg.br') {
        blindEvaluators++;
      }
      if (u.projects.some((p) => p.role === 'OPERATOR') || u.email === 'operador@uepg.br') {
        operators++;
      }
    });

    return { total, coordinators, blindEvaluators, operators };
  }, [users]);

  // Filtro e busca
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.projects.some((p) => p.project.name.toLowerCase().includes(query));

      if (!matchesQuery) return false;

      if (roleFilter === 'ADMIN') {
        return user.role === 'ADMIN' || user.email === 'admin@uepg.br' || user.email === 'pesquisadora@uepg.br';
      }
      if (roleFilter === 'EVALUATOR') {
        return user.projects.some((p) => p.isBlinded) || user.email === 'carlos@uepg.br';
      }
      if (roleFilter === 'OPERATOR') {
        return user.projects.some((p) => p.role === 'OPERATOR') || user.email === 'operador@uepg.br';
      }

      return true;
    });
  }, [users, searchQuery, roleFilter]);

  const roleLabels: Record<string, string> = {
    ADMIN: 'Coordenação Geral',
    COORDINATOR: 'Coordenador',
    CO_ADVISOR: 'Co-orientador',
    EVALUATOR: 'Avaliador Clínico',
    OPERATOR: 'Operador Clínico',
    RESEARCHER: 'Pesquisador',
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (user: UserData) => {
    setEditingUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      password: '',
      projects: user.projects.map((p) => ({
        projectId: p.project.id,
        role: p.role,
        isBlinded: p.isBlinded,
      })),
    });
    setModalFeedback(null);
    setShowEditModal(true);
  };

  // Adicionar Projeto na atribuição (Novo Membro)
  const toggleProjectInNew = (projectId: string) => {
    const exists = newUserForm.projects.find((p) => p.projectId === projectId);
    if (exists) {
      setNewUserForm({
        ...newUserForm,
        projects: newUserForm.projects.filter((p) => p.projectId !== projectId),
      });
    } else {
      setNewUserForm({
        ...newUserForm,
        projects: [...newUserForm.projects, { projectId, role: 'OPERATOR', isBlinded: false }],
      });
    }
  };

  // Atualizar atribuição de projeto (Novo Membro)
  const updateProjectRoleInNew = (projectId: string, role: string, isBlinded: boolean) => {
    setNewUserForm({
      ...newUserForm,
      projects: newUserForm.projects.map((p) =>
        p.projectId === projectId ? { ...p, role, isBlinded } : p
      ),
    });
  };

  // Adicionar/Remover Projeto na atribuição (Edição)
  const toggleProjectInEdit = (projectId: string) => {
    const exists = editUserForm.projects.find((p) => p.projectId === projectId);
    if (exists) {
      setEditUserForm({
        ...editUserForm,
        projects: editUserForm.projects.filter((p) => p.projectId !== projectId),
      });
    } else {
      setEditUserForm({
        ...editUserForm,
        projects: [...editUserForm.projects, { projectId, role: 'OPERATOR', isBlinded: false }],
      });
    }
  };

  // Atualizar atribuição de projeto (Edição)
  const updateProjectRoleInEdit = (projectId: string, role: string, isBlinded: boolean) => {
    setEditUserForm({
      ...editUserForm,
      projects: editUserForm.projects.map((p) =>
        p.projectId === projectId ? { ...p, role, isBlinded } : p
      ),
    });
  };

  // Criar Novo Membro
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalFeedback(null);

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(newUserForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar membro da equipe.');
      }

      setModalFeedback({ type: 'success', text: 'Pesquisador cadastrado com sucesso!' });
      setTimeout(() => {
        setShowNewModal(false);
        setModalFeedback(null);
        setNewUserForm({
          name: '',
          email: '',
          password: '',
          role: 'RESEARCHER',
          isApproved: true,
          projects: [],
        });
        fetchUsers(false);
      }, 700);
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Erro ao cadastrar usuário.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Salvar Edição de Membro
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setModalFeedback(null);

    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          userId: editingUser.id,
          ...editUserForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar dados do membro.');
      }

      setModalFeedback({ type: 'success', text: 'Dados atualizados com sucesso!' });
      setTimeout(() => {
        setShowEditModal(false);
        setModalFeedback(null);
        setEditingUser(null);
        fetchUsers(false);
      }, 700);
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Erro ao atualizar dados.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmar Exclusão de Membro
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setSubmitting(true);
    setModalFeedback(null);

    try {
      const res = await fetch(`/api/team?id=${deletingUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir membro da equipe.');
      }

      setShowDeleteModal(false);
      setDeletingUser(null);
      fetchUsers(false);
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Erro ao excluir membro.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-57px)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Topo Limpo & Apresentação */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Corpo Docente & Pesquisadores Clínicos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span>Equipe de Pesquisa</span>
              <button
                onClick={() => fetchUsers(false)}
                disabled={isRefreshing || loading}
                title="Recarregar pesquisadores"
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </h1>
            <p className="text-slate-500 mt-1 text-xs sm:text-sm">
              Professores orientadores, alunos de pós-graduação, avaliadores cegos e operadores credenciados.
            </p>
          </div>

          {/* Botão de Adição de Membro (Administrador) */}
          {isAdmin && (
            <button
              onClick={() => {
                setModalFeedback(null);
                setShowNewModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 shadow-xs hover:shadow-md cursor-pointer shrink-0"
              title="Cadastrar um novo membro ou orientador na equipe"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Membro</span>
            </button>
          )}
        </div>

        {/* Cards de Métricas da Equipe */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Equipe</p>
              <p className="text-2xl font-black text-slate-900 leading-tight">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Coordenadores</p>
              <p className="text-2xl font-black text-purple-700 leading-tight">{stats.coordinators}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avaliadores Cegos</p>
              <p className="text-2xl font-black text-amber-700 leading-tight">{stats.blindEvaluators}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operadores</p>
              <p className="text-2xl font-black text-emerald-700 leading-tight">{stats.operators}</p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Segmented Control */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 overflow-x-auto">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                roleFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                roleFilter === 'ADMIN'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Coordenadores
            </button>
            <button
              onClick={() => setRoleFilter('EVALUATOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                roleFilter === 'EVALUATOR'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Avaliadores Cegos
            </button>
            <button
              onClick={() => setRoleFilter('OPERATOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                roleFilter === 'OPERATOR'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operadores
            </button>
          </div>

          {/* Caixa de Busca */}
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou estudo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabela de Pesquisadores */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-xs font-semibold text-slate-600">Carregando pesquisadores...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
              <p className="font-bold text-sm">{error}</p>
              <button
                onClick={() => fetchUsers(true)}
                className="mt-3 px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl transition"
              >
                Tentar Novamente
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">Nenhum membro encontrado.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Nenhum membro corresponde aos termos de busca selecionados.'
                  : 'Nenhum pesquisador cadastrado no sistema ainda.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 h-11">
                    <th className="py-3 px-5">Pesquisador</th>
                    <th className="py-3 px-4">Papel Institucional</th>
                    <th className="py-3 px-4">Estudos Atribuídos</th>
                    <th className="py-3 px-4">Status de Cadastro</th>
                    <th className="py-3 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isCoordinator =
                      user.role === 'ADMIN' ||
                      user.email === 'admin@uepg.br' ||
                      user.email === 'pesquisadora@uepg.br';
                    const isBlindEvaluator =
                      user.projects.some((p) => p.isBlinded) || user.email === 'carlos@uepg.br';
                    const isSelf = currentUser?.id === user.id;
                    const isRootAdmin = user.email === 'admin@uepg.br';
                    const isExpanded = expandedUserIds.has(user.id);

                    return (
                      <React.Fragment key={user.id}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                          {/* Pesquisador: Avatar + Nome + E-mail */}
                          <td className="py-3.5 px-5 align-middle">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {getInitials(user.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-start space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandUser(user.id)}
                                    className="font-bold text-slate-900 hover:text-blue-600 text-sm transition text-left flex items-center gap-1.5 group cursor-pointer"
                                    title="Clique para ver os estudos deste pesquisador"
                                  >
                                    <span>{user.name}</span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">
                                        Você
                                      </span>
                                    )}
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform ${
                                        isExpanded ? 'rotate-180 text-blue-600' : ''
                                      }`}
                                    />
                                  </button>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                                  <span className="truncate">{user.email}</span>
                                  {user.projects.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandUser(user.id)}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline"
                                      >
                                        {isExpanded ? 'Ocultar estudos' : 'Ver estudos'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Papel Institucional */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            {isCoordinator ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center space-x-1.5 w-fit">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                <span>Coordenação Geral</span>
                              </span>
                            ) : isBlindEvaluator ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center space-x-1.5 w-fit">
                                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                <span>Avaliador Cego</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center space-x-1.5 w-fit">
                                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                                <span>{roleLabels[user.role] || 'Pesquisador Clínico'}</span>
                              </span>
                            )}
                          </td>

                          {/* Estudos Atribuídos - Padrão Unificado */}
                          <td className="py-3.5 px-4 align-middle">
                            {user.projects.length === 0 ? (
                              <span className="h-8 px-3 rounded-xl text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200/80 inline-flex items-center gap-1.5">
                                <FolderKanban className="w-3.5 h-3.5 text-slate-300" />
                                <span>0 estudos vinculados</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleExpandUser(user.id)}
                                className={`h-8 px-3 rounded-xl text-xs font-semibold border transition flex items-center space-x-2 cursor-pointer shadow-2xs ${
                                  isExpanded
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                                }`}
                                title="Clique para ver todos os estudos deste pesquisador"
                              >
                                <FolderKanban className={`w-3.5 h-3.5 ${isExpanded ? 'text-white' : 'text-blue-600'} shrink-0`} />
                                <span>
                                  <strong>{user.projects.length}</strong> {user.projects.length === 1 ? 'estudo vinculado' : 'estudos vinculados'}
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    isExpanded ? 'rotate-180 text-white' : 'text-slate-400'
                                  }`}
                                />
                              </button>
                            )}
                          </td>

                          {/* Status de Cadastro */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            {user.isApproved ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Credenciado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-amber-700 font-semibold text-xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pendente</span>
                              </span>
                            )}
                          </td>

                          {/* Ações / Contato */}
                          <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end space-x-1.5">
                              {/* E-mail */}
                              <a
                                href={`mailto:${user.email}`}
                                className="h-8 px-2.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1.5 border border-slate-200"
                                title={`Enviar e-mail para ${user.name}`}
                              >
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                <span>E-mail</span>
                              </a>

                              {/* Estudos - Padrão Unificado com Tamanho Fixo */}
                              {user.projects.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandUser(user.id)}
                                  className={`w-[100px] h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between shadow-2xs cursor-pointer border ${
                                    isExpanded
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                  }`}
                                  title={isExpanded ? 'Ocultar estudos' : 'Visualizar estudos atribuídos'}
                                >
                                  <div className="flex items-center space-x-1.5">
                                    <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                                    <span>Estudos</span>
                                  </div>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                      isExpanded ? 'rotate-180 text-white' : 'text-blue-600'
                                    }`}
                                  />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="w-[100px] h-8 px-2.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-not-allowed opacity-60"
                                  title="Sem estudos vinculados"
                                >
                                  <div className="flex items-center space-x-1.5">
                                    <FolderKanban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Estudos</span>
                                  </div>
                                  <div className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              )}

                              {/* Controles de Administração */}
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(user)}
                                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition cursor-pointer"
                                    title="Editar perfil e atribuições deste pesquisador"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSelf || isRootAdmin}
                                    onClick={() => {
                                      setDeletingUser(user);
                                      setModalFeedback(null);
                                      setShowDeleteModal(true);
                                    }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition ${
                                      isSelf || isRootAdmin
                                        ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200 hover:border-red-300 cursor-pointer'
                                    }`}
                                    title={
                                      isSelf
                                        ? 'Você não pode excluir sua própria conta'
                                        : isRootAdmin
                                        ? 'A conta raiz de administração não pode ser excluída'
                                        : 'Excluir pesquisador da equipe'
                                    }
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* LINHA EXPANDIDA: Estudos Atribuídos ao Pesquisador - Menos exagerado, compacto e limpo */}
                        {isExpanded && (
                          <tr className="bg-slate-50/60 border-b border-slate-200">
                            <td colSpan={5} className="px-5 py-3">
                              <div className="space-y-2">
                                {/* Header do Detalhamento - Compacto e direto */}
                                <div className="flex items-center justify-between text-xs pb-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                                      <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Estudos vinculados a {user.name}</span>
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      ({user.projects.length} {user.projects.length === 1 ? 'pesquisa' : 'pesquisas'})
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                    <span>Cadastrado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                </div>

                                {/* Lista Limpa e Compacta de Estudos */}
                                {user.projects.length === 0 ? (
                                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                                    Este pesquisador ainda não está associado a nenhum estudo clínico.
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {user.projects.map((membership) => {
                                      const roleLabel =
                                        membership.role === 'COORDINATOR'
                                          ? 'Coordenador(a)'
                                          : membership.role === 'OPERATOR'
                                          ? 'Operador(a) Clínico'
                                          : membership.role === 'EVALUATOR'
                                          ? 'Avaliador(a)'
                                          : membership.role;

                                      const isProjectActive = membership.project.status === 'ACTIVE';

                                      return (
                                        <div
                                          key={membership.id}
                                          className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                                        >
                                          {/* Esquerda: Papel no estudo, Mascaramento, Status e Nome do Projeto */}
                                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-900 text-white shrink-0">
                                              {roleLabel}
                                            </span>

                                            {membership.isBlinded && (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
                                                <EyeOff className="w-3 h-3 text-amber-600" />
                                                <span>Avaliador Cego</span>
                                              </span>
                                            )}

                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                                isProjectActive
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                                              }`}
                                            >
                                              {isProjectActive ? 'Estudo Ativo' : 'Concluído'}
                                            </span>

                                            <span
                                              className="font-semibold text-slate-800 text-xs truncate max-w-sm sm:max-w-md"
                                              title={membership.project.name}
                                            >
                                              {membership.project.name}
                                            </span>
                                          </div>

                                          {/* Direita: Botão Acessar Estudo */}
                                          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                                            <Link
                                              href={`/dashboard?projectId=${membership.project.id}`}
                                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                                            >
                                              <span>Acessar Estudo</span>
                                              <ChevronRight className="w-3 h-3" />
                                            </Link>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: NOVO MEMBRO DA EQUIPE (Administrador) */}
      {/* ========================================================================= */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Pesquisador</h3>
                  <p className="text-xs text-slate-500">Adicione um docente, avaliador cego ou operador clínico</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center space-x-2 ${
                  modalFeedback.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {modalFeedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Ex: Prof. Dr. João Santos"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail Institucional <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="pesquisador@uepg.br"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Senha Inicial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Papel Institucional</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="RESEARCHER">Pesquisador Clínico</option>
                    <option value="ADMIN">Coordenação Geral / Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status de Cadastro</label>
                  <select
                    value={newUserForm.isApproved ? 'APPROVED' : 'PENDING'}
                    onChange={(e) => setNewUserForm({ ...newUserForm, isApproved: e.target.value === 'APPROVED' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="APPROVED">Credenciado / Liberado</option>
                    <option value="PENDING">Aguardando Aprovação</option>
                  </select>
                </div>
              </div>

              {/* Atribuição de Estudos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Vincular a Estudos Clínicos (Opcional)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {availableProjects.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum estudo cadastrado no sistema.</p>
                  ) : (
                    availableProjects.map((proj) => {
                      const assignment = newUserForm.projects.find((p) => p.projectId === proj.id);
                      const isChecked = !!assignment;

                      return (
                        <div
                          key={proj.id}
                          className={`p-2.5 rounded-lg border transition ${
                            isChecked ? 'bg-indigo-50/70 border-indigo-200' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleProjectInNew(proj.id)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                              />
                              <span className="text-xs font-bold text-slate-800">{proj.name}</span>
                            </label>
                            <span className="text-[10px] text-slate-400">{proj.status}</span>
                          </div>

                          {isChecked && (
                            <div className="mt-2.5 pt-2 border-t border-indigo-100 flex flex-wrap items-center gap-3 text-xs">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[11px] font-semibold text-slate-600">Função:</span>
                                <select
                                  value={assignment.role}
                                  onChange={(e) =>
                                    updateProjectRoleInNew(proj.id, e.target.value, assignment.isBlinded)
                                  }
                                  className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium"
                                >
                                  <option value="OPERATOR">Operador Clínico</option>
                                  <option value="EVALUATOR">Avaliador Clínico</option>
                                  <option value="COORDINATOR">Coordenador do Estudo</option>
                                </select>
                              </div>

                              <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <input
                                  type="checkbox"
                                  checked={assignment.isBlinded}
                                  onChange={(e) =>
                                    updateProjectRoleInNew(proj.id, assignment.role, e.target.checked)
                                  }
                                  className="w-3.5 h-3.5 text-amber-600 rounded"
                                />
                                <span>Avaliador Cego (Mascarado)</span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Salvar Pesquisador</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR MEMBRO DA EQUIPE (Administrador) */}
      {/* ========================================================================= */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Editar Membro da Equipe</h3>
                  <p className="text-xs text-slate-500">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center space-x-2 ${
                  modalFeedback.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {modalFeedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail Institucional <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Redefinir Senha (Opcional)
                  </label>
                  <input
                    type="password"
                    value={editUserForm.password}
                    onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                    placeholder="Preencha apenas para alterar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Papel Institucional</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="RESEARCHER">Pesquisador Clínico</option>
                    <option value="ADMIN">Coordenação Geral / Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status de Cadastro</label>
                  <select
                    value={editUserForm.isApproved ? 'APPROVED' : 'PENDING'}
                    onChange={(e) => setEditUserForm({ ...editUserForm, isApproved: e.target.value === 'APPROVED' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="APPROVED">Credenciado / Liberado</option>
                    <option value="PENDING">Aguardando Aprovação</option>
                  </select>
                </div>
              </div>

              {/* Atribuição de Estudos na Edição */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Estudos Atribuídos e Papéis Clínicos
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {availableProjects.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum estudo cadastrado no sistema.</p>
                  ) : (
                    availableProjects.map((proj) => {
                      const assignment = editUserForm.projects.find((p) => p.projectId === proj.id);
                      const isChecked = !!assignment;

                      return (
                        <div
                          key={proj.id}
                          className={`p-2.5 rounded-lg border transition ${
                            isChecked ? 'bg-indigo-50/70 border-indigo-200' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleProjectInEdit(proj.id)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                              />
                              <span className="text-xs font-bold text-slate-800">{proj.name}</span>
                            </label>
                            <span className="text-[10px] text-slate-400">{proj.status}</span>
                          </div>

                          {isChecked && (
                            <div className="mt-2.5 pt-2 border-t border-indigo-100 flex flex-wrap items-center gap-3 text-xs">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[11px] font-semibold text-slate-600">Função:</span>
                                <select
                                  value={assignment.role}
                                  onChange={(e) =>
                                    updateProjectRoleInEdit(proj.id, e.target.value, assignment.isBlinded)
                                  }
                                  className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium"
                                >
                                  <option value="OPERATOR">Operador Clínico</option>
                                  <option value="EVALUATOR">Avaliador Clínico</option>
                                  <option value="COORDINATOR">Coordenador do Estudo</option>
                                </select>
                              </div>

                              <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <input
                                  type="checkbox"
                                  checked={assignment.isBlinded}
                                  onChange={(e) =>
                                    updateProjectRoleInEdit(proj.id, assignment.role, e.target.checked)
                                  }
                                  className="w-3.5 h-3.5 text-amber-600 rounded"
                                />
                                <span>Avaliador Cego (Mascarado)</span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXCLUIR MEMBRO DA EQUIPE (Administrador) */}
      {/* ========================================================================= */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Remover Pesquisador</h3>
            <p className="text-xs text-slate-600 mt-2">
              Você está prestes a remover o membro <strong>{deletingUser.name}</strong> ({deletingUser.email}) da equipe de pesquisa.
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl my-4 text-xs text-red-800 space-y-1">
              <p className="font-bold">Atenção!</p>
              <p className="text-[11px] text-red-700">
                O acesso deste usuário à plataforma será cancelado e todas as suas vinculações a projetos serão revogadas.
              </p>
            </div>

            {modalFeedback && (
              <div className="p-2.5 rounded-lg mb-3 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                {modalFeedback.text}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
