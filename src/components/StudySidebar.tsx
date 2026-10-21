'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  X,
  Plus,
  UserPlus,
  Stethoscope,
  ClipboardList,
  Users,
  FileSpreadsheet,
  FileCode,
  FileText,
  Sliders,
  Download,
  ShieldCheck,
  AlertTriangle,
  Menu,
} from 'lucide-react';
import { parseStudyProtocol, RESEARCH_SPECIALTIES } from '@/lib/studyProtocol';

export interface StudySidebarProps {
  projectId?: string | null;
  activeItem?: 'active' | 'triage' | 'team' | 'anamnese' | 'construtor' | 'tcle' | 'export' | 'audit' | string;
  project?: any;
  allProjects?: any[];
  isAdmin?: boolean;
  onSelectTab?: (tab: any) => void;
  onNewPatient?: () => void;
  onNewMember?: () => void;
  onEditProject?: () => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export function StudySidebar({
  projectId,
  activeItem = 'active',
  project: initialProject,
  allProjects: initialAllProjects,
  isAdmin: initialIsAdmin,
  onSelectTab,
  onNewPatient,
  onNewMember,
  onEditProject,
  mobileMenuOpen: controlledMobileOpen,
  setMobileMenuOpen: controlledSetMobileOpen,
}: StudySidebarProps) {
  const router = useRouter();

  // Estado local para mobile caso não seja controlado externamente
  const [localMobileOpen, setLocalMobileOpen] = useState(false);
  const isMobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : localMobileOpen;
  const setMobileOpen = (open: boolean) => {
    if (controlledSetMobileOpen) {
      controlledSetMobileOpen(open);
    } else {
      setLocalMobileOpen(open);
    }
  };

  // Carregar dados do projeto se não forem passados via props
  const [project, setProject] = useState<any>(initialProject || null);
  const [allProjects, setAllProjects] = useState<any[]>(initialAllProjects || []);
  const [userIsAdmin, setUserIsAdmin] = useState<boolean>(initialIsAdmin || false);

  useEffect(() => {
    if (initialProject) {
      setProject(initialProject);
    }
  }, [initialProject]);

  useEffect(() => {
    if (initialAllProjects) {
      setAllProjects(initialAllProjects);
    }
  }, [initialAllProjects]);

  useEffect(() => {
    if (initialIsAdmin !== undefined) {
      setUserIsAdmin(initialIsAdmin);
    }
  }, [initialIsAdmin]);

  // Se não temos o projeto mas temos o projectId, buscamos na API
  useEffect(() => {
    if (!initialProject && projectId) {
      let isMounted = true;
      async function loadProjectData() {
        try {
          const res = await fetch(`/api/projects/${projectId}`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.project) {
              setProject(data.project);
              if (initialIsAdmin === undefined && data.currentUser) {
                setUserIsAdmin(data.currentUser.role === 'ADMIN');
              }
            }
          }
        } catch (err) {
          console.error('Erro ao carregar dados do projeto na barra lateral:', err);
        }
      }
      loadProjectData();
      return () => {
        isMounted = false;
      };
    }
  }, [projectId, initialProject, initialIsAdmin]);

  // Se não temos a lista de projetos, buscamos
  useEffect(() => {
    if (!initialAllProjects || initialAllProjects.length === 0) {
      let isMounted = true;
      async function loadAllProjects() {
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.projects) {
              setAllProjects(data.projects);
            }
          }
        } catch (err) {
          console.error('Erro ao carregar lista de projetos:', err);
        }
      }
      loadAllProjects();
      return () => {
        isMounted = false;
      };
    }
  }, [initialAllProjects]);

  const currentProjectId = project?.id || projectId || '';

  // Contagens
  const participants = project?.participants || [];
  const approvedCount = participants.filter(
    (p: any) => p.status === 'APPROVED' || p.status === 'ACTIVE' || p.status === 'COMPLETED'
  ).length;
  const pendingCount = participants.filter((p: any) => p.status === 'PENDING').length;
  const membersCount = (project?.members || []).length;
  const auditLogsCount = (project?.auditLogs || []).length;

  // Handlers para ações
  const handleTabClick = (tab: string) => {
    setMobileOpen(false);
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      router.push(`/dashboard?projectId=${currentProjectId}&tab=${tab}`);
    }
  };

  const handleNewPatientClick = () => {
    setMobileOpen(false);
    if (onNewPatient) {
      onNewPatient();
    } else {
      router.push(`/dashboard?projectId=${currentProjectId}&newPatient=true`);
    }
  };

  const handleNewMemberClick = () => {
    setMobileOpen(false);
    if (onNewMember) {
      onNewMember();
    } else {
      router.push(`/dashboard?projectId=${currentProjectId}&newMember=true`);
    }
  };

  const handleEditProjectClick = () => {
    setMobileOpen(false);
    if (onEditProject) {
      onEditProject();
    } else {
      router.push(`/dashboard?projectId=${currentProjectId}&editProject=true`);
    }
  };

  const handleProjectSwitch = (newId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_active_project_id', newId);
    }
    setMobileOpen(false);
    if (activeItem === 'anamnese') {
      router.push(`/anamnese?projectId=${newId}`);
    } else if (activeItem === 'construtor') {
      router.push(`/construtor?projectId=${newId}`);
    } else if (activeItem === 'tcle') {
      router.push(`/tcle/editor?projectId=${newId}`);
    } else {
      router.push(`/dashboard?projectId=${newId}`);
    }
  };

  return (
    <>
      {/* Backdrop Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR LATERAL */}
      <aside
        className={`fixed lg:sticky top-[57px] bottom-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } h-[calc(100vh-57px)] shrink-0`}
      >
        {/* Topo do Sidebar: Identificação e Ação do Estudo */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estudo Atual</span>
              {project?.status === 'COMPLETED' ? (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                  <span>Finalizado</span>
                </span>
              ) : project?.status === 'CANCELLED' ? (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Cancelado
                </span>
              ) : (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Ativo</span>
                </span>
              )}
            </div>

            {/* Botão fechar apenas no mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              title="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nome do Estudo ou Seletor */}
          <div>
            {allProjects.length > 1 ? (
              <select
                value={currentProjectId}
                onChange={(e) => handleProjectSwitch(e.target.value)}
                className="w-full text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate"
                title="Alternar entre estudos de pesquisa"
              >
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug" title={project?.name || 'Carregando estudo...'}>
                {project?.name || 'Estudo de Pesquisa'}
              </h2>
            )}

            {(() => {
              const proto = parseStudyProtocol(project?.anamnesisTemplate);
              const specDef = RESEARCH_SPECIALTIES.find((s) => s.id === proto.specialty) || RESEARCH_SPECIALTIES.find((s) => s.id === 'GENERAL');
              if (!specDef) return null;
              return (
                <div className="mt-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${specDef.color}`}>
                    <span>{specDef.icon}</span>
                    <span>{specDef.badge}</span>
                  </span>
                </div>
              );
            })()}
          </div>

          {/* CTA Primário de Cadastro de Paciente */}
          <button
            onClick={handleNewPatientClick}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Paciente</span>
          </button>

          {/* CTA Secundário de Adicionar Pesquisador */}
          <button
            onClick={handleNewMemberClick}
            className="w-full mt-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200/90 text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
            title="Adicionar ou vincular pesquisador ao estudo"
          >
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span>Adicionar Pesquisador</span>
          </button>
        </div>

        {/* Menus e Navegação do Estudo */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* GRUPO 1: ATENDIMENTO CLÍNICO */}
          <div>
            <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Atendimento Clínico
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleTabClick('active')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between text-left cursor-pointer ${
                  activeItem === 'active'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Stethoscope className={`w-4 h-4 shrink-0 ${activeItem === 'active' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">Prontuários & Consultas</span>
                </div>
                {approvedCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeItem === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {approvedCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('triage')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between text-left cursor-pointer ${
                  activeItem === 'triage'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <ClipboardList className={`w-4 h-4 shrink-0 ${activeItem === 'triage' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">Triagem & Inclusão</span>
                </div>
                {pendingCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ml-1.5 ${
                      activeItem === 'triage' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* GRUPO 2: CONFIGURAÇÕES DO ESTUDO */}
          <div>
            <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Configurações do Estudo
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleTabClick('team')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between text-left cursor-pointer ${
                  activeItem === 'team'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Users className={`w-4 h-4 shrink-0 ${activeItem === 'team' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">Equipe do Estudo</span>
                </div>
                {membersCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeItem === 'team' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {membersCount}
                  </span>
                )}
              </button>

              <Link
                href={`/anamnese?projectId=${currentProjectId}`}
                onClick={() => setMobileOpen(false)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 text-left cursor-pointer ${
                  activeItem === 'anamnese'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <FileSpreadsheet
                  className={`w-4 h-4 shrink-0 ${activeItem === 'anamnese' ? 'text-blue-600' : 'text-blue-500'}`}
                />
                <span className="truncate">Ficha Clínica & Critérios</span>
              </Link>

              <Link
                href={`/construtor?projectId=${currentProjectId}`}
                onClick={() => setMobileOpen(false)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 text-left cursor-pointer ${
                  activeItem === 'construtor'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                <FileCode
                  className={`w-4 h-4 shrink-0 ${activeItem === 'construtor' ? 'text-indigo-600' : 'text-indigo-500'}`}
                />
                <span className="truncate">Construtor de eCRF</span>
              </Link>

              <Link
                href={`/tcle/editor?projectId=${currentProjectId}`}
                onClick={() => setMobileOpen(false)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 text-left cursor-pointer ${
                  activeItem === 'tcle'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <FileText
                  className={`w-4 h-4 shrink-0 ${activeItem === 'tcle' ? 'text-emerald-600' : 'text-emerald-500'}`}
                />
                <span className="truncate">Termo de Aceite (TCLE)</span>
              </Link>

              <button
                type="button"
                onClick={handleEditProjectClick}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition flex items-center space-x-2.5 text-left cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">Editar Dados do Estudo</span>
              </button>
            </div>
          </div>

          {/* GRUPO 3: DADOS (Posicionado no fim do menu) */}
          <div>
            <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Dados
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleTabClick('export')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 text-left cursor-pointer ${
                  activeItem === 'export'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Download className={`w-4 h-4 shrink-0 ${activeItem === 'export' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">Exportar Dados</span>
              </button>

              {userIsAdmin && (
                <button
                  type="button"
                  onClick={() => handleTabClick('audit')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between text-left cursor-pointer ${
                    activeItem === 'audit'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${activeItem === 'audit' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">Trilha de Auditoria</span>
                  </div>
                  {auditLogsCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        activeItem === 'audit' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {auditLogsCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Rodapé do Sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          {userIsAdmin ? (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Ambiente do Estudo</span>
              <Link
                href={`/relatorio-cep?projectId=${currentProjectId}`}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Relatório CEP
              </Link>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 px-2 flex items-center justify-between">
              <span>Protocolo Clínico UEPG</span>
              <span>Ambiente Ativo</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export function StudyMobileBar({
  projectName,
  onOpenMenu,
}: {
  projectName?: string;
  onOpenMenu: () => void;
}) {
  return (
    <div className="lg:hidden p-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-[57px] z-30 shadow-2xs">
      <button
        type="button"
        onClick={onOpenMenu}
        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center space-x-2 transition cursor-pointer"
      >
        <Menu className="w-4 h-4" />
        <span>Menu do Estudo</span>
      </button>

      <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
        {projectName || 'Estudo de Pesquisa'}
      </span>
    </div>
  );
}
