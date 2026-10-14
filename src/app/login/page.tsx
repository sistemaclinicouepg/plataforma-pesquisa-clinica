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
} from 'lucide-react';


export default function LoginPage() {
  const router = useRouter();
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.isPendingApproval) {
          setIsPendingApproval(true);
        }
        throw new Error(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }

      // Salva os dados do usuário e token nos storages locais para resiliência máxima
      if (typeof window !== 'undefined') {
        try {
          if (data.user) {
            localStorage.setItem('uepg_cached_user', JSON.stringify(data.user));
          }
          if (data.token) {
            localStorage.setItem('uepg_auth_token', data.token);
            document.cookie = `auth_session=${data.token}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `auth_token_client=${data.token}; path=/; max-age=604800; SameSite=Lax`;
          }
        } catch (e) {}
      }

      // Redireciona para o destino solicitado ou para a página inicial de Projetos
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const fromParam = urlParams?.get('from');
      const targetPath = fromParam && fromParam !== '/login' ? (fromParam === '/projetos' ? '/' : fromParam) : '/';

      // Inclui token na query como fallback seguro para navegadores com cookies bloqueados em iframes
      const separator = targetPath.includes('?') ? '&' : '?';
      const safeTargetPath = data.token ? `${targetPath}${separator}auth_token=${encodeURIComponent(data.token)}` : targetPath;

      if (typeof window !== 'undefined') {
        window.location.href = safeTargetPath;
      } else {
        router.push(targetPath);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro.');
    } finally {
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
    <div className="min-h-screen bg-slate-50/80 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      
      {/* Cabeçalho Institucional da Tela de Login */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold shadow-2xs mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>UEPG • Pós-Graduação em Odontologia Clínica</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Acesso ao Sistema Clínico
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {isRequestingAccess
            ? 'Cadastre-se para participar como pesquisador ou avaliador de ensaios clínicos.'
            : 'Entre com sua conta individual para gerenciar prontuários e pesquisas.'}
        </p>
      </div>

      {/* Cartão de Autenticação */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-3xl sm:px-10 border border-slate-200 space-y-6">
          
          {/* Mensagem de Sucesso */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-800 font-semibold space-y-1 animate-fadeIn">
              <p className="font-bold flex items-center space-x-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Solicitação Enviada!</span>
              </p>
              <p>{successMessage}</p>
            </div>
          )}

          {/* Alerta de Aprovação Pendente */}
          {isPendingApproval && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 font-semibold space-y-1 animate-fadeIn">
              <p className="font-bold flex items-center space-x-1.5 text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Conta Aguardando Aprovação</span>
              </p>
              <p>
                Seu cadastro foi registrado com sucesso, mas requer liberação prévia da Coordenação / Administrador do sistema.
              </p>
            </div>
          )}

          {/* Mensagem de Erro */}
          {error && !isPendingApproval && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-2xl text-xs text-red-800 font-bold flex items-center space-x-1.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulário */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRequestingAccess && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dra. Mariana Vasconcelos"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@uepg.br"
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Senha
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center justify-center space-x-2"
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
                    ? 'Validando...'
                    : isRequestingAccess
                    ? 'Enviar Solicitação de Cadastro'
                    : 'Acessar com Minha Conta'}
                </span>
              </button>
            </div>
          </form>

          {/* Alternância entre Login e Cadastro */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRequestingAccess(!isRequestingAccess);
                setError(null);
                setIsPendingApproval(false);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
            >
              {isRequestingAccess
                ? '← Já possui conta? Fazer Login'
                : 'Não tem conta? Solicitar cadastro como pesquisador / aluno →'}
            </button>
          </div>

          {/* Atalhos para Testes e Demonstração */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <KeyRound className="w-3 h-3 text-slate-400" />
                <span>Credenciais de Demonstração:</span>
              </p>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Ativo no Banco Neon
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* Dra. Roberta */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('pesquisadora@uepg.br', '123', true)}
                className="w-full p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/90 text-blue-950 transition flex items-center justify-between text-left group cursor-pointer disabled:opacity-60"
              >
                <div>
                  <div className="font-bold flex items-center space-x-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-700" />
                    <span>Dra. Roberta (Coordenadora de Estudos)</span>
                  </div>
                  <span className="text-[10px] text-blue-700 block mt-0.5">
                    pesquisadora@uepg.br • senha: 123
                  </span>
                </div>
                <span className="text-[10px] bg-blue-600 group-hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-md transition shadow-2xs flex items-center gap-1 shrink-0">
                  {quickLoggingInUser === 'pesquisadora@uepg.br' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <span>Entrar Direto →</span>
                  )}
                </span>
              </button>

              {/* Carlos Eduardo */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('carlos@uepg.br', '123', true)}
                className="w-full p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/90 text-amber-950 transition flex items-center justify-between text-left group cursor-pointer disabled:opacity-60"
              >
                <div>
                  <div className="font-bold flex items-center space-x-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>Carlos Eduardo (Avaliador Cego)</span>
                  </div>
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    carlos@uepg.br • senha: 123
                  </span>
                </div>
                <span className="text-[10px] bg-amber-600 group-hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-md transition shadow-2xs flex items-center gap-1 shrink-0">
                  {quickLoggingInUser === 'carlos@uepg.br' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <span>Entrar Direto →</span>
                  )}
                </span>
              </button>

              {/* Dra. Alessandra */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('admin@uepg.br', 'admin', true)}
                className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-purple-950 transition flex items-center justify-between text-left group cursor-pointer disabled:opacity-60"
              >
                <div>
                  <div className="font-bold flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span>Dra. Alessandra (Administradora Geral)</span>
                  </div>
                  <span className="text-[10px] text-purple-700 block mt-0.5">
                    admin@uepg.br • senha: admin
                  </span>
                </div>
                <span className="text-[10px] bg-purple-600 group-hover:bg-purple-700 text-white font-bold px-2.5 py-1 rounded-md transition shadow-2xs flex items-center gap-1 shrink-0">
                  {quickLoggingInUser === 'admin@uepg.br' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <span>Entrar Direto →</span>
                  )}
                </span>
              </button>

              {/* Lucas Penteado (Pendente) */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('pendente@uepg.br', '123', true)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition flex items-center justify-between text-left group cursor-pointer disabled:opacity-60"
              >
                <div>
                  <div className="font-bold flex items-center space-x-1.5 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lucas Penteado (Pendente de Aprovação)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    pendente@uepg.br • senha: 123 (Bloqueio ético)
                  </span>
                </div>
                <span className="text-[10px] bg-slate-500 group-hover:bg-slate-600 text-white font-bold px-2.5 py-1 rounded-md transition shadow-2xs flex items-center gap-1 shrink-0">
                  {quickLoggingInUser === 'pendente@uepg.br' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Testando...</span>
                    </>
                  ) : (
                    <span>Testar Bloqueio</span>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Link para o Portal do Paciente */}
          <div className="pt-2 text-center border-t border-slate-100">
            <Link
              href="/paciente"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center space-x-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Você é voluntário(a) de uma pesquisa? Acesse o Portal do Paciente →</span>
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
