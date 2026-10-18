'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Stethoscope,
  EyeOff,
  ShieldCheck,
  Smartphone,
  KeyRound,
  ArrowRight,
  Mail,
  Lock,
  Loader2,
  Eye,
  User,
  Sparkles,
  Award,
  Database,
  FileSpreadsheet,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quickLoggingInUser, setQuickLoggingInUser] = useState<string | null>(null);

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setIsPendingApproval(false);
    setSuccessMessage(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        if (data.isPendingApproval) {
          setIsPendingApproval(true);
        }
        throw new Error(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }

      // Salva os dados do usuário e token nos storages locais e limpa dados do usuário anterior
      if (typeof window !== 'undefined') {
        try {
          const previousUserStr = localStorage.getItem('uepg_cached_user');
          const previousUser = previousUserStr ? JSON.parse(previousUserStr) : null;

          if (!previousUser || previousUser.id !== data.user?.id) {
            localStorage.removeItem('uepg_cached_projects');
            localStorage.removeItem('uepg_cached_last_project');
            localStorage.removeItem('app_active_project_id');
            localStorage.removeItem('app_active_patient_code');
            localStorage.removeItem('prototipo_active_project_id');
            localStorage.removeItem('prototipo_active_patient_code');

            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('uepg_cached_project_') || key.startsWith('app_active_')) {
                localStorage.removeItem(key);
              }
            });
            Object.keys(sessionStorage).forEach((key) => {
              if (key.startsWith('uepg_tab_')) {
                sessionStorage.removeItem(key);
              }
            });
          }

          if (data.user) {
            localStorage.setItem('uepg_cached_user', JSON.stringify(data.user));
          }
          if (data.token) {
            localStorage.setItem('uepg_auth_token', data.token);
            const isHttps = window.location.protocol === 'https:';
            const secureFlag = isHttps ? '; Secure; SameSite=None' : '; SameSite=Lax';
            document.cookie = `auth_session=${data.token}; path=/; max-age=604800${secureFlag}`;
            document.cookie = `auth_token_client=${data.token}; path=/; max-age=604800${secureFlag}`;
          }
        } catch (e) {}
      }

      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const fromParam = urlParams?.get('from');
      const targetPath = fromParam && fromParam !== '/login' ? (fromParam === '/projetos' ? '/' : fromParam) : '/';

      const separator = targetPath.includes('?') ? '&' : '?';
      const safeTargetPath = data.token ? `${targetPath}${separator}auth_token=${encodeURIComponent(data.token)}` : targetPath;

      window.location.href = safeTargetPath;
      return;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('A conexão com o servidor demorou para responder. Tente novamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro ao processar o login.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setQuickLoggingInUser(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRequestingAccess) {
      setError(null);
      setIsPendingApproval(false);
      setSuccessMessage(null);
      setLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao realizar cadastro.');
        }
        setSuccessMessage(data.message || 'Cadastro realizado! Aguarde a aprovação da Coordenação.');
        setIsRequestingAccess(false);
        setPassword('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro.');
      } finally {
        setLoading(false);
      }
    } else {
      await executeLogin(email, password);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string, autoSubmit: boolean = true) => {
    setIsRequestingAccess(false);
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
    setIsPendingApproval(false);

    if (autoSubmit) {
      setQuickLoggingInUser(quickEmail);
      await executeLogin(quickEmail, quickPass);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-800">
      
      {/* PAINEL ESQUERDO: Identidade Científica & Credibilidade Institucional */}
      <div className="lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Efeitos Decorativos de Luz */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Topo do Painel */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-blue-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Universidade Estadual de Ponta Grossa • UEPG</span>
          </div>

          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <span className="font-black text-2xl tracking-tighter">U</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Plataforma de Ensaios Clínicos Odontológicos
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Ambiente unificado para gerenciamento de estudos clínicos randomizados, prontuário digital com odontograma interativo, avaliação cega e bioestatística.
            </p>
          </div>

          {/* Pilares Científicos do Sistema */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>GCP / ICH E6 (R2)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Trilha de auditoria completa e conformidade ética rigorosa.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                <EyeOff className="w-4 h-4 text-amber-400" />
                <span>Mascaramento Triplo-Cego</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Avaliadores e voluntários protegidos contra viés de intervenção.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
              <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>TCLE Digital SHA-256</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Consentimento com assinatura na tela, hash e conformidade CEP/Conep.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Bioestatística Direta</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Scripts prontos para R, SPSS Syntax, GraphPad Prism e CSV.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do Painel Esquerdo */}
        <div className="relative z-10 pt-8 mt-8 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Programa de Pós-Graduação em Odontologia Clínica</span>
          <span className="font-mono text-[11px] text-emerald-400 font-semibold">Neon DB • Online</span>
        </div>
      </div>

      {/* PAINEL DIREITO: Formulário de Autenticação */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md space-y-6">
          
          {/* Header do Cartão */}
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isRequestingAccess ? 'Solicitar Acesso ao Sistema' : 'Acesse sua Conta'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {isRequestingAccess
                ? 'Preencha seus dados para solicitar cadastro como pesquisador ou avaliador.'
                : 'Insira suas credenciais institucionais para gerenciar os prontuários e estudos.'}
            </p>
          </div>

          {/* Toggle Segmentado: Entrar vs Cadastrar */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsRequestingAccess(false);
                setError(null);
                setIsPendingApproval(false);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRequestingAccess
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Fazer Login
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRequestingAccess(true);
                setError(null);
                setIsPendingApproval(false);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRequestingAccess
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Novo Cadastro
            </button>
          </div>

          {/* Mensagens de Feedback */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-medium space-y-1 animate-fadeIn">
              <p className="font-bold flex items-center space-x-1.5 text-sm text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Solicitação Enviada com Sucesso!</span>
              </p>
              <p>{successMessage}</p>
            </div>
          )}

          {isPendingApproval && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium space-y-1 animate-fadeIn">
              <p className="font-bold flex items-center space-x-1.5 text-sm text-amber-800">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Conta Aguardando Aprovação</span>
              </p>
              <p>
                Seu cadastro foi registrado, mas requer liberação prévia da Coordenação Geral / Administrador.
              </p>
            </div>
          )}

          {error && !isPendingApproval && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulário Principal */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRequestingAccess && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Dra. Mariana Vasconcelos"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus-ring transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pesquisador@uepg.br"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus-ring transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus-ring transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRequestingAccess ? (
                <Mail className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>
                {loading
                  ? 'Autenticando...'
                  : isRequestingAccess
                  ? 'Enviar Solicitação de Cadastro'
                  : 'Acessar com Minha Conta'}
              </span>
            </button>
          </form>

          {/* Atalhos para Perfis de Demonstração & Testes */}
          <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <KeyRound className="w-3 h-3 text-slate-400" />
                <span>Acesso Rápido para Avaliação:</span>
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 font-bold px-2 py-0.5 rounded-md">
                1-Click Demo
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* Coordenadora */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('pesquisadora@uepg.br', '123', true)}
                className="w-full p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-950 transition flex items-center justify-between text-left group cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Stethoscope className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-800 group-hover:text-blue-700 transition">
                      Dra. Roberta (Coordenadora)
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">pesquisadora@uepg.br</p>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-600 group-hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1 shrink-0">
                  {quickLoggingInUser === 'pesquisadora@uepg.br' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>Entrar →</span>
                  )}
                </span>
              </button>

              {/* Avaliador Cego */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('carlos@uepg.br', '123', true)}
                className="w-full p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 text-amber-950 transition flex items-center justify-between text-left group cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <EyeOff className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-800 group-hover:text-amber-700 transition">
                      Carlos Eduardo (Avaliador Cego)
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">carlos@uepg.br</p>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-600 group-hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1 shrink-0">
                  {quickLoggingInUser === 'carlos@uepg.br' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>Entrar →</span>
                  )}
                </span>
              </button>

              {/* Administradora */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('admin@uepg.br', 'admin', true)}
                className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-purple-950 transition flex items-center justify-between text-left group cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-800 group-hover:text-purple-700 transition">
                      Dra. Alessandra (Administradora Geral)
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">admin@uepg.br</p>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-600 group-hover:bg-purple-700 text-white font-bold px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1 shrink-0">
                  {quickLoggingInUser === 'admin@uepg.br' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>Entrar →</span>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Link para o Portal do Paciente */}
          <div className="pt-2 text-center border-t border-slate-200/80">
            <Link
              href="/paciente"
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center space-x-1.5 transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Você é voluntário de um ensaio? Acessar Portal do Paciente →</span>
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
