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
  height = 70,
}) => {
  const meta = TEETH_METADATA[fdi];
  const isMirrored = meta?.mirrored || false;
  const isUpper = meta?.arch === 'superior';
  const isAbsent = status === 'AUSENTE';

  // Identificador único para gradientes e filtros
  const uid = `t_${fdi}_${status}_${isSelected ? 's' : 'n'}`;

  // Cores de contorno clínico realista (grafite escuro/carvão anatômico)
  const outlineColor = isSelected ? '#1d4ed8' : '#1e293b'; // Slate-800
  const cejStroke = isSelected ? '#3b82f6' : '#64748b'; // Linha amelocementária
  const grooveStroke = isSelected ? '#60a5fa' : '#94a3b8'; // Sulcos e canais

  // Preenchimentos por gradiente hiper-realista
  const rootGradId = `root_grad_${uid}`;
  const crownGradId = `crown_grad_${uid}`;
  const overlayGradId = `overlay_grad_${uid}`;

  // Renderizador anatômico de alta fidelidade
  const renderToothContent = () => {
    switch (fdi) {
      // ==========================================
      // ARCADA SUPERIOR (18 a 11 e 21 a 28)
      // Raízes voltadas para CIMA, Coroas para BAIXO
      // ==========================================

      // 11 e 21: Incisivo Central Superior
      case '11':
      case '21':
        return (
          <g>
            {/* Raiz Central Superior (cônica, volumosa, ápice arredondado) */}
            <path
              d="M 14 50 C 14.5 36, 17 20, 23.5 7 C 24.3 5.5, 25.7 5.5, 26.5 7 C 33 20, 35.5 36, 36 50 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Sulco radicular longitudinal sombreado */}
            <line x1="25" y1="11" x2="25" y2="46" stroke={grooveStroke} strokeWidth="0.9" strokeDasharray="1.5 1.5" />

            {/* Coroa Larga Esculpida do Incisivo Central */}
            <path
              d="M 14 50 C 12.5 61, 11 72, 11.5 83 C 11.8 86.5, 14 88, 17 88 L 33 88 C 36 88, 38.2 86.5, 38.5 83 C 39 72, 37.5 61, 36 50 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* Junção Amelocementária (CEJ) Curvada para o ápice */}
            <path d="M 14 50 C 19 46.5, 31 46.5, 36 50" fill="none" stroke={cejStroke} strokeWidth="1.2" />

            {/* Sulcos e mamelões de desenvolvimento vestibular */}
            <line x1="20" y1="62" x2="20" y2="83" stroke={grooveStroke} strokeWidth="0.75" />
            <line x1="30" y1="62" x2="30" y2="83" stroke={grooveStroke} strokeWidth="0.75" />
          </g>
        );

      // 12 e 22: Incisivo Lateral Superior
      case '12':
      case '22':
        return (
          <g>
            {/* Raiz Delgada com leve inclinação distal anatômica */}
            <path
              d="M 15 50 C 16 36, 19.5 20, 26 7.5 C 27 6.5, 28.8 6.8, 29.5 8 C 32.5 20, 34 36, 35 50 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <line x1="26.5" y1="13" x2="25.5" y2="46" stroke={grooveStroke} strokeWidth="0.8" strokeDasharray="1.5 1.5" />

            {/* Coroa com ângulo disto-incisal arredondado e mesial reto */}
            <path
              d="M 15 50 C 13.5 61, 13 72, 13.5 82 C 13.8 85.5, 16 87, 19 87 L 30 87 C 34 87, 36.5 84, 36 78 C 35.5 68, 35.5 59, 35 50 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 15 50 C 20 46.5, 30 46.5, 35 50" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="24.5" y1="63" x2="24.5" y2="82" stroke={grooveStroke} strokeWidth="0.75" />
          </g>
        );

      // 13 e 23: Canino Superior
      case '13':
      case '23':
        return (
          <g>
            {/* Raiz Canina Longa e Poderosa */}
            <path
              d="M 14 49 C 15 34, 18.5 16, 24 4.5 C 24.8 3.5, 26.2 3.5, 27 4.5 C 32.5 16, 36 34, 37 49 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <line x1="25.5" y1="10" x2="25.5" y2="45" stroke={grooveStroke} strokeWidth="0.9" strokeDasharray="1.5 1.5" />

            {/* Coroa Pentagonal em Ponta de Lança com Cúspide Viva */}
            <path
              d="M 14 49 C 12 60, 11 71, 13 79 L 25.5 90 L 38 79 C 40 71, 39 60, 37 49 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 14 49 C 20 46, 31 46, 37 49" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            {/* Aresta labial mediana convexa */}
            <line x1="25.5" y1="52" x2="25.5" y2="86" stroke={grooveStroke} strokeWidth="1" />
          </g>
        );

      // 14 e 24: Primeiro Pré-Molar Superior (Raiz Bifurcada)
      case '14':
      case '24':
        return (
          <g>
            {/* Raízes Bifurcadas com teto de furca orgânico suave */}
            <path
              d="M 14 49 C 15 36, 16 23, 18 10 C 18.8 8, 21.2 8.5, 22 11 C 23 16, 24 23, 25.5 24.5 C 27 23, 28 16, 29 11 C 29.8 8.5, 32.2 8, 33 10 C 35 23, 36 36, 37 49 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* Coroa Bicuspidada Arredondada */}
            <path
              d="M 14 49 C 11.5 60, 11 72, 14 80 L 25.5 87.5 L 37 80 C 40 72, 39.5 60, 37 49 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 14 49 C 20 46, 31 46, 37 49" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25.5" y1="53" x2="25.5" y2="83" stroke={grooveStroke} strokeWidth="0.8" />
          </g>
        );

      // 15 e 25: Segundo Pré-Molar Superior (Raiz Única)
      case '15':
      case '25':
        return (
          <g>
            {/* Raiz Única Cônica Afilada */}
            <path
              d="M 14 49 C 15 35, 18.5 18, 24 6.5 C 24.8 5.5, 26.2 5.5, 27 6.5 C 32.5 18, 36 35, 37 49 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <line x1="25.5" y1="12" x2="25.5" y2="45" stroke={grooveStroke} strokeWidth="0.8" strokeDasharray="1.5 1.5" />

            {/* Coroa Ovalada Suave */}
            <path
              d="M 14 49 C 11.5 59, 11.5 72, 15 80 L 25.5 86.5 L 36 80 C 39.5 72, 39.5 59, 37 49 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 14 49 C 20 46, 31 46, 37 49" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25.5" y1="53" x2="25.5" y2="82" stroke={grooveStroke} strokeWidth="0.8" />
          </g>
        );

      // 16 e 26: Primeiro Molar Superior (3 Raízes Anatômicas com Furca Arqueada)
      case '16':
      case '26':
        return (
          <g>
            {/* 3 Raízes Reais: Mésio-vestibular, Palatina (ao fundo/centro) e Disto-vestibular */}
            <path
              d="M 9 49 C 9.5 36, 10 22, 13 8 C 13.8 6, 16.5 6.5, 17.5 9.5 C 19 16, 20.5 24, 22.5 28 C 23.5 19, 24.5 12, 26 5.5 C 26.8 4, 28.5 4, 29.5 5.5 C 31 12, 32 19, 33 28 C 35 24, 36.5 16, 38 9.5 C 39 6.5, 41.7 6, 42.5 8 C 45.5 22, 46 36, 46.5 49 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* Coroa Molar Ampla com 2 Cúspides Oclusais Arredondadas */}
            <path
              d="M 9 49 C 8 61, 7.5 74, 9.5 82.5 C 11 86, 16 87.5, 20.5 86 C 23 85, 25 84.5, 26.5 85 C 28.5 84.5, 30.5 85, 33 86 C 37.5 87.5, 42.5 86, 44 82.5 C 46 74, 45.5 61, 44.5 49 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* Linha do colo com curvatura natural */}
            <path d="M 9 49 C 18 47, 26 48.5, 28 48.5 C 30 48.5, 37 47, 44.5 49" fill="none" stroke={cejStroke} strokeWidth="1.2" />

            {/* Sulco vestibular entre cúspides */}
            <path d="M 27 59 C 27 69, 27 77, 27 84.5" fill="none" stroke={grooveStroke} strokeWidth="0.9" />
            <path d="M 18 70 C 23 72, 31 72, 36 70" fill="none" stroke={grooveStroke} strokeWidth="0.75" />
          </g>
        );

      // 17 e 27: Segundo Molar Superior (Raízes convergentes inclinadas distalmente)
      case '17':
      case '27':
        return (
          <g>
            <path
              d="M 10 49 C 11 36, 13 23, 16 9.5 C 16.8 7.5, 19.5 8, 20.5 11 C 21.5 18, 22.5 26, 24.5 30 C 25.5 21, 26.5 13, 28.5 7.5 C 29.5 5.5, 31.5 5.5, 32.5 7.5 C 34 14, 34.5 21, 35 30 C 37 25, 38 18, 39.5 11 C 40.5 8.5, 43 8, 44 10 C 46 23, 45.5 36, 44 49 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 10 49 C 9 61, 8.5 73, 10.5 81.5 C 12 85, 16.5 86.5, 21 85.5 C 23.5 84.5, 25.5 84, 27 84.5 C 29 84, 31 84.5, 33.5 85.5 C 38 86.5, 41.5 85, 43 81.5 C 44.5 73, 44.5 61, 44 49 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 10 49 C 18 47, 36 47, 44 49" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="27" y1="59" x2="27" y2="84" stroke={grooveStroke} strokeWidth="0.9" />
          </g>
        );

      // 18 e 28: Terceiro Molar Superior / Siso
      case '18':
      case '28':
        return (
          <g>
            <path
              d="M 11 49 C 12 37, 14 25, 18 11.5 C 18.8 9.5, 21.5 10, 22.5 13.5 C 23.5 20, 26 29, 29 33 C 31 24, 34 16, 37 10 C 38 8, 41 8.5, 42 11 C 43.5 22, 43.5 35, 42.5 49 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 11 49 C 10 60, 9.5 72, 11.5 80.5 C 13.5 84.5, 18 85.5, 25 85 C 32 85.5, 36.5 84.5, 38.5 80.5 C 41 72, 41 60, 40.5 49 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 11 49 C 18 47, 33 47, 40.5 49" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25.5" y1="58" x2="25.5" y2="83" stroke={grooveStroke} strokeWidth="0.8" />
          </g>
        );

      // ==========================================
      // ARCADA INFERIOR (48 a 41 e 31 a 38)
      // Coroas para CIMA, Raízes voltadas para BAIXO
      // ==========================================

      // 41 e 31: Incisivo Central Inferior
      case '41':
      case '31':
        return (
          <g>
            {/* Coroa Pequena Delicada no Topo com Bordo Reto */}
            <path
              d="M 18 45 C 17 34, 16.5 22, 16.5 13.5 C 16.5 11, 18.5 10, 21 10 L 29 10 C 31.5 10, 33.5 11, 33.5 13.5 C 33.5 22, 33 34, 32 45 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Raiz Reta e Muito Fina para Baixo */}
            <path
              d="M 18 45 C 19 58, 22 74, 24 88 C 24.5 89.5, 25.5 89.5, 26 88 C 28 74, 31 58, 32 45 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 18 45 C 22 47.5, 28 47.5, 32 45" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25" y1="50" x2="25" y2="84" stroke={grooveStroke} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          </g>
        );

      // 42 e 32: Incisivo Lateral Inferior
      case '42':
      case '32':
        return (
          <g>
            <path
              d="M 17 45 C 16 34, 15.5 22, 15.5 13.5 C 15.5 11, 17.5 10, 20.5 10 L 30 10 C 32.5 10, 34.5 11.5, 34.5 14 C 34.5 22, 34 34, 33 45 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 17 45 C 18 58, 21.5 74, 24 88 C 24.5 89.5, 25.5 89.5, 26 88 C 28.5 74, 32 58, 33 45 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 17 45 C 22 47.5, 28 47.5, 33 45" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25" y1="50" x2="25" y2="84" stroke={grooveStroke} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          </g>
        );

      // 43 e 33: Canino Inferior
      case '43':
      case '33':
        return (
          <g>
            <path
              d="M 15 45 C 13 34, 12.5 22, 14.5 14.5 L 25 7 L 35.5 14.5 C 37.5 22, 37 34, 35 45 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 15 45 C 16 59, 19.5 76, 24 90 C 24.8 91, 26.2 91, 27 90 C 31.5 76, 34 59, 35 45 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 15 45 C 20 47.5, 30 47.5, 35 45" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25" y1="11" x2="25" y2="42" stroke={grooveStroke} strokeWidth="0.8" />
            <line x1="25.5" y1="50" x2="25.5" y2="86" stroke={grooveStroke} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          </g>
        );

      // 44 e 34: Primeiro Pré-Molar Inferior
      case '44':
      case '34':
        return (
          <g>
            <path
              d="M 14 45 C 12 34, 11.5 22, 14.5 15 L 25 9 L 35.5 15 C 38.5 22, 38 34, 36 45 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 14 45 C 15 59, 18.5 76, 24 89 C 24.8 90, 26.2 90, 27 89 C 31.5 76, 35 59, 36 45 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 14 45 C 20 47.5, 30 47.5, 36 45" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25" y1="13" x2="25" y2="42" stroke={grooveStroke} strokeWidth="0.8" />
          </g>
        );

      // 45 e 35: Segundo Pré-Molar Inferior
      case '45':
      case '35':
        return (
          <g>
            <path
              d="M 14 45 C 11.5 34, 11.5 22, 15 14.5 L 25 10 L 35 14.5 C 38.5 22, 38.5 34, 36 45 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 14 45 C 15 59, 18.5 76, 24 89 C 24.8 90, 26.2 90, 27 89 C 32 76, 35 59, 36 45 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 14 45 C 20 47.5, 30 47.5, 36 45" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25" y1="14" x2="25" y2="42" stroke={grooveStroke} strokeWidth="0.8" />
          </g>
        );

      // 46 e 36: Primeiro Molar Inferior (2 Raízes Curvas com Furca Orgânica Realista)
      case '46':
      case '36':
        return (
          <g>
            {/* Coroa Ampla com Cúspides Oclusais Arredondadas */}
            <path
              d="M 9 46 C 7.5 33, 7.5 21, 9.5 13 C 11 9.5, 16 8.5, 20.5 9.5 C 23 10.5, 25 11, 26.5 10.5 C 28.5 11, 30.5 10.5, 33 9.5 C 37.5 8.5, 42.5 9.5, 44 13 C 46 21, 46 33, 44.5 46 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* 2 Raízes Divergentes com Espaço de Bifurcação Arqueado Natural */}
            <path
              d="M 9 46 C 10 59, 11 73, 13 87 C 13.8 89.5, 16.5 89.5, 17.5 87 C 20 75, 22.5 63, 26.5 56 C 30.5 63, 33 75, 35.5 87 C 36.5 89.5, 39.2 89.5, 40 87 C 42 73, 43 59, 44.5 46 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 9 46 C 18 48.5, 36 48.5, 44.5 46" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="20" y1="12" x2="20" y2="36" stroke={grooveStroke} strokeWidth="0.8" />
            <line x1="33" y1="12" x2="33" y2="36" stroke={grooveStroke} strokeWidth="0.8" />
          </g>
        );

      // 47 e 37: Segundo Molar Inferior
      case '47':
      case '37':
        return (
          <g>
            <path
              d="M 10 46 C 8.5 33, 8.5 21, 10.5 13 C 12 9.5, 16.5 9, 21 10 C 23.5 11, 25.5 11.5, 27 11 C 29 11.5, 31 11, 33.5 10 C 38 9, 41.5 9.5, 43 13 C 45 21, 45 33, 44 46 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 10 46 C 11 59, 13 73, 15 86.5 C 15.8 89, 18.5 89, 19.5 86.5 C 21.5 76, 23.5 65, 27 58 C 30.5 65, 32.5 76, 34.5 86.5 C 35.5 89, 38.2 89, 39 86.5 C 41 73, 42.5 59, 44 46 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 10 46 C 18 48.5, 36 48.5, 44 46" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="27" y1="13" x2="27" y2="36" stroke={grooveStroke} strokeWidth="0.9" />
          </g>
        );

      // 48 e 38: Terceiro Molar Inferior / Siso
      case '48':
      case '38':
        return (
          <g>
            <path
              d="M 11 46 C 9.5 33, 9.5 21, 11.5 13.5 C 13.5 10, 18 9, 25 9.5 C 32 9, 36.5 10, 38.5 13.5 C 40.5 21, 40.5 33, 40 46 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 11 46 C 12 59, 14.5 72, 17 85 C 17.8 87.5, 20.5 87.5, 21.5 85 C 23 76, 24.5 67, 27 60 C 29.5 67, 31.5 76, 33.5 85 C 34.5 87.5, 37.2 87.5, 38 85 C 40 72, 40.5 59, 40 46 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M 11 46 C 18 48.5, 33 48.5, 40 46" fill="none" stroke={cejStroke} strokeWidth="1.2" />
            <line x1="25.5" y1="12" x2="25.5" y2="35" stroke={grooveStroke} strokeWidth="0.8" />
          </g>
        );

      // ==========================================
      // DENTES DECÍDUOS
      // ==========================================
      case '51':
      case '61':
      case '52':
      case '62':
        return (
          <g>
            <path
              d="M 16 50 C 17 37, 20.5 22, 25 11 C 25.8 10, 27.2 10, 28 11 C 31 22, 33.5 37, 34 50 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 14 50 C 13 60, 13 70, 14 78 C 14 81, 16 83, 19 83 L 31 83 C 34 83, 36 81, 36 78 C 37 70, 37 60, 36 50 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 14 50 C 20 47.5, 30 47.5, 36 50" fill="none" stroke={cejStroke} strokeWidth="1" />
          </g>
        );

      case '53':
      case '63':
        return (
          <g>
            <path
              d="M 16 50 C 17 36, 20.5 19, 25 8 C 25.8 7, 27.2 7, 28 8 C 31 19, 33.5 36, 34 50 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 14 50 C 13 60, 13 70, 15 76 L 25 84 L 35 76 C 37 70, 37 60, 36 50 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 14 50 C 20 47.5, 30 47.5, 36 50" fill="none" stroke={cejStroke} strokeWidth="1" />
          </g>
        );

      case '54':
      case '64':
      case '55':
      case '65':
        return (
          <g>
            <path
              d="M 10 49 C 10 37, 10 23, 12 11 C 12.8 9, 15.5 10, 17 15 C 18 23, 19.5 31, 21.5 36 C 22.5 27, 24 17, 26 9 C 27 7, 29 7, 30 9 C 32 17, 33 27, 34 36 C 36 31, 37.5 23, 38.5 15 C 40 10, 42.8 9, 43.5 11 C 45.5 23, 45.5 37, 45.5 49 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 9 49 C 8 60, 8 70, 10 78 C 12 82, 16 83, 21 82 C 24 81, 26 81, 28 81 C 33 82, 37 82, 39 78 C 41 70, 41 60, 40 49 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 9 49 C 18 47, 32 47, 40 49" fill="none" stroke={cejStroke} strokeWidth="1" />
            <line x1="25" y1="56" x2="25" y2="79" stroke={grooveStroke} strokeWidth="0.8" />
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
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 17 46 C 18 58, 21 72, 24 84 C 24.5 86, 25.5 86, 26 84 C 29 72, 32 58, 33 46 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 17 46 C 21 48, 29 48, 33 46" fill="none" stroke={cejStroke} strokeWidth="1" />
          </g>
        );

      case '73':
      case '83':
        return (
          <g>
            <path
              d="M 15 46 C 14 36, 14 26, 16 19 L 25 11 L 34 19 C 36 26, 36 36, 35 46 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 15 46 C 16 58, 20 74, 24 86 C 24.5 88, 25.5 88, 26 86 C 30 74, 34 58, 35 46 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 15 46 C 21 48, 29 48, 35 46" fill="none" stroke={cejStroke} strokeWidth="1" />
          </g>
        );

      case '74':
      case '84':
      case '75':
      case '85':
      default:
        return (
          <g>
            <path
              d="M 9 46 C 8 36, 8 25, 10 17 C 12 13, 16 12, 21 13 C 24 14, 27 14, 30 13 C 35 12, 39 13, 41 17 C 43 25, 43 36, 42 46 Z"
              fill={`url(#${crownGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path
              d="M 9 46 C 10 58, 12 71, 13 83 C 13.8 86, 16.5 86, 17.5 83 C 19.5 74, 22 64, 25.5 57 C 29 64, 31.5 74, 33.5 83 C 34.5 86, 37.2 86, 38 83 C 39.5 71, 41 58, 42 46 Z"
              fill={`url(#${rootGradId})`}
              stroke={outlineColor}
              strokeWidth="1.5"
            />
            <path d="M 9 46 C 18 48, 32 48, 42 46" fill="none" stroke={cejStroke} strokeWidth="1" />
            <line x1="25" y1="15" x2="25" y2="38" stroke={grooveStroke} strokeWidth="0.8" />
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
        className={`transition-all duration-200 drop-shadow-2xs ${
          isAbsent ? 'opacity-30 grayscale' : 'opacity-100 hover:drop-shadow-sm'
        }`}
      >
        <defs>
          {/* Gradiente Natural do Esmalte da Coroa (Brilho perolado e volume) */}
          <linearGradient id={crownGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {status === 'RESTAURADO' ? (
              <>
                <stop offset="0%" stopColor="#bfdbfe" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#2563eb" />
              </>
            ) : status === 'CARIE' ? (
              <>
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </>
            ) : status === 'FACETA' ? (
              <>
                <stop offset="0%" stopColor="#f3e8ff" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#7e22ce" />
              </>
            ) : isSelected ? (
              <>
                <stop offset="0%" stopColor="#eff6ff" />
                <stop offset="50%" stopColor="#bfdbfe" />
                <stop offset="100%" stopColor="#93c5fd" />
              </>
            ) : (
              <>
                {/* Esmalte Natural: Branco radiante com volume suave */}
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#ffffff" />
                <stop offset="70%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </>
            )}
          </linearGradient>

          {/* Gradiente Natural da Raiz (Cimento / Marfim anatômico) */}
          <linearGradient id={rootGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            {isUpper ? (
              <>
                {/* Raiz Superior: vai do ápice (topo) ao colo (meio) */}
                <stop offset="0%" stopColor="#ebe4d5" />
                <stop offset="50%" stopColor="#f5efe4" />
                <stop offset="100%" stopColor="#faf7f0" />
              </>
            ) : (
              <>
                {/* Raiz Inferior: vai do colo (meio) ao ápice (fundo) */}
                <stop offset="0%" stopColor="#faf7f0" />
                <stop offset="50%" stopColor="#f5efe4" />
                <stop offset="100%" stopColor="#ebe4d5" />
              </>
            )}
          </linearGradient>
        </defs>

        {isMirrored ? (
          <g transform="translate(52, 0) scale(-1, 1)">{renderToothContent()}</g>
        ) : (
          renderToothContent()
        )}

        {/* Marcação de Dente Ausente (Cruz cirúrgica de ausência) */}
        {isAbsent && (
          <g stroke="#dc2626" strokeWidth="2.8" strokeLinecap="round">
            <line x1="8" y1="16" x2="44" y2="80" />
            <line x1="44" y1="16" x2="8" y2="80" />
          </g>
        )}
      </svg>
    </div>
  );
};
