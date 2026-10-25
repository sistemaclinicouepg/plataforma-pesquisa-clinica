'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, Check, Sparkles } from 'lucide-react';

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
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

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

  const handleToggleHasAllergy = (status: boolean) => {
    setHasAllergy(status);
    if (!status) {
      setSelectedAllergies([]);
      onAllergiesChange('Nenhuma alergia conhecida');
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

  const handleAddCustomAllergy = () => {
    const trimmed = customAllergyInput.trim();
    if (!trimmed) return;
    if (!selectedAllergies.includes(trimmed)) {
      const next = [...selectedAllergies, trimmed];
      setSelectedAllergies(next);
      onAllergiesChange(next.join(', '));
    }
    setCustomAllergyInput('');
  };

  const handleSelectComplaint = (complaint: string) => {
    if (!chiefComplaint || chiefComplaint.trim() === '') {
      onChiefComplaintChange(complaint);
    } else if (!chiefComplaint.includes(complaint)) {
      onChiefComplaintChange(`${chiefComplaint}; ${complaint}`);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      {/* QUEIXA PRINCIPAL */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
          <span>Queixa Principal / Motivo da Consulta</span>
          <span className="text-[11px] font-normal text-slate-400 lowercase">
            selecione opções rápidas ou digite
          </span>
        </label>

        {/* Sugestões rápidas de Queixa Principal */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_CHIEF_COMPLAINTS.map((option) => {
            const isSelected = chiefComplaint?.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelectComplaint(option)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer text-left ${
                  isSelected
                    ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {option}
              </button>
            );
          })}
        </div>

        {/* Campo de texto livre para Queixa Principal */}
        <input
          type="text"
          value={chiefComplaint}
          onChange={(e) => onChiefComplaintChange(e.target.value)}
          placeholder="Ex: Quer clarear os dentes para formatura ou relata sensibilidade..."
          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* ALERGIAS */}
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

        {/* Se Sim: Lista de alergias comuns e inclusão de outras */}
        {hasAllergy && (
          <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2.5 animate-fadeIn">
            <span className="text-[11px] font-bold text-rose-900 block">
              Selecione uma ou mais alergias da lista:
            </span>

            <div className="flex flex-wrap gap-1.5">
              {PREDEFINED_ALLERGIES.map((alg) => {
                const isSelected = selectedAllergies.includes(alg);
                return (
                  <button
                    key={alg}
                    type="button"
                    onClick={() => handleToggleAllergyTag(alg)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs'
                        : 'bg-white hover:bg-rose-100/70 text-rose-900 border-rose-200'
                    }`}
                  >
                    {isSelected ? '✕ ' : '+ '}
                    {alg}
                  </button>
                );
              })}
            </div>

            {/* Adicionar outra alergia personalizada */}
            <div className="pt-1 flex gap-2">
              <input
                type="text"
                value={customAllergyInput}
                onChange={(e) => setCustomAllergyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomAllergy();
                  }
                }}
                placeholder="Digitar outra alergia (ex: Corantes, Frutos do mar, Dipirona sódica...)"
                className="flex-1 px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={handleAddCustomAllergy}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Alergias Selecionadas / Ativas */}
            {selectedAllergies.length > 0 && (
              <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider mr-1">
                  Alergias registradas:
                </span>
                {selectedAllergies.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-rose-300 text-rose-900 text-xs font-semibold shadow-2xs"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllergyTag(item)}
                      className="text-rose-500 hover:text-rose-700 ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
