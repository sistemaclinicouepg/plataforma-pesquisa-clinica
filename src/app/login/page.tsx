'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPendingApproval(false);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isRequestingAccess) {
        // Cadastro de novo pesquisador
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Erro ao realizar cadastro.');
        }

        setSuccessMessage(data.message || 'Cadastro realizado! Aguarde a aprovação da Coordenação.');
        setIsRequestingAccess(false);
        setPassword('');
      } else {
        // Login
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.isPendingApproval) {
            setIsPendingApproval(true);
          }
          throw new Error(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        }

        // Redireciona para os projetos do pesquisador logado
        router.push('/projetos');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
    setIsPendingApproval(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      
      {/* Cabeçalho Institucional da Tela de Login */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold shadow-2xs mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>UEPG • Pós-Graduação em Odontologia Clínica</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Acesso ao Sistema Clínico
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {isRequestingAccess
            ? 'Cadastre-se para participar como pesquisador ou avaliador de ensaios clínicos.'
            : 'Entre com sua conta individual para gerenciar prontuários e pesquisas.'}
        </p>
      </div>

      {/* Cartão de Autenticação */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-3xl sm:px-10 border border-slate-200 space-y-6">
          
          {/* Mensagem de Sucesso */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-800 font-semibold space-y-1 animate-fadeIn">
              <p className="font-bold flex items-center space-x-1.5 text-sm">
                <span>✓</span>
                <span>Solicitação Enviada!</span>
              </p>
              <p>{successMessage}</p>
            </div>
          )}

          {/* Alerta de Aprovação Pendente */}
          {isPendingApproval && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 font-semibold space-y-1 animate-fadeIn">
              <p className="font-bold flex items-center space-x-1.5 text-sm">
                <span>⏳</span>
                <span>Conta Aguardando Aprovação</span>
              </p>
              <p>
                Seu cadastro foi registrado com sucesso, mas requer liberação prévia da Coordenação / Administrador do sistema.
              </p>
            </div>
          )}

          {/* Mensagem de Erro */}
          {error && !isPendingApproval && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-2xl text-xs text-red-800 font-bold animate-fadeIn">
              ⚠️ {error}
            </div>
          )}

          {/* Formulário */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRequestingAccess && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dra. Mariana Vasconcelos"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@uepg.br"
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Senha
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>{loading ? '⏳' : isRequestingAccess ? '📨' : '🔐'}</span>
                <span>
                  {loading
                    ? 'Validando...'
                    : isRequestingAccess
                    ? 'Enviar Solicitação de Cadastro'
                    : 'Acessar com Minha Conta'}
                </span>
              </button>
            </div>
          </form>

          {/* Alternância entre Login e Cadastro */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRequestingAccess(!isRequestingAccess);
                setError(null);
                setIsPendingApproval(false);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
            >
              {isRequestingAccess
                ? '← Já possui conta? Fazer Login'
                : 'Não tem conta? Solicitar cadastro como pesquisador / aluno →'}
            </button>
          </div>

          {/* Atalhos para Demonstração de Contas Independentes */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Alternador de Contas Independentes (Para Demonstração):
            </p>

            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('pesquisadora@uepg.br', '123')}
                className="w-full p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-900 transition flex items-center justify-between text-left"
              >
                <div>
                  <span className="font-bold block">👩‍⚕️ Dra. Roberta (Coordenadora)</span>
                  <span className="text-[10px] text-blue-700">Acesso pleno: prontuários, triagem, eCRF, alocação</span>
                </div>
                <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-md">Usar</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('carlos@uepg.br', '123')}
                className="w-full p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-900 transition flex items-center justify-between text-left"
              >
                <div>
                  <span className="font-bold block">🎓 Carlos Eduardo (Avaliador Cego)</span>
                  <span className="text-[10px] text-amber-700">Duplo-cego ativo: grupos e dores mascarados</span>
                </div>
                <span className="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded-md">Usar</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@uepg.br', 'admin')}
                className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-900 transition flex items-center justify-between text-left"
              >
                <div>
                  <span className="font-bold block">👑 Dra. Alessandra (Administradora Geral)</span>
                  <span className="text-[10px] text-purple-700">Aprovação de novos pesquisadores e todos os estudos</span>
                </div>
                <span className="text-[10px] bg-purple-600 text-white font-bold px-2 py-0.5 rounded-md">Usar</span>
              </button>
            </div>
          </div>

          {/* Link para o Portal do Paciente */}
          <div className="pt-2 text-center border-t border-slate-100">
            <Link
              href="/paciente"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center space-x-1"
            >
              <span>📱</span>
              <span>Você é voluntário(a) de uma pesquisa? Acesse o Portal do Paciente →</span>
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
