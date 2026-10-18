'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  MessageSquare,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Filter,
  X,
  UserCheck,
  ChevronRight,
  Shield,
  Stethoscope,
  ExternalLink,
} from 'lucide-react';

type Participation = {
  id: string;
  researchCode: string;
  status: string;
  group?: string | null;
  anamnesisDone: boolean;
  createdAt: string;
  project: {
    id: string;
    name: string;
    status: string;
  };
  sessions?: Array<{
    id: string;
    sessionNumber: number;
    sessionDate: string;
  }>;
};

type PatientData = {
  id: string;
  fullName: string;
  cpf: string;
  email?: string | null;
  phoneWhatsApp: string;
  address?: string | null;
  dateOfBirth: string;
  biologicalSex: string;
  comorbidities?: string | null;
  allergies?: string | null;
  medications?: string | null;
  chiefComplaint?: string | null;
  expectations?: string | null;
  createdAt: string;
  participations: Participation[];
};

export default function PacientesPage() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/patients');
      if (!res.ok) {
        throw new Error('Falha ao carregar lista de pacientes.');
      }
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (err: any) {
      console.error('Erro ao buscar pacientes:', err);
      setError(err?.message || 'Erro ao conectar ao banco de dados.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients(true);
  }, []);

  // Formatação segura de CPF (LGPD: 123.***.***-00)
  const formatCPF = (rawCpf: string) => {
    const clean = rawCpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
    }
    return rawCpf;
  };

  // Cálculo de idade a partir da data de nascimento
  const calculateAge = (dobString: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  // Estatísticas agregadas
  const stats = useMemo(() => {
    const total = patients.length;
    let inProtocol = 0;
    let inTriage = 0;

    patients.forEach((p) => {
      const hasActive = p.participations.some((part) => part.status === 'APPROVED');
      const hasPending = p.participations.some((part) => part.status === 'PENDING');
      if (hasActive) inProtocol++;
      else if (hasPending) inTriage++;
    });

    return { total, inProtocol, inTriage };
  }, [patients]);

  // Filtro e busca
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        patient.fullName.toLowerCase().includes(query) ||
        patient.cpf.replace(/\D/g, '').includes(query.replace(/\D/g, '')) ||
        patient.phoneWhatsApp.replace(/\D/g, '').includes(query.replace(/\D/g, '')) ||
        patient.participations.some(
          (part) =>
            part.researchCode.toLowerCase().includes(query) ||
            part.project.name.toLowerCase().includes(query)
        );

      if (!matchesQuery) return false;

      if (statusFilter === 'ACTIVE') {
        return patient.participations.some((part) => part.status === 'APPROVED');
      }
      if (statusFilter === 'PENDING') {
        return patient.participations.some((part) => part.status === 'PENDING');
      }

      return true;
    });
  }, [patients, searchQuery, statusFilter]);

  // Abertura de conversa no WhatsApp
  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá, ${name}! Entramos em contato a respeito da sua participação na pesquisa clínica da Odontologia UEPG.`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-[calc(100vh-57px)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Topo Limpo & Apresentação */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Prontuário Geral Unificado (LGPD)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span>Diretório de Pacientes</span>
              <button
                onClick={() => fetchPatients(false)}
                disabled={isRefreshing || loading}
                title="Recarregar pacientes"
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </h1>
            <p className="text-slate-500 mt-1 text-xs sm:text-sm">
              Visão centralizada de todos os voluntários cadastrados nos ensaios clínicos da UEPG.
            </p>
          </div>
        </div>

        {/* Cards de Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Pacientes</p>
              <p className="text-2xl font-black text-slate-900 leading-tight">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Em Protocolo Ativo</p>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-2xl font-black text-emerald-600 leading-tight">{stats.inProtocol}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fila de Triagem</p>
              <p className="text-2xl font-black text-amber-600 leading-tight">{stats.inTriage}</p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Segmented Control */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Ativos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === 'ACTIVE' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {stats.inProtocol}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Triagem</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === 'PENDING' ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {stats.inTriage}
              </span>
            </button>
          </div>

          {/* Caixa de Busca */}
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, WhatsApp ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabela de Pacientes */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-xs font-semibold text-slate-600">Carregando pacientes cadastrados...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
              <p className="font-bold text-sm">{error}</p>
              <button
                onClick={() => fetchPatients(true)}
                className="mt-3 px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl transition"
              >
                Tentar Novamente
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">Nenhum paciente encontrado.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Nenhum paciente corresponde aos termos de busca selecionados.'
                  : 'Nenhum paciente cadastrado no sistema ainda.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Limpar Busca
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 h-11">
                    <th className="py-3 px-5">Paciente</th>
                    <th className="py-3 px-4">Documento & Contato</th>
                    <th className="py-3 px-4">Estudos & Protocolos</th>
                    <th className="py-3 px-4">Sessões Clínicas</th>
                    <th className="py-3 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((patient) => {
                    const age = calculateAge(patient.dateOfBirth);
                    const primaryParticipation = patient.participations[0];

                    return (
                      <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Nome & Dados Demográficos */}
                        <td className="py-3.5 px-5 align-middle">
                          <div className="font-bold text-slate-900 text-sm">
                            {patient.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                            <span>{patient.biologicalSex}</span>
                            {age !== null && (
                              <>
                                <span>•</span>
                                <span>{age} anos</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Documento & Contato WhatsApp */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <div className="font-mono text-xs font-semibold text-slate-700">
                            {formatCPF(patient.cpf)}
                          </div>
                          <div className="mt-1 flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => openWhatsApp(patient.phoneWhatsApp, patient.fullName)}
                              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center space-x-1 hover:underline cursor-pointer"
                              title="Abrir conversa no WhatsApp"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{patient.phoneWhatsApp}</span>
                            </button>
                          </div>
                        </td>

                        {/* Estudos em que participa */}
                        <td className="py-3.5 px-4 align-middle">
                          {patient.participations.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">Nenhum estudo associado</span>
                          ) : (
                            <div className="space-y-1.5">
                              {patient.participations.map((part) => (
                                <div key={part.id} className="flex items-center space-x-2">
                                  <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded font-mono text-[10px] font-bold">
                                    {part.researchCode}
                                  </span>
                                  <Link
                                    href={`/dashboard?projectId=${part.project.id}`}
                                    className="text-xs font-semibold text-slate-800 hover:text-blue-600 truncate max-w-[180px] inline-block transition"
                                    title={part.project.name}
                                  >
                                    {part.project.name}
                                  </Link>
                                  {part.status === 'APPROVED' ? (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Ativo
                                    </span>
                                  ) : part.status === 'PENDING' ? (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Triagem
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                      {part.status}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Sessões Clínicas Realizadas */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          {patient.participations.map((part) => {
                            const sessionCount = part.sessions?.length || 0;
                            return (
                              <div key={part.id} className="flex items-center space-x-1.5 text-xs text-slate-600">
                                <Activity className="w-3.5 h-3.5 text-blue-600" />
                                <span>
                                  <strong>{sessionCount}</strong> sessão(ões) realizada(s)
                                </span>
                              </div>
                            );
                          })}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => openWhatsApp(patient.phoneWhatsApp, patient.fullName)}
                              className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition"
                              title="Conversar no WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            </button>

                            {primaryParticipation && (
                              <Link
                                href={`/dashboard?projectId=${primaryParticipation.project.id}`}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-2xs"
                                title="Abrir prontuário no estudo"
                              >
                                <span>Ver Prontuário</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
