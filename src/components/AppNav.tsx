'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

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
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || null);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
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
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Erro ao sair:', err);
      router.push('/login');
    }
  };

  // Se estiver na tela de login ou portal do paciente, não renderiza a barra de navegação
  if (isPublicOrPatientScreen) {
    return null;
  }

  // Se estiver em rota protegida e não autenticado (e não for a home `/`)
  const isProtectedPath =
    pathname.startsWith('/projetos') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/construtor') ||
    pathname.startsWith('/relatorio-cep');

  if (!loading && !currentUser && isProtectedPath) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <span>⚠️</span>
          <span>Acesso Restrito ao Pesquisador: Você não está autenticado.</span>
        </div>
        <Link
          href="/login"
          className="px-3 py-1 bg-white text-amber-900 rounded-lg font-bold shadow-2xs hover:bg-amber-50 transition"
        >
          Fazer Login com Minha Conta →
        </Link>
      </div>
    );
  }

  // Links de navegação baseados na função
  const isEvaluator = currentUser?.email === 'carlos@uepg.br'; // Identificado como avaliador cego
  const isAdmin = currentUser?.role === 'ADMIN';

  const navLinks = [
    { href: '/projetos', label: '🏢 Meus Estudos' },
    { href: `/dashboard?projectId=${activeProjectId}`, label: '📊 Prontuário & Atendimento' },
    {
      href: `/construtor?projectId=${activeProjectId}`,
      label: '📋 Construtor eCRF',
      roleBadge: isEvaluator ? 'Leitura' : 'Coordenação',
    },
    { href: `/relatorio-cep?projectId=${activeProjectId}`, label: '📑 Relatório CEP' },
  ];

  return (
    <header className="bg-white/95 text-slate-800 border-b border-slate-200/90 text-xs sticky top-0 z-40 shadow-2xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Identificação Oficial do Sistema */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl text-blue-900 font-bold tracking-tight text-xs transition"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ODONTO-PESQUISA UEPG</span>
          </Link>

          {/* Links Principais da Aplicação */}
          <nav className="flex flex-wrap items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href.split('?')[0];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-xl transition-all font-semibold text-xs flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
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
        <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-center">
          
          {currentUser ? (
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
              
              {/* Badge de Função e Cegamento */}
              {isAdmin ? (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1">
                  <span>👑</span>
                  <span>Administrador</span>
                </span>
              ) : isEvaluator ? (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                  <span>🔒</span>
                  <span>Avaliador Cego</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 flex items-center space-x-1">
                  <span>👩‍⚕️</span>
                  <span>Coordenadora</span>
                </span>
              )}

              {/* Nome do Usuário */}
              <div className="text-left px-1">
                <span className="block font-bold text-slate-800 text-xs truncate max-w-[130px] sm:max-w-[180px]">
                  {currentUser.name}
                </span>
              </div>

              {/* Botão de Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition"
                title="Encerrar sessão"
              >
                Sair ⎋
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition"
              >
                Entrar com Minha Conta →
              </Link>
            </div>
          )}

          {/* Link Rápido para o Portal do Paciente */}
          <a
            href={`/paciente?code=${activeParticipantCode}&projectId=${activeProjectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
            title="Abrir a tela externa que o paciente visualiza"
          >
            <span>📱</span>
            <span className="hidden sm:inline">Portal Paciente</span>
            <span>↗</span>
          </a>

        </div>

      </div>
    </header>
  );
}
