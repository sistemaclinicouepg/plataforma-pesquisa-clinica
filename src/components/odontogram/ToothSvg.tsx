import React from 'react';
import { TEETH_METADATA, ToothStatus } from './teethData';

interface ToothSvgProps {
  fdi: string;
  status?: ToothStatus;
  isSelected?: boolean;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const ToothSvg: React.FC<ToothSvgProps> = ({
  fdi,
  status = 'HIGIDO',
  isSelected = false,
  className = '',
  width = 36,
  height = 72,
}) => {
  const meta = TEETH_METADATA[fdi];
  const isUpper = meta?.arch === 'superior';
  const isAbsent = status === 'AUSENTE';
  const isRestored = status === 'RESTAURADO';
  const isCaries = status === 'CARIE';
  const isFacet = status === 'FACETA';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-all duration-200 ${className}`}
      style={{ width, height }}
    >
      {/* Imagem 3D Hiper-realista Anatômica do Dente */}
      <picture
        className={`w-full h-full flex items-center justify-center transition-all duration-200 ${
          isAbsent ? 'opacity-25 grayscale filter contrast-75' : ''
        }`}
      >
        <source srcSet={`/teeth/tooth-${fdi}.webp`} type="image/webp" />
        <img
          src={`/teeth/tooth-${fdi}.png`}
          alt={`Dente ${fdi}`}
          className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
          loading="lazy"
        />
      </picture>

      {/* ============================================================ */}
      {/* SOBREPOSIÇÃO CLÍNICA: AUSENTE (Cruz Cirúrgica Vermelha)      */}
      {/* ============================================================ */}
      {isAbsent && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 drop-shadow-sm"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line
            x1="20"
            y1="18"
            x2="80"
            y2="82"
            stroke="#ef4444"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <line
            x1="80"
            y1="18"
            x2="20"
            y2="82"
            stroke="#ef4444"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* ============================================================ */}
      {/* SOBREPOSIÇÃO CLÍNICA: RESTAURADO (Resina Composta Azul)      */}
      {/* ============================================================ */}
      {isRestored && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-all ${
            isUpper ? 'bottom-1' : 'top-1'
          }`}
          style={{ width: '70%', height: '34%' }}
        >
          <div className="w-full h-full rounded-md bg-blue-600/85 border border-blue-200 shadow-sm shadow-blue-600/50 backdrop-blur-[0.5px] flex items-center justify-center relative overflow-hidden">
            {/* Brilho especular no esmalte restaurado */}
            <div className="w-3/4 h-1/3 rounded-full bg-white/50 blur-[0.5px] absolute top-0.5" />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SOBREPOSIÇÃO CLÍNICA: CÁRIE (Lesão Cavitária Vermelha/Âmbar) */}
      {/* ============================================================ */}
      {isCaries && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-all ${
            isUpper ? 'bottom-1.5' : 'top-1.5'
          }`}
          style={{ width: '62%', height: '30%' }}
        >
          <div className="w-full h-full rounded-full bg-red-600/90 border-2 border-red-950/80 shadow-inner flex items-center justify-center animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-950" />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SOBREPOSIÇÃO CLÍNICA: FACETA / COROA (Cerâmica Translúcida)  */}
      {/* ============================================================ */}
      {isFacet && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-all ${
            isUpper ? 'bottom-0.5' : 'top-0.5'
          }`}
          style={{ width: '84%', height: '38%' }}
        >
          <div className="w-full h-full rounded-lg bg-gradient-to-tr from-purple-500/75 via-fuchsia-400/55 to-amber-200/45 border border-purple-400 shadow-sm shadow-purple-500/30 ring-1 ring-purple-300" />
        </div>
      )}

      {/* Anel de Seleção */}
      {isSelected && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-blue-500 ring-offset-1 pointer-events-none z-20 animate-pulse" />
      )}
    </div>
  );
};
