'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, Check, ShieldAlert, ListChecks } from 'lucide-react';

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

  const handleToggleComplaint = (complaint: string) => {
    if (!chiefComplaint || chiefComplaint.trim() === '') {
      onChiefComplaintChange(complaint);
      return;
    }
    const isSelected = chiefComplaint.includes(complaint);
    if (isSelected) {
      // Remove a queixa mantendo outras anotações livres digitadas
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

  return (
    <div className="space-y-4 pt-1">
      {/* QUEIXA PRINCIPAL EM FORMATO DE LISTA */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5 text-blue-600" />
            <span>Queixa Principal / Motivo da Consulta</span>
          </label>
          <span className="text-[11px] text-slate-400">
            Selecione na lista ou digite
          </span>
        </div>

        {/* Lista estruturada de queixas frequentes */}
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
          {COMMON_CHIEF_COMPLAINTS.map((option) => {
            const isSelected = Boolean(chiefComplaint && chiefComplaint.includes(option));
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleToggleComplaint(option)}
                className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-50/70 text-blue-900 font-semibold'
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
          })}
        </div>

        {/* Campo de texto livre para complemento ou nova queixa */}
        <input
          type="text"
          value={chiefComplaint}
          onChange={(e) => onChiefComplaintChange(e.target.value)}
          placeholder="Ex: Quer clarear os dentes para formatura ou relata sensibilidade..."
          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
        />
      </div>

      {/* ALERGIAS EM FORMATO DE LISTA */}
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

        {/* Se Sim: Lista estruturada de alergias com inclusão de outras */}
        {hasAllergy && (
          <div className="p-3 bg-rose-50/40 border border-rose-200 rounded-2xl space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Lista de Alergias Frequentes:</span>
              </span>
              <span className="text-[11px] text-rose-700 font-semibold">
                {selectedAllergies.length} registrada{selectedAllergies.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Lista com checkboxes */}
            <div className="rounded-xl border border-rose-200 bg-white divide-y divide-rose-100 overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
              {PREDEFINED_ALLERGIES.map((alg) => {
                const isSelected = selectedAllergies.includes(alg);
                return (
                  <button
                    key={alg}
                    type="button"
                    onClick={() => handleToggleAllergyTag(alg)}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-rose-50/80 text-rose-900 font-semibold'
                        : 'text-slate-700 hover:bg-rose-50/30'
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

              {/* Alergias adicionadas manualmente */}
              {selectedAllergies
                .filter((item) => !PREDEFINED_ALLERGIES.includes(item))
                .map((customItem) => (
                  <div
                    key={customItem}
                    className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between bg-rose-50/90 text-rose-900 font-semibold"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-md flex items-center justify-center border bg-rose-600 border-rose-600 text-white shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span>{customItem}</span>
                      <span className="text-[10px] text-rose-500 font-normal italic">(outra)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllergyTag(customItem)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-100 transition cursor-pointer"
                      title="Remover alergia"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>

            {/* Inserção de nova alergia personalizada */}
            <div className="flex gap-2">
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
                className="flex-1 px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={handleAddCustomAllergy}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar à Lista</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
