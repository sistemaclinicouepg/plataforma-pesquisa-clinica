'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  ShieldCheck,
  EyeOff,
  Stethoscope,
  KeyRound,
  Lock,
  Mail,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Eye,
  RefreshCw,
  LogOut,
  ChevronLeft,
  Sparkles,
  Award,
} from 'lucide-react';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
  projects: Array<{
    memberId: string;
    role: string;
    isBlinded: boolean;
    project: {
      id: string;
      name: string;
      description: string | null;
      status: string | null;
      createdAt: string;
      _count: { participants: number };
    };
  }>;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Formulário de Dados Cadastrais
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSuccessMessage, setNameSuccessMessage] = useState<string | null>(null);
  const [nameErrorMessage, setNameErrorMessage] = useState<string | null>(null);

  // Formulário de Troca de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoadError(null);
    try {
      // 1. Tenta carregar do cache para resposta instantânea (0 ms)
      if (typeof window !== 'undefined') {
        const cachedUserStr = localStorage.getItem('uepg_cached_user');
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          if (cachedUser) {
            setProfile((prev) => prev || {
              id: cachedUser.id,
              name: cachedUser.name,
              email: cachedUser.email,
              role: cachedUser.role,
              isApproved: true,
              createdAt: new Date().toISOString(),
              projects: [],
            });
            setName((prev) => prev || cachedUser.name);
          }
        }
      }

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/profile', {
        headers,
        credentials: 'include',
        cache: 'no-store',
      });

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('uepg_auth_token');
          localStorage.removeItem('uepg_cached_user');
          window.location.href = '/login?from=/perfil';
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('uepg_cached_user', JSON.stringify({
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                isApproved: data.user.isApproved,
              }));
            } catch (e) {}
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setLoadError(err.error || 'Não foi possível carregar os dados do perfil.');
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      setLoadError('Erro de conexão ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Salvar Alteração de Nome
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    try {
      setSavingName(true);
      setNameErrorMessage(null);
      setNameSuccessMessage(null);

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar nome.');
      }

      setNameSuccessMessage('Nome atualizado com sucesso no sistema!');
      if (profile) {
        setProfile({ ...profile, name: data.user.name });
      }

      // Atualiza token e cache local
      if (typeof window !== 'undefined') {
        if (data.token) {
          localStorage.setItem('uepg_auth_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('uepg_cached_user', JSON.stringify(data.user));
        }
      }

      setTimeout(() => setNameSuccessMessage(null), 5000);
    } catch (err: any) {
      setNameErrorMessage(err.message || 'Erro ao salvar alterações.');
    } finally {
      setSavingName(false);
    }
  };

  // Salvar Alteração de Senha
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMessage(null);
    setPasswordSuccessMessage(null);

    if (!currentPassword) {
      setPasswordErrorMessage('Informe sua senha atual.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMessage('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('A confirmação não coincide com a nova senha digitada.');
      return;
    }

    try {
      setSavingPassword(true);

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível alterar a senha.');
      }

      setPasswordSuccessMessage('Sua senha foi alterada com sucesso! Guarde-a com segurança.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (typeof window !== 'undefined' && data.token) {
        localStorage.setItem('uepg_auth_token', data.token);
      }

      setTimeout(() => setPasswordSuccessMessage(null), 6000);
    } catch (err: any) {
      setPasswordErrorMessage(err.message || 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('uepg_auth_token');
        localStorage.removeItem('uepg_cached_user');
        localStorage.removeItem('uepg_cached_projects');
        localStorage.removeItem('uepg_cached_last_project');
        localStorage.removeItem('app_active_project_id');
        localStorage.removeItem('app_active_patient_code');
        document.cookie = 'auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'auth_token_client=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const isAdmin = profile?.role === 'ADMIN' || profile?.email === 'admin@uepg.br';
  const isEvaluator = profile?.email === 'carlos@uepg.br';

  const userInitials = profile?.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'P';

  const formattedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '2026';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Barra Superior / Breadcrumb */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-slate-500 hover:text-blue-600 text-xs font-semibold transition flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar aos Projetos</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-800">Meu Perfil de Pesquisador</span>
          </div>

          <button
            onClick={() => fetchProfile()}
            disabled={loading}
            title="Atualizar dados do perfil"
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 max-w-6xl mx-auto">
        {/* Banner de Erro Geral */}
        {loadError && !profile && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-900 shadow-2xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              onClick={() => fetchProfile()}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 font-bold rounded-lg transition"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Card Principal de Identificação do Pesquisador */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/60 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-50/50 rounded-full blur-2xl -z-10 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar com Iniciais */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-sm shrink-0 tracking-wider">
                {userInitials}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {profile?.name || 'Carregando pesquisador...'}
                  </h1>

                  {/* Badge de Função */}
                  {isAdmin ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                      <span>Administrador do Sistema</span>
                    </span>
                  ) : isEvaluator ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                      <span>Avaliador Cego</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-700" />
                      <span>Pesquisador Clínico</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{profile?.email || '...'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cadastrado em {formattedDate}</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Acesso Autorizado UEPG</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              <button
                onClick={handleLogout}
                className="w-full md:w-auto px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grid de Formulários: Dados Cadastrais + Troca de Senha */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          
          {/* Card 1: Alteração de Dados Cadastrais */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Dados Pessoais & Identificação</h2>
                  <p className="text-xs text-slate-500">Atualize seu nome exibido em relatórios e assinaturas clínicas.</p>
                </div>
              </div>

              {nameSuccessMessage && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{nameSuccessMessage}</span>
                </div>
              )}

              {nameErrorMessage && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{nameErrorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateName} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Nome Completo do Pesquisador *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Dra. Roberta Micheten Dias"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Este nome é registrado nas fichas clínicas, logs de auditoria GCP e relatórios ao CEP.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    E-mail Institucional UEPG
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={profile?.email || ''}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed font-medium pr-10"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    O e-mail institucional é fixado pelo login oficial da instituição.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Função no Sistema
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-bold block">
                        {isAdmin ? 'Administrador Geral' : isEvaluator ? 'Avaliador Cego' : 'Pesquisador'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isAdmin
                          ? 'Acesso irrestrito a auditoria, aprovação de usuários e todos os estudos'
                          : 'Acesso às fichas clínicas e projetos em que participa'}
                      </span>
                    </div>
                    <Award className="w-5 h-5 text-blue-600 shrink-0" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingName || !name.trim()}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingName ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Salvando Nome...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salvar Alterações de Dados</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Card 2: Alteração de Senha */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Segurança & Alteração de Senha</h2>
                  <p className="text-xs text-slate-500">Altere sua senha de acesso a qualquer momento.</p>
                </div>
              </div>

              {passwordSuccessMessage && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccessMessage}</span>
                </div>
              )}

              {passwordErrorMessage && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{passwordErrorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
                {/* Senha Atual */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Senha Atual *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual..."
                      className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Nova Senha (Mínimo 6 caracteres) *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha..."
                      className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Confirmar Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha..."
                      className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Critérios Visuais da Senha */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        newPassword.length >= 6
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={newPassword.length >= 6 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      Pelo menos 6 caracteres
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        newPassword && confirmPassword && newPassword === confirmPassword
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={
                        newPassword && confirmPassword && newPassword === confirmPassword
                          ? 'text-emerald-700 font-bold'
                          : 'text-slate-500'
                      }
                    >
                      As duas senhas coincidem exatamente
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      savingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      newPassword.length < 6 ||
                      newPassword !== confirmPassword
                    }
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingPassword ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Atualizando Senha...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Atualizar Senha de Acesso</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
