'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudySidebar, StudyMobileBar } from '@/components/StudySidebar';
import { parseStudyProtocol, EthicsApprovalConfig } from '@/lib/studyProtocol';
import {
  ArrowLeft,
  Save,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  Trash2,
  ExternalLink,
  RefreshCw,
  FileCheck2,
  BookOpen,
  Eye,
  AlertCircle,
  Folder,
  Calendar,
  Building2,
  Hash,
  Clock,
  Sparkles,
} from 'lucide-react';

function formatBytes(bytes?: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function RelatorioCepContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') || searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Metadados e Arquivos Éticos
  const [ethics, setEthics] = useState<EthicsApprovalConfig>({
    status: 'APROVADO',
    approvalNumber: '',
    caae: '',
    institution: 'Comitê de Ética em Pesquisa - UEPG',
    approvalDate: '',
    notes: '',
  });

  // Estados de Upload
  const [uploadingCep, setUploadingCep] = useState(false);
  const [uploadingProject, setUploadingProject] = useState(false);
  const [cepDragOver, setCepDragOver] = useState(false);
  const [projectDragOver, setProjectDragOver] = useState(false);

  const cepFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados do projeto
  useEffect(() => {
    let isMounted = true;
    async function fetchProject() {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [projRes, allProjRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch('/api/projects'),
        ]);

        if (projRes.ok) {
          const projData = await projRes.json();
          if (isMounted && projData.project) {
            setProject(projData.project);
            const protocol = parseStudyProtocol(projData.project.anamnesisTemplate);
            const eth = protocol.ethicsApproval;
            if (eth) {
              setEthics((prev) => ({
                ...prev,
                ...eth,
                // fallback padrão
                institution: eth.institution || 'Comitê de Ética em Pesquisa - UEPG',
                status: eth.status || 'APROVADO',
              }));
            }
          }
        }

        if (allProjRes.ok) {
          const allData = await allProjRes.json();
          if (isMounted && allData.projects) {
            setAllProjects(allData.projects);
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar dados do projeto:', err);
        if (isMounted) setErrorMessage('Falha ao carregar dados do projeto.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProject();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Toast feedback timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Salvar alterações
  const handleSave = async (updatedEthicsState?: EthicsApprovalConfig) => {
    if (!projectId || !project) return;
    setSaving(true);
    setErrorMessage(null);

    const ethicsToSave = updatedEthicsState || ethics;

    try {
      // Obter template atual
      let rawTemplate: any = {};
      if (project.anamnesisTemplate) {
        try {
          rawTemplate =
            typeof project.anamnesisTemplate === 'string'
              ? JSON.parse(project.anamnesisTemplate)
              : project.anamnesisTemplate;
        } catch {
          rawTemplate = {};
        }
      }

      const currentProtocol = rawTemplate.studyProtocol || rawTemplate;
      const updatedProtocol = {
        ...currentProtocol,
        ethicsApproval: ethicsToSave,
      };

      const updatedTemplate = {
        ...rawTemplate,
        studyProtocol: updatedProtocol,
        ethicsApproval: ethicsToSave,
      };

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anamnesisTemplate: JSON.stringify(updatedTemplate),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao salvar dados no servidor.');
      }

      const data = await res.json();
      if (data.project) {
        setProject(data.project);
      }

      setIsDirty(false);
      setToastMessage('Documentos e dados éticos salvos com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar documentos éticos:', err);
      setErrorMessage(err.message || 'Erro ao salvar. Verifique sua conexão.');
    } finally {
      setSaving(false);
    }
  };

  // Upload genérico de arquivo PDF para o R2
  const uploadPdfFile = async (file: File, type: 'cep' | 'project') => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Atenção: Por favor, selecione exclusivamente um arquivo no formato PDF.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('Atenção: O arquivo excede o limite máximo permitido de 100 MB.');
      return;
    }

    const isCep = type === 'cep';
    if (isCep) setUploadingCep(true);
    else setUploadingProject(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `estudos/${projectId || 'geral'}/cep`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha no upload do arquivo.');
      }

      const result = await res.json();

      let nextEthics: EthicsApprovalConfig;

      if (isCep) {
        nextEthics = {
          ...ethics,
          cepPdfKey: result.key,
          cepPdfUrl: result.url,
          cepPdfName: result.fileName || file.name,
          cepPdfSize: result.size || file.size,
          cepPdfUploadedAt: new Date().toISOString(),
        };
      } else {
        nextEthics = {
          ...ethics,
          projectPdfKey: result.key,
          projectPdfUrl: result.url,
          projectPdfName: result.fileName || file.name,
          projectPdfSize: result.size || file.size,
          projectPdfUploadedAt: new Date().toISOString(),
        };
      }

      setEthics(nextEthics);
      setIsDirty(true);

      // Auto-salva para garantir que o upload persista no projeto imediatamente
      await handleSave(nextEthics);
      setToastMessage(
        isCep
          ? 'Parecer do CEP/CONEP anexado e salvo com sucesso!'
          : 'Projeto de Pesquisa anexado e salvo com sucesso!'
      );
    } catch (err: any) {
      console.error('Erro no upload:', err);
      alert(`Falha ao anexar arquivo: ${err.message}`);
    } finally {
      if (isCep) setUploadingCep(false);
      else setUploadingProject(false);
    }
  };

  // Visualizar arquivo em nova aba com URL atualizada
  const handleOpenFile = async (url?: string, key?: string) => {
    if (key) {
      try {
        const res = await fetch(`/api/upload?key=${encodeURIComponent(key)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            window.open(data.url, '_blank');
            return;
          }
        }
      } catch (e) {
        console.warn('Falha ao buscar URL assinada atualizada, usando URL cached:', e);
      }
    }

    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Arquivo não localizado.');
    }
  };

  // Remover arquivo anexado
  const handleRemoveFile = async (type: 'cep' | 'project') => {
    const isCep = type === 'cep';
    const fileName = isCep ? ethics.cepPdfName : ethics.projectPdfName;
    const fileKey = isCep ? ethics.cepPdfKey : ethics.projectPdfKey;

    const confirmed = window.confirm(
      `Deseja realmente desanexar o arquivo "${fileName || 'PDF'}" deste estudo?`
    );
    if (!confirmed) return;

    if (fileKey) {
      try {
        await fetch(`/api/upload?key=${encodeURIComponent(fileKey)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Aviso ao excluir do storage:', err);
      }
    }

    let nextEthics: EthicsApprovalConfig;
    if (isCep) {
      nextEthics = {
        ...ethics,
        cepPdfKey: undefined,
        cepPdfUrl: undefined,
        cepPdfName: undefined,
        cepPdfSize: undefined,
        cepPdfUploadedAt: undefined,
      };
    } else {
      nextEthics = {
        ...ethics,
        projectPdfKey: undefined,
        projectPdfUrl: undefined,
        projectPdfName: undefined,
        projectPdfSize: undefined,
        projectPdfUploadedAt: undefined,
      };
    }

    setEthics(nextEthics);
    setIsDirty(true);
    await handleSave(nextEthics);
    setToastMessage('Arquivo desanexado com sucesso.');
  };

  if (!projectId) {
    return (
      <div className="flex-1 bg-slate-50 p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Selecione um Estudo Clínico</h2>
          <p className="text-slate-600 text-sm mb-6">
            Para gerenciar e anexar os documentos do CEP / CONEP, escolha qual pesquisa você deseja acessar:
          </p>
          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {allProjects.map((p) => (
              <Link
                key={p.id}
                href={`/relatorio-cep?projectId=${p.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left transition group"
              >
                <div className="flex items-center space-x-3">
                  <Folder className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{p.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{p.description || 'Sem descrição'}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-white group-hover:bg-blue-100 px-3 py-1 rounded-lg border border-slate-200 group-hover:border-blue-200">
                  Selecionar
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Meus Projetos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cálculos de conformidade regulatória
  const hasCepPdf = !!ethics.cepPdfUrl || !!ethics.cepPdfKey;
  const hasProjectPdf = !!ethics.projectPdfUrl || !!ethics.projectPdfKey;
  const hasApprovalNumber = !!ethics.approvalNumber?.trim();
  const hasCaae = !!ethics.caae?.trim();
  const hasApprovalDate = !!ethics.approvalDate?.trim();

  const complianceScore =
    (hasCepPdf ? 1 : 0) +
    (hasProjectPdf ? 1 : 0) +
    (hasApprovalNumber ? 1 : 0) +
    (hasCaae ? 1 : 0) +
    (hasApprovalDate ? 1 : 0);

  const isCompliant = complianceScore >= 4;

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-800 flex flex-col min-h-screen">
      <div className="flex-1 flex w-full relative">
        {/* Barra Lateral do Estudo */}
        <StudySidebar
          projectId={projectId}
          activeItem="cep"
          allProjects={allProjects}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Painel Principal */}
        <div className="flex-1 min-w-0 flex flex-col pb-16">
          <StudyMobileBar
            projectName={project?.name || 'Carregando estudo...'}
            onOpenMenu={() => setMobileMenuOpen(true)}
          />

          {/* Barra Superior / Cabeçalho */}
          <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-10 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href={`/dashboard?projectId=${projectId}`}
                className="text-slate-500 hover:text-blue-600 text-xs font-semibold transition inline-flex items-center px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
                title="Voltar ao Prontuário do Estudo"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Voltar ao Prontuário</span>
              </Link>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="font-extrabold text-sm text-slate-800">
                  Documentos e Aceite do CEP / CONEP
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-600 truncate max-w-[200px] sm:max-w-[320px]">
                  {project?.name || 'Estudo Clínico'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              {isDirty && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Alterações não salvas
                </span>
              )}

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-xs hover:shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Dados</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Erro global */}
          {errorMessage && (
            <div className="mx-4 sm:mx-8 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 text-xs font-bold"
              >
                Dispensar
              </button>
            </div>
          )}

          {/* Conteúdo Central */}
          <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
            {/* Banner de Orientação Regulatória CNS / GCP */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-radial from-blue-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-500/30 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-300" />
                      Boas Práticas Clínicas (GCP / ICH) • CNS 466/2012
                    </span>
                    <span className="text-slate-400 text-xs">|</span>
                    <span className="text-xs text-blue-200 font-semibold">
                      Comitê de Ética em Pesquisa (CEP / CONEP)
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    Arquivo Ético & Protocolo Oficial do Estudo
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Mantenha arquivados os documentos comprobatórios de aprovação ética. O Parecer
                    Consubstanciado e o Projeto Integral Aprovado são exigências regulatórias mandatórias
                    para publicação em periódicos e auditorias de ensaios clínicos.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
                  <a
                    href="https://plataformabrasil.saude.gov.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition border border-white/20 shadow-xs"
                    title="Acessar Plataforma Brasil (Ministério da Saúde)"
                  >
                    <span>Plataforma Brasil</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>
              </div>

              {/* Status de Conformidade */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-300 font-semibold">Status de Conformidade:</span>
                  {isCompliant ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Conformidade Regulamentar Atendida ({complianceScore}/5 requisitos)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Documentação Parcial ({complianceScore}/5 requisitos preenchidos)
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-300 font-medium">
                  {ethics.approvalNumber ? `Parecer nº ${ethics.approvalNumber}` : 'Parecer não informado'} •{' '}
                  {ethics.caae ? `CAAE ${ethics.caae}` : 'CAAE não informado'}
                </div>
              </div>
            </div>

            {/* Grid dos Documentos Principais (Uploads de PDF) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DOCUMENTO 1: Parecer Consubstanciado do CEP / CONEP */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span>1. Parecer de Aceite / Aprovação CEP</span>
                        {hasCepPdf && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Anexado
                          </span>
                        )}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Parecer Consubstanciado oficial emitido pelo Comitê de Ética ou CONEP (PDF).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {hasCepPdf ? (
                    // Card do Arquivo Anexado
                    <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black text-xs shadow-2xs">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[280px] sm:max-w-[340px]">
                            {ethics.cepPdfName || 'Parecer_Consubstanciado_CEP.pdf'}
                          </p>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                            <span>{formatBytes(ethics.cepPdfSize)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatDateDisplay(ethics.cepPdfUploadedAt) || 'Recente'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-100">
                        <button
                          type="button"
                          onClick={() => handleOpenFile(ethics.cepPdfUrl, ethics.cepPdfKey)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer"
                          title="Visualizar documento em nova aba"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Visualizar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => cepFileInputRef.current?.click()}
                          disabled={uploadingCep}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Substituir PDF por nova versão"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Substituir</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile('cep')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200 cursor-pointer"
                          title="Desanexar arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Zona de Drop / Upload
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setCepDragOver(true);
                      }}
                      onDragLeave={() => setCepDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setCepDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) uploadPdfFile(file, 'cep');
                      }}
                      onClick={() => !uploadingCep && cepFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2.5 ${
                        cepDragOver
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 bg-slate-50/40'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                        {uploadingCep ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          {uploadingCep
                            ? 'Enviando arquivo do parecer para o storage seguro...'
                            : 'Clique para selecionar ou arraste o Parecer Consubstanciado (PDF)'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Arquivo oficial emitido pela Plataforma Brasil • Formato PDF (até 100 MB)
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={cepFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPdfFile(file, 'cep');
                      e.target.value = '';
                    }}
                  />

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      O arquivo fica criptografado em nuvem e disponível para consulta dos membros do estudo.
                    </span>
                  </div>
                </div>
              </div>

              {/* DOCUMENTO 2: Projeto de Pesquisa Completo / Protocolo Integral Aprovado */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span>2. Projeto de Pesquisa Completo (PDF)</span>
                        {hasProjectPdf && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            Anexado
                          </span>
                        )}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Protocolo metodológico integral e aprovado submetido ao CEP (PDF).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {hasProjectPdf ? (
                    // Card do Arquivo Anexado
                    <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-black text-xs shadow-2xs">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[280px] sm:max-w-[340px]">
                            {ethics.projectPdfName || 'Projeto_de_Pesquisa_Completo.pdf'}
                          </p>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                            <span>{formatBytes(ethics.projectPdfSize)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatDateDisplay(ethics.projectPdfUploadedAt) || 'Recente'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-100">
                        <button
                          type="button"
                          onClick={() => handleOpenFile(ethics.projectPdfUrl, ethics.projectPdfKey)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-800 bg-white hover:bg-blue-100 border border-blue-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer"
                          title="Visualizar projeto em nova aba"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Visualizar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => projectFileInputRef.current?.click()}
                          disabled={uploadingProject}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Substituir PDF por nova versão"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Substituir</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile('project')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200 cursor-pointer"
                          title="Desanexar arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Zona de Drop / Upload
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setProjectDragOver(true);
                      }}
                      onDragLeave={() => setProjectDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setProjectDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) uploadPdfFile(file, 'project');
                      }}
                      onClick={() => !uploadingProject && projectFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2.5 ${
                        projectDragOver
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 bg-slate-50/40'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                        {uploadingProject ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                        ) : (
                          <Upload className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          {uploadingProject
                            ? 'Enviando projeto de pesquisa para o storage...'
                            : 'Clique para selecionar ou arraste o Projeto de Pesquisa Completo (PDF)'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Texto integral, metodologia, termo TCLE e cronograma • PDF (até 100 MB)
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={projectFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPdfFile(file, 'project');
                      e.target.value = '';
                    }}
                  />

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>
                      Permite que qualquer pesquisador do estudo consulte a metodologia exata na cadeira clínica.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadados Regulatórios e Detalhes da Tramitação Ética */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Identificação & Tramitação na Plataforma Brasil
                    </h2>
                    <p className="text-xs text-slate-500">
                      Dados oficiais registrados junto ao CEP / CONEP para emissão de relatórios e auditorias.
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    ethics.status === 'APROVADO'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : ethics.status === 'EM_ANALISE'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : ethics.status === 'PENDENCIA'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {ethics.status === 'APROVADO'
                    ? 'Aprovado pelo CEP'
                    : ethics.status === 'EM_ANALISE'
                    ? 'Em Apreciação Ética'
                    : ethics.status === 'PENDENCIA'
                    ? 'Com Pendência'
                    : 'Dispensado / Isento'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Situação da Aprovação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Situação da Aprovação Ética</span>
                  </label>
                  <select
                    value={ethics.status || 'APROVADO'}
                    onChange={(e) => {
                      setEthics({ ...ethics, status: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    <option value="APROVADO">Aprovado pelo CEP / CONEP</option>
                    <option value="EM_ANALISE">Em Análise / Tramitação Ética</option>
                    <option value="PENDENCIA">Com Pendência Documental</option>
                    <option value="DISPENSADO">Isento / Dispensado de Apreciação</option>
                  </select>
                </div>

                {/* 2. Número do Parecer Consubstanciado */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>Número do Parecer Consubstanciado</span>
                  </label>
                  <input
                    type="text"
                    value={ethics.approvalNumber || ''}
                    onChange={(e) => {
                      setEthics({ ...ethics, approvalNumber: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Ex: 5.842.193 ou 6.104.220"
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                {/* 3. CAAE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>CAAE (Certificado Ético)</span>
                  </label>
                  <input
                    type="text"
                    value={ethics.caae || ''}
                    onChange={(e) => {
                      setEthics({ ...ethics, caae: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Ex: 71234523.4.0000.0105"
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                {/* 4. Comitê de Ética / Instituição */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Comitê de Ética em Pesquisa (CEP) / Instituição</span>
                  </label>
                  <input
                    type="text"
                    value={ethics.institution || ''}
                    onChange={(e) => {
                      setEthics({ ...ethics, institution: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Ex: Comitê de Ética em Pesquisa - UEPG (Universidade Estadual de Ponta Grossa)"
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                {/* 5. Data de Aprovação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Data de Aprovação do Parecer</span>
                  </label>
                  <input
                    type="date"
                    value={ethics.approvalDate || ''}
                    onChange={(e) => {
                      setEthics({ ...ethics, approvalDate: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* 6. Observações e Condicionantes */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Condicionantes, Emendas ou Observações Regulatórias</span>
                </label>
                <textarea
                  rows={3}
                  value={ethics.notes || ''}
                  onChange={(e) => {
                    setEthics({ ...ethics, notes: e.target.value });
                    setIsDirty(true);
                  }}
                  placeholder="Registre aqui eventuais emendas ao protocolo aprovadas pelo CEP, condicionantes específicas, data prevista para envio do relatório semestral/final..."
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Botão de Salvar no Fundo do Formulário */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  <p>
                    Última sincronização ética realizada com segurança no banco de dados da UEPG.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-xs hover:shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando alterações...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Informações do CEP</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Checklist de Conformidade GCP & Rastreabilidade */}
            <div className="bg-slate-100/80 rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Checklist de Boas Práticas Clínicas (GCP / ICH E6 R2)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start space-x-2.5">
                  {hasCepPdf ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">Parecer do CEP em PDF</span>
                    <span className="text-[11px] text-slate-500">
                      {hasCepPdf ? 'Documento anexado no sistema' : 'Pendente de anexação'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start space-x-2.5">
                  {hasProjectPdf ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">Projeto Integral em PDF</span>
                    <span className="text-[11px] text-slate-500">
                      {hasProjectPdf ? 'Protocolo arquivado com sucesso' : 'Pendente de anexação'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start space-x-2.5">
                  {hasApprovalNumber && hasCaae ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">CAAE e Parecer</span>
                    <span className="text-[11px] text-slate-500">
                      {hasApprovalNumber && hasCaae
                        ? 'Registrados e rastreáveis'
                        : 'Preenchimento incompleto'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function RelatorioCepPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Carregando Documentos do CEP...</span>
          </div>
        </div>
      }
    >
      <RelatorioCepContent />
    </Suspense>
  );
}
