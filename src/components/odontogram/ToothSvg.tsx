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
  width = 38,
  height = 70,
}) => {
  const meta = TEETH_METADATA[fdi];
  const isMirrored = meta?.mirrored || false;

  // Cores dinâmicas de preenchimento e contorno baseadas no status clínico ou seleção
  let fillColor = '#ffffff';
  let strokeColor = '#334155'; // Slate-700
  let detailColor = '#94a3b8'; // Slate-400
  let isAbsent = false;

  if (isSelected) {
    fillColor = '#dbeafe'; // Blue-100
    strokeColor = '#1d4ed8'; // Blue-700
    detailColor = '#3b82f6';
  } else if (status === 'HIGIDO') {
    fillColor = '#f0fdf4'; // Emerald-50
    strokeColor = '#059669'; // Emerald-600
    detailColor = '#34d399';
  } else if (status === 'RESTAURADO') {
    fillColor = '#eff6ff'; // Blue-50
    strokeColor = '#2563eb'; // Blue-600
    detailColor = '#60a5fa';
  } else if (status === 'CARIE') {
    fillColor = '#fef2f2'; // Red-50
    strokeColor = '#dc2626'; // Red-600
    detailColor = '#f87171';
  } else if (status === 'FACETA') {
    fillColor = '#faf5ff'; // Purple-50
    strokeColor = '#9333ea'; // Purple-600
    detailColor = '#c084fc';
  } else if (status === 'AUSENTE') {
    fillColor = '#f8fafc'; // Slate-50
    strokeColor = '#94a3b8'; // Slate-400
    detailColor = '#cbd5e1';
    isAbsent = true;
  }

  // Renderizador específico por tipo de dente
  const renderToothContent = () => {
    switch (fdi) {
      // ==========================================
      // ARCADA SUPERIOR - PERMANENTES DIREITO (11 a 18)
      // (Espelhados para o lado esquerdo 21 a 28)
      // ==========================================
      case '11':
      case '21':
        return (
          <g>
            {/* Raiz Central Superior (aponta para cima) */}
            <path
              d="M 12 52 C 14 38, 19 20, 24 8 C 24.5 7, 25.5 7, 26 8 C 31 20, 36 38, 38 52 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Linha do canal radicular */}
            <line x1="25" y1="12" x2="25" y2="48" stroke={detailColor} strokeWidth="1" strokeDasharray="1.5 1.5" />
            {/* Coroa do Incisivo Central (larga, bordo reto embaixo) */}
            <path
              d="M 11 52 C 10 64, 9 76, 9 86 C 9 90, 11 91, 14 91 L 36 91 C 39 91, 41 89, 41 85 C 41 76, 40 64, 39 52 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Linha do colo amelocementário */}
            <path d="M 11 52 C 19 55, 31 55, 39 52" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            {/* Sulcos de desenvolvimento vestibular */}
            <line x1="19" y1="65" x2="19" y2="84" stroke={detailColor} strokeWidth="0.8" />
            <line x1="31" y1="65" x2="31" y2="84" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      case '12':
      case '22':
        return (
          <g>
            {/* Raiz Incisivo Lateral (mais delgada, leve inclinação distal) */}
            <path
              d="M 14 52 C 15 38, 20 22, 26 8 C 26.5 7, 27.5 7, 28 9 C 32 24, 34 38, 36 52 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <line x1="26" y1="13" x2="25" y2="48" stroke={detailColor} strokeWidth="1" strokeDasharray="1.5 1.5" />
            {/* Coroa Lateral Superior (ângulo disto-incisal arredondado) */}
            <path
              d="M 13 52 C 12 64, 12 76, 12 85 C 12 89, 14 91, 17 91 L 31 91 C 35 91, 38 88, 37 83 C 37 75, 37 64, 36 52 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 13 52 C 20 55, 30 55, 36 52" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="24" y1="66" x2="24" y2="83" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      case '13':
      case '23':
        return (
          <g>
            {/* Raiz Canino Superior (robusta e cônica) */}
            <path
              d="M 13 51 C 14 36, 19 18, 24 5 C 24.5 4, 25.5 4, 26 5 C 31 18, 36 36, 37 51 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <line x1="25" y1="9" x2="25" y2="48" stroke={detailColor} strokeWidth="1" strokeDasharray="1.5 1.5" />
            {/* Coroa Canino Superior (cúspide pontiaguda embaixo) */}
            <path
              d="M 12 51 C 10 63, 10 74, 12 81 L 25 93 L 38 81 C 40 74, 40 63, 38 51 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 12 51 C 20 55, 30 55, 38 51" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            {/* Aresta labial mediana */}
            <line x1="25" y1="56" x2="25" y2="89" stroke={detailColor} strokeWidth="1" />
          </g>
        );

      case '14':
      case '24':
        return (
          <g>
            {/* Raízes Primeiro Pré-Molar Superior (bifurcada na ponta) */}
            <path
              d="M 13 51 C 14 38, 15 24, 17 11 C 18 9, 21 11, 22 17 C 23 23, 27 23, 28 17 C 29 11, 32 9, 33 11 C 35 24, 36 38, 37 51 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Coroa Pré-Molar */}
            <path
              d="M 12 51 C 10 63, 10 73, 13 81 L 25 90 L 37 81 C 40 73, 40 63, 38 51 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 12 51 C 20 54, 30 54, 38 51" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="56" x2="25" y2="85" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      case '15':
      case '25':
        return (
          <g>
            {/* Raiz Segundo Pré-Molar Superior (única, afilada) */}
            <path
              d="M 13 51 C 14 37, 18 20, 24 7 C 24.5 6, 25.5 6, 26 7 C 32 20, 36 37, 37 51 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <line x1="25" y1="11" x2="25" y2="48" stroke={detailColor} strokeWidth="1" strokeDasharray="1.5 1.5" />
            {/* Coroa Pré-Molar mais ovalada */}
            <path
              d="M 12 51 C 10 62, 10 74, 14 82 L 25 89 L 36 82 C 40 74, 40 62, 38 51 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 12 51 C 20 54, 30 54, 38 51" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="56" x2="25" y2="84" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      case '16':
      case '26':
        return (
          <g>
            {/* 3 Raízes do Primeiro Molar Superior (2 vestibulares + 1 palatina central) */}
            <path
              d="M 8 50 C 9 36, 10 22, 13 8 C 14 6, 17 7, 18 12 C 19 20, 21 28, 23 34 C 23.5 24, 24 15, 26 7 C 27 5, 29 5, 30 7 C 32 15, 32.5 24, 33 34 C 35 28, 37 20, 38 12 C 39 7, 42 6, 43 8 C 46 22, 47 36, 48 50 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Coroa volumosa do 1º Molar Superior com cúspides oclusais */}
            <path
              d="M 7 50 C 6 63, 6 75, 8 84 C 10 88, 15 90, 20 89 C 23 88, 27 88, 30 89 C 35 90, 40 88, 42 84 C 44 75, 44 63, 43 50 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 7 50 C 18 55, 32 55, 43 50" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            {/* Sulco oclusal vestibular */}
            <line x1="25" y1="62" x2="25" y2="88" stroke={detailColor} strokeWidth="1" />
            <line x1="16" y1="72" x2="34" y2="72" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      case '17':
      case '27':
        return (
          <g>
            {/* 3 Raízes do Segundo Molar Superior (mais convergentes e inclinadas distalmente) */}
            <path
              d="M 9 50 C 10 37, 12 24, 15 9 C 16 7, 19 8, 20 13 C 21 22, 22 30, 24 36 C 25 26, 26 17, 28 8 C 29 6, 31 6, 32 8 C 34 17, 34 26, 35 36 C 37 30, 38 21, 40 12 C 41 8, 44 8, 45 10 C 47 24, 46 37, 45 50 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Coroa Molar Superior */}
            <path
              d="M 8 50 C 7 63, 7 75, 9 84 C 11 88, 16 89, 21 88 C 24 87, 27 87, 30 88 C 35 89, 39 88, 41 84 C 43 75, 43 63, 42 50 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 8 50 C 18 54, 32 54, 42 50" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="62" x2="25" y2="87" stroke={detailColor} strokeWidth="1" />
          </g>
        );

      case '18':
      case '28':
        return (
          <g>
            {/* Raízes Siso Superior (mais fusionadas, inclinadas para distal) */}
            <path
              d="M 10 50 C 11 38, 13 26, 17 11 C 18 9, 21 10, 22 15 C 23 25, 26 33, 29 38 C 31 29, 34 19, 37 11 C 38 9, 41 9, 42 11 C 44 23, 44 37, 42 50 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Coroa Terceiro Molar */}
            <path
              d="M 9 50 C 8 62, 8 74, 11 83 C 13 87, 18 88, 25 87 C 32 88, 37 87, 39 83 C 42 74, 42 62, 40 50 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 9 50 C 18 54, 31 54, 40 50" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="60" x2="25" y2="86" stroke={detailColor} strokeWidth="1" />
          </g>
        );

      // ==========================================
      // ARCADA INFERIOR - PERMANENTES DIREITO (41 a 48)
      // (Espelhados para o lado esquerdo 31 a 38)
      // Note: Coroa em cima (y ~8 a 46), Raízes para baixo (y ~46 a 94)
      // ==========================================
      case '41':
      case '31':
        return (
          <g>
            {/* Coroa Incisivo Central Inferior (muito estreita, bordo reto) */}
            <path
              d="M 16 48 C 15 36, 15 22, 15 12 C 15 8, 17 7, 20 7 L 30 7 C 33 7, 35 8, 35 12 C 35 22, 35 36, 34 48 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Raiz Fina Inferior apontando para baixo */}
            <path
              d="M 16 48 C 17 62, 20 78, 23 91 C 24 93, 26 93, 27 91 C 30 78, 33 62, 34 48 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 16 48 C 21 44, 29 44, 34 48" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="52" x2="25" y2="88" stroke={detailColor} strokeWidth="1" strokeDasharray="1.5 1.5" />
          </g>
        );

      case '42':
      case '32':
        return (
          <g>
            {/* Coroa Incisivo Lateral Inferior (ligeiramente mais ampla) */}
            <path
              d="M 15 48 C 14 36, 14 22, 14 12 C 14 8, 17 7, 20 7 L 31 7 C 34 7, 36 9, 36 13 C 36 23, 35 36, 35 48 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 15 48 C 16 62, 19 78, 23 91 C 24 93, 26 93, 27 91 C 31 78, 34 62, 35 48 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 15 48 C 21 44, 29 44, 35 48" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="52" x2="25" y2="88" stroke={detailColor} strokeWidth="1" strokeDasharray="1.5 1.5" />
          </g>
        );

      case '43':
      case '33':
        return (
          <g>
            {/* Coroa Canino Inferior (cúspide pontiaguda no topo) */}
            <path
              d="M 13 47 C 12 36, 11 25, 13 18 L 25 6 L 37 18 C 39 25, 38 36, 37 47 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Raiz longa e cônica para baixo */}
            <path
              d="M 13 47 C 14 62, 18 80, 23 93 C 24 95, 26 95, 27 93 C 32 80, 36 62, 37 47 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 13 47 C 20 43, 30 43, 37 47" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="12" x2="25" y2="44" stroke={detailColor} strokeWidth="1" />
            <line x1="25" y1="50" x2="25" y2="90" stroke={detailColor} strokeWidth="1" strokeDasharray="1.5 1.5" />
          </g>
        );

      case '44':
      case '34':
        return (
          <g>
            {/* Coroa 1º Pré-Molar Inferior */}
            <path
              d="M 13 47 C 11 36, 11 24, 14 17 L 25 9 L 36 17 C 39 24, 39 36, 37 47 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Raiz única afilada para baixo */}
            <path
              d="M 13 47 C 14 61, 18 78, 23 92 C 24 94, 26 94, 27 92 C 32 78, 36 61, 37 47 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 13 47 C 20 43, 30 43, 37 47" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="14" x2="25" y2="44" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      case '45':
      case '35':
        return (
          <g>
            {/* Coroa 2º Pré-Molar Inferior */}
            <path
              d="M 12 47 C 10 36, 10 24, 13 17 L 25 10 L 37 17 C 40 24, 40 36, 38 47 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 12 47 C 13 61, 17 78, 23 92 C 24 94, 26 94, 27 92 C 33 78, 37 61, 38 47 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 12 47 C 20 43, 30 43, 38 47" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="15" x2="25" y2="44" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      case '46':
      case '36':
        return (
          <g>
            {/* Coroa do 1º Molar Inferior (ampla, 5 cúspides) */}
            <path
              d="M 8 46 C 6 34, 6 22, 8 13 C 10 9, 15 8, 20 9 C 23 10, 27 10, 30 9 C 35 8, 40 9, 42 13 C 44 22, 44 34, 42 46 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* 2 Raízes Divergentes (mesial e distal) com bifurcação nítida para baixo */}
            <path
              d="M 8 46 C 9 60, 11 74, 11 88 C 12 91, 15 91, 17 87 C 20 77, 23 65, 25 57 C 27 65, 30 77, 33 87 C 35 91, 38 91, 39 88 C 40 74, 41 60, 42 46 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 8 46 C 18 42, 32 42, 42 46" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            {/* Sulcos vestibulares da coroa */}
            <line x1="18" y1="11" x2="18" y2="38" stroke={detailColor} strokeWidth="0.8" />
            <line x1="32" y1="11" x2="32" y2="38" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      case '47':
      case '37':
        return (
          <g>
            {/* Coroa 2º Molar Inferior */}
            <path
              d="M 8 46 C 7 34, 7 22, 9 13 C 11 9, 16 8, 21 9 C 24 10, 27 10, 30 9 C 35 8, 39 9, 41 13 C 43 22, 43 34, 42 46 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* 2 Raízes Inferiores mais próximas e levemente curvadas para distal */}
            <path
              d="M 8 46 C 9 60, 12 74, 13 87 C 14 90, 17 90, 19 86 C 21 76, 23 66, 25 58 C 27 66, 29 76, 32 86 C 34 90, 37 90, 38 87 C 40 74, 41 60, 42 46 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 8 46 C 18 42, 32 42, 42 46" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="11" x2="25" y2="38" stroke={detailColor} strokeWidth="1" />
          </g>
        );

      case '48':
      case '38':
        return (
          <g>
            {/* Coroa 3º Molar Inferior */}
            <path
              d="M 9 46 C 8 34, 8 22, 10 14 C 12 10, 17 9, 25 9 C 33 9, 38 10, 40 14 C 42 22, 42 34, 41 46 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Raízes curvadas para trás / distalmente */}
            <path
              d="M 9 46 C 10 59, 13 72, 16 85 C 17 88, 20 88, 22 84 C 23 76, 24 67, 26 59 C 28 67, 30 76, 33 84 C 35 88, 38 88, 39 85 C 41 72, 42 59, 41 46 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 9 46 C 18 42, 31 42, 41 46" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="25" y1="12" x2="25" y2="38" stroke={detailColor} strokeWidth="1" />
          </g>
        );

      // ==========================================
      // DENTES DECÍDUOS (SUPERIORES: 51 a 65)
      // ==========================================
      case '51':
      case '61':
      case '52':
      case '62':
        return (
          <g>
            {/* Raiz delgada decídua superior */}
            <path
              d="M 16 52 C 17 38, 21 22, 25 11 C 25.5 10, 26.5 10, 27 11 C 30 22, 33 38, 34 52 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            {/* Coroa menor e bojuda decídua */}
            <path
              d="M 14 52 C 13 62, 13 72, 14 80 C 14 83, 16 85, 19 85 L 31 85 C 34 85, 36 83, 36 80 C 37 72, 37 62, 36 52 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path d="M 14 52 C 20 55, 30 55, 36 52" fill="none" stroke={strokeColor} strokeWidth="1" />
          </g>
        );

      case '53':
      case '63':
        return (
          <g>
            {/* Canino Decíduo Superior */}
            <path
              d="M 16 52 C 17 37, 21 20, 25 8 C 25.5 7, 26.5 7, 27 8 C 30 20, 33 37, 34 52 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M 14 52 C 13 62, 13 72, 15 78 L 25 86 L 35 78 C 37 72, 37 62, 36 52 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path d="M 14 52 C 20 55, 30 55, 36 52" fill="none" stroke={strokeColor} strokeWidth="1" />
          </g>
        );

      case '54':
      case '64':
      case '55':
      case '65':
        return (
          <g>
            {/* Molar Decíduo Superior com Raízes Extremamente Divergentes */}
            <path
              d="M 10 50 C 10 38, 10 24, 12 11 C 13 9, 16 10, 18 16 C 19 24, 21 32, 23 37 C 24 28, 25 18, 27 10 C 28 8, 30 8, 31 10 C 33 18, 34 28, 35 37 C 37 32, 39 24, 40 16 C 41 10, 44 9, 45 11 C 47 24, 47 38, 47 50 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            {/* Coroa Molar Decíduo */}
            <path
              d="M 9 50 C 8 61, 8 72, 10 80 C 12 84, 16 85, 21 84 C 24 83, 27 83, 30 84 C 35 85, 39 84, 41 80 C 43 72, 43 61, 42 50 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path d="M 9 50 C 18 54, 32 54, 42 50" fill="none" stroke={strokeColor} strokeWidth="1" />
            <line x1="25" y1="58" x2="25" y2="81" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );

      // ==========================================
      // DENTES DECÍDUOS (INFERIORES: 71 a 85)
      // ==========================================
      case '71':
      case '81':
      case '72':
      case '82':
        return (
          <g>
            {/* Coroa Incisivo Decíduo Inferior */}
            <path
              d="M 17 48 C 16 38, 16 26, 16 16 C 16 12, 18 11, 21 11 L 29 11 C 32 11, 34 12, 34 16 C 34 26, 34 38, 33 48 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            {/* Raiz Decídua Inferior */}
            <path
              d="M 17 48 C 18 60, 21 74, 24 86 C 24.5 88, 25.5 88, 26 86 C 29 74, 32 60, 33 48 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path d="M 17 48 C 21 45, 29 45, 33 48" fill="none" stroke={strokeColor} strokeWidth="1" />
          </g>
        );

      case '73':
      case '83':
        return (
          <g>
            {/* Canino Decíduo Inferior */}
            <path
              d="M 15 48 C 14 38, 14 27, 16 20 L 25 11 L 34 20 C 36 27, 36 38, 35 48 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M 15 48 C 16 60, 20 76, 24 88 C 24.5 90, 25.5 90, 26 88 C 30 76, 34 60, 35 48 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path d="M 15 48 C 21 44, 29 44, 35 48" fill="none" stroke={strokeColor} strokeWidth="1" />
          </g>
        );

      case '74':
      case '84':
      case '75':
      case '85':
      default:
        return (
          <g>
            {/* Molar Decíduo Inferior com Raízes Divergentes */}
            <path
              d="M 9 46 C 8 36, 8 25, 10 17 C 12 13, 16 12, 21 13 C 24 14, 27 14, 30 13 C 35 12, 39 13, 41 17 C 43 25, 43 36, 42 46 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path
              d="M 9 46 C 10 58, 13 72, 13 85 C 14 88, 17 88, 19 84 C 21 76, 23 66, 25 58 C 27 66, 29 76, 32 84 C 34 88, 37 88, 38 85 C 39 72, 41 58, 42 46 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path d="M 9 46 C 18 42, 32 42, 42 46" fill="none" stroke={strokeColor} strokeWidth="1" />
            <line x1="25" y1="15" x2="25" y2="40" stroke={detailColor} strokeWidth="0.8" />
          </g>
        );
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width, height }}
    >
      <svg
        viewBox="0 0 54 98"
        width="100%"
        height="100%"
        className={`transition-all duration-150 drop-shadow-2xs ${
          isAbsent ? 'opacity-40' : 'opacity-100'
        }`}
      >
        {isMirrored ? (
          <g transform="translate(54, 0) scale(-1, 1)">{renderToothContent()}</g>
        ) : (
          renderToothContent()
        )}

        {/* Marcação de Ausente (X diagonal sutil) */}
        {isAbsent && (
          <g stroke="#64748b" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="20" x2="42" y2="80" />
            <line x1="42" y1="20" x2="12" y2="80" />
          </g>
        )}
      </svg>
    </div>
  );
};
