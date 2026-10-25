/**
 * Biblioteca Padronizada de Questionários Clínicos (PROMs / GCP / ICH E6)
 * Permite a instanciação imediata dos instrumentos validados de pesquisa clínica odontológica.
 */

export type FormQuestionDef = {
  id: string;
  type: 'vas' | 'likert' | 'choice' | 'boolean' | 'text' | 'number' | 'instruction' | 'matrix';
  title: string;
  required: boolean;
  description?: string;
  options?: Array<{ label: string; value: string }>;
  minLabel?: string;
  maxLabel?: string;
  observation?: string;
};

export type PresetQuestionnaireDef = {
  id: string;
  title: string;
  description: string;
  frequency: string;
  modality: 'SESSION' | 'TIME_BASED';
  questions: FormQuestionDef[];
};

export const STANDARD_PRESETS: Record<string, PresetQuestionnaireDef> = {
  eva: {
    id: 'eva',
    title: 'Escala Visual Analógica de Sensibilidade (EVA)',
    description: 'Modalidade: TEMPO | Frequência: Todos os dias (Diário) | Ocorrência: Diário de Sensibilidade (0h a 48h) | Monitoramento longitudinal de sensibilidade dentinária (0h, 1h, 24h, 48h pós-atendimento).',
    frequency: 'Todos os dias (Diário)',
    modality: 'TIME_BASED',
    questions: [
      {
        id: 'q_sens_vas',
        type: 'vas',
        title: 'Qual a intensidade da sua sensibilidade ou dor dentária neste momento?',
        minLabel: '0.0 - Sem Dor ou Desconforto',
        maxLabel: '10.0 - Pior Dor Imaginável',
        required: true,
        observation: 'Deslize a barra contínua de 0 a 10 de acordo com sua percepção.',
      },
      {
        id: 'q_sens_type',
        type: 'choice',
        title: 'Como você descreveria o tipo de sensibilidade sentida?',
        required: false,
        options: [
          { label: 'Nenhuma sensibilidade', value: 'nenhuma' },
          { label: 'Dor rápida em pontada com estímulo frio', value: 'pontada_frio' },
          { label: 'Latejamento persistente e espontâneo', value: 'latejamento' },
          { label: 'Desconforto com ar/vento ao respirar pela boca', value: 'ar_frio' },
          { label: 'Sensação de ardência ou queimação na gengiva', value: 'ardencia_gengival' },
        ],
      },
      {
        id: 'q_analgesic',
        type: 'boolean',
        title: 'Precisou tomar algum analgésico ou anti-inflamatório para aliviar o desconforto?',
        required: true,
        options: [
          { label: 'Sim', value: 'sim' },
          { label: 'Não', value: 'nao' },
        ],
      },
      {
        id: 'q_analgesic_details',
        type: 'text',
        title: 'Caso tenha tomado medicação, qual foi o remédio e a dosagem?',
        required: false,
        observation: 'Ex: Paracetamol 750mg ou Dipirona 500mg.',
      },
      {
        id: 'q_symptoms_notes',
        type: 'text',
        title: 'Outras observações ou sintomas adicionais:',
        required: false,
      },
    ],
  },

  satisfaction: {
    id: 'satisfaction',
    title: 'Questionário de Satisfação com o Tratamento',
    description: 'Modalidade: SESSAO | Frequência: Retorno Final / Conclusão | Ocorrência: Na sessão final de retorno | Avaliação da percepção estética e resultado global do procedimento pelo paciente.',
    frequency: 'Retorno Final / Conclusão',
    modality: 'SESSION',
    questions: [
      {
        id: 'q_sat_color',
        type: 'vas',
        title: 'Qual o seu grau de satisfação com a cor final obtida em seus dentes?',
        minLabel: '0.0 - Totalmente Insatisfeito',
        maxLabel: '10.0 - Extremamente Satisfeito',
        required: true,
      },
      {
        id: 'q_sat_confidence',
        type: 'likert',
        title: 'O resultado do tratamento melhorou sua autoconfiança ao sorrir e falar em público?',
        required: true,
        options: [
          { label: 'Não mudou em nada', value: '0' },
          { label: 'Mudou muito pouco', value: '1' },
          { label: 'Mudou moderadamente', value: '2' },
          { label: 'Melhorou bastante', value: '3' },
          { label: 'Melhorou significativamente', value: '4' },
        ],
      },
      {
        id: 'q_sat_recommend',
        type: 'boolean',
        title: 'Você recomendaria este procedimento clínico para amigos ou familiares?',
        required: true,
        options: [
          { label: 'Sim', value: 'sim' },
          { label: 'Não', value: 'nao' },
        ],
      },
      {
        id: 'q_sat_discomfort',
        type: 'choice',
        title: 'Como você avalia o nível de desconforto geral durante todo o tratamento?',
        required: true,
        options: [
          { label: 'Sem nenhum desconforto', value: 'nenhum' },
          { label: 'Desconforto leve e passageiro', value: 'leve' },
          { label: 'Desconforto moderado suportável', value: 'moderado' },
          { label: 'Desconforto intenso', value: 'intenso' },
        ],
      },
      {
        id: 'q_sat_feedback',
        type: 'text',
        title: 'Deixe seus comentários e impressões gerais sobre o atendimento da equipe da pesquisa:',
        required: false,
      },
    ],
  },

  ohip: {
    id: 'ohip',
    title: 'Impacto na Qualidade de Vida (OHIP-14)',
    description: 'Modalidade: SESSAO | Frequência: Linha de Base / Admissão | Ocorrência: Linha de Base / Admissão | Oral Health Impact Profile reduzido para avaliar impactos funcionais e psicossociais da saúde bucal.',
    frequency: 'Linha de Base / Admissão',
    modality: 'SESSION',
    questions: [
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
      { id: 'ohip_11', type: 'likert', title: '11. Foi um pouco intolerante com cônjuge ou amigos por causa de dor bucal?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
      { id: 'ohip_12', type: 'likert', title: '12. Teve dificuldades para realizar seu trabalho ou estudo por causa de dentes?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
      { id: 'ohip_13', type: 'likert', title: '13. Sentiu que a vida era menos satisfatória por causa de problemas bucais?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
      { id: 'ohip_14', type: 'likert', title: '14. Ficou totalmente incapaz de desenvolver atividades diárias por causa de dor bucal?', required: true, options: [{ label: 'Nunca', value: '0' }, { label: 'Raramente', value: '1' }, { label: 'Às vezes', value: '2' }, { label: 'Repetidamente', value: '3' }, { label: 'Sempre', value: '4' }] },
    ],
  },

  habits: {
    id: 'habits',
    title: 'Mapeamento de Hábitos e Alimentos Corantes',
    description: 'Modalidade: TEMPO | Frequência: 1 vez por semana | Ocorrência: Semanalmente | Registro de ingestão de café, chimarrão, alimentos corantes e fumo durante o estudo.',
    frequency: '1 vez por semana',
    modality: 'TIME_BASED',
    questions: [
      {
        id: 'habits_coffee',
        type: 'choice',
        title: 'Qual a sua frequência média de consumo de café ou chá preto nos últimos 7 dias?',
        required: true,
        options: [
          { label: 'Não consumo', value: '0' },
          { label: '1 a 2 xícaras ao dia', value: '1-2' },
          { label: '3 a 5 xícaras ao dia', value: '3-5' },
          { label: 'Mais de 5 xícaras ao dia', value: '5+' },
        ],
      },
      {
        id: 'habits_mate',
        type: 'choice',
        title: 'Consumiu chimarrão ou tereré durante esta semana?',
        required: true,
        options: [
          { label: 'Não consumi', value: 'nao' },
          { label: 'Consumi ocasionalmente (1 a 2 vezes)', value: 'ocasional' },
          { label: 'Consumo diário', value: 'diario' },
        ],
      },
      {
        id: 'habits_smoking',
        type: 'boolean',
        title: 'Fumou cigarro tradicional, eletrônico ou narguilé nos últimos 7 dias?',
        required: true,
        options: [
          { label: 'Sim', value: 'sim' },
          { label: 'Não', value: 'nao' },
        ],
      },
      {
        id: 'habits_colored_food',
        type: 'choice',
        title: 'Consumiu molhos escuros (molho de tomate, shoyu), vinho tinto, beterraba ou açaí?',
        required: true,
        options: [
          { label: 'Não consumi nenhum destes', value: 'nenhum' },
          { label: 'Consumi 1 a 2 vezes', value: '1-2' },
          { label: 'Consumi frequentemente (3 ou mais vezes)', value: 'frequente' },
        ],
      },
    ],
  },
};

export function getStandardPreset(idOrKey: string): PresetQuestionnaireDef | null {
  const clean = idOrKey.toLowerCase().trim();
  if (clean === 'eva' || clean.includes('sensibilidade') || clean.includes('escala visual')) {
    return STANDARD_PRESETS.eva;
  }
  if (clean === 'satisfaction' || clean.includes('satisfaç') || clean.includes('satisfacao')) {
    return STANDARD_PRESETS.satisfaction;
  }
  if (clean === 'ohip' || clean.includes('ohip-14') || clean.includes('qualidade de vida')) {
    return STANDARD_PRESETS.ohip;
  }
  if (clean === 'habits' || clean.includes('hábito') || clean.includes('habito') || clean.includes('corante')) {
    return STANDARD_PRESETS.habits;
  }
  return null;
}
