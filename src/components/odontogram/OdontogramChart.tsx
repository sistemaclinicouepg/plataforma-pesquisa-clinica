'use client';

import React, { useState } from 'react';
import {
  UPPER_PERMANENT_RIGHT,
  UPPER_PERMANENT_LEFT,
  LOWER_PERMANENT_RIGHT,
  LOWER_PERMANENT_LEFT,
  UPPER_DECIDUOUS_RIGHT,
  UPPER_DECIDUOUS_LEFT,
  LOWER_DECIDUOUS_RIGHT,
  LOWER_DECIDUOUS_LEFT,
  ALL_PERMANENT_TEETH,
  UPPER_PERMANENT_TEETH,
  LOWER_PERMANENT_TEETH,
  ALL_DECIDUOUS_TEETH,
  UPPER_DECIDUOUS_TEETH,
  LOWER_DECIDUOUS_TEETH,
  TEETH_METADATA,
  ToothStatus,
  TOOTH_STATUS_CONFIG,
} from './teethData';
import { ToothSvg } from './ToothSvg';

export interface OdontogramChartProps {
  mode?: 'clinical_status' | 'selection';
  statusMap?: Record<string, ToothStatus>;
  selectedTeeth?: string[];
  scope?: 'anterior' | 'full' | 'all_with_deciduous';
  onChangeStatus?: (tooth: string, newStatus: ToothStatus) => void;
  onToggleSelect?: (tooth: string) => void;
  onBatchSelect?: (teeth: string[], action: 'select' | 'deselect') => void;
  readOnly?: boolean;
  allowDeciduous?: boolean;
}

export const OdontogramChart: React.FC<OdontogramChartProps> = ({
  mode = 'clinical_status',
  statusMap = {},
  selectedTeeth = [],
  scope = 'full',
  onChangeStatus,
  onToggleSelect,
  onBatchSelect,
  readOnly = false,
  allowDeciduous = true,
}) => {
  const [deciduousOpen, setDeciduousOpen] = useState(false);
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);

  // Status cíclico ao clicar no dente
  const cycleStatus = (tooth: string) => {
    if (readOnly || !onChangeStatus) return;
    const current = statusMap[tooth] || 'HIGIDO';
    const sequence: ToothStatus[] = ['HIGIDO', 'RESTAURADO', 'CARIE', 'AUSENTE', 'FACETA'];
    const nextIdx = (sequence.indexOf(current) + 1) % sequence.length;
    onChangeStatus(tooth, sequence[nextIdx]);
  };

  const handleToothClick = (tooth: string) => {
    if (readOnly) return;
    if (mode === 'selection') {
      onToggleSelect?.(tooth);
    } else {
      cycleStatus(tooth);
    }
  };

  // Filtros de seleção em massa (Top buttons: Limpar, Todos, Superior, Inferior)
  const handleSelectAll = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(ALL_PERMANENT_TEETH, 'select');
    } else if (onChangeStatus) {
      ALL_PERMANENT_TEETH.forEach((t) => onChangeStatus(t, 'HIGIDO'));
    }
  };

  const handleClear = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.([...ALL_PERMANENT_TEETH, ...ALL_DECIDUOUS_TEETH], 'deselect');
    } else if (onChangeStatus) {
      ALL_PERMANENT_TEETH.forEach((t) => onChangeStatus(t, 'HIGIDO'));
      ALL_DECIDUOUS_TEETH.forEach((t) => onChangeStatus(t, 'HIGIDO'));
    }
  };

  const handleSelectUpper = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(UPPER_PERMANENT_TEETH, 'select');
    }
  };

  const handleSelectLower = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(LOWER_PERMANENT_TEETH, 'select');
    }
  };

  const handleSelectAllDeciduous = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(ALL_DECIDUOUS_TEETH, 'select');
    }
  };

  const handleSelectUpperDeciduous = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(UPPER_DECIDUOUS_TEETH, 'select');
    }
  };

  const handleSelectLowerDeciduous = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(LOWER_DECIDUOUS_TEETH, 'select');
    }
  };

  // Se escopo for apenas dentes anteriores (13..23 e 43..33)
  const isToothVisible = (tooth: string) => {
    if (scope !== 'anterior') return true;
    const anterior = ['13', '12', '11', '21', '22', '23', '43', '42', '41', '31', '32', '33'];
    return anterior.includes(tooth);
  };

  const renderToothCard = (tooth: string, showNumberAtBottom = true) => {
    const meta = TEETH_METADATA[tooth];
    const status = statusMap[tooth] || 'HIGIDO';
    const statusCfg = TOOTH_STATUS_CONFIG[status] || TOOTH_STATUS_CONFIG.HIGIDO;
    const isSelected = selectedTeeth.includes(tooth);
    const visible = isToothVisible(tooth);

    if (!visible) {
      return (
        <div key={tooth} className="w-7 sm:w-9 h-20 opacity-0 pointer-events-none" />
      );
    }

    return (
      <div
        key={tooth}
        onClick={() => handleToothClick(tooth)}
        onMouseEnter={() => setHoveredTooth(tooth)}
        onMouseLeave={() => setHoveredTooth(null)}
        className={`group relative flex flex-col items-center justify-between p-1 rounded-xl transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'bg-blue-100/80 ring-2 ring-blue-500 shadow-xs scale-105 z-10'
            : 'hover:bg-slate-100/90 hover:scale-105'
        }`}
        title={`${tooth} - ${meta?.name || 'Dente'}: ${
          mode === 'selection' ? (isSelected ? 'Selecionado' : 'Clique para selecionar') : statusCfg.label
        }`}
      >
        {/* Número do dente no topo para arcada inferior se desejado, ou padronizado */}
        {!showNumberAtBottom && (
          <span className="text-[11px] sm:text-xs font-bold text-slate-700 font-mono tracking-tight group-hover:text-blue-600">
            {tooth}
          </span>
        )}

        {/* Ilustração Anatômica do Dente */}
        <ToothSvg
          fdi={tooth}
          status={status}
          isSelected={isSelected}
          width={28}
          height={56}
          className="transition-transform group-hover:drop-shadow-sm"
        />

        {/* Número do dente embaixo para arcada superior */}
        {showNumberAtBottom && (
          <span className="text-[11px] sm:text-xs font-bold text-slate-700 font-mono tracking-tight group-hover:text-blue-600 mt-0.5">
            {tooth}
          </span>
        )}

        {/* Indicador de Status Clínico (no modo status) */}
        {mode === 'clinical_status' && status !== 'HIGIDO' && (
          <span
            className={`text-[8px] font-black uppercase px-1 py-0.2 rounded-full mt-0.5 ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}
          >
            {status.slice(0, 3)}
          </span>
        )}

        {/* Checkmark no modo seleção */}
        {mode === 'selection' && isSelected && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
            ✓
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-5 select-none space-y-5">
      {/* Barra de Ações Rápidas do Topo (Idêntica à referência: Limpar | Todos | Superior | Inferior) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={handleSelectUpper}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              Superior
            </button>
            <button
              type="button"
              onClick={handleSelectLower}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              Inferior
            </button>
          </div>

          {/* Dica interativa do dente sob o cursor */}
          <div className="text-[11px] font-semibold text-slate-500 truncate max-w-xs sm:max-w-md h-5 flex items-center">
            {hoveredTooth ? (
              <span className="text-blue-700 animate-fadeIn">
                <strong>{hoveredTooth}:</strong> {TEETH_METADATA[hoveredTooth]?.name}
                {mode === 'clinical_status' && (
                  <span className="ml-1.5 font-bold text-slate-600">
                    ({TOOTH_STATUS_CONFIG[statusMap[hoveredTooth] || 'HIGIDO']?.label})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">
                {mode === 'clinical_status'
                  ? '💡 Clique no dente para alternar entre Hígido, Restaurado, Cárie, Ausente ou Faceta'
                  : '💡 Selecione os dentes desejados para a intervenção clínica'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SEÇÃO 1: ARCADA SUPERIOR - PERMANENTES                      */}
      {/* ============================================================ */}
      <div className="space-y-2">
        <div className="text-center">
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Arcada Superior - Permanentes
          </span>
        </div>

        {/* Linha de Dentes da Arcada Superior (18 a 11 | 21 a 28) */}
        <div className="flex items-center justify-center overflow-x-auto py-2 px-1">
          {/* Quadrante 1 (Direito do Paciente / Esquerdo na Tela): 18 a 11 */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {UPPER_PERMANENT_RIGHT.map((tooth) => renderToothCard(tooth, true))}
          </div>

          {/* Linha Média Sagital Divisória */}
          <div className="h-20 w-[1.5px] bg-slate-300 mx-1.5 sm:mx-3 self-center rounded-full opacity-70" />

          {/* Quadrante 2 (Esquerdo do Paciente / Direito na Tela): 21 a 28 */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {UPPER_PERMANENT_LEFT.map((tooth) => renderToothCard(tooth, true))}
          </div>
        </div>
      </div>

      {/* Linha Oclusal Horizontal Sutil entre as duas arcadas */}
      <div className="border-b border-dashed border-slate-200 my-2" />

      {/* ============================================================ */}
      {/* SEÇÃO 2: ARCADA INFERIOR - PERMANENTES                      */}
      {/* ============================================================ */}
      <div className="space-y-2">
        <div className="text-center">
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Arcada Inferior - Permanentes
          </span>
        </div>

        {/* Linha de Dentes da Arcada Inferior (48 a 41 | 31 a 38) */}
        <div className="flex items-center justify-center overflow-x-auto py-2 px-1">
          {/* Quadrante 4 (Direito do Paciente / Esquerdo na Tela): 48 a 41 */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {LOWER_PERMANENT_RIGHT.map((tooth) => renderToothCard(tooth, false))}
          </div>

          {/* Linha Média Sagital Divisória */}
          <div className="h-20 w-[1.5px] bg-slate-300 mx-1.5 sm:mx-3 self-center rounded-full opacity-70" />

          {/* Quadrante 3 (Esquerdo do Paciente / Direito na Tela): 31 a 38 */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {LOWER_PERMANENT_LEFT.map((tooth) => renderToothCard(tooth, false))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SEÇÃO 3: DENTES DECÍDUOS (DE LEITE) - ACCORDION RETRÁTIL    */}
      {/* ============================================================ */}
      {allowDeciduous && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="rounded-2xl border border-purple-200 overflow-hidden bg-purple-50/30">
            {/* Cabeçalho do Accordion (Lilás / Magenta conforme referência) */}
            <button
              type="button"
              onClick={() => setDeciduousOpen(!deciduousOpen)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white font-bold text-xs sm:text-sm flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <span>🍼</span>
                <span>Dentes Decíduos (de leite)</span>
              </div>
              <span className="text-lg transition-transform duration-200">
                {deciduousOpen ? '▲' : '▼'}
              </span>
            </button>

            {/* Conteúdo Expansível dos Decíduos */}
            {deciduousOpen && (
              <div className="p-4 space-y-4 animate-fadeIn bg-white/70">
                {/* Botões de Ação para Decíduos */}
                {!readOnly && (
                  <div className="flex items-center justify-center gap-2 pb-2">
                    <button
                      type="button"
                      onClick={handleSelectAllDeciduous}
                      className="px-3 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold shadow-2xs transition"
                    >
                      Todos Decíduos
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectUpperDeciduous}
                      className="px-3 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold shadow-2xs transition"
                    >
                      Superior
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectLowerDeciduous}
                      className="px-3 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold shadow-2xs transition"
                    >
                      Inferior
                    </button>
                  </div>
                )}

                {/* Superior Decíduos */}
                <div className="space-y-1">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-purple-700 tracking-wider uppercase">
                      Superior - Decíduos
                    </span>
                  </div>
                  <div className="flex items-center justify-center overflow-x-auto py-1">
                    <div className="flex items-center space-x-1">
                      {UPPER_DECIDUOUS_RIGHT.map((tooth) => renderToothCard(tooth, true))}
                    </div>
                    <div className="h-16 w-[1.5px] bg-purple-300 mx-2 self-center rounded-full opacity-70" />
                    <div className="flex items-center space-x-1">
                      {UPPER_DECIDUOUS_LEFT.map((tooth) => renderToothCard(tooth, true))}
                    </div>
                  </div>
                </div>

                {/* Linha Divisória */}
                <div className="border-b border-dashed border-purple-200 my-1" />

                {/* Inferior Decíduos */}
                <div className="space-y-1">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-purple-700 tracking-wider uppercase">
                      Inferior - Decíduos
                    </span>
                  </div>
                  <div className="flex items-center justify-center overflow-x-auto py-1">
                    <div className="flex items-center space-x-1">
                      {LOWER_DECIDUOUS_RIGHT.map((tooth) => renderToothCard(tooth, false))}
                    </div>
                    <div className="h-16 w-[1.5px] bg-purple-300 mx-2 self-center rounded-full opacity-70" />
                    <div className="flex items-center space-x-1">
                      {LOWER_DECIDUOUS_LEFT.map((tooth) => renderToothCard(tooth, false))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legenda de Status Clínico */}
      {mode === 'clinical_status' && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
          <span className="flex items-center">
            <span className="w-3 h-3 rounded-md bg-emerald-500 mr-1.5 shadow-2xs" /> Hígido
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 rounded-md bg-blue-500 mr-1.5 shadow-2xs" /> Restaurado
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 rounded-md bg-red-500 mr-1.5 shadow-2xs" /> Cárie
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 rounded-md bg-slate-400 mr-1.5 shadow-2xs" /> Ausente
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 rounded-md bg-purple-500 mr-1.5 shadow-2xs" /> Faceta / Coroa
          </span>
        </div>
      )}
    </div>
  );
};
