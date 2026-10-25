'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  AlertCircle,
  Check,
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ClinicalTriageFieldsProps {
  chiefComplaint: string;
  onChiefComplaintChange: (val: string) => void;
  allergies: string;
  onAllergiesChange: (val: string) => void;
}

const COMMON_CHIEF_COMPLAINTS = [
  'Deseja clareamento dental / estética do sorriso',
  'Sensibilidade dentária (ao frio, doce ou mastigação)',
  'Dor ou incômodo dental',
  'Restauração fraturada ou manchada',
  'Avaliação preventiva / Check-up de rotina',
  'Gengivite / Sangramento ao escovar',
  'Voluntário encaminhado para pesquisa clínica',
];

const PREDEFINED_ALLERGIES = [
  'Penicilina / Amoxicilina',
  'Dipirona',
  'AINEs (Ibuprofeno, Cetoprofeno, Aspirina)',
  'Látex',
  'Anestésicos Locais (Lidocaína)',
  'Sulfa / Sulfonamidas',
  'Iodo',
];

export function ClinicalTriageFields({
  chiefComplaint,
  onChiefComplaintChange,
  allergies,
  onAllergiesChange,
}: ClinicalTriageFieldsProps) {
  // Estado de Alergias: Sim ou Não
  const isNegative =
    !allergies ||
    allergies.trim() === '' ||
    allergies.toLowerCase().includes('nenhuma') ||
    allergies.toLowerCase() === 'não' ||
    allergies.toLowerCase() === 'nao' ||
    allergies.toLowerCase().includes('nega');

  const [hasAllergy, setHasAllergy] = useState<boolean>(!isNegative && allergies.trim().length > 0);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  // Estados da Lista Oculta / Autocomplete de Queixa Principal
  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [complaintFilter, setComplaintFilter] = useState('');
  const complaintContainerRef = useRef<HTMLDivElement>(null);

  // Estados da Lista Oculta / Autocomplete de Alergias
  const [isAllergyOpen, setIsAllergyOpen] = useState(false);
  const [allergySearch, setAllergySearch] = useState('');
  const allergyContainerRef = useRef<HTMLDivElement>(null);

  // Sincroniza selectedAllergies a partir da prop allergies
  useEffect(() => {
    if (!allergies || isNegative) {
      setHasAllergy(false);
      setSelectedAllergies([]);
    } else {
      setHasAllergy(true);
      const items = allergies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      setSelectedAllergies(items);
    }
  }, [allergies]);

  // Fechar listas suspensas ao clicar fora dos campos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (complaintContainerRef.current && !complaintContainerRef.current.contains(target)) {
        setIsComplaintOpen(false);
      }
      if (allergyContainerRef.current && !allergyContainerRef.current.contains(target)) {
        setIsAllergyOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleHasAllergy = (status: boolean) => {
    setHasAllergy(status);
    if (!status) {
      setSelectedAllergies([]);
      onAllergiesChange('Nenhuma alergia conhecida');
      setIsAllergyOpen(false);
      setAllergySearch('');
    } else {
      if (selectedAllergies.length === 0) {
        onAllergiesChange('');
      } else {
        onAllergiesChange(selectedAllergies.join(', '));
      }
    }
  };

  const handleToggleAllergyTag = (item: string) => {
    let next: string[];
    if (selectedAllergies.includes(item)) {
      next = selectedAllergies.filter((a) => a !== item);
    } else {
      next = [...selectedAllergies, item];
    }
    setSelectedAllergies(next);
    onAllergiesChange(next.length > 0 ? next.join(', ') : '');
  };

  const handleAddCustomAllergy = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (!selectedAllergies.includes(trimmed)) {
      const next = [...selectedAllergies, trimmed];
      setSelectedAllergies(next);
      onAllergiesChange(next.join(', '));
    }
    setAllergySearch('');
  };

  const handleToggleComplaint = (complaint: string) => {
    if (!chiefComplaint || chiefComplaint.trim() === '') {
      onChiefComplaintChange(complaint);
      return;
    }
    const isSelected = chiefComplaint.includes(complaint);
    if (isSelected) {
      // Remove a queixa mantendo outras anotações digitadas
      const parts = chiefComplaint
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter((s) => s && s !== complaint);
      onChiefComplaintChange(parts.join('; '));
    } else {
      // Adiciona a queixa
      onChiefComplaintChange(`${chiefComplaint.trim().replace(/[;,]$/, '')}; ${complaint}`);
    }
  };

  // Filtragem dinâmica das queixas conforme digitação
  const filteredComplaints = COMMON_CHIEF_COMPLAINTS.filter((opt) => {
    const query = complaintFilter.trim().toLowerCase();
    if (!query) return true;
    return opt.toLowerCase().includes(query);
  });

  // Filtragem dinâmica das alergias conforme digitação
  const filteredAllergies = PREDEFINED_ALLERGIES.filter((alg) => {
    const query = allergySearch.trim().toLowerCase();
    if (!query) return true;
    return alg.toLowerCase().includes(query);
  });

  const isCustomAllergy =
    allergySearch.trim().length > 0 &&
    !PREDEFINED_ALLERGIES.some((a) => a.toLowerCase() === allergySearch.trim().toLowerCase()) &&
    !selectedAllergies.some((a) => a.toLowerCase() === allergySearch.trim().toLowerCase());

  return (
    <div className="space-y-4 pt-1">
      {/* QUEIXA PRINCIPAL COM LISTA OCULTA / AUTOCOMPLETE */}
      <div className="space-y-1.5" ref={complaintContainerRef}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Queixa Principal / Motivo da Consulta
          </label>
          <span className="text-[11px] text-slate-400">
            clique para ver opções ou digite
          </span>
        </div>

        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={chiefComplaint}
              onFocus={() => {
                setIsComplaintOpen(true);
                setComplaintFilter(chiefComplaint);
              }}
              onClick={() => {
                setIsComplaintOpen(true);
              }}
              onChange={(e) => {
                onChiefComplaintChange(e.target.value);
                setComplaintFilter(e.target.value);
                setIsComplaintOpen(true);
              }}
              placeholder="Clique para ver opções ou digite a queixa do paciente..."
              className="w-full pl-8 pr-8 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setIsComplaintOpen((prev) => !prev)}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title={isComplaintOpen ? 'Ocultar opções' : 'Exibir opções frequentes'}
            >
              {isComplaintOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* LISTA OCULTA DROPDOWN QUE ABRE AO CLICAR E FILTRA AO DIGITAR */}
          {isComplaintOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto animate-in fade-in duration-100">
              <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Opções Frequentes ({filteredComplaints.length})</span>
                <span className="font-normal text-slate-400 lowercase">clique para selecionar</span>
              </div>

              {filteredComplaints.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  Nenhuma opção pré-definida para "{complaintFilter}". O texto digitado será gravado normalmente.
                </div>
              ) : (
                filteredComplaints.map((option) => {
                  const isSelected = Boolean(chiefComplaint && chiefComplaint.includes(option));
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleToggleComplaint(option)}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer select-none ${
                        isSelected
                          ? 'bg-blue-50/80 text-blue-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span>{option}</span>
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider shrink-0 ml-2">
                          Selecionado
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ALERGIAS COM LISTA OCULTA / AUTOCOMPLETE */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Alergias Prévias Relatadas
        </label>

        {/* Seletor Sim ou Não */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleToggleHasAllergy(false)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${
              !hasAllergy
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Não (Sem Alergias Conhecidas)</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleHasAllergy(true)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${
              hasAllergy
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Sim (Possui Alergia)</span>
          </button>
        </div>

        {/* Campo com Lista Oculta que abre ao clicar e filtra ao digitar */}
        {hasAllergy && (
          <div className="space-y-2 pt-1 animate-fadeIn" ref={allergyContainerRef}>
            {/* Alergias Selecionadas / Ativas como Badges compactas */}
            {selectedAllergies.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-rose-50/60 border border-rose-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider mr-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  <span>Alergias registradas ({selectedAllergies.length}):</span>
                </span>
                {selectedAllergies.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-900 text-xs font-bold shadow-2xs"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllergyTag(item)}
                      className="text-rose-400 hover:text-rose-700 transition cursor-pointer"
                      title={`Remover alergia ${item}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input de Busca / Adição com Lista Dropdown */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-rose-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={allergySearch}
                  onFocus={() => setIsAllergyOpen(true)}
                  onClick={() => setIsAllergyOpen(true)}
                  onChange={(e) => {
                    setAllergySearch(e.target.value);
                    setIsAllergyOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isCustomAllergy) {
                        handleAddCustomAllergy(allergySearch);
                      } else if (filteredAllergies.length > 0) {
                        handleToggleAllergyTag(filteredAllergies[0]);
                        setAllergySearch('');
                      }
                    } else if (e.key === 'Escape') {
                      setIsAllergyOpen(false);
                    }
                  }}
                  placeholder="Clique para buscar ou digitar uma alergia (ex: Penicilina, Dipirona, Látex...)"
                  className="w-full pl-8 pr-8 py-2 border border-rose-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setIsAllergyOpen((prev) => !prev)}
                  className="absolute right-2.5 p-1 text-rose-400 hover:text-rose-600 transition cursor-pointer"
                  title={isAllergyOpen ? 'Ocultar opções' : 'Exibir opções de alergias'}
                >
                  {isAllergyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* LISTA OCULTA DROPDOWN QUE ABRE AO CLICAR E FILTRA AO DIGITAR */}
              {isAllergyOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-rose-200 rounded-xl shadow-xl overflow-hidden divide-y divide-rose-100 max-h-56 overflow-y-auto animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 bg-rose-50 text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Lista de Alergias ({filteredAllergies.length})</span>
                    <span className="font-normal text-rose-600 lowercase">clique para selecionar</span>
                  </div>

                  {filteredAllergies.map((alg) => {
                    const isSelected = selectedAllergies.includes(alg);
                    return (
                      <button
                        key={alg}
                        type="button"
                        onClick={() => {
                          handleToggleAllergyTag(alg);
                          setAllergySearch('');
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer select-none ${
                          isSelected
                            ? 'bg-rose-50 text-rose-900 font-semibold'
                            : 'text-slate-700 hover:bg-rose-50/40'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition shrink-0 ${
                              isSelected
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span>{alg}</span>
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider shrink-0 ml-2">
                            Ativa
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Opção para adicionar nova alergia digitada */}
                  {isCustomAllergy && (
                    <button
                      type="button"
                      onClick={() => handleAddCustomAllergy(allergySearch)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-rose-700 bg-rose-50/80 hover:bg-rose-100 transition flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Adicionar <strong>"{allergySearch.trim()}"</strong> como alergia</span>
                    </button>
                  )}

                  {filteredAllergies.length === 0 && !isCustomAllergy && (
                    <div className="p-3 text-center text-xs text-slate-500">
                      Nenhuma alergia encontrada.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
