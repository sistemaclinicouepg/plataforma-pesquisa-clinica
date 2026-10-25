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
  ChevronDown,
  FolderKanban,
  Shield,
  Stethoscope,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Save,
  Check,
} from 'lucide-react';
import { ClinicalTriageFields } from '@/components/ClinicalTriageFields';

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

type ProjectOption = {
  id: string;
  name: string;
  status: string;
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function PacientesPage() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Controle de linhas expandidas para exibir detalhes de estudos e sessões
  const [expandedPatientIds, setExpandedPatientIds] = useState<Set<string>>(new Set());

  const toggleExpandPatient = (patientId: string) => {
    setExpandedPatientIds((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  // Modais de Administração
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Estado do formulário de Novo Paciente
  const [newPatientForm, setNewPatientForm] = useState({
    fullName: '',
    cpf: '',
    phoneWhatsApp: '',
    email: '',
    dateOfBirth: '1995-01-01',
    biologicalSex: 'Feminino',
    address: '',
    chiefComplaint: '',
    expectations: '',
    comorbidities: '',
    allergies: '',
    medications: '',
    projectId: '', // Opcional: vincular imediatamente a um estudo
  });

  // Estado do formulário de Edição
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);
  const [editPatientForm, setEditPatientForm] = useState({
    fullName: '',
    cpf: '',
    phoneWhatsApp: '',
    email: '',
    dateOfBirth: '',
    biologicalSex: 'Feminino',
    address: '',
    chiefComplaint: '',
    expectations: '',
    comorbidities: '',
    allergies: '',
    medications: '',
    reason: 'Atualização cadastral no prontuário por administrador',
  });

  // Estado do modal de Exclusão
  const [deletingPatient, setDeletingPatient] = useState<PatientData | null>(null);
  const [deleteReason, setDeleteReason] = useState('Exclusão definitiva solicitada por administrador');

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br';

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('uepg_auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.warn('Erro ao verificar autenticação:', e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.warn('Erro ao buscar lista de projetos:', e);
    }
  };

  const fetchPatients = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/patients', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
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
    fetchCurrentUser();
    fetchProjects();
    fetchPatients(true);
  }, []);

  // Máscara de CPF
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Formatação segura de CPF para exibição (LGPD: 123.***.***-00)
  const formatCPF = (rawCpf: string) => {
    const clean = rawCpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
    }
    return rawCpf;
  };

  // Cálculo de idade
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

  // Abrir Modal de Edição
  const handleOpenEdit = (patient: PatientData) => {
    setEditingPatient(patient);
    setEditPatientForm({
      fullName: patient.fullName || '',
      cpf: patient.cpf || '',
      phoneWhatsApp: patient.phoneWhatsApp || '',
      email: patient.email || '',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '1995-01-01',
      biologicalSex: patient.biologicalSex || 'Feminino',
      address: patient.address || '',
      chiefComplaint: patient.chiefComplaint || '',
      expectations: patient.expectations || '',
      comorbidities: patient.comorbidities || '',
      allergies: patient.allergies || '',
      medications: patient.medications || '',
      reason: 'Atualização cadastral de rotina por administrador',
    });
    setModalFeedback(null);
    setShowEditModal(true);
  };

  // Salvar Novo Paciente
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalFeedback(null);

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(newPatientForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar paciente.');
      }

      setModalFeedback({ type: 'success', text: 'Paciente cadastrado com sucesso!' });
      setTimeout(() => {
        setShowNewModal(false);
        setModalFeedback(null);
        setNewPatientForm({
          fullName: '',
          cpf: '',
          phoneWhatsApp: '',
          email: '',
          dateOfBirth: '1995-01-01',
          biologicalSex: 'Feminino',
          address: '',
          chiefComplaint: '',
          expectations: '',
          comorbidities: '',
          allergies: '',
          medications: '',
          projectId: '',
        });
        fetchPatients(false);
      }, 700);
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Erro ao criar paciente.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Salvar Edição de Paciente
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setSubmitting(true);
    setModalFeedback(null);

    try {
      const res = await fetch('/api/patients', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          patientId: editingPatient.id,
          ...editPatientForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar alterações.');
      }

      setModalFeedback({ type: 'success', text: 'Prontuário atualizado com sucesso!' });
      setTimeout(() => {
        setShowEditModal(false);
        setModalFeedback(null);
        setEditingPatient(null);
        fetchPatients(false);
      }, 700);
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Erro ao atualizar dados.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Excluir Paciente
  const handleConfirmDelete = async () => {
    if (!deletingPatient) return;
    setSubmitting(true);
    setModalFeedback(null);

    try {
      const res = await fetch(`/api/patients?id=${deletingPatient.id}&reason=${encodeURIComponent(deleteReason)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir paciente.');
      }

      setShowDeleteModal(false);
      setDeletingPatient(null);
      fetchPatients(false);
    } catch (err: any) {
      setModalFeedback({ type: 'error', text: err?.message || 'Erro ao excluir registro.' });
    } finally {
      setSubmitting(false);
    }
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

          {/* Botão de Ação do Administrador */}
          {isAdmin && (
            <button
              onClick={() => {
                setModalFeedback(null);
                setShowNewModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 shadow-xs hover:shadow-md cursor-pointer shrink-0"
              title="Cadastrar um novo participante no prontuário unificado"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Paciente</span>
            </button>
          )}
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
                    <th className="py-3 px-4">Estudos & Sessões</th>
                    <th className="py-3 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((patient) => {
                    const age = calculateAge(patient.dateOfBirth);
                    const primaryParticipation = patient.participations[0];
                    const isExpanded = expandedPatientIds.has(patient.id);
                    const totalSessions = patient.participations.reduce(
                      (acc, p) => acc + (p.sessions?.length || 0),
                      0
                    );

                    return (
                      <React.Fragment key={patient.id}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                          {/* Nome & Dados Demográficos */}
                          <td className="py-3.5 px-5 align-middle">
                            <div className="flex items-start space-x-1.5">
                              <button
                                type="button"
                                onClick={() => toggleExpandPatient(patient.id)}
                                className="font-bold text-slate-900 hover:text-blue-600 text-sm transition text-left flex items-center gap-1.5 group cursor-pointer"
                                title="Clique para ver os estudos e sessões deste paciente"
                              >
                                <span>{patient.fullName}</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform ${
                                    isExpanded ? 'rotate-180 text-blue-600' : ''
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                              <span>{patient.biologicalSex}</span>
                              {age !== null && (
                                <>
                                  <span>•</span>
                                  <span>{age} anos</span>
                                </>
                              )}
                              {patient.participations.length > 0 && (
                                <>
                                  <span>•</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandPatient(patient.id)}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline"
                                  >
                                    {isExpanded ? 'Ocultar estudos' : 'Ver estudos'}
                                  </button>
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

                          {/* Estudos e Sessões Clínicas Integradas - Padrão Unificado */}
                          <td className="py-3.5 px-4 align-middle">
                            {patient.participations.length === 0 ? (
                              <span className="h-8 px-3 rounded-xl text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200/80 inline-flex items-center gap-1.5">
                                <FolderKanban className="w-3.5 h-3.5 text-slate-300" />
                                <span>0 estudos vinculados</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleExpandPatient(patient.id)}
                                className={`h-8 px-3 rounded-xl text-xs font-semibold border transition flex items-center space-x-2 cursor-pointer shadow-2xs ${
                                  isExpanded
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                                }`}
                                title="Clique para ver todos os estudos e sessões deste paciente"
                              >
                                <FolderKanban className={`w-3.5 h-3.5 ${isExpanded ? 'text-white' : 'text-blue-600'} shrink-0`} />
                                <span>
                                  <strong>{patient.participations.length}</strong> {patient.participations.length === 1 ? 'estudo' : 'estudos'}
                                </span>
                                <span className={isExpanded ? 'text-blue-200' : 'text-slate-300'}>•</span>
                                <span className={isExpanded ? 'text-blue-100' : 'text-slate-600'}>
                                  <strong>{totalSessions}</strong> {totalSessions === 1 ? 'sessão' : 'sessões'}
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    isExpanded ? 'rotate-180 text-white' : 'text-slate-400'
                                  }`}
                                />
                              </button>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end space-x-1.5">
                              {/* WhatsApp Direct */}
                              <button
                                type="button"
                                onClick={() => openWhatsApp(patient.phoneWhatsApp, patient.fullName)}
                                className="w-8 h-8 flex items-center justify-center text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition cursor-pointer"
                                title="Conversar no WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              </button>

                              {/* Abrir Prontuário Clínico - Padrão Unificado com Tamanho Fixo */}
                              {patient.participations.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandPatient(patient.id)}
                                  className={`w-[116px] h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between shadow-2xs cursor-pointer border ${
                                    isExpanded
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                  }`}
                                  title={isExpanded ? 'Ocultar estudos' : 'Visualizar prontuário nos estudos'}
                                >
                                  <div className="flex items-center space-x-1.5">
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <span>Prontuário</span>
                                  </div>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                      isExpanded ? 'rotate-180 text-white' : 'text-blue-600'
                                    }`}
                                  />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(patient)}
                                  className="w-[116px] h-8 px-2.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-between hover:bg-slate-100 cursor-pointer"
                                  title="Sem estudos vinculados (Abrir cadastro)"
                                >
                                  <div className="flex items-center space-x-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Prontuário</span>
                                  </div>
                                  <div className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              )}

                              {/* Controles de Administração: Editar e Excluir */}
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(patient)}
                                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition cursor-pointer"
                                    title="Editar dados cadastrais deste paciente"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeletingPatient(patient);
                                      setDeleteReason('Exclusão solicitada por administrador geral');
                                      setModalFeedback(null);
                                      setShowDeleteModal(true);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-300 transition cursor-pointer"
                                    title="Excluir paciente e vínculos"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* LINHA EXPANDIDA: Estudos e Sessões Clínicas do Paciente - Menos exagerado, compacto e limpo */}
                        {isExpanded && (
                          <tr className="bg-slate-50/60 border-b border-slate-200">
                            <td colSpan={4} className="px-5 py-3">
                              <div className="space-y-2">
                                {/* Header do Detalhamento - Compacto e direto */}
                                <div className="flex items-center justify-between text-xs pb-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                                      <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Estudos vinculados a {patient.fullName}</span>
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      ({patient.participations.length} {patient.participations.length === 1 ? 'pesquisa' : 'pesquisas'})
                                    </span>
                                  </div>

                                  {(patient.allergies || patient.comorbidities) && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {patient.allergies && (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-bold">
                                          ⚠️ Alergias: {patient.allergies}
                                        </span>
                                      )}
                                      {patient.comorbidities && (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold">
                                          Comorbidades: {patient.comorbidities}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Lista Limpa e Compacta de Estudos */}
                                {patient.participations.length === 0 ? (
                                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                                    Este paciente ainda não está associado a nenhum estudo clínico.
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {patient.participations.map((part) => {
                                      const sessCount = part.sessions?.length || 0;
                                      const lastSession = part.sessions && part.sessions.length > 0 
                                        ? part.sessions[part.sessions.length - 1] 
                                        : null;
                                      const lastSessionDate = lastSession 
                                        ? new Date(lastSession.sessionDate).toLocaleDateString('pt-BR') 
                                        : null;

                                      return (
                                        <div
                                          key={part.id}
                                          className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                                        >
                                          {/* Esquerda: Código, Status, Grupo e Nome do Estudo */}
                                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                            <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded font-mono text-[10px] font-bold shrink-0">
                                              {part.researchCode}
                                            </span>

                                            {part.status === 'APPROVED' ? (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                                Ativo no Estudo
                                              </span>
                                            ) : part.status === 'PENDING' ? (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                                Em Triagem
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                                                {part.status}
                                              </span>
                                            )}

                                            {part.group && (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0 max-w-[160px] truncate" title={part.group}>
                                                {part.group}
                                              </span>
                                            )}

                                            <span className="font-semibold text-slate-800 text-xs truncate max-w-sm sm:max-w-md" title={part.project.name}>
                                              {part.project.name}
                                            </span>
                                          </div>

                                          {/* Direita: Total de Sessões e Botão Abrir Prontuário */}
                                          <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                              <Activity className="w-3.5 h-3.5 text-blue-600" />
                                              <span className="font-semibold text-slate-700">
                                                {sessCount} {sessCount === 1 ? 'sessão realizada' : 'sessões realizadas'}
                                              </span>
                                              {lastSessionDate && (
                                                <span className="text-slate-400 text-[10px]">
                                                  (última: {lastSessionDate})
                                                </span>
                                              )}
                                            </div>

                                            <Link
                                              href={`/dashboard?projectId=${part.project.id}`}
                                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                                            >
                                              <FileText className="w-3 h-3" />
                                              <span>Abrir Prontuário</span>
                                              <ChevronRight className="w-3 h-3" />
                                            </Link>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: NOVO PACIENTE (Administrador) */}
      {/* ========================================================================= */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Paciente</h3>
                  <p className="text-xs text-slate-500">Adiciona ao prontuário central e opcionalmente vincula a um estudo</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center space-x-2 ${
                  modalFeedback.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {modalFeedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.fullName}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, fullName: e.target.value })}
                    placeholder="Ex: Maria da Silva"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={newPatientForm.cpf}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, cpf: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.phoneWhatsApp}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phoneWhatsApp: e.target.value })}
                    placeholder="(42) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={newPatientForm.dateOfBirth}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sexo Biológico</label>
                  <select
                    value={newPatientForm.biologicalSex}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, biologicalSex: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                    placeholder="paciente@exemplo.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Endereço Residencial</label>
                  <input
                    type="text"
                    value={newPatientForm.address}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vincular a Estudo Clínico (Opcional)</label>
                  <select
                    value={newPatientForm.projectId}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, projectId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Apenas cadastrar no Prontuário Central (Sem estudo inicial)</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Se você escolher um estudo, o sistema gerará automaticamente o código desidentificado do participante para triagem.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <ClinicalTriageFields
                    chiefComplaint={newPatientForm.chiefComplaint}
                    onChiefComplaintChange={(val) => setNewPatientForm({ ...newPatientForm, chiefComplaint: val })}
                    allergies={newPatientForm.allergies || ''}
                    onAllergiesChange={(val) => setNewPatientForm({ ...newPatientForm, allergies: val })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Salvar Paciente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR PACIENTE (Administrador) */}
      {/* ========================================================================= */}
      {showEditModal && editingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Editar Prontuário do Paciente</h3>
                  <p className="text-xs text-slate-500">ID: {editingPatient.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center space-x-2 ${
                  modalFeedback.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {modalFeedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatientForm.fullName}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={editPatientForm.cpf}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, cpf: maskCPF(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatientForm.phoneWhatsApp}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, phoneWhatsApp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={editPatientForm.dateOfBirth}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sexo Biológico</label>
                  <select
                    value={editPatientForm.biologicalSex}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, biologicalSex: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editPatientForm.email}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Endereço Residencial</label>
                  <input
                    type="text"
                    value={editPatientForm.address}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Queixa Principal</label>
                  <textarea
                    rows={2}
                    value={editPatientForm.chiefComplaint}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, chiefComplaint: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Justificativa de Auditoria Obrigatória GCP / ICH */}
                <div className="sm:col-span-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                  <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-700" />
                    <span>Justificativa da Alteração (Trilha de Auditoria GCP / ICH E6) <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatientForm.reason}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, reason: e.target.value })}
                    placeholder="Ex: Correção de dígito do CPF conforme documento oficial"
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">
                    Esta justificativa será registrada de forma imutável com carimbo de tempo, IP e operador responsável.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXCLUIR PACIENTE (Administrador) */}
      {/* ========================================================================= */}
      {showDeleteModal && deletingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Excluir Registro de Paciente</h3>
            <p className="text-xs text-slate-600 mt-2">
              Você está prestes a excluir definitivamente o paciente <strong>{deletingPatient.fullName}</strong> (CPF: {formatCPF(deletingPatient.cpf)}).
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl my-4 text-xs text-red-800 space-y-1">
              <p className="font-bold">Atenção: Ação Irreversível!</p>
              <p className="text-[11px] text-red-700">
                Esta ação removerá todas as participações em pesquisas, formulários e sessões vinculadas a este paciente.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo da Exclusão (Auditoria)
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Paciente solicitou revogação e exclusão total de dados"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {modalFeedback && (
              <div className="p-2.5 rounded-lg mb-3 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                {modalFeedback.text}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
