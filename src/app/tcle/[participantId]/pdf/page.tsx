'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft, ShieldCheck, CheckCircle2, Lock, FileCheck } from 'lucide-react';
import { formatDisplayHash } from '@/lib/cryptoHash';
import { formatUserAgent } from '@/lib/formatUserAgent';

type TCLEPdfData = {
  consentForm: {
    title: string;
    responsibleResearcher: string;
    advisor: string | null;
    institution: string;
    ethicsNumber: string | null;
    ethicsContacts: string | null;
    contentMarkdown: string;
    assentContentMarkdown: string | null;
  };
  isMinor: boolean;
  requiresAssent: boolean;
  existingSignature: {
    id: string;
    participantName: string;
    cpf: string;
    signatureData: string;
    signatureHash: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    isAssent: boolean;
    guardianName: string | null;
    guardianCpf: string | null;
    guardianRelationship: string | null;
    guardianSignatureData: string | null;
    signedAt: string;
  } | null;
  participant: {
    id: string;
    researchCode: string;
    fullName: string;
    cpf: string;
    dateOfBirth: string | null;
    projectName: string;
    projectId: string;
  };
};

function TclePdfContent() {
  const routeParams = useParams();
  const rawId = routeParams?.participantId;
  const participantId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const [data, setData] = useState<TCLEPdfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!participantId) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch(`/api/tcle/participant/${participantId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Não foi possível localizar os registros do termo.');
        }
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar documento.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [participantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
        <p className="animate-pulse text-sm font-semibold">Gerando visualização oficial do documento do TCLE...</p>
        <p className="text-xs text-slate-400 mt-1">Carregando autenticação criptográfica e registros éticos...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow border border-slate-200">
          <p className="text-red-600 font-bold mb-2">Erro ao carregar documento</p>
          <p className="text-xs text-slate-500 mb-6">{errorMsg || 'Dados indisponíveis.'}</p>
          <Link
            href={participantId ? `/tcle/${participantId}` : '/dashboard'}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-block"
          >
            ← Voltar para a página do termo
          </Link>
        </div>
      </div>
    );
  }

  const { consentForm, participant, existingSignature, isMinor, requiresAssent } = data;
  const isAssentDoc = Boolean(existingSignature?.isAssent || (isMinor && requiresAssent));

  return (
    <div className="min-h-screen bg-slate-200/70 py-6 px-2 sm:px-6 print:p-0 print:bg-white text-slate-900 font-serif">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 print:hidden font-sans">
        <Link
          href={`/tcle/${participantId}`}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Portal</span>
        </Link>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Conformidade: CNS 466/12 & LGPD
          </span>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar em PDF</span>
          </button>
        </div>
      </div>

      {/* Folha Oficial A4 de Alta Fidelidade */}
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-14 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-0 print:rounded-none">
        
        {/* Cabeçalho Institucional Oficial */}
        <header className="border-b-2 border-slate-900 pb-5 mb-6 text-center font-sans">
          <p className="text-[11px] font-black tracking-widest uppercase text-slate-600">
            República Federativa do Brasil • Estado do Paraná
          </p>
          <h1 className="text-base sm:text-lg font-black uppercase text-slate-900 mt-1 leading-tight">
            Universidade Estadual de Ponta Grossa – UEPG
          </h1>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            Setor de Ciências Biológicas e da Saúde • Departamento de Odontologia
          </p>
          <p className="text-[11px] text-slate-500">
            Comitê de Ética em Pesquisa Envolvendo Seres Humanos (CEP/CONEP)
          </p>
        </header>

        {/* Título do Documento */}
        <div className="text-center mb-6">
          <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider font-sans">
            {isAssentDoc ? 'DOCUMENTO OFICIAL TALE' : 'DOCUMENTO OFICIAL TCLE'}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
            {isAssentDoc
              ? 'Termo de Assentimento Livre e Esclarecido (TALE)'
              : 'Termo de Consentimento Livre e Esclarecido (TCLE)'}
          </h2>
          <p className="text-xs text-slate-600 italic mt-1 max-w-xl mx-auto">
            Em estrita conformidade com a Resolução CNS nº 466/2012, Norma Operacional nº 001/2013 do CNS/Conep e Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
          </p>
        </div>

        {/* Quadro Informativo do Estudo & Pesquisadores */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs font-sans space-y-1.5 mb-6 leading-relaxed">
          <p>
            <strong>Título da Pesquisa:</strong> {consentForm.title}
          </p>
          <p>
            <strong>Pesquisadora Responsável:</strong> {consentForm.responsibleResearcher}
          </p>
          {consentForm.advisor && (
            <p>
              <strong>Orientadora Científica:</strong> {consentForm.advisor}
            </p>
          )}
          <p>
            <strong>Instituição Proponente:</strong> {consentForm.institution}
          </p>
          {consentForm.ethicsNumber && (
            <p>
              <strong>Protocolo de Aprovação CEP:</strong> {consentForm.ethicsNumber}
            </p>
          )}
          {consentForm.ethicsContacts && (
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              <strong>Contatos do CEP:</strong> {consentForm.ethicsContacts}
            </p>
          )}
        </div>

        {/* Dados do Participante */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 text-xs font-sans grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          <div>
            <span className="text-slate-500 block text-[11px]">Participante:</span>
            <span className="font-bold text-slate-900">{participant.fullName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Código no Estudo:</span>
            <span className="font-mono font-bold text-blue-800">{participant.researchCode}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">CPF:</span>
            <span className="font-mono text-slate-800">{participant.cpf}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Classificação:</span>
            <span className="font-semibold text-slate-800">
              {isMinor ? 'Menor de 18 anos (Participante com Assentimento)' : 'Adulto Capacitado'}
            </span>
          </div>

          {/* Dados do Responsável Legal (se aplicável) */}
          {(isMinor || existingSignature?.guardianName) && (
            <div className="sm:col-span-2 pt-2 border-t border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-0.5">Responsável Legal Cadastrado:</span>
              <p className="text-slate-700">
                Nome: <strong>{existingSignature?.guardianName || 'Aguardando cadastro no ato da assinatura'}</strong> | 
                CPF: <strong className="font-mono">{existingSignature?.guardianCpf || '---'}</strong> | 
                Vínculo: <strong>{existingSignature?.guardianRelationship || 'Responsável Legal'}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Conteúdo Integral do Termo */}
        <div className="text-xs sm:text-[13px] leading-relaxed text-slate-800 space-y-4 mb-8 text-justify">
          <div className="whitespace-pre-line">
            {isAssentDoc && consentForm.assentContentMarkdown
              ? consentForm.assentContentMarkdown
              : consentForm.contentMarkdown}
          </div>
        </div>

        {/* Declaração de Aquiescência Oficial */}
        <div className="p-4 bg-slate-50 border-l-4 border-slate-900 rounded-r-xl text-xs mb-8 font-sans">
          <p className="font-bold text-slate-900 mb-1 text-[11px] uppercase tracking-wider">
            Declaração do Participante:
          </p>
          <p className="italic text-slate-700 leading-normal">
            &ldquo;Declaro que li este Termo de Consentimento Livre e Esclarecido; tive oportunidade de fazer perguntas; todas as minhas dúvidas foram esclarecidas; fui informado(a) sobre os objetivos, procedimentos, riscos, benefícios e meus direitos; recebi informações suficientes para decidir livremente e concordo voluntariamente em participar desta pesquisa. Também declaro estar ciente de que poderei retirar meu consentimento a qualquer momento, sem sofrer qualquer prejuízo.&rdquo;
          </p>
        </div>

        {/* Área de Assinaturas e Carimbo Criptográfico */}
        <div className="border-t-2 border-slate-900 pt-6 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            {/* Assinatura do Participante */}
            <div className="text-center font-sans">
              <div className="h-20 flex items-center justify-center border-b border-slate-400 mb-2">
                {existingSignature?.signatureData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={existingSignature.signatureData}
                    alt="Assinatura Eletrônica do Participante"
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400 italic font-mono">[Aguardando Assinatura]</span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-900">{participant.fullName}</p>
              <p className="text-[10px] text-slate-500 font-mono">CPF: {participant.cpf}</p>
              <p className="text-[10px] text-slate-500">
                {isMinor ? 'Assinatura do Participante (Assentimento)' : 'Assinatura do Participante da Pesquisa'}
              </p>
            </div>

            {/* Assinatura do Responsável Legal (se aplicável) ou Pesquisador */}
            <div className="text-center font-sans">
              <div className="h-20 flex items-center justify-center border-b border-slate-400 mb-2">
                {existingSignature?.guardianSignatureData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={existingSignature.guardianSignatureData}
                    alt="Assinatura do Responsável Legal"
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : isMinor ? (
                  <span className="text-xs text-slate-400 italic font-mono">[Aguardando Assinatura do Responsável]</span>
                ) : (
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800">{consentForm.responsibleResearcher}</p>
                    <p className="text-[10px] text-slate-500">Pesquisadora Responsável UEPG</p>
                  </div>
                )}
              </div>

              {isMinor ? (
                <>
                  <p className="text-xs font-bold text-slate-900">
                    {existingSignature?.guardianName || 'Nome do Responsável Legal'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    CPF: {existingSignature?.guardianCpf || '---'} ({existingSignature?.guardianRelationship || 'Responsável'})
                  </p>
                  <p className="text-[10px] text-slate-500">Assinatura do Responsável Legal pelo Menor</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-900">{consentForm.responsibleResearcher}</p>
                  <p className="text-[10px] text-slate-500">Pesquisadora Responsável • UEPG</p>
                  <p className="text-[9px] text-slate-400 font-sans">
                    Tel: (42) 99946-5140 • robertinhamicheten@hotmail.com
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Carimbo Digital de Validação Criptográfica (LGPD / CNS 466/12) */}
          {existingSignature && (
            <div className="mt-8 p-4 rounded-2xl border-2 border-slate-800 bg-slate-50 text-[11px] font-mono text-slate-700 space-y-1.5 shadow-xs font-sans">
              <div className="flex items-center space-x-2 text-slate-900 border-b border-slate-200 pb-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Certificado de Assinatura Eletrônica e Autenticidade Digital
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <p>
                  <strong className="text-slate-900">ID de Registro:</strong> {existingSignature.id}
                </p>
                <p>
                  <strong className="text-slate-900">Data/Hora (UTC):</strong>{' '}
                  {new Date(existingSignature.signedAt).toISOString()}
                </p>
                <p>
                  <strong className="text-slate-900">Data/Hora (Brasília):</strong>{' '}
                  {new Date(existingSignature.signedAt).toLocaleString('pt-BR')}
                </p>
                <p>
                  <strong className="text-slate-900">Endereço IP Registrado:</strong>{' '}
                  {existingSignature.ipAddress || '127.0.0.1'}
                </p>
                <div className="sm:col-span-2">
                  <p>
                    <strong className="text-slate-900">Dispositivo/Navegador:</strong>{' '}
                    <span className="font-semibold text-slate-800">
                      {formatUserAgent(existingSignature.userAgent)}
                    </span>
                  </p>
                  {existingSignature.userAgent && (
                    <p className="text-[9px] text-slate-400 font-mono truncate" title={existingSignature.userAgent}>
                      String Técnica: {existingSignature.userAgent}
                    </p>
                  )}
                </div>
                <p className="sm:col-span-2 pt-1 border-t border-slate-200 break-all">
                  <strong className="text-slate-900">Hash SHA-256 de Integridade:</strong>{' '}
                  <span className="text-blue-900 font-bold">
                    {formatDisplayHash(existingSignature.signatureHash || '')}
                  </span>
                </p>
              </div>

              <p className="text-[9px] text-slate-500 pt-1 border-t border-slate-200 leading-tight">
                Documento assinado eletronicamente nos termos do art. 10, § 2º da Medida Provisória nº 2.200-2/2001, da Resolução CNS nº 466/2012 e da Lei nº 13.709/2018 (LGPD). A integridade do documento é verificável pelo hash criptográfico SHA-256.
              </p>
            </div>
          )}

          {/* Vias do Termo */}
          <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 border-t border-slate-300 pt-3 gap-1">
            <span><strong>1ª via:</strong> Pesquisador (Arquivo institucional UEPG)</span>
            <span><strong>2ª via:</strong> Participante da pesquisa (Via de guarda do participante)</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function TclePdfPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
          <p className="animate-pulse text-sm font-semibold">Gerando visualização oficial do documento do TCLE...</p>
        </div>
      }
    >
      <TclePdfContent />
    </Suspense>
  );
}
