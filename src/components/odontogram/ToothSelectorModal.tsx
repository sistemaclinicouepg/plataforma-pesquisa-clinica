'use client';

import React, { useState } from 'react';
import { OdontogramChart } from './OdontogramChart';
import { ToothStatus } from './teethData';

export interface ToothSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  initialSelected?: string[];
  initialStatusMap?: Record<string, ToothStatus>;
  mode?: 'selection' | 'clinical_status';
  onConfirmSelection?: (selectedTeeth: string[]) => void;
  onConfirmStatus?: (statusMap: Record<string, ToothStatus>) => void;
}

export const ToothSelectorModal: React.FC<ToothSelectorModalProps> = ({
  isOpen,
  onClose,
  title = 'Selecione os Elementos',
  subtitle = 'Mapeamento Dentário Anátomo-Clínico',
  initialSelected = [],
  initialStatusMap = {},
  mode = 'selection',
  onConfirmSelection,
  onConfirmStatus,
}) => {
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initialSelected);
  const [statusMap, setStatusMap] = useState<Record<string, ToothStatus>>(initialStatusMap);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedTeeth(initialSelected || []);
      setStatusMap(initialStatusMap || {});
    }
  }, [isOpen, initialSelected, initialStatusMap]);

  if (!isOpen) return null;

  const handleToggleSelect = (tooth: string) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    );
  };

  const handleBatchSelect = (teeth: string[], action: 'select' | 'deselect') => {
    if (action === 'select') {
      setSelectedTeeth((prev) => Array.from(new Set([...prev, ...teeth])));
    } else {
      setSelectedTeeth((prev) => prev.filter((t) => !teeth.includes(t)));
    }
  };

  const handleChangeStatus = (tooth: string, newStatus: ToothStatus) => {
    setStatusMap((prev) => ({
      ...prev,
      [tooth]: newStatus,
    }));
  };

  const handleConfirm = () => {
    if (mode === 'selection') {
      onConfirmSelection?.(selectedTeeth);
    } else {
      onConfirmStatus?.(statusMap);
    }
    onClose();
  };

  const handleNA = () => {
    if (mode === 'selection') {
      setSelectedTeeth([]);
      onConfirmSelection?.([]);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      {/* Modal Card com estética fiel à foto enviada */}
      <div className="bg-slate-100 rounded-3xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Cabeçalho Azul Institucional idêntico ao da imagem */}
        <div className="bg-[#004799] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🦷</span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-blue-200 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Botão de Fechar Circular */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-blue-800/80 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-lg transition cursor-pointer"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo do Modal com a Arcada Completa */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <OdontogramChart
            mode={mode}
            statusMap={statusMap}
            selectedTeeth={selectedTeeth}
            scope="all_with_deciduous"
            allowDeciduous={true}
            onToggleSelect={handleToggleSelect}
            onBatchSelect={handleBatchSelect}
            onChangeStatus={handleChangeStatus}
          />
        </div>

        {/* Rodapé com Botões: N/A | Cancelar | Confirmar (N) */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleNA}
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            N/A
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="px-6 py-2.5 rounded-xl bg-[#2e3b4e] hover:bg-[#1e293b] text-white text-xs font-bold transition flex items-center space-x-2 cursor-pointer"
            >
              <span>Confirmar</span>
              {mode === 'selection' && (
                <span className="bg-slate-700 text-white text-[11px] px-2 py-0.5 rounded-full font-mono">
                  {selectedTeeth.length}
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
