'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Eye, Save, Clock } from 'lucide-react';

function TcleEditorContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [projectId, setProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    responsibleResearcher: '',
    advisor: '',
    institution: '',
    ethicsNumber: '',
    ethicsContacts: '',
    contentMarkdown: '',
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
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20">
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

        <div className="flex items-center space-x-3">
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
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. Identificação do Estudo e Pesquisadores Responsáveis
            </h3>

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
                  placeholder="Ex: Dra. Roberta Micheten Dias"
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
          </div>

          {/* Card: Conteúdo Textual do TCLE (Riscos, Benefícios, Split-Mouth) */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">
                2. Corpo do Termo (Objetivos, Riscos, Metodologia e Direitos)
              </h3>
              <span className="text-xs text-slate-400">Suporta formatação com títulos (#) e tópicos (-)</span>
            </div>

            <p className="text-xs text-slate-500">
              Adapte o texto abaixo para refletir fielmente o protocolo da sua pesquisa. Este texto será exibido integralmente para o voluntário ler antes da assinatura na tela.
            </p>

            <textarea
              rows={16}
              value={formData.contentMarkdown}
              onChange={(e) => setFormData({ ...formData, contentMarkdown: e.target.value })}
              className="w-full font-mono text-xs p-4 border border-slate-300 rounded-xl leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

        </form>
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
