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
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  Trash2,
  RefreshCw,
  FileCheck2,
  BookOpen,
  Eye,
  AlertCircle,
  Folder,
  Clock,
  X,
  ExternalLink,
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

  // Metadados e Arquivos Éticos com cache instantâneo de inicialização (elimina delay visual)
  const [ethics, setEthics] = useState<EthicsApprovalConfig>(() => {
    if (typeof window !== 'undefined' && projectId) {
      try {
        const cached = sessionStorage.getItem(`uepg_ethics_${projectId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {
      status: 'APROVADO',
      approvalNumber: '',
      caae: '',
      institution: 'Comitê de Ética em Pesquisa - UEPG',
      approvalDate: '',
      notes: '',
    };
  });

  // Modal de visualização rápida de arquivo (Quick Look)
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    key?: string;
    size?: number;
    uploadedAt?: string;
  } | null>(null);
  const [openingPreview, setOpeningPreview] = useState(false);

  // Estados de Upload
  const [uploadingCep, setUploadingCep] = useState(false);
  const [uploadingProject, setUploadingProject] = useState(false);
  const [cepDragOver, setCepDragOver] = useState(false);
  const [projectDragOver, setProjectDragOver] = useState(false);

  const cepFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  // Fechar modal de visualização via tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Carregar dados do projeto com busca otimizada e persistência em cache
  useEffect(() => {
    let isMounted = true;
    async function fetchProject() {
      if (!projectId) {
        setLoading(false);
        return;
      }

      // Se já temos os anexos no cache inicial, evitamos travar a UI
      const hasInitialCache =
        typeof window !== 'undefined' && !!sessionStorage.getItem(`uepg_ethics_${projectId}`);
      if (!hasInitialCache) {
        setLoading(true);
      }

      try {
        // Carrega o projeto prioritariamente para renderizar os dados sem esperar a lista completa
        const projPromise = fetch(`/api/projects/${projectId}`).then(async (res) => {
          if (res.ok && isMounted) {
            const projData = await res.json();
            if (projData.project) {
              setProject(projData.project);
              const protocol = parseStudyProtocol(projData.project.anamnesisTemplate);
              const eth = protocol.ethicsApproval;
              if (eth) {
                const mergedEthics: EthicsApprovalConfig = {
                  ...eth,
                  institution: eth.institution || 'Comitê de Ética em Pesquisa - UEPG',
                  status: eth.status || 'APROVADO',
                };
                setEthics(mergedEthics);
                try {
                  sessionStorage.setItem(`uepg_ethics_${projectId}`, JSON.stringify(mergedEthics));
                } catch {}
              }
            }
          }
        });

        // Carrega a lista global de projetos em paralelo para a sidebar
        const allProjPromise = fetch('/api/projects').then(async (res) => {
          if (res.ok && isMounted) {
            const allData = await res.json();
            if (allData.projects) {
              setAllProjects(allData.projects);
            }
          }
        });

        await Promise.all([projPromise, allProjPromise]);
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

  // Upload resiliente de arquivo PDF (com conversão local imediata e tentativa de storage)
  const uploadPdfFile = async (file: File, type: 'cep' | 'project') => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Atenção: Por favor, selecione exclusivamente um arquivo no formato PDF.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Atenção: O arquivo excede o limite máximo permitido de 50 MB para documentos do CEP.');
      return;
    }

    const isCep = type === 'cep';
    if (isCep) setUploadingCep(true);
    else setUploadingProject(true);

    try {
      // 1. Converter localmente para Base64 (garantia absoluta de disponibilidade sem falhas de rede)
      const readerPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const localDataUrl = await readerPromise;

      let fileKey = `inline:${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      let finalUrl = localDataUrl;

      // 2. Tentar salvar no servidor (tenta Cloudflare R2 se configurado)
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', `estudos/${projectId || 'geral'}/cep`);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          if (result.key) fileKey = result.key;
          if (result.url && !result.url.startsWith('inline:')) {
            finalUrl = result.url;
          }
        }
      } catch (uploadErr) {
        console.warn('Aviso no upload para storage externo, utilizando persistência segura em banco:', uploadErr);
      }

      let nextEthics: EthicsApprovalConfig;
      if (isCep) {
        nextEthics = {
          ...ethics,
          cepPdfKey: fileKey,
          cepPdfUrl: finalUrl,
          cepPdfName: file.name,
          cepPdfSize: file.size,
          cepPdfUploadedAt: new Date().toISOString(),
        };
      } else {
        nextEthics = {
          ...ethics,
          projectPdfKey: fileKey,
          projectPdfUrl: finalUrl,
          projectPdfName: file.name,
          projectPdfSize: file.size,
          projectPdfUploadedAt: new Date().toISOString(),
        };
      }

      setEthics(nextEthics);
      setIsDirty(true);

      // Auto-salva no banco para que o documento persista imediatamente no prontuário
      await handleSave(nextEthics);
      setToastMessage(
        isCep
          ? 'Parecer do CEP/CONEP anexado e salvo com sucesso!'
          : 'Projeto de Pesquisa anexado e salvo com sucesso!'
      );
    } catch (err: any) {
      console.error('Erro no upload do arquivo:', err);
      alert(`Falha ao anexar arquivo: ${err.message || 'Erro desconhecido'}`);
    } finally {
      if (isCep) setUploadingCep(false);
      else setUploadingProject(false);
    }
  };

  // Visualizar arquivo em popup modal com opção de abrir em nova aba
  const handleOpenFile = async (
    url?: string,
    key?: string,
    fileName?: string,
    fileSize?: number,
    uploadedAt?: string
  ) => {
    if (!url && !key) {
      alert('Arquivo não localizado.');
      return;
    }

    setOpeningPreview(true);
    let previewUrl = url || '';

    // Se estiver em formato Base64 / Data URL: converte em Blob Object URL nativo para exibição fluida no iframe
    if (url && url.startsWith('data:')) {
      try {
        const base64Data = url.split(',')[1] || url;
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        previewUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.error('Erro ao converter PDF inline para Blob:', e);
      }
    } else if (key && !key.startsWith('inline:')) {
      // Se for chave externa (R2), busca URL assinada atualizada
      try {
        const res = await fetch(`/api/upload?key=${encodeURIComponent(key)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            previewUrl = data.url;
          }
        }
      } catch (e) {
        console.warn('Falha ao buscar URL assinada atualizada, usando URL cached:', e);
      }
    }

    setOpeningPreview(false);

    if (!previewUrl) {
      alert('Arquivo não localizado.');
      return;
    }

    setPreviewModal({
      isOpen: true,
      title: fileName || 'Documento_CEP.pdf',
      url: previewUrl,
      key,
      size: fileSize,
      uploadedAt,
    });
  };

  // Download do arquivo PDF diretamente para o computador
  const handleDownloadFile = (url?: string, fileName?: string) => {
    if (!url) {
      alert('Arquivo não localizado para download.');
      return;
    }

    if (url.startsWith('data:')) {
      try {
        const base64Data = url.split(',')[1] || url;
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || 'documento.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      } catch (e) {
        console.error('Erro ao realizar download do PDF:', e);
      }
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'documento.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  // Status dos arquivos anexados
  const hasCepPdf = !!ethics.cepPdfUrl || !!ethics.cepPdfKey;
  const hasProjectPdf = !!ethics.projectPdfUrl || !!ethics.projectPdfKey;

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
                  Documentos CEP / CONEP
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
                    <span>Salvar dados</span>
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
          <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Anexos do Comitê de Ética em Pesquisa (CEP / CONEP)</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Anexe abaixo o Parecer Consubstanciado e o Projeto de Pesquisa Completo em PDF para arquivamento e consulta da equipe.
              </p>
            </div>

            {/* Grid dos Documentos Principais (Uploads de PDF) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DOCUMENTO 1: Parecer Consubstanciado do CEP / CONEP */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span>1. Parecer de aceite / aprovação do CEP</span>
                        {hasCepPdf && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Anexado
                          </span>
                        )}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Parecer Consubstanciado emitido pelo CEP ou CONEP (PDF).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {loading && !hasCepPdf ? (
                    // Skeleton loader suave durante verificação (evita flash do dropzone)
                    <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs animate-pulse min-h-[110px]">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      <span className="font-semibold text-slate-600">Verificando parecer anexado...</span>
                    </div>
                  ) : hasCepPdf ? (
                    // Card do Arquivo Anexado
                    <div className="p-4 rounded-xl border border-emerald-200/90 bg-emerald-50/40 flex flex-col gap-3">
                      {/* Cabeçalho do arquivo com espaço livre para o nome e detalhes */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          onClick={() =>
                            handleOpenFile(
                              ethics.cepPdfUrl,
                              ethics.cepPdfKey,
                              ethics.cepPdfName,
                              ethics.cepPdfSize,
                              ethics.cepPdfUploadedAt
                            )
                          }
                          className="w-10 h-10 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 font-black text-xs shadow-2xs cursor-pointer transition"
                          title="Clique para visualizar parecer no popup"
                        >
                          PDF
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            onClick={() =>
                              handleOpenFile(
                                ethics.cepPdfUrl,
                                ethics.cepPdfKey,
                                ethics.cepPdfName,
                                ethics.cepPdfSize,
                                ethics.cepPdfUploadedAt
                              )
                            }
                            className="text-xs font-bold text-slate-900 hover:text-emerald-700 truncate cursor-pointer transition"
                            title={ethics.cepPdfName || 'Parecer_Consubstanciado_CEP.pdf'}
                          >
                            {ethics.cepPdfName || 'Parecer_Consubstanciado_CEP.pdf'}
                          </p>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-medium text-slate-600">{formatBytes(ethics.cepPdfSize)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatDateDisplay(ethics.cepPdfUploadedAt) || 'Recente'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Barra de ações organizada e sem sobreposição */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-emerald-200/60 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenFile(
                                ethics.cepPdfUrl,
                                ethics.cepPdfKey,
                                ethics.cepPdfName,
                                ethics.cepPdfSize,
                                ethics.cepPdfUploadedAt
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer"
                            title="Visualizar documento em popup"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Visualizar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadFile(ethics.cepPdfUrl, ethics.cepPdfName)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer"
                            title="Baixar arquivo PDF do parecer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Baixar</span>
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
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile('cep')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200 cursor-pointer shrink-0"
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
                            ? 'Anexando arquivo do parecer ao estudo...'
                            : 'Clique para selecionar ou arraste o Parecer Consubstanciado (PDF)'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Documento de aprovação ética emitido pelo CEP/CONEP • Formato PDF (até 50 MB)
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
                      O arquivo fica disponível de forma permanente para visualização e download de toda a equipe.
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
                        <span>2. Projeto de pesquisa completo (PDF)</span>
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
                  {loading && !hasProjectPdf ? (
                    // Skeleton loader suave durante verificação (evita flash do dropzone)
                    <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs animate-pulse min-h-[110px]">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="font-semibold text-slate-600">Verificando projeto anexado...</span>
                    </div>
                  ) : hasProjectPdf ? (
                    // Card do Arquivo Anexado
                    <div className="p-4 rounded-xl border border-blue-200/90 bg-blue-50/40 flex flex-col gap-3">
                      {/* Cabeçalho do arquivo com espaço livre para o nome e detalhes */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          onClick={() =>
                            handleOpenFile(
                              ethics.projectPdfUrl,
                              ethics.projectPdfKey,
                              ethics.projectPdfName,
                              ethics.projectPdfSize,
                              ethics.projectPdfUploadedAt
                            )
                          }
                          className="w-10 h-10 rounded-xl bg-blue-100 hover:bg-blue-200 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 font-black text-xs shadow-2xs cursor-pointer transition"
                          title="Clique para visualizar projeto no popup"
                        >
                          PDF
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            onClick={() =>
                              handleOpenFile(
                                ethics.projectPdfUrl,
                                ethics.projectPdfKey,
                                ethics.projectPdfName,
                                ethics.projectPdfSize,
                                ethics.projectPdfUploadedAt
                              )
                            }
                            className="text-xs font-bold text-slate-900 hover:text-blue-700 truncate cursor-pointer transition"
                            title={ethics.projectPdfName || 'Projeto_de_Pesquisa_Completo.pdf'}
                          >
                            {ethics.projectPdfName || 'Projeto_de_Pesquisa_Completo.pdf'}
                          </p>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-medium text-slate-600">{formatBytes(ethics.projectPdfSize)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatDateDisplay(ethics.projectPdfUploadedAt) || 'Recente'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Barra de ações organizada e sem sobreposição */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-blue-200/60 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenFile(
                                ethics.projectPdfUrl,
                                ethics.projectPdfKey,
                                ethics.projectPdfName,
                                ethics.projectPdfSize,
                                ethics.projectPdfUploadedAt
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-800 bg-white hover:bg-blue-100 border border-blue-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer"
                            title="Visualizar documento em popup"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Visualizar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadFile(ethics.projectPdfUrl, ethics.projectPdfName)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer"
                            title="Baixar arquivo PDF do projeto"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Baixar</span>
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
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile('project')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200 cursor-pointer shrink-0"
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
                            ? 'Anexando projeto de pesquisa ao estudo...'
                            : 'Clique para selecionar ou arraste o Projeto de Pesquisa Completo (PDF)'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Metodologia integral e protocolo aprovado • Formato PDF (até 50 MB)
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
                      Permite que qualquer pesquisador do estudo consulte a metodologia e critérios na cadeira clínica.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modal popup de visualização rápida do documento */}
      {previewModal && previewModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra de Título / Cabeçalho */}
            <div className="px-4 sm:px-6 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  PDF
                </div>
                <div className="min-w-0">
                  <h3
                    className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md md:max-w-xl"
                    title={previewModal.title}
                  >
                    {previewModal.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    {previewModal.size && <span>{formatBytes(previewModal.size)}</span>}
                    {previewModal.size && previewModal.uploadedAt && <span>•</span>}
                    {previewModal.uploadedAt && (
                      <span>{formatDateDisplay(previewModal.uploadedAt)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Popup */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.open(previewModal.url, '_blank')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  title="Abrir arquivo em uma página separada do navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Abrir em página separada</span>
                  <span className="sm:hidden">Nova Aba</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFile(previewModal.url, previewModal.title)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  title="Baixar arquivo para o computador"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar visualização (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Visualizador de PDF Embutido */}
            <div className="flex-1 w-full bg-slate-800 relative overflow-hidden flex flex-col">
              <iframe
                src={`${previewModal.url}#toolbar=1`}
                className="w-full flex-1 border-0"
                title={previewModal.title}
              />
            </div>
          </div>
        </div>
      )}
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
