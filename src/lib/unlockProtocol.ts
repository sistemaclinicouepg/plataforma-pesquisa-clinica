/**
 * Módulo de Gestão de Liberação de Questionários e Escalas Clínicas (PROMs/EVA)
 * UEPG - Plataforma de Pesquisa Clínica
 * 
 * Permite:
 * 1. Liberação Automática por Tempo (Padrão GCP: 0h na consulta, 1h após 45m, 24h no dia seguinte, 48h em 2 dias)
 * 2. Liberação Manual e Controlada pelo Pesquisador
 * 3. Desbloqueio Antecipado/Avulso de 1 Clique (Instantâneo)
 */

export interface SessionUnlockMeta {
  unlockedMoments: Array<'0h' | '1h' | '24h' | '48h' | string>;
  unlockedForms: string[];
  releaseMode: 'AUTO' | 'MANUAL';
  lastUnlockedAt?: string;
  unlockedBy?: string;
}

const META_PREFIX = '<!-- UNLOCK_META:';
const META_SUFFIX = '-->';

/**
 * Extrai os metadados de desbloqueio armazenados nas notas da sessão clínica.
 */
export function parseUnlockMeta(notes: string | null | undefined): SessionUnlockMeta {
  const defaultMeta: SessionUnlockMeta = {
    unlockedMoments: [],
    unlockedForms: [],
    releaseMode: 'AUTO',
  };

  if (!notes) return defaultMeta;

  const startIdx = notes.indexOf(META_PREFIX);
  if (startIdx === -1) return defaultMeta;

  const endIdx = notes.indexOf(META_SUFFIX, startIdx + META_PREFIX.length);
  if (endIdx === -1) return defaultMeta;

  const rawJson = notes.substring(startIdx + META_PREFIX.length, endIdx).trim();
  try {
    const parsed = JSON.parse(rawJson);
    return {
      unlockedMoments: Array.isArray(parsed.unlockedMoments) ? parsed.unlockedMoments : [],
      unlockedForms: Array.isArray(parsed.unlockedForms) ? parsed.unlockedForms : [],
      releaseMode: parsed.releaseMode === 'MANUAL' ? 'MANUAL' : 'AUTO',
      lastUnlockedAt: parsed.lastUnlockedAt,
      unlockedBy: parsed.unlockedBy,
    };
  } catch {
    return defaultMeta;
  }
}

/**
 * Codifica metadados de desbloqueio dentro do campo de notas da sessão,
 * preservando integralmente o texto das notas do pesquisador.
 */
export function encodeUnlockMeta(
  existingNotes: string | null | undefined,
  metaUpdates: Partial<SessionUnlockMeta>
): string {
  const current = parseUnlockMeta(existingNotes);
  const updated: SessionUnlockMeta = {
    ...current,
    ...metaUpdates,
  };

  const metaTag = `${META_PREFIX} ${JSON.stringify(updated)} ${META_SUFFIX}`;

  if (!existingNotes) {
    return metaTag;
  }

  const startIdx = existingNotes.indexOf(META_PREFIX);
  if (startIdx === -1) {
    return `${existingNotes}\n\n${metaTag}`;
  }

  const endIdx = existingNotes.indexOf(META_SUFFIX, startIdx + META_PREFIX.length);
  if (endIdx === -1) {
    return `${existingNotes}\n\n${metaTag}`;
  }

  const before = existingNotes.substring(0, startIdx).trimEnd();
  const after = existingNotes.substring(endIdx + META_SUFFIX.length).trimStart();

  const parts = [before, metaTag, after].filter(Boolean);
  return parts.join('\n\n');
}

/**
 * Estrutura para armazenamento de relato detalhado do diário de dor nas notas da sessão
 */
export interface DetailedDiaryReport {
  timePoint: '0h' | '1h' | '24h' | '48h' | string;
  painScore: number;
  painType?: string;
  usedAnalgesic?: string;
  analgesicDetails?: string;
  gingivalSensation?: string;
  otherSymptoms?: string;
  submittedAt: string;
}

const DIARY_PREFIX = '<!-- DIARY_DATA:';
const DIARY_SUFFIX = '-->';

export function parseDetailedDiaryReports(notes: string | null | undefined): Record<string, DetailedDiaryReport> {
  if (!notes) return {};
  const startIdx = notes.indexOf(DIARY_PREFIX);
  if (startIdx === -1) return {};
  const endIdx = notes.indexOf(DIARY_SUFFIX, startIdx + DIARY_PREFIX.length);
  if (endIdx === -1) return {};

  const rawJson = notes.substring(startIdx + DIARY_PREFIX.length, endIdx).trim();
  try {
    return JSON.parse(rawJson);
  } catch {
    return {};
  }
}

export function encodeDetailedDiaryReport(
  existingNotes: string | null | undefined,
  report: DetailedDiaryReport
): string {
  const reports = parseDetailedDiaryReports(existingNotes);
  reports[report.timePoint] = report;

  const diaryTag = `${DIARY_PREFIX} ${JSON.stringify(reports)} ${DIARY_SUFFIX}`;

  if (!existingNotes) {
    return diaryTag;
  }

  const startIdx = existingNotes.indexOf(DIARY_PREFIX);
  if (startIdx === -1) {
    return `${existingNotes}\n\n${diaryTag}`;
  }

  const endIdx = existingNotes.indexOf(DIARY_SUFFIX, startIdx + DIARY_PREFIX.length);
  if (endIdx === -1) {
    return `${existingNotes}\n\n${diaryTag}`;
  }

  const before = existingNotes.substring(0, startIdx).trimEnd();
  const after = existingNotes.substring(endIdx + DIARY_SUFFIX.length).trimStart();

  const parts = [before, diaryTag, after].filter(Boolean);
  return parts.join('\n\n');
}

/**
 * Extrai os detalhes de um momento do diário de dor a partir dos metadados estruturados ou das notas de texto
 */
export function extractDiaryMomentDetails(
  session: {
    sessionDate: string | Date;
    notes?: string | null;
    painScore0h?: number | null;
    painScore1h?: number | null;
    painScore24h?: number | null;
    painScore48h?: number | null;
  },
  moment: '0h' | '1h' | '24h' | '48h'
): {
  score: number | null;
  submittedAt?: string;
  painType?: string;
  usedAnalgesic?: string;
  analgesicDetails?: string;
  gingivalSensation?: string;
  otherSymptoms?: string;
} {
  const score =
    moment === '0h'
      ? session.painScore0h
      : moment === '1h'
      ? session.painScore1h
      : moment === '24h'
      ? session.painScore24h
      : session.painScore48h;

  if (score === null || score === undefined) {
    return { score: null };
  }

  // 1. Tentar ler do JSON estruturado
  const structured = parseDetailedDiaryReports(session.notes);
  if (structured[moment]) {
    const s = structured[moment];
    return {
      score: s.painScore ?? score,
      submittedAt: s.submittedAt,
      painType: s.painType,
      usedAnalgesic: s.usedAnalgesic,
      analgesicDetails: s.analgesicDetails,
      gingivalSensation: s.gingivalSensation,
      otherSymptoms: s.otherSymptoms,
    };
  }

  // 2. Fallback: Parse das notas de texto gravadas
  const notes = session.notes || '';
  const regex = new RegExp(`\\[Diário ${moment} - ([^\\]]+)\\]([^\n]*)`, 'i');
  const match = notes.match(regex);

  if (match) {
    const timeStr = match[1];
    const textPart = match[2];
    const tipoMatch = textPart.match(/Tipo:\s*([^|]+)/i);
    const analgMatch = textPart.match(/Analgésico:\s*([^|]+)/i);
    const gengMatch = textPart.match(/Gengiva:\s*([^|]+)/i);
    const obsMatch = textPart.match(/Obs:\s*([^|]+)/i);

    return {
      score,
      submittedAt: timeStr,
      painType: tipoMatch ? tipoMatch[1].trim() : undefined,
      usedAnalgesic: analgMatch ? analgMatch[1].trim() : undefined,
      gingivalSensation: gengMatch ? gengMatch[1].trim() : undefined,
      otherSymptoms: obsMatch ? obsMatch[1].trim() : undefined,
    };
  }

  return {
    score,
    submittedAt: moment === '0h' ? new Date(session.sessionDate).toLocaleDateString('pt-BR') : undefined,
  };
}

/**
 * Gera dados tabulados em formato TSV (para colar no Excel/SPSS/Prism) e JSON
 * contendo TODAS as respostas de escalas e questionários do participante.
 */
export function generateParticipantTabularExport(
  participant: {
    researchCode: string;
    patient: { fullName: string; biologicalSex: string };
    group?: string | null;
    sessions?: any[];
    responses?: any[];
  },
  projectForms?: any[]
): {
  tsv: string;
  json: string;
  summaryRows: Array<Record<string, string | number>>;
} {
  const summaryRows: Array<Record<string, string | number>> = [];
  const sessions = participant.sessions || [];

  for (const sess of sessions) {
    const s0 = extractDiaryMomentDetails(sess, '0h');
    const s1 = extractDiaryMomentDetails(sess, '1h');
    const s24 = extractDiaryMomentDetails(sess, '24h');
    const s48 = extractDiaryMomentDetails(sess, '48h');

    summaryRows.push({
      ID: participant.researchCode,
      PACIENTE: participant.patient.fullName,
      SEXO: participant.patient.biologicalSex,
      GRUPO: participant.group || 'G1',
      SESSAO: sess.sessionNumber,
      DATA: new Date(sess.sessionDate).toLocaleDateString('pt-BR'),
      EVA_0H: s0.score !== null ? s0.score : 'NA',
      EVA_1H: s1.score !== null ? s1.score : 'NA',
      EVA_24H: s24.score !== null ? s24.score : 'NA',
      EVA_48H: s48.score !== null ? s48.score : 'NA',
      ANALGESICO: s1.usedAnalgesic || s24.usedAnalgesic || s48.usedAnalgesic || 'Não',
      ANALGESICO_DETALHES: s1.analgesicDetails || s24.analgesicDetails || s48.analgesicDetails || '',
      TIPO_DOR: s1.painType || s24.painType || s48.painType || '',
      GENGIVA: s1.gingivalSensation || s24.gingivalSensation || s48.gingivalSensation || 'Normal',
    });
  }

  // Se não tiver sessões ainda, adiciona linha básica
  if (summaryRows.length === 0) {
    summaryRows.push({
      ID: participant.researchCode,
      PACIENTE: participant.patient.fullName,
      SEXO: participant.patient.biologicalSex,
      GRUPO: participant.group || 'G1',
      SESSAO: 'N/A',
      DATA: 'N/A',
      EVA_0H: 'NA',
      EVA_1H: 'NA',
      EVA_24H: 'NA',
      EVA_48H: 'NA',
      ANALGESICO: 'Não',
      ANALGESICO_DETALHES: '',
      TIPO_DOR: '',
      GENGIVA: 'Normal',
    });
  }

  // Montar TSV (Tab-separated values) ideal para colar direto no Excel ou SPSS
  const headers = Object.keys(summaryRows[0]);
  const tsvLines = [
    headers.join('\t'),
    ...summaryRows.map((r) => headers.map((h) => String(r[h] ?? '')).join('\t')),
  ];

  // Adicionar bloco de respostas dos questionários no JSON
  const formAnswers: Record<string, any> = {};
  for (const resp of participant.responses || []) {
    try {
      const parsed = JSON.parse(resp.answersJson || '{}');
      const form = projectForms?.find((f) => f.id === resp.formId);
      formAnswers[form?.title || resp.formId] = {
        submittedAt: resp.submittedAt,
        answers: parsed,
      };
    } catch {}
  }

  const completeJson = JSON.stringify(
    {
      researchCode: participant.researchCode,
      patientName: participant.patient.fullName,
      sessions: summaryRows,
      questionnaires: formAnswers,
    },
    null,
    2
  );

  return {
    tsv: tsvLines.join('\n'),
    json: completeJson,
    summaryRows,
  };
}
