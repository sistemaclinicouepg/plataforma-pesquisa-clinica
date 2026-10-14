import React from 'react';
import { ToothStatus } from './teethData';

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
  const statusKey = (status || 'HIGIDO').toLowerCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-all duration-150 ${className}`}
      style={{ width, height }}
    >
      {/* Imagem Anatômica Vetorial (Contorno de dentes com sobreposição exata na coroa) */}
      <picture className="w-full h-full flex items-center justify-center transition-all duration-150">
        <source srcSet={`/teeth/tooth-${fdi}-${statusKey}.webp?v=2`} type="image/webp" />
        <img
          src={`/teeth/tooth-${fdi}-${statusKey}.png?v=2`}
          alt={`Dente ${fdi} (${status})`}
          className="w-full h-full object-contain pointer-events-none drop-shadow-none"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes(`/teeth/tooth-${fdi}.png`)) {
              target.src = `/teeth/tooth-${fdi}.png?v=2`;
            }
          }}
        />
      </picture>

      {/* Anel Sutil de Seleção (Sem sombras pesadas) */}
      {isSelected && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-blue-500 pointer-events-none z-20" />
      )}
    </div>
  );
};

