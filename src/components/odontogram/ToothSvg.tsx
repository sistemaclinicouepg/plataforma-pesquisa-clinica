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
  width = 34,
  height = 68,
}) => {
  const meta = TEETH_METADATA[fdi];
  const isMirrored = meta?.mirrored || false;

  // Cores de dente realista: contorno escuro grafite/carvão clínico
  const outlineColor = isSelected ? '#1d4ed8' : '#1e293b'; // Slate-800
  const cejColor = isSelected ? '#3b82f6' : '#64748b'; // Junção amelocementária
  const grooveColor = isSelected ? '#60a5fa' : '#94a3b8'; // Sulcos e canais
  const rootNaturalFill = '#fcfbf7'; // Marfim natural da raiz
  const isAbsent = status === 'AUSENTE';

  // Preenchimento da coroa baseado na condição clínica
  let crownFill = '#ffffff'; // Esmalte branco natural
  let crownAccentColor = outlineColor;

  if (isSelected) {
    crownFill = '#dbeafe'; // Azul de seleção
    crownAccentColor = '#1d4ed8';
  } else if (status === 'RESTAURADO') {
    crownFill = '#bfdbfe'; // Azul de restauração em resina
    crownAccentColor = '#2563eb';
  } else if (status === 'CARIE') {
    crownFill = '#fecaca'; // Vermelho de lesão de cárie ativa
    crownAccentColor = '#dc2626';
  } else if (status === 'FACETA') {
    crownFill = '#e9d5ff'; // Roxo de faceta / coroa protética
    crownAccentColor = '#9333ea';
  } else if (status === 'AUSENTE') {
    crownFill = '#f1f5f9';
    crownAccentColor = '#94a3b8';
  }

  // Renderizador com curvas anatômicas naturais e realistas
  const renderToothContent = () => {
    switch (fdi) {
      // ==========================================
      // ARCADA SUPERIOR (Raízes para CIMA, Coroa para BAIXO)
      // ==========================================

      // Incisivo Central Superior (11 / 21)
      case '11':
      case '21':
        return (
          <g>
            {/* Raiz Conica Maciça Superior */}
            <path
              d="M 13 49 C 14.5 35, 18 19, 23.5 7.5 C 24.2 6.5, 25.8 6.5, 26.5 7.5 C 32 19, 35.5 35, 37 49 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Canal radicular longitudinal sutil */}
            <line x1="25" y1="12" x2="25" y2="46" stroke={grooveColor} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
            {/* Coroa Larga Retangular / Trapezoidal com bordos naturais */}
            <path
              d="M 13 49 C 12 60, 11 72, 11 83 C 11 86.5, 13 87.5, 16 87.5 L 34 87.5 C 37 87.5, 39 86, 39 82 C 39 71, 38 60, 37 49 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Colo Anatômico (CEJ) Curvado suavemente para cima */}
            <path d="M 13 49 C 19 46.5, 31 46.5, 37 49" fill="none" stroke={cejColor} strokeWidth="1.1" />
            {/* Sulcos anatômicos vestibulares */}
            <line x1="20" y1="62" x2="20" y2="82" stroke={grooveColor} strokeWidth="0.7" />
            <line x1="30" y1="62" x2="30" y2="82" stroke={grooveColor} strokeWidth="0.7" />
          </g>
        );

      // Incisivo Lateral Superior (12 / 22)
      case '12':
      case '22':
        return (
          <g>
            {/* Raiz Delgada com leve curvatura distal anatômica */}
            <path
              d="M 15 49 C 16 36, 19.5 20, 26 8 C 26.8 6.8, 28.5 7.2, 29 8.5 C 32.5 21, 34.5 36, 35 49 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <line x1="26" y1="13" x2="25" y2="46" stroke={grooveColor} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
            {/* Coroa mais estreita com ângulo disto-incisal arredondado */}
            <path
              d="M 15 49 C 13.5 60, 13 72, 13 81.5 C 13 85, 15 86.5, 18 86.5 L 30 86.5 C 34 86.5, 36.5 83.5, 36 78 C 35.5 68, 35.5 59, 35 49 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 15 49 C 20 46.5, 30 46.5, 35 49" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="24" y1="64" x2="24" y2="81" stroke={grooveColor} strokeWidth="0.7" />
          </g>
        );

      // Canino Superior (13 / 23)
      case '13':
      case '23':
        return (
          <g>
            {/* Raiz Longa e Cônica Muito Robusta */}
            <path
              d="M 14 48 C 15 34, 18.5 16, 24 4.5 C 24.8 3.5, 26.2 3.5, 27 4.5 C 32.5 16, 36 34, 37 48 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <line x1="25.5" y1="10" x2="25.5" y2="45" stroke={grooveColor} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
            {/* Coroa Pentagonal em Ponta de Lança com Cúspide Definida */}
            <path
              d="M 14 48 C 12 59, 11 70, 13 78 L 25.5 89.5 L 38 78 C 40 70, 39 59, 37 48 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 14 48 C 20 46, 31 46, 37 48" fill="none" stroke={cejColor} strokeWidth="1.1" />
            {/* Aresta longitudinal vestibular saliente */}
            <line x1="25.5" y1="52" x2="25.5" y2="86" stroke={grooveColor} strokeWidth="0.9" />
          </g>
        );

      // Primeiro Pré-Molar Superior (14 / 24)
      case '14':
      case '24':
        return (
          <g>
            {/* Raízes Bifurcadas no terço apical com curva orgânica */}
            <path
              d="M 14 48 C 15 35, 16 22, 18 10 C 18.8 8, 21.2 8.5, 22 11 C 23 16, 24 23, 25.5 24.5 C 27 23, 28 16, 29 11 C 29.8 8.5, 32.2 8, 33 10 C 35 22, 36 35, 37 48 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Coroa Bicuspidada Arredondada */}
            <path
              d="M 14 48 C 11.5 59, 11 71, 14 79 L 25.5 87 L 37 79 C 40 71, 39.5 59, 37 48 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 14 48 C 20 45.5, 31 45.5, 37 48" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25.5" y1="52" x2="25.5" y2="82" stroke={grooveColor} strokeWidth="0.8" />
          </g>
        );

      // Segundo Pré-Molar Superior (15 / 25)
      case '15':
      case '25':
        return (
          <g>
            {/* Raiz Única Cônica Afilada */}
            <path
              d="M 14 48 C 15 35, 18.5 18, 24 6.5 C 24.8 5.5, 26.2 5.5, 27 6.5 C 32.5 18, 36 35, 37 48 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <line x1="25.5" y1="12" x2="25.5" y2="45" stroke={grooveColor} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
            {/* Coroa Ovalada Suave */}
            <path
              d="M 14 48 C 11.5 58, 11.5 71, 15 79.5 L 25.5 86 L 36 79.5 C 39.5 71, 39.5 58, 37 48 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 14 48 C 20 45.5, 31 45.5, 37 48" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25.5" y1="52" x2="25.5" y2="81" stroke={grooveColor} strokeWidth="0.8" />
          </g>
        );

      // Primeiro Molar Superior (16 / 26) - 3 Raízes Anatômicas Naturais
      case '16':
      case '26':
        return (
          <g>
            {/* 3 Raízes: Mésio-vestibular, Palatina (centro/fundo) e Disto-vestibular com teto de furca arqueado */}
            <path
              d="M 9 48 C 9.5 35, 10 21, 13 8 C 13.8 6, 16.5 6.5, 17.5 9.5 C 19 16, 20.5 24, 22.5 28 C 23.5 19, 24.5 12, 26 5.5 C 26.8 4, 28.5 4, 29.5 5.5 C 31 12, 32 19, 33 28 C 35 24, 36.5 16, 38 9.5 C 39 6.5, 41.7 6, 42.5 8 C 45.5 21, 46 35, 46.5 48 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Coroa Robusta Molar com 2 Cúspides Arredondadas no bordo oclusal */}
            <path
              d="M 9 48 C 8 60, 7.5 73, 9.5 81.5 C 11 85, 16 86.5, 20.5 85 C 23 84, 25 83.5, 26.5 84 C 28.5 83.5, 30.5 84, 33 85 C 37.5 86.5, 42.5 85, 44 81.5 C 46 73, 45.5 60, 44.5 48 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Colo Anatômico (CEJ) com ponta de esmalte voltada para a furca */}
            <path d="M 9 48 C 18 46, 26 47.5, 28 47.5 C 30 47.5, 37 46, 44.5 48" fill="none" stroke={cejColor} strokeWidth="1.1" />
            {/* Sulco vestibular separando as cúspides */}
            <path d="M 27 58 C 27 68, 27 76, 27 83.5" fill="none" stroke={grooveColor} strokeWidth="0.9" />
            <path d="M 18 69 C 23 71, 31 71, 36 69" fill="none" stroke={grooveColor} strokeWidth="0.7" />
          </g>
        );

      // Segundo Molar Superior (17 / 27) - Raízes mais convergentes inclinadas distalmente
      case '17':
      case '27':
        return (
          <g>
            <path
              d="M 10 48 C 11 35, 13 22, 16 9 C 16.8 7, 19.5 7.5, 20.5 10.5 C 21.5 18, 22.5 26, 24.5 30 C 25.5 21, 26.5 13, 28.5 7.5 C 29.5 5.5, 31.5 5.5, 32.5 7.5 C 34 14, 34.5 21, 35 30 C 37 25, 38 18, 39.5 11 C 40.5 8.5, 43 8, 44 10 C 46 23, 45.5 36, 44 48 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 10 48 C 9 60, 8.5 72, 10.5 80.5 C 12 84, 16.5 85.5, 21 84.5 C 23.5 83.5, 25.5 83, 27 83.5 C 29 83, 31 83.5, 33.5 84.5 C 38 85.5, 41.5 84, 43 80.5 C 44.5 72, 44.5 60, 44 48 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 10 48 C 18 46, 36 46, 44 48" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="27" y1="58" x2="27" y2="83" stroke={grooveColor} strokeWidth="0.9" />
          </g>
        );

      // Terceiro Molar Superior / Siso (18 / 28) - Raízes fusionadas inclinadas
      case '18':
      case '28':
        return (
          <g>
            <path
              d="M 11 48 C 12 36, 14 24, 18 11 C 18.8 9, 21.5 9.5, 22.5 13 C 23.5 20, 26 29, 29 33 C 31 24, 34 16, 37 10 C 38 8, 41 8.5, 42 11 C 43.5 22, 43.5 35, 42.5 48 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 11 48 C 10 59, 9.5 71, 11.5 79.5 C 13.5 83.5, 18 84.5, 25 84 C 32 84.5, 36.5 83.5, 38.5 79.5 C 41 71, 41 59, 40.5 48 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 11 48 C 18 46, 33 46, 40.5 48" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25.5" y1="57" x2="25.5" y2="82" stroke={grooveColor} strokeWidth="0.8" />
          </g>
        );

      // ==========================================
      // ARCADA INFERIOR (Coroa para CIMA, Raízes para BAIXO)
      // ==========================================

      // Incisivo Central Inferior (41 / 31) - O menor dente
      case '41':
      case '31':
        return (
          <g>
            {/* Coroa Estreita Delicada no Topo com Bordo Incisal Reto */}
            <path
              d="M 18 45 C 17 34, 16.5 22, 16.5 14 C 16.5 11.5, 18.5 10.5, 21 10.5 L 29 10.5 C 31.5 10.5, 33.5 11.5, 33.5 14 C 33.5 22, 33 34, 32 45 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Raiz Única Muito Fina e Reta para Baixo */}
            <path
              d="M 18 45 C 19 58, 22 74, 24 87.5 C 24.5 89, 25.5 89, 26 87.5 C 28 74, 31 58, 32 45 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 18 45 C 22 47.5, 28 47.5, 32 45" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25" y1="50" x2="25" y2="84" stroke={grooveColor} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          </g>
        );

      // Incisivo Lateral Inferior (42 / 32)
      case '42':
      case '32':
        return (
          <g>
            <path
              d="M 17 45 C 16 34, 15.5 22, 15.5 14 C 15.5 11.5, 17.5 10.5, 20.5 10.5 L 30 10.5 C 32.5 10.5, 34.5 11.8, 34.5 14.5 C 34.5 22, 34 34, 33 45 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 17 45 C 18 58, 21.5 74, 24 87.5 C 24.5 89, 25.5 89, 26 87.5 C 28.5 74, 32 58, 33 45 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 17 45 C 22 47.5, 28 47.5, 33 45" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25" y1="50" x2="25" y2="84" stroke={grooveColor} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          </g>
        );

      // Canino Inferior (43 / 33)
      case '43':
      case '33':
        return (
          <g>
            {/* Coroa com Cúspide Pontiaguda voltada para cima */}
            <path
              d="M 15 45 C 13 34, 12.5 22, 14.5 15 L 25 7.5 L 35.5 15 C 37.5 22, 37 34, 35 45 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Raiz Longa e Cônica para Baixo */}
            <path
              d="M 15 45 C 16 59, 19.5 76, 24 89.5 C 24.8 90.5, 26.2 90.5, 27 89.5 C 31.5 76, 34 59, 35 45 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 15 45 C 20 47.5, 30 47.5, 35 45" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25" y1="12" x2="25" y2="42" stroke={grooveColor} strokeWidth="0.8" />
            <line x1="25.5" y1="50" x2="25.5" y2="86" stroke={grooveColor} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          </g>
        );

      // Primeiro Pré-Molar Inferior (44 / 34)
      case '44':
      case '34':
        return (
          <g>
            <path
              d="M 14 45 C 12 34, 11.5 22, 14.5 15.5 L 25 9.5 L 35.5 15.5 C 38.5 22, 38 34, 36 45 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 14 45 C 15 59, 18.5 76, 24 88.5 C 24.8 89.5, 26.2 89.5, 27 88.5 C 31.5 76, 35 59, 36 45 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 14 45 C 20 47.5, 30 47.5, 36 45" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25" y1="14" x2="25" y2="42" stroke={grooveColor} strokeWidth="0.8" />
          </g>
        );

      // Segundo Pré-Molar Inferior (45 / 35)
      case '45':
      case '35':
        return (
          <g>
            <path
              d="M 14 45 C 11.5 34, 11.5 22, 15 15 L 25 10.5 L 35 15 C 38.5 22, 38.5 34, 36 45 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 14 45 C 15 59, 18.5 76, 24 88.5 C 24.8 89.5, 26.2 89.5, 27 88.5 C 32 76, 35 59, 36 45 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 14 45 C 20 47.5, 30 47.5, 36 45" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25" y1="15" x2="25" y2="42" stroke={grooveColor} strokeWidth="0.8" />
          </g>
        );

      // Primeiro Molar Inferior (46 / 36) - 2 Raízes Divergentes com Curva Orgânica
      case '46':
      case '36':
        return (
          <g>
            {/* Coroa Ampla com Cúspides Oclusais Arredondadas */}
            <path
              d="M 9 46 C 7.5 33, 7.5 21, 9.5 13.5 C 11 10, 16 9, 20.5 10 C 23 11, 25 11.5, 26.5 11 C 28.5 11.5, 30.5 11, 33 10 C 37.5 9, 42.5 10, 44 13.5 C 46 21, 46 33, 44.5 46 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* 2 Raízes Divergentes com Espaço de Bifurcação Arqueado Natural */}
            <path
              d="M 9 46 C 10 59, 11 73, 13 86.5 C 13.8 89, 16.5 89, 17.5 86.5 C 20 75, 22.5 63, 26.5 56 C 30.5 63, 33 75, 35.5 86.5 C 36.5 89, 39.2 89, 40 86.5 C 42 73, 43 59, 44.5 46 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Linha do Colo */}
            <path d="M 9 46 C 18 48.5, 36 48.5, 44.5 46" fill="none" stroke={cejColor} strokeWidth="1.1" />
            {/* Sulcos vestibulares que descem da oclusal */}
            <line x1="20" y1="12" x2="20" y2="36" stroke={grooveColor} strokeWidth="0.8" />
            <line x1="33" y1="12" x2="33" y2="36" stroke={grooveColor} strokeWidth="0.8" />
          </g>
        );

      // Segundo Molar Inferior (47 / 37)
      case '47':
      case '37':
        return (
          <g>
            <path
              d="M 10 46 C 8.5 33, 8.5 21, 10.5 13.5 C 12 10, 16.5 9.5, 21 10.5 C 23.5 11.5, 25.5 12, 27 11.5 C 29 12, 31 11.5, 33.5 10.5 C 38 9.5, 41.5 10, 43 13.5 C 45 21, 45 33, 44 46 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 10 46 C 11 59, 13 73, 15 86 C 15.8 88.5, 18.5 88.5, 19.5 86 C 21.5 76, 23.5 65, 27 58 C 30.5 65, 32.5 76, 34.5 86 C 35.5 88.5, 38.2 88.5, 39 86 C 41 73, 42.5 59, 44 46 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 10 46 C 18 48.5, 36 48.5, 44 46" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="27" y1="13" x2="27" y2="36" stroke={grooveColor} strokeWidth="0.9" />
          </g>
        );

      // Terceiro Molar Inferior / Siso (48 / 38)
      case '48':
      case '38':
        return (
          <g>
            <path
              d="M 11 46 C 9.5 33, 9.5 21, 11.5 14 C 13.5 10.5, 18 9.5, 25 10 C 32 9.5, 36.5 10.5, 38.5 14 C 40.5 21, 40.5 33, 40 46 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M 11 46 C 12 59, 14.5 72, 17 84.5 C 17.8 87, 20.5 87, 21.5 84.5 C 23 76, 24.5 67, 27 60 C 29.5 67, 31.5 76, 33.5 84.5 C 34.5 87, 37.2 87, 38 84.5 C 40 72, 40.5 59, 40 46 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M 11 46 C 18 48.5, 33 48.5, 40 46" fill="none" stroke={cejColor} strokeWidth="1.1" />
            <line x1="25.5" y1="12" x2="25.5" y2="35" stroke={grooveColor} strokeWidth="0.8" />
          </g>
        );

      // ==========================================
      // DENTES DECÍDUOS (51 a 65 e 71 a 85)
      // ==========================================
      case '51':
      case '61':
      case '52':
      case '62':
        return (
          <g>
            <path
              d="M 16 50 C 17 37, 20.5 22, 25 11 C 25.8 10, 27.2 10, 28 11 C 31 22, 33.5 37, 34 50 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 14 50 C 13 60, 13 70, 14 78 C 14 81, 16 83, 19 83 L 31 83 C 34 83, 36 81, 36 78 C 37 70, 37 60, 36 50 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
            />
            <path d="M 14 50 C 20 47.5, 30 47.5, 36 50" fill="none" stroke={cejColor} strokeWidth="1" />
          </g>
        );

      case '53':
      case '63':
        return (
          <g>
            <path
              d="M 16 50 C 17 36, 20.5 19, 25 8 C 25.8 7, 27.2 7, 28 8 C 31 19, 33.5 36, 34 50 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 14 50 C 13 60, 13 70, 15 76 L 25 84 L 35 76 C 37 70, 37 60, 36 50 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
            />
            <path d="M 14 50 C 20 47.5, 30 47.5, 36 50" fill="none" stroke={cejColor} strokeWidth="1" />
          </g>
        );

      case '54':
      case '64':
      case '55':
      case '65':
        return (
          <g>
            {/* Molar Decíduo Superior com Raízes Extremamente Divergentes em Leque */}
            <path
              d="M 10 49 C 10 37, 10 23, 12 11 C 12.8 9, 15.5 10, 17 15 C 18 23, 19.5 31, 21.5 36 C 22.5 27, 24 17, 26 9 C 27 7, 29 7, 30 9 C 32 17, 33 27, 34 36 C 36 31, 37.5 23, 38.5 15 C 40 10, 42.8 9, 43.5 11 C 45.5 23, 45.5 37, 45.5 49 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 9 49 C 8 60, 8 70, 10 78 C 12 82, 16 83, 21 82 C 24 81, 26 81, 28 81 C 33 82, 37 82, 39 78 C 41 70, 41 60, 40 49 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
            />
            <path d="M 9 49 C 18 47, 32 47, 40 49" fill="none" stroke={cejColor} strokeWidth="1" />
            <line x1="25" y1="56" x2="25" y2="79" stroke={grooveColor} strokeWidth="0.8" />
          </g>
        );

      case '71':
      case '81':
      case '72':
      case '82':
        return (
          <g>
            <path
              d="M 17 46 C 16 36, 16 25, 16 16 C 16 12, 18 11, 21 11 L 29 11 C 32 11, 34 12, 34 16 C 34 25, 34 36, 33 46 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
            />
            <path
              d="M 17 46 C 18 58, 21 72, 24 84 C 24.5 86, 25.5 86, 26 84 C 29 72, 32 58, 33 46 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 17 46 C 21 48, 29 48, 33 46" fill="none" stroke={cejColor} strokeWidth="1" />
          </g>
        );

      case '73':
      case '83':
        return (
          <g>
            <path
              d="M 15 46 C 14 36, 14 26, 16 19 L 25 11 L 34 19 C 36 26, 36 36, 35 46 Z"
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
            />
            <path
              d="M 15 46 C 16 58, 20 74, 24 86 C 24.5 88, 25.5 88, 26 86 C 30 74, 34 58, 35 46 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 15 46 C 21 48, 29 48, 35 46" fill="none" stroke={cejColor} strokeWidth="1" />
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
              fill={crownFill}
              stroke={crownAccentColor}
              strokeWidth="1.5"
            />
            <path
              d="M 9 46 C 10 58, 12 71, 13 83 C 13.8 86, 16.5 86, 17.5 83 C 19.5 74, 22 64, 25.5 57 C 29 64, 31.5 74, 33.5 83 C 34.5 86, 37.2 86, 38 83 C 39.5 71, 41 58, 42 46 Z"
              fill={rootNaturalFill}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 9 46 C 18 48, 32 48, 42 46" fill="none" stroke={cejColor} strokeWidth="1" />
            <line x1="25" y1="15" x2="25" y2="38" stroke={grooveColor} strokeWidth="0.8" />
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
        viewBox="0 0 52 94"
        width="100%"
        height="100%"
        className={`transition-all duration-150 drop-shadow-2xs ${
          isAbsent ? 'opacity-35' : 'opacity-100'
        }`}
      >
        {isMirrored ? (
          <g transform="translate(52, 0) scale(-1, 1)">{renderToothContent()}</g>
        ) : (
          renderToothContent()
        )}

        {/* Marcação Clara de Ausente: Traço Diagonal (X) */}
        {isAbsent && (
          <g stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
            <line x1="10" y1="18" x2="42" y2="78" />
            <line x1="42" y1="18" x2="10" y2="78" />
          </g>
        )}
      </svg>
    </div>
  );
};
