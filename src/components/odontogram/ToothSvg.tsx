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

  const uid = `t_${fdi}_${status}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-all duration-150 ${className}`}
      style={{ width, height }}
    >
      {/* Imagem 3D Anatômica do Dente (100% Livre de Sombras) */}
      <picture
        className={`w-full h-full flex items-center justify-center transition-all duration-150 ${
          isAbsent ? 'opacity-30 grayscale contrast-75' : ''
        }`}
      >
        <source srcSet={`/teeth/tooth-${fdi}.webp`} type="image/webp" />
        <img
          src={`/teeth/tooth-${fdi}.png`}
          alt={`Dente ${fdi}`}
          className="w-full h-full object-contain pointer-events-none"
          loading="lazy"
        />
      </picture>

      {/* ============================================================ */}
      {/* SOBREPOSIÇÕES CLÍNICAS VETORIAIS ANATÔMICAS E HARMÔNICAS    */}
      {/* ============================================================ */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Gradiente de Resina Composta Restauradora (Azul Odontológico Harmonioso) */}
          <linearGradient id={`rest_grad_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.88" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
          </linearGradient>

          {/* Gradiente de Lesão de Cárie Anatômica (Âmbar/Vinho Profundo) */}
          <radialGradient id={`carie_grad_${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#450a0a" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#991b1b" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.4" />
          </radialGradient>

          {/* Gradiente de Faceta / Coroa Cerâmica Translúcida */}
          <linearGradient id={`facet_grad_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#e879f9" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* 1. STATUS: AUSENTE (Cruz Cirúrgica Fina, Elegante e Refinada) */}
        {isAbsent && (
          <g>
            <line
              x1="26"
              y1="22"
              x2="74"
              y2="78"
              stroke="#e11d48"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.9"
            />
            <line
              x1="74"
              y1="22"
              x2="26"
              y2="78"
              stroke="#e11d48"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.9"
            />
          </g>
        )}

        {/* 2. STATUS: RESTAURADO (Restauração de Resina Esculpida na Coroa) */}
        {isRestored && (
          <g transform={isUpper ? 'translate(0, 52)' : 'translate(0, -6)'}>
            {/* Bloco anatômico da restauração que segue as vertentes de cúspides */}
            <path
              d="M 37 25 C 33 28, 34 35, 38 39 C 43 43, 57 43, 62 39 C 66 35, 67 28, 63 25 C 58 22, 42 22, 37 25 Z"
              fill={`url(#rest_grad_${uid})`}
              stroke="#2563eb"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Sulco anatômico na restauração */}
            <path
              d="M 44 26 C 48 32, 52 32, 56 26"
              fill="none"
              stroke="#1e40af"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.75"
            />
            {/* Brilho especular no esmalte restaurado */}
            <path
              d="M 40 25 C 43 23, 47 23, 50 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.85"
            />
          </g>
        )}

        {/* 3. STATUS: CÁRIE (Lesão Cavitária Orgânica na Fosseta da Coroa) */}
        {isCaries && (
          <g transform={isUpper ? 'translate(0, 52)' : 'translate(0, -6)'}>
            {/* Halo de desmineralização suave ao redor da cárie */}
            <ellipse cx="50" cy="31" rx="13" ry="9" fill="#fecaca" opacity="0.45" />
            {/* Lesão cavitária ativa irregular */}
            <path
              d="M 43 28 C 41 30, 42 34, 45 36 C 48 38, 53 37, 56 34 C 58 31, 56 28, 53 27 C 49 25, 45 26, 43 28 Z"
              fill={`url(#carie_grad_${uid})`}
              stroke="#7f1d1d"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Fóvea profunda / ponto central de cavitação */}
            <circle cx="49" cy="31" r="2.2" fill="#2d0606" />
          </g>
        )}

        {/* 4. STATUS: FACETA / COROA (Glaze Cerâmico com Término Cervical Dourado) */}
        {isFacet && (
          <g transform={isUpper ? 'translate(0, 52)' : 'translate(0, -6)'}>
            {/* Envoltório translúcido cerâmico da coroa */}
            <path
              d="M 28 20 C 34 17, 66 17, 72 20 C 76 28, 75 39, 70 45 C 61 48, 39 48, 30 45 C 25 39, 24 28, 28 20 Z"
              fill={`url(#facet_grad_${uid})`}
              stroke="#a855f7"
              strokeWidth="1"
              strokeDasharray="2.5 1.5"
            />
            {/* Linha de término cervical protética */}
            <path
              d="M 28 20 C 40 17, 60 17, 72 20"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      {/* Anel Sutil de Seleção (Sem sombras pesadas) */}
      {isSelected && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-blue-500 pointer-events-none z-20" />
      )}
    </div>
  );
};
