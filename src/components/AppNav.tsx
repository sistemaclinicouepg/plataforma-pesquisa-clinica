'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FolderKanban,
  Activity,
  FileCode,
  FileText,
  ExternalLink,
  ShieldCheck,
  EyeOff,
  Stethoscope,
  LogOut,
  AlertTriangle,
  ArrowRight,
  User as UserIcon,
  ChevronDown,
  Sparkles,
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('uepg_cached_user');
          localStorage.removeItem('uepg_auth_token');
        }
      }
    } catch {
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

  if (isPublicOrPatientScreen) {
    return null;
  }

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
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
          <span>Acesso Restrito ao Pesquisador: Você não está autenticado no sistema clínico.</span>
        </div>
        <Link
          href="/login"
          className="px-3.5 py-1 bg-white text-amber-950 rounded-lg font-bold shadow-xs hover:bg-amber-50 transition flex items-center space-x-1.5"
        >
          <span>Fazer Login</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const isEvaluator = currentUser?.email === 'carlos@uepg.br';
  const isAdmin = currentUser?.role === 'ADMIN';

  // Obter iniciais do usuário
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const navLinks = [
    { href: '/', label: 'Meus Projetos', icon: FolderKanban },
    { href: `/dashboard?projectId=${activeProjectId}`, label: 'Prontuário & Atendimento', icon: Activity },
    { href: `/construtor?projectId=${activeProjectId}`, label: 'Construtor eCRF', icon: FileCode },
    { href: `/anamnese?projectId=${activeProjectId}`, label: 'Ficha & Critérios', icon: Stethoscope },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/80 sticky top-0 z-40 shadow-card">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Identificação Oficial do Sistema */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="flex items-center space-x-2.5 group transition"
          >
            {/* Logomarca UEPG Pesquisa Clínica */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
              <span className="font-black text-sm tracking-tighter">U</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -ml-0.5 mb-2 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">UEPG</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-xs text-blue-600 tracking-tight">Pesquisa Clínica</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Ensaios Odontológicos • GCP / ICH
              </span>
            </div>
          </Link>

          <div className="hidden lg:block h-5 w-px bg-slate-200 mx-1" />

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
                  className={`px-3 py-1.5 rounded-xl transition-all font-semibold text-xs flex items-center space-x-2 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito: Perfil Autêntico Logado e Controle de Sessão */}
        <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-center">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              
              {/* Badge de Função e Mascaramento */}
              {isAdmin ? (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                  <span className="hidden sm:inline">Coordenação Geral</span>
                  <span className="sm:hidden">Admin</span>
                </span>
              ) : isEvaluator ? (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center space-x-1.5">
                  <EyeOff className="w-3 h-3 text-amber-600" />
                  <span>Avaliador Cego</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200/80 flex items-center space-x-1.5">
                  <Stethoscope className="w-3 h-3 text-blue-600" />
                  <span>Pesquisador</span>
                </span>
              )}

              {/* Botão Perfil & Avatar */}
              <div className="flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl p-1 transition shadow-2xs">
                <Link
                  href="/perfil"
                  className="flex items-center space-x-2 px-2 py-1 text-slate-800 hover:text-blue-600 text-xs font-bold transition"
                  title="Meu Perfil e Segurança"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-[11px] flex items-center justify-center shadow-2xs">
                    {getInitials(currentUser.name)}
                  </div>
                  <span className="truncate max-w-[110px] sm:max-w-[150px]">
                    {currentUser.name}
                  </span>
                </Link>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                {/* Botão Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Encerrar sessão com segurança"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
              >
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Link Rápido para o Portal do Paciente */}
          <a
            href={`/paciente?code=${activeParticipantCode}&projectId=${activeProjectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/90 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs hover:shadow-xs group"
            title="Abrir o Portal Externo do Paciente (Diário de Dor & eCRF)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
            <span className="hidden sm:inline">Portal Paciente</span>
            <ExternalLink className="w-3 h-3 text-emerald-600 ml-0.5" />
          </a>

        </div>

      </div>
    </header>
  );
}
