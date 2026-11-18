import { StudyProtocolConfig } from '@/lib/studyProtocol';

export type ClinicalWindowConfig = {
  sessionNumber: number;
  name: string;
  shortName: string;
  targetDaysFromAnchor: number;
  toleranceMinusDays: number;
  tolerancePlusDays: number;
  anchorSessionNumber: number;
};

export const CLINICAL_WINDOWS: Record<number, ClinicalWindowConfig> = {
  2: {
    sessionNumber: 2,
    name: 'Sessão 2: 2ª Aplicação',
    shortName: 'S2 (7d)',
    targetDaysFromAnchor: 7,
    toleranceMinusDays: 2, // 5 a 9 dias pós-S1
    tolerancePlusDays: 2,
    anchorSessionNumber: 1,
  },
  3: {
    sessionNumber: 3,
    name: 'Sessão 3: Retorno de 14 Dias',
    shortName: 'R14d',
    targetDaysFromAnchor: 14,
    toleranceMinusDays: 3, // 11 a 17 dias pós-S2
    tolerancePlusDays: 3,
    anchorSessionNumber: 2,
  },
  4: {
    sessionNumber: 4,
    name: 'Sessão 4: Retorno de 30 Dias (Final)',
    shortName: 'R30d',
    targetDaysFromAnchor: 30,
    toleranceMinusDays: 5, // 25 a 35 dias pós-S2
    tolerancePlusDays: 5,
    anchorSessionNumber: 2,
  },
};

export type SessionWindowStatus = {
  sessionNumber: number;
  config: ClinicalWindowConfig;
  targetDate: Date;
  windowStart: Date;
  windowEnd: Date;
  isCompleted: boolean;
  actualDate?: Date;
  completedStatus?: 'ON_TIME' | 'DEVIATION_EARLY' | 'DEVIATION_LATE';
  deviationDays?: number;
  pendingStatus?: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING';
  daysDiff?: number;
};

export type ParticipantWindowsSummary = {
  hasS1: boolean;
  s1Date?: Date;
  allCompleted: boolean;
  nextPendingSessionNumber?: number;
  nextStatus?: SessionWindowStatus;
  sessions: Record<number, SessionWindowStatus>;
  overallAlert: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' | 'WAITING_S1' | 'COMPLETED';
};

export function calculateSessionWindows(
  part: any,
  customProtocol?: StudyProtocolConfig
): ParticipantWindowsSummary {
  const s1 = part.sessions?.find((s: any) => s.sessionNumber === 1);
  if (!s1) {
    const s1Proto = customProtocol?.sessions?.find((s) => s.sessionNumber === 1);
    const s1Config: ClinicalWindowConfig = {
      sessionNumber: 1,
      name: s1Proto?.name || 'Sessão 1 (Intervenção Inicial / Baseline)',
      shortName: 'S1',
      targetDaysFromAnchor: 0,
      toleranceMinusDays: 0,
      tolerancePlusDays: 0,
      anchorSessionNumber: 1,
    };
    return {
      hasS1: false,
      allCompleted: false,
      nextPendingSessionNumber: 1,
      nextStatus: {
        sessionNumber: 1,
        config: s1Config,
        targetDate: new Date(),
        windowStart: new Date(),
        windowEnd: new Date(),
        isCompleted: false,
        pendingStatus: 'UPCOMING',
        daysDiff: 0,
      },
      sessions: {},
      overallAlert: 'WAITING_S1',
    };
  }

  const s1Date = new Date(s1.sessionDate);
  const s2 = part.sessions?.find((s: any) => s.sessionNumber === 2);

  const sessions: Record<number, SessionWindowStatus> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextPendingSessionNumber: number | undefined = undefined;

  // Se houver sessões customizadas no protocolo do estudo
  const protocolSessions =
    customProtocol?.sessions && customProtocol.sessions.length > 0
      ? customProtocol.sessions.filter((s) => s.sessionNumber > 1)
      : null;

  if (protocolSessions) {
    let cumulativeDays = 0;
    for (const proto of protocolSessions) {
      cumulativeDays += proto.daysFromPrevious;
      const sNum = proto.sessionNumber;
      const tol = proto.toleranceDays || 2;
      const config: ClinicalWindowConfig = {
        sessionNumber: sNum,
        name: proto.name,
        shortName: `S${sNum}`,
        targetDaysFromAnchor: cumulativeDays,
        toleranceMinusDays: tol,
        tolerancePlusDays: tol,
        anchorSessionNumber: 1,
      };

      const targetDate = new Date(s1Date.getTime() + cumulativeDays * 86400000);
      const windowStart = new Date(s1Date.getTime() + (cumulativeDays - tol) * 86400000);
      const windowEnd = new Date(s1Date.getTime() + (cumulativeDays + tol) * 86400000);

      const existingSession = part.sessions?.find((s: any) => s.sessionNumber === sNum);

      if (existingSession) {
        const actualDate = new Date(existingSession.sessionDate);
        const actualTime = new Date(actualDate).setHours(0, 0, 0, 0);
        const startTime = new Date(windowStart).setHours(0, 0, 0, 0);
        const endTime = new Date(windowEnd).setHours(23, 59, 59, 999);

        let completedStatus: 'ON_TIME' | 'DEVIATION_EARLY' | 'DEVIATION_LATE' = 'ON_TIME';
        let deviationDays = 0;

        if (actualTime < startTime) {
          completedStatus = 'DEVIATION_EARLY';
          deviationDays = Math.round((startTime - actualTime) / 86400000);
        } else if (actualTime > endTime) {
          completedStatus = 'DEVIATION_LATE';
          deviationDays = Math.round((actualTime - endTime) / 86400000);
        }

        sessions[sNum] = {
          sessionNumber: sNum,
          config,
          targetDate,
          windowStart,
          windowEnd,
          isCompleted: true,
          actualDate,
          completedStatus,
          deviationDays,
        };
      } else {
        if (nextPendingSessionNumber === undefined) {
          nextPendingSessionNumber = sNum;
        }

        const startTime = new Date(windowStart).setHours(0, 0, 0, 0);
        const endTime = new Date(windowEnd).setHours(23, 59, 59, 999);

        let pendingStatus: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' = 'UPCOMING';
        let daysDiff = 0;

        if (today.getTime() > endTime) {
          pendingStatus = 'OVERDUE';
          daysDiff = Math.ceil((today.getTime() - endTime) / 86400000);
        } else if (today.getTime() >= startTime) {
          pendingStatus = 'DUE_NOW';
          daysDiff = Math.ceil((endTime - today.getTime()) / 86400000);
        } else {
          pendingStatus = 'UPCOMING';
          daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / 86400000);
        }

        sessions[sNum] = {
          sessionNumber: sNum,
          config,
          targetDate,
          windowStart,
          windowEnd,
          isCompleted: false,
          pendingStatus,
          daysDiff,
        };
      }
    }
  } else {
    // Protocolo padrão de 4 sessões (para compatibilidade com estudos existentes)
    for (const sNum of [2, 3, 4] as const) {
      const config = CLINICAL_WINDOWS[sNum];
      const anchor =
        config.anchorSessionNumber === 1 || !s2
          ? s1Date
          : new Date(s2.sessionDate);

      const additionalDays = config.anchorSessionNumber === 2 && !s2 ? 7 : 0;
      const totalDays = config.targetDaysFromAnchor + additionalDays;
      const targetDate = new Date(anchor.getTime() + totalDays * 86400000);
      const windowStart = new Date(
        anchor.getTime() + (totalDays - config.toleranceMinusDays) * 86400000
      );
      const windowEnd = new Date(
        anchor.getTime() + (totalDays + config.tolerancePlusDays) * 86400000
      );

      const existingSession = part.sessions?.find((s: any) => s.sessionNumber === sNum);

      if (existingSession) {
        const actualDate = new Date(existingSession.sessionDate);
        const actualTime = new Date(actualDate).setHours(0, 0, 0, 0);
        const startTime = new Date(windowStart).setHours(0, 0, 0, 0);
        const endTime = new Date(windowEnd).setHours(23, 59, 59, 999);

        let completedStatus: 'ON_TIME' | 'DEVIATION_EARLY' | 'DEVIATION_LATE' = 'ON_TIME';
        let deviationDays = 0;

        if (actualTime < startTime) {
          completedStatus = 'DEVIATION_EARLY';
          deviationDays = Math.round((startTime - actualTime) / 86400000);
        } else if (actualTime > endTime) {
          completedStatus = 'DEVIATION_LATE';
          deviationDays = Math.round((actualTime - endTime) / 86400000);
        }

        sessions[sNum] = {
          sessionNumber: sNum,
          config,
          targetDate,
          windowStart,
          windowEnd,
          isCompleted: true,
          actualDate,
          completedStatus,
          deviationDays,
        };
      } else {
        if (nextPendingSessionNumber === undefined) {
          nextPendingSessionNumber = sNum;
        }

        const startTime = new Date(windowStart).setHours(0, 0, 0, 0);
        const endTime = new Date(windowEnd).setHours(23, 59, 59, 999);

        let pendingStatus: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' = 'UPCOMING';
        let daysDiff = 0;

        if (today.getTime() > endTime) {
          pendingStatus = 'OVERDUE';
          daysDiff = Math.ceil((today.getTime() - endTime) / 86400000);
        } else if (today.getTime() >= startTime) {
          pendingStatus = 'DUE_NOW';
          daysDiff = Math.ceil((endTime - today.getTime()) / 86400000);
        } else {
          pendingStatus = 'UPCOMING';
          daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / 86400000);
        }

        sessions[sNum] = {
          sessionNumber: sNum,
          config,
          targetDate,
          windowStart,
          windowEnd,
          isCompleted: false,
          pendingStatus,
          daysDiff,
        };
      }
    }
  }

  const allNumbers = protocolSessions
    ? [1, ...protocolSessions.map((s) => s.sessionNumber)]
    : [1, 2, 3, 4];

  const allCompleted = allNumbers.every((num) =>
    part.sessions?.some((s: any) => s.sessionNumber === num)
  );

  let overallAlert: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' | 'WAITING_S1' | 'COMPLETED' =
    allCompleted ? 'COMPLETED' : 'UPCOMING';

  if (!allCompleted) {
    const uncompletedStatuses = Object.values(sessions).filter((s) => !s.isCompleted);
    if (uncompletedStatuses.some((s) => s.pendingStatus === 'OVERDUE')) {
      overallAlert = 'OVERDUE';
    } else if (uncompletedStatuses.some((s) => s.pendingStatus === 'DUE_NOW')) {
      overallAlert = 'DUE_NOW';
    } else {
      overallAlert = 'UPCOMING';
    }
  }

  const nextStatus = nextPendingSessionNumber
    ? sessions[nextPendingSessionNumber]
    : undefined;

  return {
    hasS1: true,
    s1Date,
    allCompleted,
    nextPendingSessionNumber,
    nextStatus,
    sessions,
    overallAlert,
  };
}
