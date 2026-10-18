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
  UserCheck,
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

export default function EquipePage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'EVALUATOR' | 'OPERATOR'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/team');
      if (!res.ok) {
        throw new Error('Falha ao carregar lista de pesquisadores.');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Erro ao buscar equipe:', err);
      setError(err?.message || 'Erro ao conectar ao banco de dados.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
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
                    <th className="py-3 px-5 text-right">Contato</th>
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

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Pesquisador: Avatar + Nome + E-mail */}
                        <td className="py-3.5 px-5 align-middle">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {getInitials(user.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">{user.name}</p>
                              <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
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

                        {/* Estudos Atribuídos */}
                        <td className="py-3.5 px-4 align-middle">
                          {user.projects.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">Nenhum estudo associado</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {user.projects.map((membership) => (
                                <Link
                                  key={membership.id}
                                  href={`/dashboard?projectId=${membership.project.id}`}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition flex items-center space-x-1"
                                  title={`Ver estudo: ${membership.project.name}`}
                                >
                                  <FolderKanban className="w-3 h-3 text-slate-400" />
                                  <span className="truncate max-w-[150px]">{membership.project.name}</span>
                                </Link>
                              ))}
                            </div>
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
                              <span>Aguardando Aprovação</span>
                            </span>
                          )}
                        </td>

                        {/* Ações / Contato */}
                        <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                          <a
                            href={`mailto:${user.email}`}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold transition inline-flex items-center space-x-1.5 border border-slate-200"
                            title={`Enviar e-mail para ${user.name}`}
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>E-mail</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
