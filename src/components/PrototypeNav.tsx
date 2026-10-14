'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Stethoscope,
  Home,
  FolderKanban,
  LayoutDashboard,
  ClipboardList,
  Smartphone,
  FileSignature,
  FileText,
  X,
  User,
  Shield,
  GraduationCap
} from 'lucide-react';

export default function PrototypeNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [minimized, setMinimized] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string } | null>(null);
  const [switching, setSwitching] = useState(false);

  // ID do estudo modelo calibrado para testes como fallback
  const defaultProjectId = 'b4360782-3701-4fad-8af4-263f0bd397ba';
  const defaultParticipantId = '8029f77e-bcbd-40ef-98b9-a060584e409c';
  const [activeProjectId, setActiveProjectId] = useState<string>(defaultProjectId);
  const [activeParticipantCode, setActiveParticipantCode] = useState<string>('P001');

  const checkUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || null);
      }
    } catch {
      // Ignorar falhas silenciosas
    }
  };

  useEffect(() => {
    checkUser();

    // Sincronizar projectId ativo a partir da URL ou localStorage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pId = urlParams.get('projectId');
      const pCode = urlParams.get('code');

      if (pId) {
        setActiveProjectId(pId);
        localStorage.setItem('prototipo_active_project_id', pId);
      } else {
        const saved = localStorage.getItem('prototipo_active_project_id');
        if (saved) setActiveProjectId(saved);
      }

      if (pCode) {
        setActiveParticipantCode(pCode);
        localStorage.setItem('prototipo_active_patient_code', pCode);
      } else {
        const savedCode = localStorage.getItem('prototipo_active_patient_code');
        if (savedCode) setActiveParticipantCode(savedCode);
      }
    }
  }, [pathname]);

  const handleQuickSwitch = async (email: string, pass: string) => {
    try {
      setSwitching(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        await checkUser();
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-lg text-xs font-bold border border-slate-200 flex items-center space-x-2 backdrop-blur-md transition-all hover:scale-105"
        title="Abrir barra de navegação clínica"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
        <span>Menu Clínico</span>
      </button>
    );
  }

  const links = [
    { href: '/', label: 'Central', icon: Home },
    { href: '/projetos', label: 'Meus Estudos', icon: FolderKanban },
    { href: `/dashboard?projectId=${activeProjectId}`, label: 'Prontuário & Dashboard', icon: LayoutDashboard },
    { href: `/paciente?code=${activeParticipantCode}`, label: 'Portal Paciente', icon: Smartphone },
    { href: `/tcle/${defaultParticipantId}`, label: 'TCLE Digital', icon: FileSignature },
    { href: `/relatorio-cep?projectId=${activeProjectId}`, label: 'Relatório CEP', icon: FileText },
  ];

  return (
    <aside aria-label="Menu de Navegação Clínica" className="bg-white/95 text-slate-800 border-b border-slate-200/90 text-xs sticky top-0 z-50 shadow-2xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Lado Esquerdo: Identificação Clínica e Links */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-blue-900 font-bold tracking-tight text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ODONTO-PESQUISA UEPG</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href.split('?')[0];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-semibold text-[11px] ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Lado Direito: Alternador de Usuários e Botão Minimizar */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
          <div className="flex items-center space-x-1 bg-slate-100/80 border border-slate-200 p-0.5 rounded-lg text-[10px]">
            <span className="px-1.5 text-slate-500 font-semibold">Perfil:</span>
            
            <button
              type="button"
              disabled={switching}
              onClick={() => handleQuickSwitch('pesquisadora@uepg.br', '123')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition ${
                currentUser?.email === 'pesquisadora@uepg.br'
                  ? 'bg-white text-blue-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
              title="Pesquisadora Responsável (Dra. Roberta)"
            >
              <User className="w-3 h-3 text-blue-600" />
              <span>Dra. Roberta</span>
            </button>

            <button
              type="button"
              disabled={switching}
              onClick={() => handleQuickSwitch('admin@uepg.br', 'admin')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition ${
                currentUser?.email === 'admin@uepg.br'
                  ? 'bg-white text-purple-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
              title="Coordenação / Admin (Dra. Alessandra)"
            >
              <Shield className="w-3 h-3 text-purple-600" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              disabled={switching}
              onClick={() => handleQuickSwitch('carlos@uepg.br', '123')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition ${
                currentUser?.email === 'carlos@uepg.br'
                  ? 'bg-white text-amber-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
              title="Avaliador Cego (Carlos)"
            >
              <GraduationCap className="w-3 h-3 text-amber-600" />
              <span>Avaliador Cego</span>
            </button>
          </div>

          <button
            onClick={() => setMinimized(true)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Ocultar barra superior"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
