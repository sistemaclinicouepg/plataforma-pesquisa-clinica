export type ToothStatus = 'HIGIDO' | 'RESTAURADO' | 'CARIE' | 'AUSENTE' | 'FACETA';

export interface ToothConfig {
  fdi: string;
  name: string;
  shortName: string;
  arch: 'superior' | 'inferior';
  category: 'permanent' | 'deciduous';
  quadrant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  type:
    | 'central_incisor'
    | 'lateral_incisor'
    | 'canine'
    | 'premolar_1'
    | 'premolar_2'
    | 'molar_1'
    | 'molar_2'
    | 'molar_3'
    | 'deciduous_incisor'
    | 'deciduous_canine'
    | 'deciduous_molar';
  mirrored?: boolean;
}

export const TOOTH_STATUS_CONFIG: Record<
  ToothStatus,
  { label: string; bg: string; text: string; border: string; fill: string; stroke: string; badge: string }
> = {
  HIGIDO: {
    label: 'Hígido',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    fill: '#ecfdf5',
    stroke: '#059669',
    badge: 'bg-emerald-500',
  },
  RESTAURADO: {
    label: 'Restaurado',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
    fill: '#eff6ff',
    stroke: '#2563eb',
    badge: 'bg-blue-500',
  },
  CARIE: {
    label: 'Cárie',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-300',
    fill: '#fef2f2',
    stroke: '#dc2626',
    badge: 'bg-red-500',
  },
  AUSENTE: {
    label: 'Ausente',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    border: 'border-slate-300',
    fill: '#f1f5f9',
    stroke: '#94a3b8',
    badge: 'bg-slate-400',
  },
  FACETA: {
    label: 'Prótese',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    fill: '#fef3c7',
    stroke: '#d97706',
    badge: 'bg-amber-500',
  },
};

// Quadrantes Permanentes
export const UPPER_PERMANENT_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
export const UPPER_PERMANENT_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
export const UPPER_PERMANENT_TEETH = [...UPPER_PERMANENT_RIGHT, ...UPPER_PERMANENT_LEFT];

export const LOWER_PERMANENT_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];
export const LOWER_PERMANENT_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];
export const LOWER_PERMANENT_TEETH = [...LOWER_PERMANENT_RIGHT, ...LOWER_PERMANENT_LEFT];

export const ALL_PERMANENT_TEETH = [...UPPER_PERMANENT_TEETH, ...LOWER_PERMANENT_TEETH];

// Quadrantes Decíduos (Dentes de leite)
export const UPPER_DECIDUOUS_RIGHT = ['55', '54', '53', '52', '51'];
export const UPPER_DECIDUOUS_LEFT = ['61', '62', '63', '64', '65'];
export const UPPER_DECIDUOUS_TEETH = [...UPPER_DECIDUOUS_RIGHT, ...UPPER_DECIDUOUS_LEFT];

export const LOWER_DECIDUOUS_RIGHT = ['85', '84', '83', '82', '81'];
export const LOWER_DECIDUOUS_LEFT = ['71', '72', '73', '74', '75'];
export const LOWER_DECIDUOUS_TEETH = [...LOWER_DECIDUOUS_RIGHT, ...LOWER_DECIDUOUS_LEFT];

export const ALL_DECIDUOUS_TEETH = [...UPPER_DECIDUOUS_TEETH, ...LOWER_DECIDUOUS_TEETH];

export const TEETH_METADATA: Record<string, ToothConfig> = {
  // Arcada Superior - Permanentes Direito (18 a 11)
  '18': { fdi: '18', name: 'Terceiro Molar Superior Direito (Siso)', shortName: '3º Molar Sup. D.', arch: 'superior', category: 'permanent', quadrant: 1, type: 'molar_3' },
  '17': { fdi: '17', name: 'Segundo Molar Superior Direito', shortName: '2º Molar Sup. D.', arch: 'superior', category: 'permanent', quadrant: 1, type: 'molar_2' },
  '16': { fdi: '16', name: 'Primeiro Molar Superior Direito', shortName: '1º Molar Sup. D.', arch: 'superior', category: 'permanent', quadrant: 1, type: 'molar_1' },
  '15': { fdi: '15', name: 'Segundo Pré-Molar Superior Direito', shortName: '2º Pré Sup. D.', arch: 'superior', category: 'permanent', quadrant: 1, type: 'premolar_2' },
  '14': { fdi: '14', name: 'Primeiro Pré-Molar Superior Direito', shortName: '1º Pré Sup. D.', arch: 'superior', category: 'permanent', quadrant: 1, type: 'premolar_1' },
  '13': { fdi: '13', name: 'Canino Superior Direito', shortName: 'Canino Sup. D.', arch: 'superior', category: 'permanent', quadrant: 1, type: 'canine' },
  '12': { fdi: '12', name: 'Incisivo Lateral Superior Direito', shortName: 'Inc. Lat. Sup. D.', arch: 'superior', category: 'permanent', quadrant: 1, type: 'lateral_incisor' },
  '11': { fdi: '11', name: 'Incisivo Central Superior Direito', shortName: 'Inc. Cent. Sup. D.', arch: 'superior', category: 'permanent', quadrant: 1, type: 'central_incisor' },

  // Arcada Superior - Permanentes Esquerdo (21 a 28)
  '21': { fdi: '21', name: 'Incisivo Central Superior Esquerdo', shortName: 'Inc. Cent. Sup. E.', arch: 'superior', category: 'permanent', quadrant: 2, type: 'central_incisor', mirrored: true },
  '22': { fdi: '22', name: 'Incisivo Lateral Superior Esquerdo', shortName: 'Inc. Lat. Sup. E.', arch: 'superior', category: 'permanent', quadrant: 2, type: 'lateral_incisor', mirrored: true },
  '23': { fdi: '23', name: 'Canino Superior Esquerdo', shortName: 'Canino Sup. E.', arch: 'superior', category: 'permanent', quadrant: 2, type: 'canine', mirrored: true },
  '24': { fdi: '24', name: 'Primeiro Pré-Molar Superior Esquerdo', shortName: '1º Pré Sup. E.', arch: 'superior', category: 'permanent', quadrant: 2, type: 'premolar_1', mirrored: true },
  '25': { fdi: '25', name: 'Segundo Pré-Molar Superior Esquerdo', shortName: '2º Pré Sup. E.', arch: 'superior', category: 'permanent', quadrant: 2, type: 'premolar_2', mirrored: true },
  '26': { fdi: '26', name: 'Primeiro Molar Superior Esquerdo', shortName: '1º Molar Sup. E.', arch: 'superior', category: 'permanent', quadrant: 2, type: 'molar_1', mirrored: true },
  '27': { fdi: '27', name: 'Segundo Molar Superior Esquerdo', shortName: '2º Molar Sup. E.', arch: 'superior', category: 'permanent', quadrant: 2, type: 'molar_2', mirrored: true },
  '28': { fdi: '28', name: 'Terceiro Molar Superior Esquerdo (Siso)', shortName: '3º Molar Sup. E.', arch: 'superior', category: 'permanent', quadrant: 2, type: 'molar_3', mirrored: true },

  // Arcada Inferior - Permanentes Direito (48 a 41)
  '48': { fdi: '48', name: 'Terceiro Molar Inferior Direito (Siso)', shortName: '3º Molar Inf. D.', arch: 'inferior', category: 'permanent', quadrant: 4, type: 'molar_3' },
  '47': { fdi: '47', name: 'Segundo Molar Inferior Direito', shortName: '2º Molar Inf. D.', arch: 'inferior', category: 'permanent', quadrant: 4, type: 'molar_2' },
  '46': { fdi: '46', name: 'Primeiro Molar Inferior Direito', shortName: '1º Molar Inf. D.', arch: 'inferior', category: 'permanent', quadrant: 4, type: 'molar_1' },
  '45': { fdi: '45', name: 'Segundo Pré-Molar Inferior Direito', shortName: '2º Pré Inf. D.', arch: 'inferior', category: 'permanent', quadrant: 4, type: 'premolar_2' },
  '44': { fdi: '44', name: 'Primeiro Pré-Molar Inferior Direito', shortName: '1º Pré Inf. D.', arch: 'inferior', category: 'permanent', quadrant: 4, type: 'premolar_1' },
  '43': { fdi: '43', name: 'Canino Inferior Direito', shortName: 'Canino Inf. D.', arch: 'inferior', category: 'permanent', quadrant: 4, type: 'canine' },
  '42': { fdi: '42', name: 'Incisivo Lateral Inferior Direito', shortName: 'Inc. Lat. Inf. D.', arch: 'inferior', category: 'permanent', quadrant: 4, type: 'lateral_incisor' },
  '41': { fdi: '41', name: 'Incisivo Central Inferior Direito', shortName: 'Inc. Cent. Inf. D.', arch: 'inferior', category: 'permanent', quadrant: 4, type: 'central_incisor' },

  // Arcada Inferior - Permanentes Esquerdo (31 a 38)
  '31': { fdi: '31', name: 'Incisivo Central Inferior Esquerdo', shortName: 'Inc. Cent. Inf. E.', arch: 'inferior', category: 'permanent', quadrant: 3, type: 'central_incisor', mirrored: true },
  '32': { fdi: '32', name: 'Incisivo Lateral Inferior Esquerdo', shortName: 'Inc. Lat. Inf. E.', arch: 'inferior', category: 'permanent', quadrant: 3, type: 'lateral_incisor', mirrored: true },
  '33': { fdi: '33', name: 'Canino Inferior Esquerdo', shortName: 'Canino Inf. E.', arch: 'inferior', category: 'permanent', quadrant: 3, type: 'canine', mirrored: true },
  '34': { fdi: '34', name: 'Primeiro Pré-Molar Inferior Esquerdo', shortName: '1º Pré Inf. E.', arch: 'inferior', category: 'permanent', quadrant: 3, type: 'premolar_1', mirrored: true },
  '35': { fdi: '35', name: 'Segundo Pré-Molar Inferior Esquerdo', shortName: '2º Pré Inf. E.', arch: 'inferior', category: 'permanent', quadrant: 3, type: 'premolar_2', mirrored: true },
  '36': { fdi: '36', name: 'Primeiro Molar Inferior Esquerdo', shortName: '1º Molar Inf. E.', arch: 'inferior', category: 'permanent', quadrant: 3, type: 'molar_1', mirrored: true },
  '37': { fdi: '37', name: 'Segundo Molar Inferior Esquerdo', shortName: '2º Molar Inf. E.', arch: 'inferior', category: 'permanent', quadrant: 3, type: 'molar_2', mirrored: true },
  '38': { fdi: '38', name: 'Terceiro Molar Inferior Esquerdo (Siso)', shortName: '3º Molar Inf. E.', arch: 'inferior', category: 'permanent', quadrant: 3, type: 'molar_3', mirrored: true },

  // Arcada Superior - Decíduos Direito (55 a 51)
  '55': { fdi: '55', name: 'Segundo Molar Decíduo Superior Direito', shortName: '2º Molar Dec. Sup. D.', arch: 'superior', category: 'deciduous', quadrant: 5, type: 'deciduous_molar' },
  '54': { fdi: '54', name: 'Primeiro Molar Decíduo Superior Direito', shortName: '1º Molar Dec. Sup. D.', arch: 'superior', category: 'deciduous', quadrant: 5, type: 'deciduous_molar' },
  '53': { fdi: '53', name: 'Canino Decíduo Superior Direito', shortName: 'Canino Dec. Sup. D.', arch: 'superior', category: 'deciduous', quadrant: 5, type: 'deciduous_canine' },
  '52': { fdi: '52', name: 'Incisivo Lateral Decíduo Superior Direito', shortName: 'Inc. Lat. Dec. Sup. D.', arch: 'superior', category: 'deciduous', quadrant: 5, type: 'deciduous_incisor' },
  '51': { fdi: '51', name: 'Incisivo Central Decíduo Superior Direito', shortName: 'Inc. Cent. Dec. Sup. D.', arch: 'superior', category: 'deciduous', quadrant: 5, type: 'deciduous_incisor' },

  // Arcada Superior - Decíduos Esquerdo (61 a 65)
  '61': { fdi: '61', name: 'Incisivo Central Decíduo Superior Esquerdo', shortName: 'Inc. Cent. Dec. Sup. E.', arch: 'superior', category: 'deciduous', quadrant: 6, type: 'deciduous_incisor', mirrored: true },
  '62': { fdi: '62', name: 'Incisivo Lateral Decíduo Superior Esquerdo', shortName: 'Inc. Lat. Dec. Sup. E.', arch: 'superior', category: 'deciduous', quadrant: 6, type: 'deciduous_incisor', mirrored: true },
  '63': { fdi: '63', name: 'Canino Decíduo Superior Esquerdo', shortName: 'Canino Dec. Sup. E.', arch: 'superior', category: 'deciduous', quadrant: 6, type: 'deciduous_canine', mirrored: true },
  '64': { fdi: '64', name: 'Primeiro Molar Decíduo Superior Esquerdo', shortName: '1º Molar Dec. Sup. E.', arch: 'superior', category: 'deciduous', quadrant: 6, type: 'deciduous_molar', mirrored: true },
  '65': { fdi: '65', name: 'Segundo Molar Decíduo Superior Esquerdo', shortName: '2º Molar Dec. Sup. E.', arch: 'superior', category: 'deciduous', quadrant: 6, type: 'deciduous_molar', mirrored: true },

  // Arcada Inferior - Decíduos Direito (85 a 81)
  '85': { fdi: '85', name: 'Segundo Molar Decíduo Inferior Direito', shortName: '2º Molar Dec. Inf. D.', arch: 'inferior', category: 'deciduous', quadrant: 8, type: 'deciduous_molar' },
  '84': { fdi: '84', name: 'Primeiro Molar Decíduo Inferior Direito', shortName: '1º Molar Dec. Inf. D.', arch: 'inferior', category: 'deciduous', quadrant: 8, type: 'deciduous_molar' },
  '83': { fdi: '83', name: 'Canino Decíduo Inferior Direito', shortName: 'Canino Dec. Inf. D.', arch: 'inferior', category: 'deciduous', quadrant: 8, type: 'deciduous_canine' },
  '82': { fdi: '82', name: 'Incisivo Lateral Decíduo Inferior Direito', shortName: 'Inc. Lat. Dec. Inf. D.', arch: 'inferior', category: 'deciduous', quadrant: 8, type: 'deciduous_incisor' },
  '81': { fdi: '81', name: 'Incisivo Central Decíduo Inferior Direito', shortName: 'Inc. Cent. Dec. Inf. D.', arch: 'inferior', category: 'deciduous', quadrant: 8, type: 'deciduous_incisor' },

  // Arcada Inferior - Decíduos Esquerdo (71 a 75)
  '71': { fdi: '71', name: 'Incisivo Central Decíduo Inferior Esquerdo', shortName: 'Inc. Cent. Dec. Inf. E.', arch: 'inferior', category: 'deciduous', quadrant: 7, type: 'deciduous_incisor', mirrored: true },
  '72': { fdi: '72', name: 'Incisivo Lateral Decíduo Inferior Esquerdo', shortName: 'Inc. Lat. Dec. Inf. E.', arch: 'inferior', category: 'deciduous', quadrant: 7, type: 'deciduous_incisor', mirrored: true },
  '73': { fdi: '73', name: 'Canino Decíduo Inferior Esquerdo', shortName: 'Canino Dec. Inf. E.', arch: 'inferior', category: 'deciduous', quadrant: 7, type: 'deciduous_canine', mirrored: true },
  '74': { fdi: '74', name: 'Primeiro Molar Decíduo Inferior Esquerdo', shortName: '1º Molar Dec. Inf. E.', arch: 'inferior', category: 'deciduous', quadrant: 7, type: 'deciduous_molar', mirrored: true },
  '75': { fdi: '75', name: 'Segundo Molar Decíduo Inferior Esquerdo', shortName: '2º Molar Dec. Inf. E.', arch: 'inferior', category: 'deciduous', quadrant: 7, type: 'deciduous_molar', mirrored: true },
};
