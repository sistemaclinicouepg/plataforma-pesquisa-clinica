'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, Printer, Users } from 'lucide-react';
import { formatDisplayHash } from '@/lib/cryptoHash';

type TCLEData = {
  title: string;
  responsibleResearcher: string;
  advisor?: string | null;
  institution: string;
  ethicsNumber?: string | null;
  ethicsContacts?: string | null;
  contentMarkdown: string;
  assentContentMarkdown?: string | null;
};

type AuditResult = {
  signatureId: string;
  signedAt: string;
  signatureHash?: string | null;
  isAssent?: boolean;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  audit: {
    ipAddress: string;
    userAgent: string;
    hash?: string | null;
  };
};

function PatientTcleContent() {
  const routeParams = useParams();
  const rawId = routeParams?.participantId;
  const participantId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const [tcle, setTcle] = useState<TCLEData | null>(null);
  const [loading, setLoading] = useState(true);
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  // Informações de menor de idade e TALE
  const [isMinor, setIsMinor] = useState(false);
  const [requiresAssent, setRequiresAssent] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianCpf, setGuardianCpf] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('Mãe');
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);

  // Canvas do Participante
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Canvas do Responsável Legal (TALE)
  const guardianCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGuardianDrawing, setIsGuardianDrawing] = useState(false);
  const [hasGuardianSignature, setHasGuardianSignature] = useState(false);

  useEffect(() => {
    if (!participantId) return;

    let isMounted = true;
    const loadTCLE = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tcle/participant/${participantId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setTcle(data.consentForm);
            setIsMinor(Boolean(data.isMinor));
            setRequiresAssent(Boolean(data.requiresAssent));

            if (data.existingSignature) {
              setAuditResult({
                signatureId: data.existingSignature.id,
                signedAt: data.existingSignature.signedAt,
                signatureHash: data.existingSignature.signatureHash,
                isAssent: data.existingSignature.isAssent,
                guardianName: data.existingSignature.guardianName,
                guardianRelationship: data.existingSignature.guardianRelationship,
                audit: {
                  ipAddress: data.existingSignature.ipAddress || '127.0.0.1',
                  userAgent: data.existingSignature.userAgent || 'Navegador Web',
                  hash: data.existingSignature.signatureHash,
                },
              });
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar TCLE:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTCLE();
    return () => {
      isMounted = false;
    };
  }, [participantId]);

  // Funções do Canvas do Participante
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Funções do Canvas do Responsável Legal (TALE)
  const startGuardianDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = guardianCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsGuardianDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
  };

  const drawGuardian = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isGuardianDrawing) return;
    const canvas = guardianCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasGuardianSignature(true);
  };

  const stopGuardianDrawing = () => {
    setIsGuardianDrawing(false);
  };

  const clearGuardianCanvas = () => {
    const canvas = guardianCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasGuardianSignature(false);
  };

  const handleSign = async () => {
    if (!hasSignature || !readConfirmed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isAssentSign = Boolean(isMinor && requiresAssent);

    if (isAssentSign) {
      if (!guardianName.trim() || !guardianCpf.trim() || !hasGuardianSignature || !guardianConfirmed) {
        setSignError('Para menores de 18 anos, é obrigatório o preenchimento de todos os dados e assinatura do responsável legal.');
        return;
      }
    }

    try {
      setSigning(true);
      setSignError(null);
      const signatureDataUrl = canvas.toDataURL('image/png');
      const guardianSignatureDataUrl = isAssentSign && guardianCanvasRef.current
        ? guardianCanvasRef.current.toDataURL('image/png')
        : undefined;

      const res = await fetch('/api/tcle/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participantId,
          signatureData: signatureDataUrl,
          isAssent: isAssentSign,
          guardianName: isAssentSign ? guardianName.trim() : undefined,
          guardianCpf: isAssentSign ? guardianCpf.trim() : undefined,
          guardianRelationship: isAssentSign ? guardianRelationship : undefined,
          guardianSignatureData: guardianSignatureDataUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAuditResult(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setSignError(data.error || 'Erro ao registrar assinatura eletrônica. Por favor, tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao enviar assinatura:', err);
      setSignError('Erro de conexão ao enviar assinatura eletrônica. Verifique sua conexão.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        <p className="animate-pulse text-xs">Carregando Termo de Consentimento...</p>
      </div>
    );
  }

  if (!tcle) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Termo Não Encontrado</h2>
          <p className="text-xs text-slate-500 mb-6">
            Não foi possível localizar o Termo de Consentimento para este participante.
          </p>
          <Link
            href="/paciente"
            className="w-full inline-block py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Ir para o Portal do Paciente
          </Link>
        </div>
      </div>
    );
  }

  // TELA DE TERMO ASSINADO COM CERTIFICADO E BOTÃO PARA BAIXAR PDF
  if (auditResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-slate-800">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          
          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {auditResult.isAssent ? 'TALE Assinado' : 'TCLE Assinado'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Consentimento Registrado!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Documento validado eletronicamente em conformidade com as resoluções CNS 466/2012 e a Lei nº 13.709/2018 (LGPD).
            </p>
          </div>

          {/* Selo Criptográfico de Auditoria */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2 font-mono text-slate-700">
            <div className="flex items-center space-x-1.5 text-emerald-700 font-bold border-b border-slate-200 pb-1.5 text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Selo Criptográfico de Integridade</span>
            </div>
            <p><strong>Código de Auditoria:</strong> {auditResult.signatureId}</p>
            <p><strong>Data e Hora:</strong> {new Date(auditResult.signedAt).toLocaleString('pt-BR')}</p>
            <p><strong>Endereço IP:</strong> {auditResult.audit.ipAddress}</p>
            {auditResult.signatureHash && (
              <p className="break-all pt-1 border-t border-slate-200 text-[10px]">
                <strong>Hash SHA-256:</strong>{' '}
                <span className="text-blue-700 font-bold">
                  {formatDisplayHash(auditResult.signatureHash)}
                </span>
              </p>
            )}
            {auditResult.guardianName && (
              <p className="pt-1 border-t border-slate-200 text-[10px] text-slate-600">
                <strong>Responsável Legal:</strong> {auditResult.guardianName} ({auditResult.guardianRelationship})
              </p>
            )}
          </div>

          {/* Ações de Impressão / PDF e Avançar */}
          <div className="space-y-2 pt-2">
            <Link
              href={`/tcle/${participantId}/pdf`}
              target="_blank"
              className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Baixar / Imprimir Cópia Oficial em PDF</span>
            </Link>

            <Link
              href={participantId && participantId !== 'demo' ? `/paciente?participantId=${participantId}` : '/paciente'}
              className="w-full inline-block py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Avançar para o Diário Clínico do Paciente →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE ASSINATURA ELETRÔNICA
  const isAssentMode = Boolean(isMinor && requiresAssent);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 py-6 px-3 sm:px-6 flex justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Cabeçalho Institucional do TCLE/TALE */}
        <header className="bg-blue-700 text-white p-6 text-center border-b border-blue-800">
          <p className="text-blue-200 text-xs font-semibold tracking-wider uppercase mb-1">
            {tcle?.institution || 'Universidade Estadual de Ponta Grossa – UEPG'}
          </p>
          <div className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white mb-1.5">
            {isAssentMode ? 'Termo de Assentimento Livre e Esclarecido (TALE)' : 'Termo de Consentimento Livre e Esclarecido (TCLE)'}
          </div>
          <h1 className="text-lg sm:text-xl font-bold leading-snug">
            {isAssentMode ? 'Assentimento Livre e Esclarecido' : 'Consentimento Livre e Esclarecido'}
          </h1>
          <p className="text-xs text-blue-200 mt-2 line-clamp-2">
            Pesquisa: {tcle?.title}
          </p>
        </header>

        {/* Informações dos Pesquisadores e Ética */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 text-xs space-y-1 text-slate-600">
          <p><strong>Pesquisadora Responsável:</strong> {tcle?.responsibleResearcher}</p>
          {tcle?.advisor && <p><strong>Orientadora:</strong> {tcle.advisor}</p>}
          {tcle?.ethicsNumber && (
            <p><strong>Comitê de Ética:</strong> Aprovado sob {tcle.ethicsNumber}</p>
          )}
          {isAssentMode && (
            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center space-x-2">
              <Users className="w-4 h-4 shrink-0 text-amber-700" />
              <span>
                <strong>Participante Menor de Idade / Vulnerável:</strong> Este documento requer a leitura conjunta e a assinatura do participante e do seu responsável legal.
              </span>
            </div>
          )}
        </div>

        {/* Corpo do Texto Completo do TCLE / TALE */}
        <main className="p-6 space-y-5 text-xs text-slate-700 leading-relaxed overflow-y-auto max-h-[42vh] border-b border-slate-200 bg-white">
          <div className="whitespace-pre-line">
            {isAssentMode && tcle?.assentContentMarkdown
              ? tcle.assentContentMarkdown
              : tcle?.contentMarkdown}
          </div>

          {tcle?.ethicsContacts && (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-900 mt-4">
              <strong>Dúvidas sobre seus direitos como participante:</strong> <br/>
              {tcle.ethicsContacts}
            </div>
          )}
        </main>

        {/* Declaração de Leitura e Assinaturas */}
        <div className="p-6 bg-slate-50 space-y-6">
          
          <label className="flex items-start space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={readConfirmed}
              onChange={(e) => setReadConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-800 font-medium leading-tight">
              Declaro que li este documento, todas as dúvidas foram esclarecidas e <strong>concordo voluntariamente em participar</strong> desta pesquisa clínica.
            </span>
          </label>

          {/* Quadro 1: Assinatura do Participante */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">
                {isAssentMode ? 'Assinatura do Participante (Assentimento):' : 'Assinatura do Participante:'}
              </span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-blue-600 hover:text-blue-800 font-medium underline text-[11px]"
              >
                Limpar
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white relative overflow-hidden shadow-inner touch-none">
              <canvas
                ref={canvasRef}
                width={500}
                height={140}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 cursor-crosshair"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Assine Aqui com o Dedo
                </div>
              )}
            </div>
          </div>

          {/* Bloco TALE: Responsável Legal */}
          {isAssentMode && (
            <div className="p-4 bg-white rounded-2xl border border-slate-300 space-y-4 shadow-xs">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Users className="w-4 h-4 text-blue-700 shrink-0" />
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                  Autorização do Responsável Legal (Obrigatório)
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome Completo do Responsável: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria dos Santos"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      CPF do Responsável: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={guardianCpf}
                      onChange={(e) => setGuardianCpf(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Grau de Parentesco / Vínculo: *
                    </label>
                    <select
                      value={guardianRelationship}
                      onChange={(e) => setGuardianRelationship(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Mãe">Mãe</option>
                      <option value="Pai">Pai</option>
                      <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                      <option value="Guardião(ã) Legal">Guardião(ã) Legal</option>
                      <option value="Outro Responsável Legal">Outro Responsável Legal</option>
                    </select>
                  </div>
                </div>

                {/* Quadro 2: Assinatura do Responsável Legal */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">Assinatura do Responsável Legal: *</span>
                    <button
                      type="button"
                      onClick={clearGuardianCanvas}
                      className="text-blue-600 hover:text-blue-800 font-medium underline text-[11px]"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 relative overflow-hidden shadow-inner touch-none">
                    <canvas
                      ref={guardianCanvasRef}
                      width={500}
                      height={140}
                      onMouseDown={startGuardianDrawing}
                      onMouseMove={drawGuardian}
                      onMouseUp={stopGuardianDrawing}
                      onMouseLeave={stopGuardianDrawing}
                      onTouchStart={startGuardianDrawing}
                      onTouchMove={drawGuardian}
                      onTouchEnd={stopGuardianDrawing}
                      className="w-full h-36 cursor-crosshair"
                    />
                    {!hasGuardianSignature && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-semibold uppercase tracking-wider">
                        Assinatura do Responsável Aqui
                      </div>
                    )}
                  </div>
                </div>

                <label className="flex items-start space-x-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={guardianConfirmed}
                    onChange={(e) => setGuardianConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-700 leading-tight">
                    Declaro ser responsável legal pelo participante menor de 18 anos e <strong>autorizo expressamente sua participação</strong> no ensaio clínico da UEPG.
                  </span>
                </label>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Assinatura eletrônica protegida com carimbo criptográfico SHA-256 e trilha de auditoria CNS 466/12.</span>
          </p>

          {signError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{signError}</span>
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={
              !hasSignature ||
              !readConfirmed ||
              signing ||
              (isAssentMode && (!hasGuardianSignature || !guardianName.trim() || !guardianCpf.trim() || !guardianConfirmed))
            }
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{signing ? 'Registrando Assinatura Eletrônica...' : 'Confirmar e Assinar Eletronicamente'}</span>
          </button>

        </div>

      </div>
    </div>
  );
}

export default function PatientTclePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
          <p className="animate-pulse text-sm font-semibold">Carregando Termo de Consentimento Livre e Esclarecido...</p>
        </div>
      }
    >
      <PatientTcleContent />
    </Suspense>
  );
}
