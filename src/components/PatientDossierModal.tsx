'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { OdontogramChart, ToothStatus } from '@/components/odontogram';
import { TOOTH_STATUS_CONFIG } from '@/components/odontogram/teethData';
import {
  X,
  Printer,
  Edit,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Phone,
  ShieldCheck,
  FileSpreadsheet,
  Activity,
  ExternalLink,
  Lock,
  Stethoscope,
  Smile,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';

export type DossierTab = 'geral' | 'odontograma' | 'anamnese' | 'periodontograma' | 'historico';

interface PatientDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: any;
  project: any;
  studyProtocol?: any;
  onEditAnamnesis?: (part: any) => void;
  onEditPatient?: (part: any) => void;
  isBlindedUser?: boolean;
}

export const PatientDossierModal: React.FC<PatientDossierModalProps> = ({
  isOpen,
  onClose,
  participant,
  project,
  studyProtocol,
  onEditAnamnesis,
  onEditPatient,
  isBlindedUser = false,
}) => {
  const [activeTab, setActiveTab] = useState<DossierTab>('geral');

  // Parse dos dados clínicos armazenados em anamnesisData
  const parsedAnamnesis = useMemo(() => {
    if (!participant?.anamnesisData) {
      return {
        chiefComplaint: '',
        allergies: '',
        odontogram: {} as Record<string, ToothStatus>,
        periodontogram: {
          bleedingOnProbing: '0-10%',
          visiblePlaque: '< 20%',
          probingDepth: '≤ 3mm',
          gingivalRecession: 'Ausente',
          furcationOrMobility: 'Ausente',
        },
        answers: {} as Record<string, string>,
        clinicalNotes: '',
      };
    }

    try {
      const data = JSON.parse(participant.anamnesisData);
      return {
        chiefComplaint: data.chiefComplaint || '',
        allergies: data.allergies || '',
        odontogram: (data.odontogram || {}) as Record<string, ToothStatus>,
        periodontogram: data.periodontogram || {
          bleedingOnProbing: '0-10%',
          visiblePlaque: '< 20%',
          probingDepth: '≤ 3mm',
          gingivalRecession: 'Ausente',
          furcationOrMobility: 'Ausente',
        },
        answers: (data.answers || (typeof data === 'object' ? data : {})) as Record<string, string>,
        clinicalNotes: data.clinicalNotes || '',
      };
    } catch {
      return {
        chiefComplaint: '',
        allergies: '',
        odontogram: {} as Record<string, ToothStatus>,
        periodontogram: {
          bleedingOnProbing: '0-10%',
          visiblePlaque: '< 20%',
          probingDepth: '≤ 3mm',
          gingivalRecession: 'Ausente',
          furcationOrMobility: 'Ausente',
        },
        answers: {} as Record<string, string>,
        clinicalNotes: '',
      };
    }
  }, [participant?.anamnesisData]);

  // Template da anamnese do projeto (perguntas de inclusão/exclusão)
  const templateConfig = useMemo(() => {
    if (!project?.anamnesisTemplate) return null;
    try {
      return JSON.parse(project.anamnesisTemplate);
    } catch {
      return null;
    }
  }, [project?.anamnesisTemplate]);

  // Contagem dos status dos dentes no odontograma
  const odontogramStats = useMemo(() => {
    const stats: Record<ToothStatus, number> = {
      HIGIDO: 0,
      RESTAURADO: 0,
      CARIE: 0,
      AUSENTE: 0,
      FACETA: 0,
    };
    for (const st of Object.values(parsedAnamnesis.odontogram)) {
      if (stats[st] !== undefined) {
        stats[st]++;
      }
    }
    return stats;
  }, [parsedAnamnesis.odontogram]);

  // Cálculo da idade
  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return 'N/I';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 'N/I';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !participant) return null;

  const patient = participant.patient || {};
  const isAnamnesisFilled = Boolean(participant.anamnesisDone || participant.anamnesisData);
  const questionsList = Array.isArray(templateConfig?.questions) ? templateConfig.questions : [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Topo do Dossiê Clínico (Header) */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg shadow-2xs">
                {participant.researchCode || 'SEM CÓDIGO'}
              </span>

              {participant.status === 'APPROVED' && (
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Voluntário Ativo no Estudo</span>
                </span>
              )}

              {participant.status === 'PENDING' && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Candidato em Triagem Clínica</span>
                </span>
              )}

              {participant.status === 'EXCLUDED' && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-300 text-xs font-bold rounded-full flex items-center gap-1">
                  <X className="w-3.5 h-3.5 text-red-600" />
                  <span>Inelegível / Excluído</span>
                </span>
              )}

              {participant.group && (
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold rounded-full">
                  {isBlindedUser ? (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-blue-600" />
                      <span>Alocação Mascarada</span>
                    </span>
                  ) : (
                    `Grupo: ${participant.group}`
                  )}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 leading-snug">
              {patient.fullName || 'Paciente Não Identificado'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Protocolo: <strong className="text-slate-700">{project?.name}</strong> • UEPG Clínica Odontológica
            </p>
          </div>

          {/* Botões de Ação do Header */}
          <div className="flex items-center gap-2 self-end sm:self-center print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Imprimir Prontuário Completo ou Salvar em PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Imprimir Ficha</span>
            </button>

            {onEditAnamnesis && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditAnamnesis(participant);
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Editar anamnese e odontograma"
              >
                <Edit className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Editar Ficha</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="Fechar prontuário"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Abas de Navegação */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 overflow-x-auto text-xs font-bold shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'geral'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Dados & Histórico Clínico</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('odontograma')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'odontograma'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smile className="w-4 h-4" />
            <span>Odontograma Gráfico</span>
            {Object.keys(parsedAnamnesis.odontogram).length > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
                {Object.keys(parsedAnamnesis.odontogram).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('anamnese')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'anamnese'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Anamnese & Critérios</span>
            <span className={`w-2 h-2 rounded-full ${isAnamnesisFilled ? 'bg-emerald-500' : 'bg-amber-400'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('periodontograma')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'periodontograma'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Periodontograma</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'historico'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Consultas & eCRFs</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
              {participant.sessions?.length || 0}
            </span>
          </button>
        </div>

        {/* Corpo do Dossiê */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          
          {/* ========================================================
              ABA 1: DADOS CADASTRAIS, QUEIXA, HISTÓRICO MÉDICO & TCLE
              ======================================================== */}
          {(activeTab === 'geral' || typeof window === 'undefined') && (
            <div className="space-y-6">
              
              {/* Grid: Identificação Civil e Histórico Médico */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Cartão 1: Identificação Civil */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>Identificação e Contato</span>
                    </h3>
                    {onEditPatient && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditPatient(participant);
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer print:hidden"
                      >
                        Editar Cadastro
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Nome Completo:</span>
                      <strong className="text-slate-900">{patient.fullName || 'Não informado'}</strong>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block">CPF:</span>
                      <strong className="font-mono text-slate-800">{patient.cpf || 'Não informado'}</strong>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block">Data de Nascimento / Idade:</span>
                      <span className="font-semibold text-slate-800">
                        {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('pt-BR') : 'N/I'}{' '}
                        ({calculateAge(patient.dateOfBirth)})
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block">Sexo Biológico:</span>
                      <strong className="text-slate-800">{patient.biologicalSex || 'Não informado'}</strong>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[11px] text-slate-400 block">Telefone / WhatsApp:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <strong className="font-mono text-slate-900">{patient.phoneWhatsApp || 'Não informado'}</strong>
                        {patient.phoneWhatsApp && (
                          <a
                            href={`https://wa.me/55${patient.phoneWhatsApp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded transition print:hidden"
                          >
                            Abrir no WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    {patient.email && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-slate-400 block">E-mail:</span>
                        <span className="text-slate-800">{patient.email}</span>
                      </div>
                    )}

                    {patient.address && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-slate-400 block">Endereço Residencial:</span>
                        <span className="text-slate-800">{patient.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cartão 2: Queixa Principal & Saúde Sistêmica */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="border-b border-slate-200/80 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-emerald-600" />
                      <span>Anamnese Médica & Queixa Odontológica</span>
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Queixa Principal Relatada (específica deste estudo):
                      </span>
                      <p className="p-2 bg-white rounded-lg border border-slate-200 text-slate-800 italic mt-0.5">
                        &ldquo;{parsedAnamnesis.chiefComplaint || patient.chiefComplaint || 'Nenhuma queixa específica registrada no momento do cadastro.'}&rdquo;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Comorbidades / Doenças:</span>
                        <span className="font-semibold text-slate-800">{patient.comorbidities || 'Nenhuma comorbidade relatada'}</span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Alergias Conhecidas (específicas deste estudo):
                        </span>
                        <span className={`font-semibold ${(parsedAnamnesis.allergies || patient.allergies) ? 'text-red-700' : 'text-slate-800'}`}>
                          {parsedAnamnesis.allergies || patient.allergies || 'Nenhuma alergia relatada'}
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Medicamentos em Uso:</span>
                        <span className="font-semibold text-slate-800">{patient.medications || 'Nenhum medicamento'}</span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Expectativas do Tratamento:</span>
                        <span className="font-semibold text-slate-800">{patient.expectations || 'Não especificadas'}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Cartão 3: Status Ético do TCLE / TALE */}
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      Termo de Consentimento Livre e Esclarecido (TCLE)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Conformidade ética CNS 466/2012 e Lei Geral de Proteção de Dados (LGPD).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center print:hidden">
                  <Link
                    href={`/tcle/${participant.id}`}
                    target="_blank"
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-xl font-bold text-xs transition inline-flex items-center gap-1 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver TCLE Digital</span>
                  </Link>

                  <Link
                    href={`/tcle/${participant.id}/pdf`}
                    target="_blank"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition inline-flex items-center gap-1 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Baixar PDF Oficial</span>
                  </Link>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              ABA 2: ODONTOGRAMA GRÁFICO VISUAL
              ======================================================== */}
          {(activeTab === 'odontograma' || typeof window === 'undefined') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-blue-600" />
                    <span>Odontograma Clínico do Participante</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mapa de condições dentárias da arcada superior e inferior registrado na triagem.
                  </p>
                </div>

                {onEditAnamnesis && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditAnamnesis(participant);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 self-start sm:self-auto cursor-pointer print:hidden"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-600" />
                    <span>Alterar Dentes no Odontograma</span>
                  </button>
                )}
              </div>

              {/* Quadro de Métricas dos Dentes */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Hígidos</span>
                  <strong className="text-lg text-emerald-700">{odontogramStats.HIGIDO}</strong>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Restaurados</span>
                  <strong className="text-lg text-blue-700">{odontogramStats.RESTAURADO}</strong>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-bold text-red-800 uppercase block">Cárie</span>
                  <strong className="text-lg text-red-700">{odontogramStats.CARIE}</strong>
                </div>

                <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-bold text-slate-700 uppercase block">Ausentes</span>
                  <strong className="text-lg text-slate-700">{odontogramStats.AUSENTE}</strong>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">Faceta/Coroa</span>
                  <strong className="text-lg text-purple-700">{odontogramStats.FACETA}</strong>
                </div>
              </div>

              {/* Renderização do Componente OdontogramChart em Modo Leitura */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
                <OdontogramChart
                  mode="clinical_status"
                  statusMap={parsedAnamnesis.odontogram}
                  scope={templateConfig?.odontogramScope || 'full'}
                  readOnly={true}
                  allowDeciduous={false}
                />
              </div>

              {/* Listagem Textual dos Dentes Alterados */}
              {Object.keys(parsedAnamnesis.odontogram).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Dentes com Condições Registradas:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parsedAnamnesis.odontogram).map(([tooth, status]) => {
                      const cfg = TOOTH_STATUS_CONFIG[status as ToothStatus] || TOOTH_STATUS_CONFIG.HIGIDO;
                      return (
                        <div
                          key={tooth}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className="font-mono font-bold">Dente {tooth}:</span>
                          <span>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ABA 3: ANAMNESE ESPECÍFICA DO ESTUDO & CRITÉRIOS
              ======================================================== */}
          {(activeTab === 'anamnese' || typeof window === 'undefined') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    <span>Critérios de Elegibilidade & Anamnese do Protocolo</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Respostas fornecidas na triagem inicial em comparação com os critérios do protocolo clínico.
                  </p>
                </div>

                {onEditAnamnesis && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditAnamnesis(participant);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 self-start sm:self-auto cursor-pointer print:hidden"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-600" />
                    <span>Editar Respostas</span>
                  </button>
                )}
              </div>

              {questionsList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  <p>Nenhuma pergunta personalizada de anamnese configurada para este protocolo.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {questionsList.map((q: any, idx: number) => {
                    const answer = parsedAnamnesis.answers[q.id];
                    const hasAnswer = answer !== undefined && answer !== '';
                    const isDisqualified =
                      q.isCriterion &&
                      q.disqualifyIf &&
                      answer?.toLowerCase() === q.disqualifyIf.toLowerCase();

                    return (
                      <div
                        key={q.id || idx}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isDisqualified
                            ? 'bg-red-50/70 border-red-200 text-red-900'
                            : hasAnswer
                            ? 'bg-white border-slate-200 text-slate-800'
                            : 'bg-slate-50/60 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] text-slate-400">#{idx + 1}</span>
                            <span className="font-bold text-xs">{q.title}</span>
                            {q.isCriterion && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                Critério
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isDisqualified ? (
                            <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 font-bold text-xs rounded-lg flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>{String(answer).toUpperCase()} (Incompatível)</span>
                            </span>
                          ) : hasAnswer ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-lg flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{String(answer)}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded italic">
                              Não respondido
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notas Clínicas Adicionais da Anamnese */}
              {parsedAnamnesis.clinicalNotes && (
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Notas Clínicas do Pesquisador:</span>
                  </span>
                  <p className="text-xs text-amber-800 whitespace-pre-wrap leading-relaxed">
                    {parsedAnamnesis.clinicalNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ABA 4: PERIODONTOGRAMA
              ======================================================== */}
          {(activeTab === 'periodontograma' || typeof window === 'undefined') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Parâmetros e Índices Periodontais Registrados</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Avaliação da saúde gengival, placa visível e profundidade de sondagem.
                  </p>
                </div>

                {onEditAnamnesis && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditAnamnesis(participant);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 self-start sm:self-auto cursor-pointer print:hidden"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-600" />
                    <span>Atualizar Periodontograma</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Sangramento à Sondagem (SS / BOP)
                  </span>
                  <p className="text-base font-extrabold text-slate-800">
                    {parsedAnamnesis.periodontogram.bleedingOnProbing || '0-10%'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Índice de Placa Visível (IPV)
                  </span>
                  <p className="text-base font-extrabold text-slate-800">
                    {parsedAnamnesis.periodontogram.visiblePlaque || '< 20%'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Profundidade de Sondagem (PS)
                  </span>
                  <p className="text-base font-extrabold text-slate-800">
                    {parsedAnamnesis.periodontogram.probingDepth || '≤ 3mm'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Recessão Gengival / Exposição Radicular
                  </span>
                  <p className="text-base font-extrabold text-slate-800">
                    {parsedAnamnesis.periodontogram.gingivalRecession || 'Ausente'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 sm:col-span-2 lg:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Envolvimento de Furca ou Mobilidade
                  </span>
                  <p className="text-base font-extrabold text-slate-800">
                    {parsedAnamnesis.periodontogram.furcationOrMobility || 'Ausente'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 5: HISTÓRICO DE CONSULTAS / SESSÕES & eCRFs
              ======================================================== */}
          {(activeTab === 'historico' || typeof window === 'undefined') && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Sessões Clínicas & Registros de Intervenção</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Histórico de atendimentos realizados, aferição de cor, dor e questionários preenchidos.
                </p>
              </div>

              {(!participant.sessions || participant.sessions.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Nenhuma sessão clínica registrada ainda.</p>
                  <p className="mt-1">As sessões e avaliações de cor aparecerão aqui assim que forem executadas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participant.sessions.map((sess: any) => (
                    <div
                      key={sess.id || sess.sessionNumber}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                            S{sess.sessionNumber}
                          </span>
                          <div>
                            <strong className="text-slate-900 text-xs block">{sess.sessionType || `Sessão ${sess.sessionNumber}`}</strong>
                            <span className="text-[11px] text-slate-400">
                              Data: {sess.sessionDate ? new Date(sess.sessionDate).toLocaleDateString('pt-BR') : 'Data não informada'}
                            </span>
                          </div>
                        </div>

                        {sess.operatorName && (
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                            Op: {sess.operatorName}
                          </span>
                        )}
                      </div>

                      {/* Parâmetros da Sessão: Cor e Dor */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {sess.shadeRight && (
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <span className="text-[10px] text-slate-400 block font-bold">Cor Hemi-arcada Direita:</span>
                            <strong className="text-slate-800">{sess.shadeRight}</strong>
                          </div>
                        )}

                        {sess.shadeLeft && (
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <span className="text-[10px] text-slate-400 block font-bold">Cor Hemi-arcada Esquerda:</span>
                            <strong className="text-slate-800">{sess.shadeLeft}</strong>
                          </div>
                        )}

                        {sess.painScore0h !== null && sess.painScore0h !== undefined && (
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <span className="text-[10px] text-slate-400 block font-bold">Escala Dor (0h):</span>
                            <strong className="text-slate-800">{sess.painScore0h} / 10</strong>
                          </div>
                        )}

                        {sess.painScore24h !== null && sess.painScore24h !== undefined && (
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <span className="text-[10px] text-slate-400 block font-bold">Escala Dor (24h):</span>
                            <strong className="text-slate-800">{sess.painScore24h} / 10</strong>
                          </div>
                        )}
                      </div>

                      {sess.notes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                          &ldquo;{sess.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Formulários eCRFs Respondidos */}
              {participant.responses && participant.responses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Questionários eCRFs Respondidos ({participant.responses.length}):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {participant.responses.map((resp: any, i: number) => (
                      <div key={resp.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <strong className="text-slate-900 block">{resp.form?.title || 'Formulário Clínico'}</strong>
                        <span className="text-[11px] text-slate-400">
                          Enviado em: {resp.submittedAt ? new Date(resp.submittedAt).toLocaleDateString('pt-BR') : 'Data registrada'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Prontuário protegido sob a LGPD (Lei nº 13.709/2018) • UEPG</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
