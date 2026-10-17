'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FolderKanban,
  Activity,
  FileEdit,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  EyeOff,
  Stethoscope,
  LogOut,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
};

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string>('b4360782-3701-4fad-8af4-263f0bd397ba');
  const [activeParticipantCode, setActiveParticipantCode] = useState<string>('P001');

  // Não exibir cabeçalho de pesquisador em telas públicas/paciente ou tela de login dedicada
  const isPublicOrPatientScreen =
    pathname === '/login' ||
    pathname === '/paciente' ||
    pathname.startsWith('/tcle/');

  const fetchAuthUser = async () => {
    // 1. Carregamento instantâneo a partir do cache local
    if (typeof window !== 'undefined') {
      try {
        const cachedUserStr = localStorage.getItem('uepg_cached_user');
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          if (cachedUser) {
            setCurrentUser(cachedUser);
            setLoading(false);
          }
        }
      } catch (e) {}
    }

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || null);
        if (data.user && typeof window !== 'undefined') {
          try {
            localStorage.setItem('uepg_cached_user', JSON.stringify(data.user));
          } catch (e) {}
        }
      } else {
        // Se a resposta não foi ok (ex: 401 não autenticado), limpa o cache de usuário anterior
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('uepg_cached_user');
          localStorage.removeItem('uepg_auth_token');
        }
      }
    } catch {
      // Falha de rede: se não havia cache válido, garante nulo
      if (!localStorage.getItem('uepg_cached_user')) {
        setCurrentUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthUser();

    // Sincronizar projectId ativo
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pId = urlParams.get('projectId');
      const pCode = urlParams.get('code');

      if (pId) {
        setActiveProjectId(pId);
        localStorage.setItem('app_active_project_id', pId);
      } else {
        const saved = localStorage.getItem('app_active_project_id');
        if (saved) setActiveProjectId(saved);
      }

      if (pCode) {
        setActiveParticipantCode(pCode);
        localStorage.setItem('app_active_patient_code', pCode);
      } else {
        const savedCode = localStorage.getItem('app_active_patient_code');
        if (savedCode) setActiveParticipantCode(savedCode);
      }
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        // Limpeza agressiva e completa de qualquer dado ou cache em memória
        localStorage.removeItem('uepg_auth_token');
        localStorage.removeItem('uepg_cached_user');
        localStorage.removeItem('uepg_cached_projects');
        localStorage.removeItem('uepg_cached_last_project');
        localStorage.removeItem('app_active_project_id');
        localStorage.removeItem('app_active_patient_code');
        localStorage.removeItem('prototipo_active_project_id');
        localStorage.removeItem('prototipo_active_patient_code');

        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('uepg_cached_') || key.startsWith('app_active_')) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('uepg_tab_')) {
            sessionStorage.removeItem(key);
          }
        });

        const isHttps = window.location.protocol === 'https:';
        const secureFlag = isHttps ? '; Secure; SameSite=None' : '; SameSite=Lax';
        document.cookie = `auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
        document.cookie = `auth_token_client=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
        document.cookie = 'auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'auth_token_client=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setCurrentUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Erro ao sair:', err);
      window.location.href = '/login';
    }
  };

  // Se estiver na tela de login ou portal do paciente, não renderiza a barra de navegação
  if (isPublicOrPatientScreen) {
    return null;
  }

  // Se estiver em rota protegida e não autenticado
  const isProtectedPath =
    pathname === '/' ||
    pathname.startsWith('/projetos') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/construtor') ||
    pathname.startsWith('/anamnese') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/relatorio-cep');

  if (!loading && !currentUser && isProtectedPath) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
          <span>Acesso Restrito ao Pesquisador: Você não está autenticado.</span>
        </div>
        <Link
          href="/login"
          className="px-3 py-1 bg-white text-amber-900 rounded-lg font-bold shadow-2xs hover:bg-amber-50 transition flex items-center space-x-1"
        >
          <span>Fazer Login</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // Links de navegação baseados na função
  const isEvaluator = currentUser?.email === 'carlos@uepg.br';
  const isAdmin = currentUser?.role === 'ADMIN';

  const navLinks: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roleBadge?: string;
  }> = [
    { href: '/', label: 'Meus Projetos', icon: FolderKanban },
    { href: `/dashboard?projectId=${activeProjectId}`, label: 'Prontuário & Atendimento', icon: Activity },
  ];

  return (
    <header className="bg-white/95 text-slate-800 border-b border-slate-200/90 text-xs sticky top-0 z-40 shadow-xs backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Identificação Oficial do Sistema */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center space-x-2 bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 px-2.5 py-1.5 rounded-lg text-blue-900 font-bold tracking-tight text-xs transition"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide text-[11px] font-black">ODONTO-PESQUISA UEPG</span>
          </Link>

          {/* Links Principais da Aplicação */}
          <nav className="flex flex-wrap items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const linkBase = link.href.split('?')[0];
              const isActive = pathname === linkBase || (link.href === '/' && pathname === '/projetos');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 rounded-lg transition-all font-semibold text-xs flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-bold border border-slate-200/90 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{link.label}</span>
                  {link.roleBadge && !isActive && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                      {link.roleBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito: Perfil Autêntico Logado e Controle de Sessão */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
          {currentUser ? (
            <div className={`flex items-center space-x-1.5 p-1 rounded-xl border transition ${
              pathname === '/perfil'
                ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                : 'bg-slate-50 border-slate-200'
            }`}>
              
              {/* Badge de Função e Cegamento */}
              {isAdmin ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-purple-700" />
                  <span>Administrador</span>
                </span>
              ) : isEvaluator ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                  <EyeOff className="w-3 h-3 text-amber-700" />
                  <span>Avaliador Cego</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 flex items-center space-x-1">
                  <Stethoscope className="w-3 h-3 text-blue-700" />
                  <span>Coordenação</span>
                </span>
              )}

              {/* Link direto para a Área de Perfil */}
              <Link
                href="/perfil"
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition font-bold text-xs ${
                  pathname === '/perfil'
                    ? 'text-blue-700 bg-white shadow-2xs'
                    : 'text-slate-800 hover:text-blue-600 hover:bg-slate-100'
                }`}
                title="Acessar meu perfil e alterar senha"
              >
                <span className="truncate max-w-[120px] sm:max-w-[160px]">
                  {currentUser.name}
                </span>
              </Link>

              {/* Botão de Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="px-2 py-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                title="Encerrar sessão"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1"
              >
                <span>Entrar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Link Rápido para o Portal do Paciente */}
          <a
            href={`/paciente?code=${activeParticipantCode}&projectId=${activeProjectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
            title="Abrir a tela externa que o paciente visualiza"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Portal Paciente</span>
          </a>

        </div>

      </div>
    </header>
  );
}

