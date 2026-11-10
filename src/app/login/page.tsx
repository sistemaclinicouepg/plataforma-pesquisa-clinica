'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans text-slate-800">
      
      {/* Cabeçalho Institucional */}
      <div className="text-center mb-6 space-y-2 max-w-md">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>Universidade Estadual de Ponta Grossa • UEPG</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Plataforma de Pesquisa Clínica
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Ambiente unificado para gestão de ensaios clínicos odontológicos
        </p>
      </div>

      {/* Cartão de Login Simplificado */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/90 p-6 sm:p-8 space-y-6">
        
        {/* Título do Cartão */}
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Acesso ao Sistema</h2>
            <p className="text-xs text-slate-500">Informe suas credenciais para continuar</p>
          </div>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center space-x-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              E-mail Institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@uepg.br"
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
          </button>
        </form>

        {/* Link para o Portal do Paciente */}
        <div className="pt-4 text-center border-t border-slate-100">
          <Link
            href="/paciente"
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center space-x-1.5 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>É voluntário de um ensaio? Acessar Portal do Paciente →</span>
          </Link>
        </div>

      </div>

      {/* Rodapé */}
      <div className="text-center mt-6 text-xs text-slate-400">
        <span>Programa de Pós-Graduação em Odontologia Clínica • UEPG</span>
      </div>

    </div>
  );
}
