'use client';

import React, { useState, useEffect } from 'react';
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
  statusMap,
  selectedTeeth = [],
  scope = 'full',
  onChangeStatus,
  onToggleSelect,
  onBatchSelect,
  readOnly = false,
  allowDeciduous = true,
}) => {
  // Estado local autossuficiente para garantir que o clique funcione imediatamente
  const [localStatusMap, setLocalStatusMap] = useState<Record<string, ToothStatus>>(statusMap || {});
  const [deciduousOpen, setDeciduousOpen] = useState(false);
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [activeSelectedTooth, setActiveSelectedTooth] = useState<string | null>(null);

  // Sincronizar quando a prop externa mudar
  useEffect(() => {
    if (statusMap) {
      setLocalStatusMap(statusMap);
    }
  }, [statusMap]);

  // Função para definir status específico de um dente
  const setSpecificStatus = (tooth: string, newStatus: ToothStatus) => {
    if (readOnly) return;
    setLocalStatusMap((prev) => ({
      ...prev,
      [tooth]: newStatus,
    }));
    onChangeStatus?.(tooth, newStatus);
  };

  // Status cíclico ao clicar no dente: Hígido -> Restaurado -> Cárie -> Ausente -> Faceta -> Hígido
  const cycleStatus = (tooth: string) => {
    if (readOnly) return;
    const current = localStatusMap[tooth] || 'HIGIDO';
    const sequence: ToothStatus[] = ['HIGIDO', 'RESTAURADO', 'CARIE', 'AUSENTE', 'FACETA'];
    const nextIdx = (sequence.indexOf(current) + 1) % sequence.length;
    const nextStatus = sequence[nextIdx];

    setSpecificStatus(tooth, nextStatus);
    setActiveSelectedTooth(tooth);
  };

  const handleToothClick = (tooth: string) => {
    if (readOnly) return;
    if (mode === 'selection') {
      onToggleSelect?.(tooth);
    } else {
      cycleStatus(tooth);
    }
  };

  // Ações em massa
  const handleClear = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.([...ALL_PERMANENT_TEETH, ...ALL_DECIDUOUS_TEETH], 'deselect');
    } else {
      const resetMap: Record<string, ToothStatus> = {};
      [...ALL_PERMANENT_TEETH, ...ALL_DECIDUOUS_TEETH].forEach((t) => {
        resetMap[t] = 'HIGIDO';
        onChangeStatus?.(t, 'HIGIDO');
      });
      setLocalStatusMap(resetMap);
    }
  };

  const handleSelectAll = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(ALL_PERMANENT_TEETH, 'select');
    } else {
      const current = activeSelectedTooth ? localStatusMap[activeSelectedTooth] || 'HIGIDO' : 'HIGIDO';
      const updated: Record<string, ToothStatus> = { ...localStatusMap };
      ALL_PERMANENT_TEETH.forEach((t) => {
        updated[t] = current;
        onChangeStatus?.(t, current);
      });
      setLocalStatusMap(updated);
    }
  };

  const handleSelectUpper = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(UPPER_PERMANENT_TEETH, 'select');
    } else {
      const current = activeSelectedTooth ? localStatusMap[activeSelectedTooth] || 'HIGIDO' : 'HIGIDO';
      const updated: Record<string, ToothStatus> = { ...localStatusMap };
      UPPER_PERMANENT_TEETH.forEach((t) => {
        updated[t] = current;
        onChangeStatus?.(t, current);
      });
      setLocalStatusMap(updated);
    }
  };

  const handleSelectLower = () => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(LOWER_PERMANENT_TEETH, 'select');
    } else {
      const current = activeSelectedTooth ? localStatusMap[activeSelectedTooth] || 'HIGIDO' : 'HIGIDO';
      const updated: Record<string, ToothStatus> = { ...localStatusMap };
      LOWER_PERMANENT_TEETH.forEach((t) => {
        updated[t] = current;
        onChangeStatus?.(t, current);
      });
      setLocalStatusMap(updated);
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

  const renderToothCard = (tooth: string) => {
    const meta = TEETH_METADATA[tooth];
    const status = localStatusMap[tooth] || 'HIGIDO';
    const statusCfg = TOOTH_STATUS_CONFIG[status] || TOOTH_STATUS_CONFIG.HIGIDO;
    const isSelected = selectedTeeth.includes(tooth);
    const isActive = activeSelectedTooth === tooth;
    const visible = isToothVisible(tooth);

    if (!visible) {
      return (
        <div key={tooth} className="w-7 sm:w-9 h-24 opacity-0 pointer-events-none" />
      );
    }

    return (
      <div
        key={tooth}
        onClick={() => handleToothClick(tooth)}
        onMouseEnter={() => setHoveredTooth(tooth)}
        onMouseLeave={() => setHoveredTooth(null)}
        className={`group relative flex flex-col items-center justify-between p-1.5 sm:p-2 rounded-2xl transition-all duration-150 cursor-pointer ${
          isActive
            ? 'bg-blue-50 ring-2 ring-blue-500 shadow-sm scale-105 z-20'
            : isSelected
            ? 'bg-blue-100/70 ring-2 ring-blue-500 shadow-xs scale-105 z-10'
            : 'hover:bg-slate-100/90 hover:scale-105 hover:shadow-xs'
        }`}
        title={`${tooth} - ${meta?.name || 'Dente'}: ${
          mode === 'selection'
            ? isSelected
              ? 'Selecionado'
              : 'Clique para selecionar'
            : `${statusCfg.label}. Clique para alternar status.`
        }`}
      >
        {/* Ilustração Anatômica Realista do Dente */}
        <ToothSvg
          fdi={tooth}
          status={status}
          isSelected={isSelected || isActive}
          width={30}
          height={60}
          className="transition-transform group-hover:drop-shadow-sm"
        />

        {/* Número do dente no padrão FDI */}
        <span className="text-[11px] sm:text-xs font-black text-slate-800 font-mono tracking-tight group-hover:text-blue-600 mt-1">
          {tooth}
        </span>

        {/* Badge de Higidez / Status Clínico */}
        {mode === 'clinical_status' && (
          <div className="mt-0.5 flex items-center justify-center">
            {status === 'HIGIDO' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Hígido" />
            ) : (
              <span
                className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}
              >
                {status.slice(0, 4)}
              </span>
            )}
          </div>
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

  const activeToothStatus = activeSelectedTooth ? localStatusMap[activeSelectedTooth] || 'HIGIDO' : null;

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xs p-3 sm:p-6 select-none space-y-6">
      
      {/* Barra de Ações Rápidas do Topo (Limpar | Todos | Superior | Inferior) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              Limpar (Todos Hígidos)
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={handleSelectUpper}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              Superior
            </button>
            <button
              type="button"
              onClick={handleSelectLower}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              Inferior
            </button>
          </div>

          {/* Dica interativa do dente sob o cursor */}
          <div className="text-xs font-semibold text-slate-600 truncate max-w-xs sm:max-w-md h-5 flex items-center">
            {hoveredTooth ? (
              <span className="text-blue-700 animate-fadeIn">
                <strong>Dente {hoveredTooth}:</strong> {TEETH_METADATA[hoveredTooth]?.name}
                {mode === 'clinical_status' && (
                  <span className="ml-2 font-bold text-slate-700">
                    [{TOOTH_STATUS_CONFIG[localStatusMap[hoveredTooth] || 'HIGIDO']?.label}]
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">
                {mode === 'clinical_status'
                  ? '💡 Clique diretamente no dente para alterar o status'
                  : '💡 Selecione os dentes desejados para a intervenção'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Paleta Rápida de Status (aparece ao selecionar um dente) */}
      {!readOnly && mode === 'clinical_status' && activeSelectedTooth && (
        <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-slate-700 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-blue-400 font-mono">Dente {activeSelectedTooth}:</span>
            <span className="text-xs font-medium text-slate-300">
              {TEETH_METADATA[activeSelectedTooth]?.name}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-400 mr-1 font-semibold">Definir status:</span>
            <button
              type="button"
              onClick={() => setSpecificStatus(activeSelectedTooth, 'HIGIDO')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                activeToothStatus === 'HIGIDO'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Hígido</span>
            </button>

            <button
              type="button"
              onClick={() => setSpecificStatus(activeSelectedTooth, 'RESTAURADO')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                activeToothStatus === 'RESTAURADO'
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Restaurado</span>
            </button>

            <button
              type="button"
              onClick={() => setSpecificStatus(activeSelectedTooth, 'CARIE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                activeToothStatus === 'CARIE'
                  ? 'bg-red-600 text-white ring-2 ring-red-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>Cárie</span>
            </button>

            <button
              type="button"
              onClick={() => setSpecificStatus(activeSelectedTooth, 'AUSENTE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                activeToothStatus === 'AUSENTE'
                  ? 'bg-slate-600 text-white ring-2 ring-slate-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Ausente</span>
            </button>

            <button
              type="button"
              onClick={() => setSpecificStatus(activeSelectedTooth, 'FACETA')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                activeToothStatus === 'FACETA'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Faceta / Coroa</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SEÇÃO 1: ARCADA SUPERIOR - PERMANENTES                      */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <div className="text-center">
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
            Arcada Superior - Permanentes
          </span>
        </div>

        {/* Linha de Dentes da Arcada Superior (18 a 11 | 21 a 28) */}
        <div className="flex items-center justify-center overflow-x-auto py-2 px-1">
          {/* Quadrante 1 (Direito do Paciente): 18 a 11 */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {UPPER_PERMANENT_RIGHT.map((tooth) => renderToothCard(tooth))}
          </div>

          {/* Linha Média Sagital Divisória */}
          <div className="h-24 w-[1.5px] bg-slate-300 mx-1.5 sm:mx-3 self-center rounded-full opacity-80" />

          {/* Quadrante 2 (Esquerdo do Paciente): 21 a 28 */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {UPPER_PERMANENT_LEFT.map((tooth) => renderToothCard(tooth))}
          </div>
        </div>
      </div>

      {/* Linha Oclusal Horizontal Sutil entre as duas arcadas */}
      <div className="border-b border-dashed border-slate-200 my-2" />

      {/* ============================================================ */}
      {/* SEÇÃO 2: ARCADA INFERIOR - PERMANENTES                      */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <div className="text-center">
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
            Arcada Inferior - Permanentes
          </span>
        </div>

        {/* Linha de Dentes da Arcada Inferior (48 a 41 | 31 a 38) */}
        <div className="flex items-center justify-center overflow-x-auto py-2 px-1">
          {/* Quadrante 4 (Direito do Paciente): 48 a 41 */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {LOWER_PERMANENT_RIGHT.map((tooth) => renderToothCard(tooth))}
          </div>

          {/* Linha Média Sagital Divisória */}
          <div className="h-24 w-[1.5px] bg-slate-300 mx-1.5 sm:mx-3 self-center rounded-full opacity-80" />

          {/* Quadrante 3 (Esquerdo do Paciente): 31 a 38 */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {LOWER_PERMANENT_LEFT.map((tooth) => renderToothCard(tooth))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SEÇÃO 3: DENTES DECÍDUOS (DE LEITE) - ACCORDION RETRÁTIL    */}
      {/* ============================================================ */}
      {allowDeciduous && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="rounded-2xl border border-purple-200 overflow-hidden bg-purple-50/30">
            <button
              type="button"
              onClick={() => setDeciduousOpen(!deciduousOpen)}
              className="w-full px-5 py-3.5 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white font-bold text-xs sm:text-sm flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <span>🍼</span>
                <span>Dentes Decíduos (de leite)</span>
              </div>
              <span className="text-lg transition-transform duration-200">
                {deciduousOpen ? '▲' : '▼'}
              </span>
            </button>

            {deciduousOpen && (
              <div className="p-4 space-y-4 animate-fadeIn bg-white/70">
                {!readOnly && (
                  <div className="flex items-center justify-center gap-2 pb-2">
                    <button
                      type="button"
                      onClick={handleSelectAllDeciduous}
                      className="px-3 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                    >
                      Todos Decíduos
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectUpperDeciduous}
                      className="px-3 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                    >
                      Superior
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectLowerDeciduous}
                      className="px-3 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold shadow-2xs transition cursor-pointer"
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
                      {UPPER_DECIDUOUS_RIGHT.map((tooth) => renderToothCard(tooth))}
                    </div>
                    <div className="h-16 w-[1.5px] bg-purple-300 mx-2 self-center rounded-full opacity-70" />
                    <div className="flex items-center space-x-1">
                      {UPPER_DECIDUOUS_LEFT.map((tooth) => renderToothCard(tooth))}
                    </div>
                  </div>
                </div>

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
                      {LOWER_DECIDUOUS_RIGHT.map((tooth) => renderToothCard(tooth))}
                    </div>
                    <div className="h-16 w-[1.5px] bg-purple-300 mx-2 self-center rounded-full opacity-70" />
                    <div className="flex items-center space-x-1">
                      {LOWER_DECIDUOUS_LEFT.map((tooth) => renderToothCard(tooth))}
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
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 shadow-2xs" /> Hígido (Branco)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5 shadow-2xs" /> Restaurado (Azul)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5 shadow-2xs" /> Cárie (Vermelho)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-1.5 shadow-2xs" /> Ausente (Traço X)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-1.5 shadow-2xs" /> Faceta / Coroa (Roxo)
          </span>
        </div>
      )}
    </div>
  );
};
