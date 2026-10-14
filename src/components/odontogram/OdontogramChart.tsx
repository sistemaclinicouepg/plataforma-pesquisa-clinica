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

export type ToolMode = ToothStatus | 'CYCLE';

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
  // Estado local dos dentes garantido para renderização instantânea
  const [localStatusMap, setLocalStatusMap] = useState<Record<string, ToothStatus>>(statusMap || {});
  
  // Pincel / Ferramenta de Status Ativo (permite selecionar o status e ir clicando nos dentes!)
  const [activeBrush, setActiveBrush] = useState<ToolMode>('CYCLE');
  
  const [deciduousOpen, setDeciduousOpen] = useState(false);
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);

  // Sincronizar quando a prop externa for atualizada
  useEffect(() => {
    if (statusMap) {
      setLocalStatusMap(statusMap);
    }
  }, [statusMap]);

  // Aplica o status em um dente específico
  const applyToothStatus = (tooth: string, statusToApply: ToothStatus) => {
    if (readOnly) return;
    setLocalStatusMap((prev) => ({
      ...prev,
      [tooth]: statusToApply,
    }));
    onChangeStatus?.(tooth, statusToApply);
  };

  // Clique no dente com comportamento inteligente de Pincel / Ciclo
  const handleToothClick = (tooth: string) => {
    if (readOnly) return;

    if (mode === 'selection') {
      onToggleSelect?.(tooth);
      return;
    }

    // Modo Pincel Ativo: se o usuário escolheu Ausente, Cárie, Restaurado, etc.
    if (activeBrush !== 'CYCLE') {
      const current = localStatusMap[tooth] || 'HIGIDO';
      // Se clicar com a mesma ferramenta em dente que já tem aquele status, reverte para Hígido
      const nextStatus = current === activeBrush ? 'HIGIDO' : activeBrush;
      applyToothStatus(tooth, nextStatus);
    } else {
      // Modo Ciclo Sequencial
      const current = localStatusMap[tooth] || 'HIGIDO';
      const sequence: ToothStatus[] = ['HIGIDO', 'RESTAURADO', 'CARIE', 'AUSENTE', 'FACETA'];
      const nextIdx = (sequence.indexOf(current) + 1) % sequence.length;
      applyToothStatus(tooth, sequence[nextIdx]);
    }
  };

  // Ações em lote
  const handleClearAll = () => {
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

  // Aplica o pincel atual em uma lista de dentes
  const applyBrushToTeeth = (teeth: string[]) => {
    if (readOnly) return;
    if (mode === 'selection') {
      onBatchSelect?.(teeth, 'select');
    } else {
      const targetStatus: ToothStatus = activeBrush === 'CYCLE' ? 'HIGIDO' : activeBrush;
      const updated = { ...localStatusMap };
      teeth.forEach((t) => {
        updated[t] = targetStatus;
        onChangeStatus?.(t, targetStatus);
      });
      setLocalStatusMap(updated);
    }
  };

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
          isSelected
            ? 'bg-blue-100/80 ring-2 ring-blue-500 shadow-sm scale-105 z-10'
            : 'hover:bg-slate-100/90 hover:scale-105 hover:shadow-xs active:scale-95'
        }`}
        title={`${tooth} - ${meta?.name || 'Dente'}: ${statusCfg.label}. ${
          activeBrush !== 'CYCLE'
            ? `Clique para aplicar status [${TOOTH_STATUS_CONFIG[activeBrush]?.label}]`
            : 'Clique para alternar status'
        }`}
      >
        {/* Ilustração Anatômica Hiper-realista do Dente */}
        <ToothSvg
          fdi={tooth}
          status={status}
          isSelected={isSelected}
          width={30}
          height={62}
          className="transition-transform group-hover:drop-shadow-sm"
        />

        {/* Número do dente no padrão FDI */}
        <span className="text-[11px] sm:text-xs font-black text-slate-800 font-mono tracking-tight group-hover:text-blue-600 mt-1">
          {tooth}
        </span>

        {/* Indicador de Status Clínico */}
        {mode === 'clinical_status' && (
          <div className="mt-0.5 flex items-center justify-center">
            {status === 'HIGIDO' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" title="Hígido" />
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

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xs p-3 sm:p-6 select-none space-y-5">
      
      {/* ============================================================ */}
      {/* BARRA DE FERRAMENTAS / MODO PINCEL CLÍNICO ATIVO             */}
      {/* Permite selecionar um status e ir clicando nos dentes!       */}
      {/* ============================================================ */}
      {!readOnly && mode === 'clinical_status' && (
        <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 space-y-2.5 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm">🖌️</span>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Ferramenta / Pincel Clínico:
              </span>
            </div>

            <span className="text-[11px] text-slate-300 font-semibold bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
              {activeBrush === 'CYCLE' ? (
                '🔄 Modo Ciclo: Clique no dente para alternar sequencialmente'
              ) : (
                <span>
                  Pincel Ativo: <strong className="text-white underline">{TOOTH_STATUS_CONFIG[activeBrush]?.label}</strong> (Clique nos dentes para aplicar)
                </span>
              )}
            </span>
          </div>

          {/* Botões seletores de ferramenta/pincel */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveBrush('AUSENTE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeBrush === 'AUSENTE'
                  ? 'bg-slate-700 text-white ring-2 ring-red-400 shadow-xs scale-105'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>⚪ Ausente (Extraído)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBrush('CARIE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeBrush === 'CARIE'
                  ? 'bg-red-600 text-white ring-2 ring-red-300 shadow-xs scale-105'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span>🔴 Cárie</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBrush('RESTAURADO')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeBrush === 'RESTAURADO'
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-xs scale-105'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span>🔵 Restaurado</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBrush('FACETA')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeBrush === 'FACETA'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-xs scale-105'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span>🟣 Faceta / Coroa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBrush('HIGIDO')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeBrush === 'HIGIDO'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-xs scale-105'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>🟢 Hígido</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBrush('CYCLE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeBrush === 'CYCLE'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-300 shadow-xs scale-105'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span>🔄</span>
              <span>Alternar (Ciclo)</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Ações Rápidas (Limpar | Aplicar Superior | Aplicar Inferior | Todos) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="inline-flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              Limpar (Todos Hígidos)
            </button>
            <button
              type="button"
              onClick={() => applyBrushToTeeth(ALL_PERMANENT_TEETH)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              {activeBrush === 'CYCLE' ? 'Todos' : `Aplicar em Todos`}
            </button>
            <button
              type="button"
              onClick={() => applyBrushToTeeth(UPPER_PERMANENT_TEETH)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              Superior
            </button>
            <button
              type="button"
              onClick={() => applyBrushToTeeth(LOWER_PERMANENT_TEETH)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
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
                {activeBrush !== 'CYCLE'
                  ? `👉 Clique em qualquer dente para aplicar [${TOOTH_STATUS_CONFIG[activeBrush]?.label}]`
                  : '👉 Clique em qualquer dente para alternar o status clínico'}
              </span>
            )}
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
                      onClick={() => applyBrushToTeeth(ALL_DECIDUOUS_TEETH)}
                      className="px-3 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                    >
                      Todos Decíduos
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBrushToTeeth(UPPER_DECIDUOUS_TEETH)}
                      className="px-3 py-1 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                    >
                      Superior
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBrushToTeeth(LOWER_DECIDUOUS_TEETH)}
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
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 shadow-2xs" /> Hígido (Esmalte Natural)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5 shadow-2xs" /> Restaurado (Resina Azul)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5 shadow-2xs" /> Cárie (Lesão Vermelha)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-1.5 shadow-2xs" /> Ausente (Cruz Vermelha)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-1.5 shadow-2xs" /> Faceta / Coroa (Roxo)
          </span>
        </div>
      )}
    </div>
  );
};
