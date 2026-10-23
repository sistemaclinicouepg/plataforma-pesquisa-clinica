/**
 * Definições de Tipos e Utilitários para o Protocolo Clínico
 * (Sessões, Duração, Frequência e Responsáveis pelos Formulários)
 */

export type SessionType = 'CLINICAL' | 'EVALUATION' | 'FOLLOW_UP';

export type ResearchSpecialty =
  | 'RESTORATIVE' // Dentística Restauradora & Adesão
  | 'SURGERY' // Cirurgia & Exodontia
  | 'ENDODONTICS' // Endodontia
  | 'PERIODONTICS' // Periodontia & Implante
  | 'BLEACHING' // Clareamento Dental
  | 'GENERAL'; // Ensaio Clínico Geral

export interface SpecialtyDefinition {
  id: ResearchSpecialty;
  name: string;
  badge: string;
  icon: string;
  color: string;
  description: string;
  procedureTitle: string;
  hasColorGuide: boolean;
  checklist: string[];
}

export const RESEARCH_SPECIALTIES: SpecialtyDefinition[] = [
  {
    id: 'RESTORATIVE',
    name: 'Dentística Restauradora & Adesão',
    badge: 'Dentística / Adesão',
    icon: '🦷',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Restaurações diretas/indiretas, adesivos dentinários, critérios FDI/USPHS e longevidade.',
    procedureTitle: 'Protocolo de Restauração / Aplicação Adesiva',
    hasColorGuide: true,
    checklist: [
      'Preparo cavitário e/ou profilaxia com isolamento absoluto realizado.',
      'Aplicação e fotoativação do sistema adesivo conforme protocolo do fabricante.',
      'Inserção, fotoativação da resina composta e acabamento/polimento imediato.',
    ],
  },
  {
    id: 'SURGERY',
    name: 'Cirurgia & Exodontia',
    badge: 'Cirurgia / Exodontia',
    icon: '🩺',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Exodontias (3º molares), osteotomia, analgesia pré-emptiva, trismo, edema e dor pós-operatória.',
    procedureTitle: 'Procedimento Cirúrgico / Exodontia',
    hasColorGuide: false,
    checklist: [
      'Assepsia, antissepsia de campos e anestesia local adequada.',
      'Ato operatório, ostectomia/odontosecção e exodontia realizada.',
      'Irrigação abundante, hemostasia e sutura cirúrgica adequada.',
    ],
  },
  {
    id: 'ENDODONTICS',
    name: 'Endodontia',
    badge: 'Endodontia',
    icon: '🔬',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Preparo químico-mecânico, medicação intracanal, obturação e dor pós-endodôntica.',
    procedureTitle: 'Intervenção Endodôntica',
    hasColorGuide: false,
    checklist: [
      'Isolamento absoluto e odontometria eletrônica confirmada.',
      'Preparo químico-mecânico e irrigação final padronizada.',
      'Medicação intracanal ou obturação e selamento provisório/definitivo.',
    ],
  },
  {
    id: 'PERIODONTICS',
    name: 'Periodontia & Implantodontia',
    badge: 'Periodontia',
    icon: '🌿',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Raspagem e alisamento radicular, cirurgias periodontais e sensibilidade cervical.',
    procedureTitle: 'Terapia Periodontal / Intervenção',
    hasColorGuide: false,
    checklist: [
      'Mapeamento inicial de índices (IPV e SS) realizado.',
      'Instrumentação periodontal/cirúrgica conforme grupo experimental.',
      'Irrigação local, hemostasia e orientações de higiene específicas.',
    ],
  },
  {
    id: 'BLEACHING',
    name: 'Clareamento Dental',
    badge: 'Clareamento Dental',
    icon: '✨',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Eficácia estética (ΔSGU / espectrofotometria), sensibilidade dental imediata e remota.',
    procedureTitle: 'Aplicação do Gel Clareador / Protocolo',
    hasColorGuide: true,
    checklist: [
      'Profilaxia coronária realizada com pedra-pomes e água.',
      'Barreira gengival fotopolimerizada com vedamento absoluto das papilas.',
      'Aplicação homogênea do produto clareador nos hemi-arcos conforme protocolo.',
    ],
  },
  {
    id: 'GENERAL',
    name: 'Ensaio Clínico Geral / Multidisciplinar',
    badge: 'Ensaio Clínico Geral',
    icon: '📋',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Estudos clínicos biomédicos, farmacológicos, preventivos e multidisciplinares.',
    procedureTitle: 'Execução da Intervenção Clínica Padronizada',
    hasColorGuide: true,
    checklist: [
      'Checagem de antissepsia, biossegurança e consentimento do participante.',
      'Execução do protocolo clínico experimental conforme aprovado pelo CEP.',
      'Finalização da intervenção e orientações pós-operatórias na cadeira.',
    ],
  },
];

export interface SessionClinicalModules {
  toothMapping?: boolean; // Mapeamento de dentes/quadrantes
  colorGuide?: boolean; // Escala Vita Classical
  painVAS?: boolean; // Escala EVA na cadeira (0h)
  softTissueExam?: boolean; // Exame de tecidos moles / alvéolo / margem
  edemaTrismus?: boolean; // Aferição de edema facial e trismo (Cirurgia)
  fdiCriteria?: boolean; // Critérios FDI de longevidade (Dentística)
  percussionPalpation?: boolean; // Percussão e palpação (Endodontia)
  periodontogram?: boolean; // Sondagem e sangramento (Periodontia)
}

export type StudySessionProtocol = {
  id: string;
  sessionNumber: number;
  name: string;
  type: SessionType;
  daysFromPrevious: number; // 0 para a sessão 1, X dias para as subsequentes
  durationMinutes: number; // Duração estimada em minutos (ex: 15, 30, 45, 60, 90, 120)
  toleranceDays: number; // Tolerância em dias (ex: ±2 dias)
  description?: string;
  // Configurações por sessão para o Voluntário / Paciente
  requiresPatientQuestionnaire?: boolean; // Se o paciente precisa responder questionários nesta sessão (default: true)
  patientQuestionnaireIds?: string[]; // IDs dos questionários atribuídos a esta sessão (ex: ['eva', 'ohip', 'satisfaction'])
  patientInstructions?: string; // Orientações personalizadas da sessão enviadas ao paciente
  // Configurações por sessão para o Pesquisador
  clinicalModules?: SessionClinicalModules;
  clinicalChecklist?: string[]; // Etapas clínicas padronizadas desta sessão
};

export type RespondentType = 'RESEARCHER' | 'PATIENT';

export type FormFrequencyType =
  | 'DAILY' // Todos os dias (Diário)
  | 'WEEKLY' // 1 vez por semana
  | 'BIWEEKLY' // A cada 15 dias
  | 'PER_SESSION' // A cada sessão clínica
  | 'ONCE'; // Única vez / Pontual

export type FormTargetProtocol = {
  id: string; // 'anamnesis' | 'odontogram' | 'periodontogram' | 'eva' | 'ohip' | 'satisfaction' | custom
  title: string;
  description: string;
  enabled: boolean;
  respondent: RespondentType;
  frequency: FormFrequencyType;
  frequencyDescription?: string;
  isPreset?: boolean;
};

export interface AvailableQuestionnaireOption {
  id: string;
  title: string;
  badge: string;
  icon: string;
  category: string;
  description: string;
  defaultRespondent: RespondentType;
}

export const PRESET_QUESTIONNAIRES_CATALOG: AvailableQuestionnaireOption[] = [
  {
    id: 'eva',
    title: 'Diário de Dor & Sensibilidade (Escala EVA)',
    badge: 'Dor & Sensibilidade',
    icon: '⚡',
    category: 'Farmacovigilância & Desfechos',
    description: 'Monitoramento longitudinal com escala EVA (0 a 10) e gatilho de alerta vermelho clínico.',
    defaultRespondent: 'PATIENT',
  },
  {
    id: 'ohip',
    title: 'Qualidade de Vida em Saúde Bucal (OHIP-14)',
    badge: 'OHIP-14',
    icon: '📊',
    category: 'Qualidade de Vida (PROMs)',
    description: '14 perguntas em escala Likert de 5 pontos validada internacionalmente.',
    defaultRespondent: 'PATIENT',
  },
  {
    id: 'satisfaction',
    title: 'Questionário de Satisfação do Voluntário',
    badge: 'Satisfação',
    icon: '⭐',
    category: 'Percepção Estética & Sucesso',
    description: 'Avaliação da percepção de conforto, resultado e recomendação do tratamento.',
    defaultRespondent: 'PATIENT',
  },
  {
    id: 'habits',
    title: 'Mapeamento de Hábitos, Dieta & Higiene',
    badge: 'Hábitos & Estilo de Vida',
    icon: '☕',
    category: 'Variáveis Intervenientes',
    description: 'Controle de tabagismo/vape, café, chimarrão, alimentos corantes e escovação.',
    defaultRespondent: 'PATIENT',
  },
  {
    id: 'fdi',
    title: 'Critérios Clínicos FDI (Dentística / Longevidade)',
    badge: 'FDI World Dental',
    icon: '🦷',
    category: 'Restauração & Adesão',
    description: 'Avaliação estética, funcional e biológica de materiais restauradores.',
    defaultRespondent: 'RESEARCHER',
  },
  {
    id: 'surgery_edema',
    title: 'Aferição de Edema Facial & Trismo (Cirurgia)',
    badge: 'Cirurgia / Edema',
    icon: '🩺',
    category: 'Pós-Operatório Cirúrgico',
    description: 'Mensurações anatômicas em mm e abertura máxima interincisal.',
    defaultRespondent: 'RESEARCHER',
  },
];

export type StudyProtocolConfig = {
  specialty?: ResearchSpecialty; // Área/Linha de pesquisa clínica do estudo
  projectPrefix?: string; // Prefixo personalizado do código dos participantes (ex: 'P01', 'EXP', 'CLAR')
  totalSessions: number;
  sessions: StudySessionProtocol[];
  forms: FormTargetProtocol[];
};

export const DEFAULT_STUDY_SESSIONS: StudySessionProtocol[] = [
  {
    id: 'sess_1',
    sessionNumber: 1,
    name: 'Sessão 1: Atendimento Inicial / 1ª Intervenção',
    type: 'CLINICAL',
    daysFromPrevious: 0,
    durationMinutes: 60,
    toleranceDays: 0,
    description: 'Procedimento clínico inicial e linha de base.',
    requiresPatientQuestionnaire: true,
    patientQuestionnaireIds: ['eva'],
    clinicalModules: {
      toothMapping: true,
      colorGuide: true,
      painVAS: true,
      softTissueExam: true,
    },
    clinicalChecklist: [
      'Checagem de antissepsia, biossegurança e consentimento do participante.',
      'Execução do protocolo clínico experimental conforme aprovado pelo CEP.',
      'Finalização da intervenção e orientações pós-operatórias na cadeira.',
    ],
  },
  {
    id: 'sess_2',
    sessionNumber: 2,
    name: 'Sessão 2: 2ª Intervenção Clínica',
    type: 'CLINICAL',
    daysFromPrevious: 7,
    durationMinutes: 45,
    toleranceDays: 2,
    description: 'Segunda aplicação clínica do protocolo experimental.',
    requiresPatientQuestionnaire: true,
    patientQuestionnaireIds: ['eva'],
    clinicalModules: {
      toothMapping: true,
      colorGuide: true,
      painVAS: true,
      softTissueExam: true,
    },
    clinicalChecklist: [
      'Avaliação clínica prévia da integridade tecidual.',
      'Execução da segunda etapa do protocolo experimental.',
      'Checagem de desfechos imediatos e liberação do participante.',
    ],
  },
  {
    id: 'sess_3',
    sessionNumber: 3,
    name: 'Sessão 3: Avaliação Clínica de Retorno',
    type: 'EVALUATION',
    daysFromPrevious: 7,
    durationMinutes: 30,
    toleranceDays: 3,
    description: 'Exame clínico de acompanhamento e verificação de desfechos.',
    requiresPatientQuestionnaire: true,
    patientQuestionnaireIds: ['satisfaction', 'ohip'],
    clinicalModules: {
      toothMapping: true,
      colorGuide: true,
      painVAS: true,
      softTissueExam: true,
    },
    clinicalChecklist: [
      'Exame clínico de longevidade e ausência de efeitos adversos.',
      'Aferição de desfechos primários e secundários do protocolo.',
      'Encerramento do acompanhamento clínico do participante.',
    ],
  },
];

/**
 * Retorna o protocolo de sessões e critérios padrão recomendados para cada especialidade odontológica
 */
export function getSpecialtyDefaultSessions(specialty: ResearchSpecialty): StudySessionProtocol[] {
  switch (specialty) {
    case 'RESTORATIVE':
      return [
        {
          id: 'sess_1',
          sessionNumber: 1,
          name: 'Sessão 1: Procedimento Restaurador & Aplicação Adesiva',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 60,
          toleranceDays: 0,
          description: 'Preparo, isolamento absoluto, aplicação adesiva e restauração.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          patientInstructions: 'Registre a sensibilidade pós-operatória ao mastigar e ao frio.',
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
            fdiCriteria: false,
          },
          clinicalChecklist: [
            'Exame do elemento dental, cor de base e profilaxia com pedra-pomes e água.',
            'Isolamento absoluto estrito com lençol de borracha e amarria.',
            'Condicionamento do substrato e aplicação do sistema adesivo conforme fabricante.',
            'Inserção da resina composta, fotoativação e checagem oclusal.',
            'Acabamento imediato e polimento prévio da restauração.',
          ],
        },
        {
          id: 'sess_2',
          sessionNumber: 2,
          name: 'Sessão 2: Reavaliação Imediata & Polimento Final (7 dias)',
          type: 'EVALUATION',
          daysFromPrevious: 7,
          durationMinutes: 30,
          toleranceDays: 2,
          description: 'Aferição de sensibilidade mastigatória e refinamento oclusal.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: true,
            softTissueExam: true,
            fdiCriteria: true,
          },
          clinicalChecklist: [
            'Verificação de queixas de dor ou sensibilidade ao ar e mastigação.',
            'Refinamento de contatos oclusais com papel carbono de alta precisão.',
            'Polimento final de alto brilho com pastas diamantadas.',
          ],
        },
        {
          id: 'sess_3',
          sessionNumber: 3,
          name: 'Sessão 3: Avaliação de 6 Meses (Critérios FDI)',
          type: 'FOLLOW_UP',
          daysFromPrevious: 180,
          durationMinutes: 40,
          toleranceDays: 15,
          description: 'Avaliação de longevidade clínica segundo critérios padronizados FDI.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['ohip', 'satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: false,
            softTissueExam: true,
            fdiCriteria: true,
          },
          clinicalChecklist: [
            'Critérios Estéticos FDI: brilho superficial, manchamento marginal e cor.',
            'Critérios Funcionais FDI: fratura de material, retenção e adaptação de margem.',
            'Critérios Biológicos FDI: cárie secundária, sensibilidade e vitalidade pulpar.',
          ],
        },
        {
          id: 'sess_4',
          sessionNumber: 4,
          name: 'Sessão 4: Avaliação de 12 Meses (Longevidade Final)',
          type: 'FOLLOW_UP',
          daysFromPrevious: 180,
          durationMinutes: 40,
          toleranceDays: 15,
          description: 'Acompanhamento longitudinal de 1 ano e classificação de sucesso.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: false,
            softTissueExam: true,
            fdiCriteria: true,
          },
          clinicalChecklist: [
            'Avaliação cega independente segundo os critérios FDI World Dental.',
            'Registro fotográfico padronizado da interface adesiva.',
            'Classificação final do desfecho restaurador.',
          ],
        },
      ];

    case 'SURGERY':
      return [
        {
          id: 'sess_1',
          sessionNumber: 1,
          name: 'Sessão 1: Ato Cirúrgico / Exodontia',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 60,
          toleranceDays: 0,
          description: 'Ato cirúrgico padronizado, exodontia e sutura.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          patientInstructions: 'Preencha o diário de dor e informe qualquer analgésico de resgate tomado.',
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: true,
            softTissueExam: true,
            edemaTrismus: true,
          },
          clinicalChecklist: [
            'Aferição de sinais vitais, antissepsia extra e intrabucal.',
            'Anestesia local e anotação do número de tubetes utilizados.',
            'Incisão, descolamento mucoperiosteal e osteotomia/odontosecção.',
            'Exodontia com mínimo trauma e curetagem cuidadosa do alvéolo.',
            'Irrigação abundante com soro fisiológico 0,9% e sutura oclusiva.',
          ],
        },
        {
          id: 'sess_2',
          sessionNumber: 2,
          name: 'Sessão 2: Retorno 48 Horas (Pico Inflamatório: Edema & Trismo)',
          type: 'EVALUATION',
          daysFromPrevious: 2,
          durationMinutes: 20,
          toleranceDays: 1,
          description: 'Aferição de edema facial em mm, abertura interincisal e dor.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: true,
            softTissueExam: true,
            edemaTrismus: true,
          },
          clinicalChecklist: [
            'Mensuração do edema facial em mm (linhas anatômicas tragus-pogônio e comissura).',
            'Aferição da abertura máxima interincisal (trismo) com paquímetro milimetrado.',
            'Exame do coágulo sanguíneo e integridade dos pontos de sutura.',
          ],
        },
        {
          id: 'sess_3',
          sessionNumber: 3,
          name: 'Sessão 3: Retorno 7 Dias (Remoção de Sutura & Cicatrização)',
          type: 'EVALUATION',
          daysFromPrevious: 5,
          durationMinutes: 20,
          toleranceDays: 2,
          description: 'Remoção de sutura e controle de complicações infecciosas/alveolite.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['ohip', 'satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: true,
            softTissueExam: true,
            edemaTrismus: true,
          },
          clinicalChecklist: [
            'Inspeção do alvéolo: epitelização tecidual e ausência de alveolite seca/úmida.',
            'Remoção delicada dos pontos de sutura com fio estéril.',
            'Avaliação de sensibilidade ou parestesia de nervo alveolar e lingual.',
          ],
        },
        {
          id: 'sess_4',
          sessionNumber: 4,
          name: 'Sessão 4: Controle de 30 Dias (Cicatrização Óssea Final)',
          type: 'FOLLOW_UP',
          daysFromPrevious: 23,
          durationMinutes: 20,
          toleranceDays: 5,
          description: 'Encerramento do protocolo cirúrgico do voluntário.',
          requiresPatientQuestionnaire: false,
          patientQuestionnaireIds: [],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: false,
            softTissueExam: true,
          },
          clinicalChecklist: [
            'Inspeção do contorno mucoso e ausência de sintomatologia residual.',
            'Encerramento do protocolo cirúrgico e alta do voluntário.',
          ],
        },
      ];

    case 'ENDODONTICS':
      return [
        {
          id: 'sess_1',
          sessionNumber: 1,
          name: 'Sessão 1: Intervenção Endodôntica (PQC & Obturação)',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 90,
          toleranceDays: 0,
          description: 'Acesso, instrumentação, desinfecção e selamento do canal.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: true,
            softTissueExam: true,
            percussionPalpation: true,
          },
          clinicalChecklist: [
            'Isolamento absoluto estrito com lençol de borracha.',
            'Acesso coronário e odontometria eletrônica foraminal confirmada.',
            'Preparo químico-mecânico padronizado e agitação de irrigantes (PUI).',
            'Secagem e obturação termoplastificada do sistema de canais.',
            'Selamento coronário imediato e radiografia periapical final.',
          ],
        },
        {
          id: 'sess_2',
          sessionNumber: 2,
          name: 'Sessão 2: Retorno 7 Dias (Dor Pós-Endodôntica & Sintomas)',
          type: 'EVALUATION',
          daysFromPrevious: 7,
          durationMinutes: 20,
          toleranceDays: 2,
          description: 'Avaliação de dor à mastigação, percussão e palpação.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: true,
            softTissueExam: true,
            percussionPalpation: true,
          },
          clinicalChecklist: [
            'Palpação apical vestibular e percussão vertical/horizontal.',
            'Checagem da integridade do selamento coronário provisório/definitivo.',
          ],
        },
        {
          id: 'sess_3',
          sessionNumber: 3,
          name: 'Sessão 3: Acompanhamento de 6 Meses (Índice Periapical PAI)',
          type: 'FOLLOW_UP',
          daysFromPrevious: 180,
          durationMinutes: 30,
          toleranceDays: 15,
          description: 'Tomada radiográfica padronizada e regressão de lesão periapical.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['ohip', 'satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: false,
            softTissueExam: true,
            percussionPalpation: true,
          },
          clinicalChecklist: [
            'Tomada radiográfica periapical com posicionador milimetrado.',
            'Classificação do escore periapical (Índice PAI de Ørstavik 1 a 5).',
            'Inspeção de fístulas, mobilidade dental e integridade estrutural.',
          ],
        },
        {
          id: 'sess_4',
          sessionNumber: 4,
          name: 'Sessão 4: Controle de 12 Meses (Sucesso Endodôntico Final)',
          type: 'FOLLOW_UP',
          daysFromPrevious: 180,
          durationMinutes: 30,
          toleranceDays: 15,
          description: 'Confirmação do sucesso clínico e radiográfico a longo prazo.',
          requiresPatientQuestionnaire: false,
          patientQuestionnaireIds: [],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: false,
            softTissueExam: true,
            percussionPalpation: true,
          },
          clinicalChecklist: [
            'Radiografia periapical final para confirmação de cicatrização óssea periapical.',
            'Classificação do desfecho endodôntico (Sucesso estrito vs Incerteza vs Falha).',
          ],
        },
      ];

    case 'PERIODONTICS':
      return [
        {
          id: 'sess_1',
          sessionNumber: 1,
          name: 'Sessão 1: Terapia Periodontal Básica / Raspagem (RAR)',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 60,
          toleranceDays: 0,
          description: 'Mapeamento periodontal completo e raspagem/alisamento radicular.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: true,
            softTissueExam: true,
            periodontogram: true,
          },
          clinicalChecklist: [
            'Mapeamento inicial de Profundidade de Sondagem (PS) e Nível de Inserção Clínica (NIC).',
            'Registro de Sangramento à Sondagem (SS %) e Índice de Placa Visível (IPV).',
            'Raspagem e alisamento radicular (RAR) com ultrassom e curetas padronizadas.',
            'Instrução de higiene bucal personalizada e escovas interdentais.',
          ],
        },
        {
          id: 'sess_2',
          sessionNumber: 2,
          name: 'Sessão 2: Reavaliação Periodontal de 30 Dias',
          type: 'EVALUATION',
          daysFromPrevious: 30,
          durationMinutes: 40,
          toleranceDays: 5,
          description: 'Aferição de resposta tecidual, redução de bolsas e SS.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva', 'habits'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: true,
            softTissueExam: true,
            periodontogram: true,
          },
          clinicalChecklist: [
            'Sondagem dos sítios tratados e contagem de bolsas residuais (PS ≥ 5mm).',
            'Verificação da redução de sangramento e adesão do paciente à higiene bucal.',
          ],
        },
        {
          id: 'sess_3',
          sessionNumber: 3,
          name: 'Sessão 3: Terapia Periodontal de Suporte (90 Dias)',
          type: 'FOLLOW_UP',
          daysFromPrevious: 60,
          durationMinutes: 30,
          toleranceDays: 7,
          description: 'Controle de biofilme, sensibilidade cervical e raspagem localizada.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['ohip'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: false,
            softTissueExam: true,
            periodontogram: true,
          },
          clinicalChecklist: [
            'Instrumentação localizada de sítios com sangramento persistente.',
            'Aplicação de agentes dessensibilizantes em áreas de recessão gengival.',
          ],
        },
        {
          id: 'sess_4',
          sessionNumber: 4,
          name: 'Sessão 4: Manutenção & Estabilidade de 180 Dias',
          type: 'FOLLOW_UP',
          daysFromPrevious: 90,
          durationMinutes: 30,
          toleranceDays: 10,
          description: 'Periograma comparativo de 6 meses e estabilidade periodontal.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['ohip', 'satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: false,
            painVAS: false,
            softTissueExam: true,
            periodontogram: true,
          },
          clinicalChecklist: [
            'Periograma completo de 6 meses para bioestatística comparativa.',
            'Cálculo do ganho médio de inserção clínica (NIC) e estabilidade de suporte.',
          ],
        },
      ];

    case 'BLEACHING':
      return [
        {
          id: 'sess_1',
          sessionNumber: 1,
          name: 'Sessão 1: Linha de Base & 1ª Aplicação do Gel',
          type: 'CLINICAL',
          daysFromPrevious: 0,
          durationMinutes: 60,
          toleranceDays: 0,
          description: 'Aferição de cor inicial VITA, aplicação do gel clareador e diário 0-48h.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva', 'habits'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
          clinicalChecklist: [
            'Aferição do tom de cor de base no terço médio (Escala VITA Classical ou Bleachedguide).',
            'Profilaxia coronária com pedra-pomes e água.',
            'Aplicação da barreira gengival fotopolimerizável com vedamento absoluto.',
            'Aplicação homogênea do gel clareador nos hemi-arcos conforme protocolo.',
            'Aspiração abundante, lavagem e remoção da barreira.',
          ],
        },
        {
          id: 'sess_2',
          sessionNumber: 2,
          name: 'Sessão 2: 2ª Aplicação Clínica (7 Dias)',
          type: 'CLINICAL',
          daysFromPrevious: 7,
          durationMinutes: 60,
          toleranceDays: 2,
          description: 'Segunda sessão de aplicação do agente clareador.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['eva'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
          clinicalChecklist: [
            'Aferição prévia de cor e ausência de irritação gengival.',
            'Barreira gengival e aplicação da 2ª sessão do gel clareador.',
            'Registro da sensibilidade imediata na cadeira.',
          ],
        },
        {
          id: 'sess_3',
          sessionNumber: 3,
          name: 'Sessão 3: Retorno de 14 Dias (Estabilidade de Cor)',
          type: 'EVALUATION',
          daysFromPrevious: 7,
          durationMinutes: 30,
          toleranceDays: 3,
          description: 'Aferição de cor após reidratação dental (cálculo de ΔSGU).',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['satisfaction'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: true,
            softTissueExam: true,
          },
          clinicalChecklist: [
            'Aferição de cor sob luz padronizada após reidratação dental completa.',
            'Cálculo do Delta de cor (ΔSGU) e exame da margem gengival.',
          ],
        },
        {
          id: 'sess_4',
          sessionNumber: 4,
          name: 'Sessão 4: Retorno de 30 Dias (Longevidade Estética)',
          type: 'FOLLOW_UP',
          daysFromPrevious: 16,
          durationMinutes: 30,
          toleranceDays: 5,
          description: 'Avaliação final da eficácia e longevidade do clareamento.',
          requiresPatientQuestionnaire: true,
          patientQuestionnaireIds: ['satisfaction', 'ohip'],
          clinicalModules: {
            toothMapping: true,
            colorGuide: true,
            painVAS: false,
            softTissueExam: true,
          },
          clinicalChecklist: [
            'Aferição final da cor dental sob condições padronizadas.',
            'Avaliação da satisfação estética do sorriso e encerramento.',
          ],
        },
      ];

    case 'GENERAL':
    default:
      return DEFAULT_STUDY_SESSIONS;
  }
}

export const DEFAULT_FORM_TARGETS: FormTargetProtocol[] = [
  {
    id: 'anamnesis',
    title: 'Ficha Clínica & Anamnese',
    description: 'Critérios de inclusão/exclusão e histórico do participante.',
    enabled: true,
    respondent: 'RESEARCHER',
    frequency: 'ONCE',
    frequencyDescription: 'Na triagem / admissão',
    isPreset: true,
  },
  {
    id: 'odontogram',
    title: 'Odontograma Clínico Anatômico',
    description: 'Mapeamento dental e visualização de procedimentos.',
    enabled: true,
    respondent: 'RESEARCHER',
    frequency: 'PER_SESSION',
    frequencyDescription: 'A cada sessão clínica',
    isPreset: true,
  },
  {
    id: 'periodontogram',
    title: 'Exame Periodontal (Periograma)',
    description: 'Avaliação de sangramento à sondagem (SS) e placa (IPV).',
    enabled: false,
    respondent: 'RESEARCHER',
    frequency: 'PER_SESSION',
    frequencyDescription: 'A cada sessão clínica',
    isPreset: true,
  },
  {
    id: 'eva',
    title: 'Escala Visual Analógica de Sensibilidade (EVA)',
    description: 'Monitoramento diário de sensibilidade dentinária pelo participante.',
    enabled: true,
    respondent: 'PATIENT',
    frequency: 'DAILY',
    frequencyDescription: 'Todos os dias (Diário)',
    isPreset: true,
  },
  {
    id: 'ohip',
    title: 'Impacto na Qualidade de Vida (OHIP-14)',
    description: 'Oral Health Impact Profile reduzido para saúde bucal.',
    enabled: false,
    respondent: 'PATIENT',
    frequency: 'WEEKLY',
    frequencyDescription: '1 vez por semana',
    isPreset: true,
  },
  {
    id: 'satisfaction',
    title: 'Questionário de Satisfação com o Sorriso',
    description: 'Avaliação da percepção estética e resultado pelo paciente.',
    enabled: false,
    respondent: 'PATIENT',
    frequency: 'ONCE',
    frequencyDescription: 'Na sessão final de retorno',
    isPreset: true,
  },
];

export const PRESET_FORM_QUESTIONS = {
  eva: [
    {
      id: 'q_sens_vas',
      type: 'vas',
      title: 'Qual a intensidade da sua sensibilidade dentária neste exato momento?',
      minLabel: '0 - Sem Dor',
      maxLabel: '10 - Dor Severa',
      required: true,
    },
    {
      id: 'q_sens_desc',
      type: 'choice',
      title: 'Qual a principal sensação observada?',
      required: false,
      options: [
        { label: 'Dor rápida em pontada', value: 'pontada' },
        { label: 'Latejamento persistente', value: 'latejamento' },
        { label: 'Sensibilidade com água/vento frio', value: 'frio' },
        { label: 'Ardência ou queimação gengival', value: 'gengival' },
      ],
    },
    {
      id: 'q_medication',
      type: 'boolean',
      title: 'Precisou tomar algum analgésico nas últimas 12 horas?',
      required: true,
    },
  ],
  ohip: [
    { id: 'ohip_1', type: 'likert', title: '1. Teve problemas para pronunciar palavras por causa dos dentes ou da boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_2', type: 'likert', title: '2. Sentiu que o sabor dos alimentos piorou por causa de seus dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_3', type: 'likert', title: '3. Já sentiu dores agudas ou dolorimentos em sua boca ou dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_4', type: 'likert', title: '4. Achou desconfortável comer algum alimento por causa de seus dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_5', type: 'likert', title: '5. Já se sentiu preocupado(a) por causa de problemas em seus dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_6', type: 'likert', title: '6. Já se sentiu tenso(a) ou estressado(a) por causa de dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_7', type: 'likert', title: '7. Sua alimentação ficou prejudicada por causa de seus dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_8', type: 'likert', title: '8. Teve que interromper suas refeições por causa de problemas bucais?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_9', type: 'likert', title: '9. Achou difícil relaxar por causa de desconforto em dentes ou boca?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_10', type: 'likert', title: '10. Já se sentiu envergonhado(a) ao sorrir ou falar por causa de seus dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_11', type: 'likert', title: '11. Foi um pouco intolerante com familiares ou amigos por causa de incômodo bucal?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_12', type: 'likert', title: '12. Teve dificuldades para realizar seu trabalho ou estudos por causa de dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_13', type: 'likert', title: '13. Sentiu que a vida em geral ficou menos satisfatória por causa dos dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    { id: 'ohip_14', type: 'likert', title: '14. Ficou totalmente incapaz de exercer suas funções diárias normais?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
  ],
  satisfaction: [
    {
      id: 'q_sat_color',
      type: 'vas',
      title: 'O quanto você está satisfeito(a) com a cor obtida em seus dentes?',
      minLabel: '0 - Totalmente Insatisfeito',
      maxLabel: '10 - Extremamente Satisfeito',
      required: true,
    },
    {
      id: 'q_sat_comfort',
      type: 'vas',
      title: 'Como você avalia o conforto e a tolerabilidade geral durante o estudo?',
      minLabel: '0 - Muito desconfortável',
      maxLabel: '10 - Totalmente confortável',
      required: true,
    },
    {
      id: 'q_sat_impact',
      type: 'vas',
      title: 'O resultado influenciou positivamente sua confiança ao sorrir ou falar?',
      minLabel: '0 - Não mudou',
      maxLabel: '10 - Melhorou significativamente',
      required: true,
    },
    {
      id: 'q_sat_rec',
      type: 'boolean',
      title: 'Você recomendaria este procedimento clínico para amigos ou familiares?',
      required: true,
    },
    {
      id: 'q_sat_com',
      type: 'text',
      title: 'Comentários ou impressões pessoais sobre sua experiência no estudo:',
      required: false,
    },
  ],
  habits: [
    {
      id: 'q_coffee',
      type: 'choice',
      title: 'Com que frequência você consome café ou chás escuros?',
      required: true,
      options: [
        { label: 'Não consumo', value: 'nenhum' },
        { label: '1 a 2 xícaras ao dia', value: '1-2' },
        { label: '3 a 4 xícaras ao dia', value: '3-4' },
        { label: '5 ou mais xícaras ao dia', value: '5+' },
      ],
    },
    {
      id: 'q_colored_beverages',
      type: 'choice',
      title: 'Consumo de bebidas com corantes intensos (refrigerantes escuros, vinho tinto, suco de uva ou açaí):',
      required: true,
      options: [
        { label: 'Raramente ou nunca', value: 'raro' },
        { label: '1 a 2 vezes por semana', value: 'semanal' },
        { label: 'Quase todos os dias', value: 'frequente' },
        { label: 'Diariamente', value: 'diario' },
      ],
    },
    {
      id: 'q_chimarrao',
      type: 'choice',
      title: 'Hábito de tomar chimarrão ou tereré:',
      required: true,
      options: [
        { label: 'Não consumo', value: 'nao' },
        { label: 'Ocasionalmente (fins de semana)', value: 'ocasional' },
        { label: 'Diariamente', value: 'diario' },
      ],
    },
    {
      id: 'q_smoking',
      type: 'choice',
      title: 'Hábito de tabagismo ou uso de dispositivos eletrônicos (vape / pod):',
      required: true,
      options: [
        { label: 'Não fumante', value: 'nao' },
        { label: 'Ex-fumante', value: 'ex' },
        { label: 'Fumante de cigarros convencionais', value: 'cigarro' },
        { label: 'Uso cigarro eletrônico / vape', value: 'vape' },
      ],
    },
    {
      id: 'q_brushing',
      type: 'choice',
      title: 'Quantas vezes ao dia você realiza a escovação dos seus dentes?',
      required: true,
      options: [
        { label: '1 vez ao dia', value: '1' },
        { label: '2 vezes ao dia', value: '2' },
        { label: '3 ou mais vezes ao dia', value: '3+' },
      ],
    },
    {
      id: 'q_floss',
      type: 'boolean',
      title: 'Você utiliza fio dental diariamente?',
      required: true,
    },
  ],
};

/**
 * Lê com segurança o protocolo configurado em um template de anamnese
 */
export function parseStudyProtocol(templateStringOrObj: any): StudyProtocolConfig {
  let parsed: any = {};
  if (typeof templateStringOrObj === 'string') {
    try {
      parsed = JSON.parse(templateStringOrObj);
    } catch {
      parsed = {};
    }
  } else if (typeof templateStringOrObj === 'object' && templateStringOrObj !== null) {
    parsed = templateStringOrObj;
  }

  const studyProtocol = parsed.studyProtocol || {};

  const validSpecialties: ResearchSpecialty[] = [
    'RESTORATIVE',
    'SURGERY',
    'ENDODONTICS',
    'PERIODONTICS',
    'BLEACHING',
    'GENERAL',
  ];

  let specialty: ResearchSpecialty = 'GENERAL';
  if (studyProtocol.specialty && validSpecialties.includes(studyProtocol.specialty)) {
    specialty = studyProtocol.specialty;
  }

  const rawSessions = Array.isArray(studyProtocol.sessions) && studyProtocol.sessions.length > 0
    ? studyProtocol.sessions
    : getSpecialtyDefaultSessions(specialty);

  const sessions: StudySessionProtocol[] = rawSessions.map((s: any, idx: number) => {
    return {
      id: s.id || `sess_${idx + 1}`,
      sessionNumber: Number(s.sessionNumber) || idx + 1,
      name: s.name || `Sessão ${idx + 1}`,
      type: s.type || (idx === 0 ? 'CLINICAL' : 'EVALUATION'),
      daysFromPrevious: Number(s.daysFromPrevious) ?? (idx === 0 ? 0 : 7),
      durationMinutes: Number(s.durationMinutes) || (idx === 0 ? 60 : 30),
      toleranceDays: Number(s.toleranceDays) || (idx === 0 ? 0 : 2),
      description: s.description || '',
      requiresPatientQuestionnaire: s.requiresPatientQuestionnaire !== undefined
        ? Boolean(s.requiresPatientQuestionnaire)
        : true,
      patientQuestionnaireIds: Array.isArray(s.patientQuestionnaireIds)
        ? s.patientQuestionnaireIds
        : (s.requiresPatientQuestionnaire === false ? [] : ['eva']),
      patientInstructions: s.patientInstructions || '',
      clinicalModules: s.clinicalModules || {
        toothMapping: true,
        colorGuide: specialty === 'BLEACHING' || specialty === 'RESTORATIVE',
        painVAS: true,
        softTissueExam: true,
        fdiCriteria: specialty === 'RESTORATIVE',
        edemaTrismus: specialty === 'SURGERY',
        percussionPalpation: specialty === 'ENDODONTICS',
        periodontogram: specialty === 'PERIODONTICS',
      },
      clinicalChecklist: Array.isArray(s.clinicalChecklist) && s.clinicalChecklist.length > 0
        ? s.clinicalChecklist
        : undefined,
    };
  });

  const forms = Array.isArray(studyProtocol.forms) && studyProtocol.forms.length > 0
    ? studyProtocol.forms
    : DEFAULT_FORM_TARGETS;

  return {
    specialty,
    projectPrefix: studyProtocol.projectPrefix ? String(studyProtocol.projectPrefix).trim().toUpperCase() : undefined,
    totalSessions: Number(studyProtocol.totalSessions) || sessions.length,
    sessions,
    forms,
  };
}

export function getRespondentLabel(resp: RespondentType): string {
  return resp === 'PATIENT' ? '👤 Paciente (no celular)' : '🩺 Pesquisador (eCRF / Exame Clínico)';
}

export function getFrequencyLabel(freq: FormFrequencyType): string {
  switch (freq) {
    case 'DAILY':
      return 'Todos os dias (Diário)';
    case 'WEEKLY':
      return '1 vez por semana';
    case 'BIWEEKLY':
      return 'A cada 15 dias';
    case 'PER_SESSION':
      return 'A cada sessão clínica';
    case 'ONCE':
      return 'Única vez (Pontual)';
    default:
      return 'Personalizada';
  }
}
