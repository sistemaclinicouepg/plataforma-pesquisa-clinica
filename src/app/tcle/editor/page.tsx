'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Eye, Save, Clock, Sparkles, FileText, Phone, Mail } from 'lucide-react';
import { OFFICIAL_UEPG_TCLE } from '@/lib/tcleDefault';
import { StudySidebar, StudyMobileBar } from '@/components/StudySidebar';

function TcleEditorContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'tcle' | 'tale'>('tcle');

  const [formData, setFormData] = useState({
    title: '',
    responsibleResearcher: '',
    advisor: '',
    institution: '',
    ethicsNumber: '',
    ethicsContacts: '',
    contentMarkdown: '',
    assentContentMarkdown: '',
  });

  useEffect(() => {
    const fetchTcle = async () => {
      try {
        setLoading(true);
        let pId = projectIdParam;

        if (!pId) {
          const listRes = await fetch('/api/projects');
          if (listRes.ok) {
            const listData = await listRes.json();
            pId = listData.projects?.[0]?.id;
          }
        }

        if (pId) {
          setProjectId(pId);
          const res = await fetch(`/api/projects/${pId}/tcle`);
          if (res.ok) {
            const data = await res.json();
            if (data.consentForm) {
              setFormData({
                title: data.consentForm.title || '',
                responsibleResearcher: data.consentForm.responsibleResearcher || '',
                advisor: data.consentForm.advisor || '',
                institution: data.consentForm.institution || '',
                ethicsNumber: data.consentForm.ethicsNumber || '',
                ethicsContacts: data.consentForm.ethicsContacts || '',
                contentMarkdown: data.consentForm.contentMarkdown || '',
                assentContentMarkdown: data.consentForm.assentContentMarkdown || OFFICIAL_UEPG_TCLE.assentContentMarkdown,
              });
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar TCLE:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTcle();
  }, [projectIdParam]);

  const handleLoadOfficialTemplate = () => {
    if (
      window.confirm(
        'Deseja carregar o modelo oficial da UEPG ("TCLE PC vs PH")? Quaisquer alterações não salvas nos campos de texto serão substituídas pelo documento original aprovado.'
      )
    ) {
      setFormData({
        title: OFFICIAL_UEPG_TCLE.title,
        responsibleResearcher: OFFICIAL_UEPG_TCLE.responsibleResearcher,
        advisor: OFFICIAL_UEPG_TCLE.advisor,
        institution: OFFICIAL_UEPG_TCLE.institution,
        ethicsNumber: OFFICIAL_UEPG_TCLE.ethicsNumber,
        ethicsContacts: OFFICIAL_UEPG_TCLE.ethicsContacts,
        contentMarkdown: OFFICIAL_UEPG_TCLE.contentMarkdown,
        assentContentMarkdown: OFFICIAL_UEPG_TCLE.assentContentMarkdown,
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    try {
      setSaving(true);
      setSavedSuccess(false);

      const res = await fetch(`/api/projects/${projectId}/tcle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Erro ao salvar TCLE:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        <p className="animate-pulse">Carregando configurações do TCLE...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans text-slate-800 flex flex-col">
      <div className="flex-1 flex w-full relative">
        <StudySidebar
          projectId={projectId}
          activeItem="tcle"
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="flex-1 min-w-0 flex flex-col pb-20">
          {/* Barra Superior Mobile para Abrir Sidebar */}
          <StudyMobileBar
            projectName={formData.title || 'Termo de Aceite (TCLE)'}
            onOpenMenu={() => setMobileMenuOpen(true)}
          />

          {/* Topbar */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative shadow-xs">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard?projectId=${projectId}`} className="text-slate-500 hover:text-blue-600 text-sm font-semibold transition inline-flex items-center">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Voltar ao Painel</span>
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <h1 className="text-xl font-bold text-slate-900">
            Personalizador de TCLE (Consentimento Livre e Esclarecido)
          </h1>
          {savedSuccess && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Termo Atualizado com Sucesso!</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleLoadOfficialTemplate}
            className="px-3.5 py-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Carregar texto integral oficial do protocolo PC vs PH da UEPG"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Restaurar Modelo Oficial UEPG</span>
          </button>
          <Link
            href={`/tcle/demo?projectId=${projectId}`}
            target="_blank"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition inline-flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver Visão do Paciente</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Salvando...' : 'Salvar Termo do Estudo'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Card: Metadados Institucionais e Pesquisadores */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">
                1. Identificação do Estudo e Pesquisadores Responsáveis
              </h3>
              <span className="text-[11px] text-slate-400">Dados oficiais exigidos pelo CEP/CONEP</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Título Oficial da Pesquisa
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Pesquisador(a) Responsável
                </label>
                <input
                  type="text"
                  required
                  value={formData.responsibleResearcher}
                  onChange={(e) => setFormData({ ...formData, responsibleResearcher: e.target.value })}
                  placeholder="Ex: Roberta Micheten Dias"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Orientador(a) / Co-pesquisador
                </label>
                <input
                  type="text"
                  value={formData.advisor}
                  onChange={(e) => setFormData({ ...formData, advisor: e.target.value })}
                  placeholder="Ex: Profa. Dra. Alessandra Reis"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Instituição Proponente
                </label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Parecer do Comitê de Ética (CEP / CAAE)
                </label>
                <input
                  type="text"
                  value={formData.ethicsNumber}
                  onChange={(e) => setFormData({ ...formData, ethicsNumber: e.target.value })}
                  placeholder="Ex: Parecer nº 5.892.104"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Contatos do Comitê de Ética em Pesquisa (CEP)
              </label>
              <input
                type="text"
                value={formData.ethicsContacts}
                onChange={(e) => setFormData({ ...formData, ethicsContacts: e.target.value })}
                placeholder="Endereço, telefone e e-mail do CEP institucional para dúvidas do voluntário"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            {/* Aviso de contatos da pesquisadora no termo */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold">Contato da Pesquisadora no Protocolo:</span>
              <span className="text-blue-800 font-mono text-[11px]">
                Tel: (42) 99946-5140 • robertinhamicheten@hotmail.com
              </span>
            </div>
          </div>

          {/* Card: Conteúdo Textual do TCLE e TALE com Abas */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  2. Redação dos Termos de Esclarecimento
                </h3>
                <p className="text-xs text-slate-500">
                  Selecione a aba para editar o termo destinado a adultos (TCLE) ou a menores/vulneráveis (TALE).
                </p>
              </div>
              
              {/* Seletor de Abas */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('tcle')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'tcle' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  TCLE (Adultos)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tale')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'tale' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  TALE (Menores)
                </button>
              </div>
            </div>

            {activeTab === 'tcle' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Texto Integral do TCLE (Suporta Markdown #, ##, -):</span>
                  <span>Exibido antes da assinatura do voluntário</span>
                </div>
                <textarea
                  rows={18}
                  value={formData.contentMarkdown}
                  onChange={(e) => setFormData({ ...formData, contentMarkdown: e.target.value })}
                  className="w-full font-mono text-xs p-4 border border-slate-300 rounded-xl leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Texto do Termo de Consentimento Livre e Esclarecido..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span className="font-semibold text-purple-700">Texto do Termo de Assentimento (TALE):</span>
                  <span>Linguagem acessível para menores com leitura conjunta dos pais</span>
                </div>
                <textarea
                  rows={12}
                  value={formData.assentContentMarkdown}
                  onChange={(e) => setFormData({ ...formData, assentContentMarkdown: e.target.value })}
                  className="w-full font-mono text-xs p-4 border border-slate-300 rounded-xl leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Texto do Termo de Assentimento Livre e Esclarecido (para menores de idade)..."
                />
              </div>
            )}
          </div>

        </form>
      </div>
        </div>
      </div>
    </div>
  );
}

export default function TcleEditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando Editor...</div>}>
      <TcleEditorContent />
    </Suspense>
  );
}
