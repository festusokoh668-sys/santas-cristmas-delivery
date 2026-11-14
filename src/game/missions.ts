import {
  DailyMissionsBoard,
  DailyMissionState,
  LevelScoreSummary,
  MissionEvent,
  PlayerProgress,
} from './types';

interface MissionTemplate {
  id: string;
  kind: DailyMissionState['kind'];
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  timeLimitSeconds?: number;
}

const SLOT_1_POOL: MissionTemplate[] = [
  {
    id: 'm-cookies-50',
    kind: 'collect_cookies',
    title: 'Master Cookie Hunter',
    description: 'Collect 50 real magic cookies across any city mazes.',
    target: 50,
    rewardCoins: 50,
  },
  {
    id: 'm-deliver-12',
    kind: 'deliver_presents',
    title: 'Express Sleigh Route',
    description: 'Complete 12 present deliveries to glowing checkpoints.',
    target: 12,
    rewardCoins: 45,
  },
];

const SLOT_2_POOL: MissionTemplate[] = [
  {
    id: 'm-secret-3m',
    kind: 'secret_room_fast',
    title: 'Secret Room Sprinter',
    description: 'Visit a Secret Christmas Room within 3 minutes of starting a level.',
    target: 1,
    rewardCoins: 60,
    timeLimitSeconds: 180,
  },
  {
    id: 'm-speed-2m',
    kind: 'speed_delivery',
    title: 'Dash Through the Snow',
    description: 'Complete any city maze in under 2 minutes.',
    target: 1,
    rewardCoins: 65,
    timeLimitSeconds: 120,
  },
];

const SLOT_3_POOL: MissionTemplate[] = [
  {
    id: 'm-help-elf',
    kind: 'help_elf',
    title: 'Friend to the Elves',
    description: 'Find and team up with a Mystery Elf in any maze.',
    target: 1,
    rewardCoins: 35,
  },
  {
    id: 'm-golden-present',
    kind: 'golden_present',
    title: 'Golden Present Seeker',
    description: 'Locate a hidden Missing Golden Present inside a maze.',
    target: 1,
    rewardCoins: 55,
  },
  {
    id: 'm-clean-run',
    kind: 'clean_run',
    title: 'Sharp Holiday Eyes',
    description: 'Finish any city maze with at most 1 trap or fake cookie triggered.',
    target: 1,
    rewardCoins: 50,
  },
];

export function getDailyMissionDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateKeyToDayOffset(dateKey: string): number {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0;
  const utc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  const anchor = Date.UTC(2026, 10, 13); // 2026-11-13 starts at index 0
  return Math.max(0, Math.floor((utc - anchor) / 86400000));
}

function toMissionState(tpl: MissionTemplate, dateKey: string): DailyMissionState {
  return {
    id: `${dateKey}:${tpl.id}`,
    kind: tpl.kind,
    title: tpl.title,
    description: tpl.description,
    progress: 0,
    target: tpl.target,
    rewardCoins: tpl.rewardCoins,
    timeLimitSeconds: tpl.timeLimitSeconds,
    completed: false,
    claimed: false,
  };
}

export function generateDailyMissions(dateKey: string = getDailyMissionDateKey()): DailyMissionsBoard {
  const dayOffset = dateKeyToDayOffset(dateKey);
  const t1 = SLOT_1_POOL[dayOffset % SLOT_1_POOL.length];
  const t2 = SLOT_2_POOL[dayOffset % SLOT_2_POOL.length];
  const t3 = SLOT_3_POOL[dayOffset % SLOT_3_POOL.length];
  return {
    dateKey,
    missions: [
      toMissionState(t1, dateKey),
      toMissionState(t2, dateKey),
      toMissionState(t3, dateKey),
    ],
  };
}

export function syncDailyMissions(
  board: DailyMissionsBoard | undefined,
  dateKey: string = getDailyMissionDateKey()
): DailyMissionsBoard {
  if (!board || board.dateKey !== dateKey || !Array.isArray(board.missions) || board.missions.length === 0) {
    return generateDailyMissions(dateKey);
  }
  return board;
}

export function applyMissionEvent(
  board: DailyMissionsBoard,
  event: MissionEvent,
  dateKey: string = getDailyMissionDateKey()
): { board: DailyMissionsBoard; newlyCompleted: DailyMissionState[] } {
  const current = syncDailyMissions(board, dateKey);
  const newlyCompleted: DailyMissionState[] = [];

  const nextMissions = current.missions.map((m) => {
    if (m.completed) return m;

    let increment = 0;
    if (event.type === 'cookie' && m.kind === 'collect_cookies') {
      increment = 1;
    } else if (event.type === 'delivery' && m.kind === 'deliver_presents') {
      increment = 1;
    } else if (
      event.type === 'secret_room' &&
      m.kind === 'secret_room_fast' &&
      event.elapsedSeconds <= (m.timeLimitSeconds ?? 180)
    ) {
      increment = 1;
    } else if (event.type === 'golden_present' && m.kind === 'golden_present') {
      increment = 1;
    } else if (event.type === 'elf' && m.kind === 'help_elf') {
      increment = 1;
    }

    if (increment === 0) return m;

    const nextProgress = Math.min(m.target, m.progress + increment);
    const completed = nextProgress >= m.target;
    const updated: DailyMissionState = {
      ...m,
      progress: nextProgress,
      completed,
    };
    if (completed) {
      newlyCompleted.push(updated);
    }
    return updated;
  });

  return {
    board: { dateKey: current.dateKey, missions: nextMissions },
    newlyCompleted,
  };
}

export function applyLevelSummaryToMissions(
  board: DailyMissionsBoard,
  summary: LevelScoreSummary,
  dateKey: string = getDailyMissionDateKey()
): { board: DailyMissionsBoard; newlyCompleted: DailyMissionState[] } {
  const current = syncDailyMissions(board, dateKey);
  if (!summary.won) {
    return { board: current, newlyCompleted: [] };
  }

  const newlyCompleted: DailyMissionState[] = [];
  const nextMissions = current.missions.map((m) => {
    if (m.completed) return m;

    let qualified = false;
    if (m.kind === 'clean_run' && summary.trapsTriggered <= 1) {
      qualified = true;
    } else if (
      m.kind === 'speed_delivery' &&
      summary.elapsedSeconds <= (m.timeLimitSeconds ?? 120)
    ) {
      qualified = true;
    }

    if (!qualified) return m;
    const updated: DailyMissionState = {
      ...m,
      progress: m.target,
      completed: true,
    };
    newlyCompleted.push(updated);
    return updated;
  });

  return {
    board: { dateKey: current.dateKey, missions: nextMissions },
    newlyCompleted,
  };
}

export function claimMissionReward(
  progress: PlayerProgress,
  missionId: string
): { progress: PlayerProgress; coinsAwarded: number } {
  const target = progress.dailyMissions.missions.find((m) => m.id === missionId);
  if (!target || !target.completed || target.claimed) {
    return { progress, coinsAwarded: 0 };
  }

  const nextMissions = progress.dailyMissions.missions.map((m) =>
    m.id === missionId ? { ...m, claimed: true } : m
  );

  return {
    progress: {
      ...progress,
      coins: progress.coins + target.rewardCoins,
      dailyMissions: {
        ...progress.dailyMissions,
        missions: nextMissions,
      },
    },
    coinsAwarded: target.rewardCoins,
  };
}

export function claimAllMissionRewards(progress: PlayerProgress): {
  progress: PlayerProgress;
  coinsAwarded: number;
} {
  let coinsAwarded = 0;
  const nextMissions = progress.dailyMissions.missions.map((m) => {
    if (m.completed && !m.claimed) {
      coinsAwarded += m.rewardCoins;
      return { ...m, claimed: true };
    }
    return m;
  });

  if (coinsAwarded === 0) return { progress, coinsAwarded: 0 };

  return {
    progress: {
      ...progress,
      coins: progress.coins + coinsAwarded,
      dailyMissions: {
        ...progress.dailyMissions,
        missions: nextMissions,
      },
    },
    coinsAwarded,
  };
}

export function getClaimableMissionCount(board: DailyMissionsBoard): number {
  return board.missions.filter((m) => m.completed && !m.claimed).length;
}

export interface MissionClearProgressionResult {
  progress: PlayerProgress;
  coinsAwarded: number;
  nextCityIndex: number;
  clearedMissions: DailyMissionState[];
}

export function resolveMissionClearProgression(
  progress: PlayerProgress,
  currentCityIndex: number,
  newlyCompleted: DailyMissionState[],
  totalCities = 10
): MissionClearProgressionResult {
  if (newlyCompleted.length === 0) {
    return {
      progress,
      coinsAwarded: 0,
      nextCityIndex: currentCityIndex,
      clearedMissions: [],
    };
  }

  const newlyIds = new Set(newlyCompleted.map((m) => m.id));
  let coinsAwarded = 0;
  const clearedMissions: DailyMissionState[] = [];

  const nextMissions = progress.dailyMissions.missions.map((m) => {
    if (newlyIds.has(m.id) && m.completed && !m.claimed) {
      coinsAwarded += m.rewardCoins;
      const claimedState = { ...m, claimed: true };
      clearedMissions.push(claimedState);
      return claimedState;
    }
    if (newlyIds.has(m.id)) {
      clearedMissions.push(m);
    }
    return m;
  });

  const maxIdx = Math.max(0, totalCities - 1);
  const nextCityIndex = totalCities > 0 ? (currentCityIndex + 1) % totalCities : 0;
  const nextUnlocked = Math.max(
    progress.unlockedLevelIndex,
    Math.min(maxIdx, currentCityIndex + 1)
  );

  return {
    progress: {
      ...progress,
      unlockedLevelIndex: nextUnlocked,
      coins: progress.coins + coinsAwarded,
      dailyMissions: {
        ...progress.dailyMissions,
        missions: nextMissions,
      },
    },
    coinsAwarded,
    nextCityIndex,
    clearedMissions,
  };
}

