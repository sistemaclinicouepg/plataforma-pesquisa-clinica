/**
 * Definições de Tipos e Utilitários para o Protocolo Clínico
 * (Sessões, Duração, Frequência e Responsáveis pelos Formulários)
 */

export type SessionType = 'CLINICAL' | 'EVALUATION' | 'FOLLOW_UP';

export type StudySessionProtocol = {
  id: string;
  sessionNumber: number;
  name: string;
  type: SessionType;
  daysFromPrevious: number; // 0 para a sessão 1, X dias para as subsequentes
  durationMinutes: number; // Duração estimada em minutos (ex: 15, 30, 45, 60, 90, 120)
  toleranceDays: number; // Tolerância em dias (ex: ±2 dias)
  description?: string;
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

export type StudyProtocolConfig = {
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
  },
];

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
  const sessions = Array.isArray(studyProtocol.sessions) && studyProtocol.sessions.length > 0
    ? studyProtocol.sessions
    : DEFAULT_STUDY_SESSIONS;

  const forms = Array.isArray(studyProtocol.forms) && studyProtocol.forms.length > 0
    ? studyProtocol.forms
    : DEFAULT_FORM_TARGETS;

  return {
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
