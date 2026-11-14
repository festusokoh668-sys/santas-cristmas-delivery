import { TOTAL_LEVELS } from './cities';
import { generateDailyMissions, syncDailyMissions } from './missions';
import {
  ActivePowerUps,
  CosmeticItem,
  DeliveryHouse,
  Difficulty,
  FakeCookieKind,
  LevelScoreSummary,
  PlayerProgress,
  PowerUpKind,
  TileKind,
} from './types';

export const STORAGE_KEY = 'santas_holiday_maze_progress_v1';

export const COSMETICS: CosmeticItem[] = [
  // Santa Outfits (8)
  {
    id: 'outfit_classic',
    slot: 'outfit',
    name: 'Classic Velvet Suit',
    description: 'Traditional crimson coat with snowy fur trim and brass belt.',
    cost: 0,
    primaryColor: '#dc2626',
    trimColor: '#f8fafc',
  },
  {
    id: 'outfit_royal_gold',
    slot: 'outfit',
    name: 'Royal Gold Coat',
    description: 'Deep burgundy velvet stitched with shimmering North Pole gold.',
    cost: 60,
    primaryColor: '#991b1b',
    trimColor: '#fbbf24',
  },
  {
    id: 'outfit_midnight_stealth',
    slot: 'outfit',
    name: 'Midnight Shadow Cloak',
    description: 'Sleek midnight-navy delivery suit trimmed with icy starlight.',
    cost: 70,
    primaryColor: '#1e293b',
    trimColor: '#38bdf8',
  },
  {
    id: 'outfit_candy_cane',
    slot: 'outfit',
    name: 'Peppermint Candy Suit',
    description: 'Cheerful peppermint-rose velvet with crisp sugar-white trim.',
    cost: 85,
    primaryColor: '#e11d48',
    trimColor: '#ffffff',
  },
  {
    id: 'outfit_arctic_frost',
    slot: 'outfit',
    name: 'Arctic Frost Parka',
    description: 'Glacier-blue winter coat woven from northern lights silk.',
    cost: 90,
    primaryColor: '#0284c7',
    trimColor: '#e0f2fe',
  },
  {
    id: 'outfit_gingerbread',
    slot: 'outfit',
    name: 'Gingerbread Baker Coat',
    description: 'Warm spiced-cinnamon velvet piped with sweet cream icing.',
    cost: 110,
    primaryColor: '#92400e',
    trimColor: '#fef3c7',
  },
  {
    id: 'outfit_tropical_festive',
    slot: 'outfit',
    name: 'Tropical Holiday Tunic',
    description: 'Breezy emerald festive suit perfect for Lagos, Rio, and Sydney!',
    cost: 120,
    primaryColor: '#059669',
    trimColor: '#fef08a',
  },
  {
    id: 'outfit_starlight_legend',
    slot: 'outfit',
    name: 'North Star Grand Robe',
    description: 'Enchanted royal-violet cloak spun with glowing golden thread.',
    cost: 160,
    primaryColor: '#6d28d9',
    trimColor: '#fde047',
  },

  // Sleigh & Footstep Trails (7)
  {
    id: 'sleigh_crimson',
    slot: 'sleigh',
    name: 'Crimson Candy Trail',
    description: 'Leaves warm festive sparkles in the snow behind Santa.',
    cost: 0,
    primaryColor: '#ef4444',
    trimColor: '#fde68a',
  },
  {
    id: 'sleigh_frost_comet',
    slot: 'sleigh',
    name: 'Ice Crystal Comet',
    description: 'Twinkling glacier-blue snow crystals trailing Santa’s boots.',
    cost: 55,
    primaryColor: '#0ea5e9',
    trimColor: '#e0f2fe',
  },
  {
    id: 'sleigh_starlight',
    slot: 'sleigh',
    name: 'Starlight Gold Trail',
    description: 'Golden stardust shimmer that illuminates every corner.',
    cost: 75,
    primaryColor: '#f59e0b',
    trimColor: '#fef9c3',
  },
  {
    id: 'sleigh_peppermint_spark',
    slot: 'sleigh',
    name: 'Peppermint Sparkle',
    description: 'Swirling candy-pink and frosted-white holiday embers.',
    cost: 80,
    primaryColor: '#f43f5e',
    trimColor: '#ffffff',
  },
  {
    id: 'sleigh_emerald_magic',
    slot: 'sleigh',
    name: 'Evergreen Elf Dust',
    description: 'Enchanted woodland emerald and bright mint sparkles.',
    cost: 95,
    primaryColor: '#10b981',
    trimColor: '#bef264',
  },
  {
    id: 'sleigh_aurora',
    slot: 'sleigh',
    name: 'Aurora Borealis Trail',
    description: 'Swirling teal and emerald ribbons of northern light.',
    cost: 110,
    primaryColor: '#14b8a6',
    trimColor: '#a7f3d0',
  },
  {
    id: 'sleigh_rainbow_prism',
    slot: 'sleigh',
    name: 'Holiday Prism Glow',
    description: 'Royal violet and golden starlight sparks from Santa’s sleigh.',
    cost: 145,
    primaryColor: '#a855f7',
    trimColor: '#fde047',
  },

  // Reindeer Gear (7)
  {
    id: 'reindeer_bells',
    slot: 'reindeer',
    name: 'Classic Sleigh Bells',
    description: 'Polished brass harness bells for your trusty reindeer companion.',
    cost: 0,
    primaryColor: '#d97706',
    trimColor: '#fde047',
  },
  {
    id: 'reindeer_frost_collar',
    slot: 'reindeer',
    name: 'Sapphire Frost Collar',
    description: 'Shimmering ice-blue collar and crystalline snowflake medallion.',
    cost: 50,
    primaryColor: '#0284c7',
    trimColor: '#bae6fd',
  },
  {
    id: 'reindeer_red_nose',
    slot: 'reindeer',
    name: 'Glowing Beacon Nose',
    description: 'Bright ruby glow that guides Santa through foggy alleys.',
    cost: 65,
    primaryColor: '#f43f5e',
    trimColor: '#fecdd3',
  },
  {
    id: 'reindeer_gold_crown',
    slot: 'reindeer',
    name: 'Golden Star Antlers',
    description: 'Gleaming 24k North Pole antlers crowned with a golden crest.',
    cost: 85,
    primaryColor: '#eab308',
    trimColor: '#fef9c3',
  },
  {
    id: 'reindeer_candy_antlers',
    slot: 'reindeer',
    name: 'Peppermint Antler Ribbons',
    description: 'Striped candy ribbons and star ornaments on golden antlers.',
    cost: 100,
    primaryColor: '#ec4899',
    trimColor: '#ffffff',
  },
  {
    id: 'reindeer_emerald_cape',
    slot: 'reindeer',
    name: 'Elf Helper Saddle',
    description: 'Festive evergreen velvet saddle blanket stitched with gold.',
    cost: 115,
    primaryColor: '#059669',
    trimColor: '#fde68a',
  },
  {
    id: 'reindeer_cosmic_halo',
    slot: 'reindeer',
    name: 'Aurora Halo Harness',
    description: 'Enchanted starlight harness and glowing aurora antlers.',
    cost: 150,
    primaryColor: '#8b5cf6',
    trimColor: '#5eead4',
  },

  // Workshop Perks & Gadgets (6)
  {
    id: 'gear_standard_bell',
    slot: 'gear',
    name: 'Standard Sleigh Bell',
    description: 'Reliable brass workshop bell carried on every Christmas mission.',
    perkLabel: 'Standard Issue',
    cost: 0,
    primaryColor: '#64748b',
    trimColor: '#e2e8f0',
  },
  {
    id: 'gear_muffled_slippers',
    slot: 'gear',
    name: 'Velvet Sneak Slippers',
    description: 'Padded elf-wool soles muffle noisy marble and wooden hallways.',
    perkLabel: '-25% Footstep Noise',
    cost: 55,
    primaryColor: '#0ea5e9',
    trimColor: '#bae6fd',
  },
  {
    id: 'gear_cookie_magnet',
    slot: 'gear',
    name: 'Gingerbread Magnet',
    description: 'Enchanted pastry charm pulls nearby cookies and presents closer.',
    perkLabel: '+55% Cookie Pickup Range',
    cost: 80,
    primaryColor: '#f59e0b',
    trimColor: '#fef3c7',
  },
  {
    id: 'gear_jingle_boots',
    slot: 'gear',
    name: 'Turbo Dash Boots',
    description: 'Spring-loaded sleigh boots boost pace and recharge Snow Dodge faster.',
    perkLabel: '+12% Speed & +35% Dash Recharge',
    cost: 105,
    primaryColor: '#ef4444',
    trimColor: '#fde047',
  },
  {
    id: 'gear_extra_heart',
    slot: 'gear',
    name: 'Hearty Cocoa Flask',
    description: 'Warm North Pole cocoa grants +1 extra Sleigh Heart on every mission.',
    perkLabel: '+1 Max Sleigh Heart (4 Hearts)',
    cost: 135,
    primaryColor: '#ec4899',
    trimColor: '#fbcfe8',
  },
  {
    id: 'gear_stealth_cloak',
    slot: 'gear',
    name: 'Shadow Elf Cloak',
    description: 'Woven stealth fabric slows guard detection and speeds gadget recharge.',
    perkLabel: '-30% Suspicion & +25% Gadget Recharge',
    cost: 170,
    primaryColor: '#6366f1',
    trimColor: '#c7d2fe',
  },
];

export interface GearBonuses {
  speedMultiplier: number;
  dashRechargeMultiplier: number;
  noiseMultiplier: number;
  pickupRadiusMultiplier: number;
  suspicionMultiplier: number;
  abilityCooldownMultiplier: number;
  maxHearts: number;
}

export function getGearBonuses(gearId: string | undefined): GearBonuses {
  return {
    speedMultiplier: gearId === 'gear_jingle_boots' ? 1.12 : 1,
    dashRechargeMultiplier: gearId === 'gear_jingle_boots' ? 1.35 : 1,
    noiseMultiplier: gearId === 'gear_muffled_slippers' ? 0.75 : 1,
    pickupRadiusMultiplier: gearId === 'gear_cookie_magnet' ? 1.55 : 1,
    suspicionMultiplier: gearId === 'gear_stealth_cloak' ? 0.7 : 1,
    abilityCooldownMultiplier: gearId === 'gear_stealth_cloak' ? 1.25 : 1,
    maxHearts: gearId === 'gear_extra_heart' ? 4 : 3,
  };
}

export function createDefaultProgress(): PlayerProgress {
  return {
    unlockedLevelIndex: 0,
    coins: 25,
    difficulty: 'easy',
    levelRecords: {},
    ownedCosmetics: ['outfit_classic', 'sleigh_crimson', 'reindeer_bells', 'gear_standard_bell'],
    equippedCosmetics: {
      outfit: 'outfit_classic',
      sleigh: 'sleigh_crimson',
      reindeer: 'reindeer_bells',
      gear: 'gear_standard_bell',
    },
    settings: {
      muted: false,
      musicVolume: 0.45,
      sfxVolume: 0.7,
      mobileJoystick: 'auto',
      reducedMotion: false,
      theme: 'dark',
    },
    dailyMissions: generateDailyMissions(),
  };
}

export function parseProgress(raw: string | null): PlayerProgress {
  const def = createDefaultProgress();
  if (!raw) return def;
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      unlockedLevelIndex:
        typeof parsed.unlockedLevelIndex === 'number'
          ? Math.max(0, Math.min(TOTAL_LEVELS - 1, parsed.unlockedLevelIndex))
          : def.unlockedLevelIndex,
      coins: typeof parsed.coins === 'number' ? Math.max(0, parsed.coins) : def.coins,
      difficulty:
        parsed.difficulty === 'easy' || parsed.difficulty === 'medium' || parsed.difficulty === 'hard'
          ? parsed.difficulty
          : def.difficulty,
      levelRecords: parsed.levelRecords && typeof parsed.levelRecords === 'object' ? parsed.levelRecords : {},
      ownedCosmetics: Array.isArray(parsed.ownedCosmetics)
        ? Array.from(new Set([...def.ownedCosmetics, ...parsed.ownedCosmetics]))
        : def.ownedCosmetics,
      equippedCosmetics: {
        outfit: parsed.equippedCosmetics?.outfit ?? def.equippedCosmetics.outfit,
        sleigh: parsed.equippedCosmetics?.sleigh ?? def.equippedCosmetics.sleigh,
        reindeer: parsed.equippedCosmetics?.reindeer ?? def.equippedCosmetics.reindeer,
        gear: parsed.equippedCosmetics?.gear ?? def.equippedCosmetics.gear,
      },
      settings: {
        muted: Boolean(parsed.settings?.muted),
        musicVolume:
          typeof parsed.settings?.musicVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.settings.musicVolume))
            : def.settings.musicVolume,
        sfxVolume:
          typeof parsed.settings?.sfxVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.settings.sfxVolume))
            : def.settings.sfxVolume,
        mobileJoystick:
          parsed.settings?.mobileJoystick === 'on' ||
          parsed.settings?.mobileJoystick === 'off' ||
          parsed.settings?.mobileJoystick === 'auto'
            ? parsed.settings.mobileJoystick
            : def.settings.mobileJoystick,
        reducedMotion: Boolean(parsed.settings?.reducedMotion),
        theme: parsed.settings?.theme === 'light' ? 'light' : 'dark',
      },
      dailyMissions: syncDailyMissions(parsed.dailyMissions),
    };
  } catch {
    return def;
  }
}

export function loadPlayerProgress(): PlayerProgress {
  if (typeof window === 'undefined') return createDefaultProgress();
  try {
    return parseProgress(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return createDefaultProgress();
  }
}

export function savePlayerProgress(progress: PlayerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function buyCosmetic(progress: PlayerProgress, itemId: string): {
  progress: PlayerProgress;
  purchased: boolean;
} {
  const item = COSMETICS.find((c) => c.id === itemId);
  if (!item) return { progress, purchased: false };
  if (progress.ownedCosmetics.includes(itemId)) {
    return {
      progress: equipCosmetic(progress, itemId),
      purchased: false,
    };
  }
  if (progress.coins < item.cost) {
    return { progress, purchased: false };
  }
  const updated: PlayerProgress = {
    ...progress,
    coins: progress.coins - item.cost,
    ownedCosmetics: [...progress.ownedCosmetics, itemId],
    equippedCosmetics: {
      ...progress.equippedCosmetics,
      [item.slot]: itemId,
    },
  };
  return { progress: updated, purchased: true };
}

export function equipCosmetic(progress: PlayerProgress, itemId: string): PlayerProgress {
  const item = COSMETICS.find((c) => c.id === itemId);
  if (!item || !progress.ownedCosmetics.includes(itemId)) return progress;
  return {
    ...progress,
    equippedCosmetics: {
      ...progress.equippedCosmetics,
      [item.slot]: itemId,
    },
  };
}

export function isTileSolid(tile: TileKind | undefined, hasWings = false): boolean {
  if (!tile) return true;
  if (tile === 'wall') return true;
  if (tile === 'secret_wall') return true;
  if (tile === 'candy_barrier') return !hasWings;
  return false;
}

export function circleIntersectsGrid(
  grid: TileKind[][],
  cx: number,
  cy: number,
  radius: number,
  hasWings = false
): boolean {
  const minTx = Math.floor(cx - radius);
  const maxTx = Math.floor(cx + radius);
  const minTy = Math.floor(cy - radius);
  const maxTy = Math.floor(cy + radius);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = grid[ty]?.[tx];
      if (!isTileSolid(tile, hasWings)) continue;
      // Closest point on tile AABB [tx, tx+1] x [ty, ty+1]
      const closestX = Math.max(tx, Math.min(cx, tx + 1));
      const closestY = Math.max(ty, Math.min(cy, ty + 1));
      const dx = cx - closestX;
      const dy = cy - closestY;
      if (dx * dx + dy * dy < radius * radius) {
        return true;
      }
    }
  }
  return false;
}

export function moveWithWallCollision(
  grid: TileKind[][],
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  hasWings = false
): { x: number; y: number; hitWall: boolean } {
  let nx = x;
  let ny = y;
  let hitWall = false;

  // Resolve X axis first
  if (dx !== 0) {
    const candX = nx + dx;
    if (!circleIntersectsGrid(grid, candX, ny, radius, hasWings)) {
      nx = candX;
    } else {
      hitWall = true;
      // Nudge gently toward open tile center vertically if corner-clipping
      const tileCenterY = Math.floor(ny) + 0.5;
      const nudge = Math.sign(tileCenterY - ny) * Math.min(Math.abs(dx) * 0.55, Math.abs(tileCenterY - ny));
      if (nudge !== 0 && !circleIntersectsGrid(grid, candX, ny + nudge, radius, hasWings)) {
        nx = candX;
        ny += nudge;
        hitWall = false;
      }
    }
  }

  // Resolve Y axis second
  if (dy !== 0) {
    const candY = ny + dy;
    if (!circleIntersectsGrid(grid, nx, candY, radius, hasWings)) {
      ny = candY;
    } else {
      hitWall = true;
      const tileCenterX = Math.floor(nx) + 0.5;
      const nudge = Math.sign(tileCenterX - nx) * Math.min(Math.abs(dy) * 0.55, Math.abs(tileCenterX - nx));
      if (nudge !== 0 && !circleIntersectsGrid(grid, nx + nudge, candY, radius, hasWings)) {
        ny = candY;
        nx += nudge;
        hitWall = false;
      }
    }
  }

  return { x: nx, y: ny, hitWall };
}

export function isPortalUnlocked(
  realCookiesCollected: number,
  requiredCookies: number,
  deliveriesCompleted: number,
  requiredDeliveries: number,
  gateKeysHeld = 0,
  requiredGateKeys = 0,
  missionCleared = false
): boolean {
  const keysOk = gateKeysHeld >= requiredGateKeys;
  if (!keysOk) return false;
  if (missionCleared) return true;
  return realCookiesCollected >= requiredCookies && deliveriesCompleted >= requiredDeliveries;
}

export function canDeliverToHouse(house: DeliveryHouse, heldKeyIds: Set<string>): boolean {
  if (house.delivered) return false;
  if (house.requiresKeyId && !heldKeyIds.has(house.requiresKeyId)) {
    return false;
  }
  return true;
}

export function getFakeCookiePenalty(kind: FakeCookieKind): {
  label: string;
  slowDuration: number;
  slowFactor: number;
  niceDelta: number;
  scoreDelta: number;
  bounceBack: boolean;
} {
  switch (kind) {
    case 'prank_boom':
      return {
        label: 'POOF! Confetti Prank Cookie!',
        slowDuration: 1.6,
        slowFactor: 0.55,
        niceDelta: -6,
        scoreDelta: -25,
        bounceBack: true,
      };
    case 'cardboard':
      return {
        label: 'Yuck! Painted Cardboard Cookie!',
        slowDuration: 1.2,
        slowFactor: 0.65,
        niceDelta: -4,
        scoreDelta: -15,
        bounceBack: false,
      };
    case 'vanishing':
      return {
        label: 'Whoa! Vanishing Trick Cookie!',
        slowDuration: 0.8,
        slowFactor: 0.8,
        niceDelta: -3,
        scoreDelta: -10,
        bounceBack: false,
      };
    case 'frozen':
      return {
        label: 'BRRR! Frozen Brain-Freeze Cookie!',
        slowDuration: 2.5,
        slowFactor: 0.42,
        niceDelta: -5,
        scoreDelta: -20,
        bounceBack: false,
      };
    case 'elf_morph':
      return {
        label: 'Hehe! Mischievous Prankster Elf!',
        slowDuration: 1.8,
        slowFactor: 0.5,
        niceDelta: -6,
        scoreDelta: -25,
        bounceBack: true,
      };
    case 'spring_trap':
      return {
        label: 'BOING! Spring-Loaded Surprise!',
        slowDuration: 1.4,
        slowFactor: 0.6,
        niceDelta: -5,
        scoreDelta: -20,
        bounceBack: true,
      };
  }
}

export function getPowerUpInfo(kind: PowerUpKind): {
  name: string;
  effect: string;
  duration: number;
} {
  switch (kind) {
    case 'magical_milk':
      return { name: 'Magical Milk', effect: 'Boosts speed', duration: 9 };
    case 'reindeer_dash':
      return { name: 'Reindeer Dash', effect: 'Burst dash ready', duration: 10 };
    case 'snowflake_shield':
      return { name: 'Snowflake Shield', effect: 'Blocks 1 trap', duration: 30 };
    case 'golden_compass':
      return { name: 'Golden Compass', effect: 'Points to objective', duration: 14 };
    case 'magic_lantern':
      return { name: 'Magic Lantern', effect: 'Reveals fake cookies & secrets', duration: 12 };
    case 'elf_helper':
      return { name: 'Elf Helper', effect: 'Auto-collects nearby cookies', duration: 11 };
    case 'christmas_wings':
      return { name: 'Christmas Wings', effect: 'Glide over small barriers', duration: 10 };
  }
}

export function createEmptyPowerUps(): ActivePowerUps {
  return {
    magical_milk: 0,
    reindeer_dash: 0,
    snowflake_shield: 0,
    golden_compass: 0,
    magic_lantern: 0,
    elf_helper: 0,
    christmas_wings: 0,
  };
}

export function getTrapPadState(
  elapsedSeconds: number,
  phaseOffset: number,
  cycleSeconds: number
): 'safe' | 'warning' | 'active' {
  const t = ((elapsedSeconds + phaseOffset) % cycleSeconds + cycleSeconds) % cycleSeconds;
  const ratio = t / cycleSeconds;
  if (ratio < 0.45) return 'safe';
  if (ratio < 0.68) return 'warning';
  return 'active';
}

export function calculateLevelSummary(params: {
  cityIndex: number;
  cityName: string;
  difficulty: Difficulty;
  baseScore: number;
  realCookiesCollected: number;
  requiredCookies: number;
  deliveriesCompleted: number;
  requiredDeliveries: number;
  trapsTriggered: number;
  secretRoomsFound: number;
  goldenPresentFound: boolean;
  elfHelped: boolean;
  niceMeter: number;
  elapsedSeconds: number;
  won: boolean;
  defeatReason?: 'timeout' | 'hearts';
}): LevelScoreSummary {
  const diffMult = params.difficulty === 'easy' ? 1 : params.difficulty === 'medium' ? 1.25 : 1.5;
  const speedBonus = params.won ? Math.max(0, Math.round((150 - params.elapsedSeconds) * 4)) : 0;
  const niceBonus = params.won ? Math.round(params.niceMeter * 3) : 0;
  const secretBonus = params.secretRoomsFound * 150 + (params.goldenPresentFound ? 250 : 0) + (params.elfHelped ? 100 : 0);
  const totalScore = Math.max(0, Math.round((params.baseScore + speedBonus + niceBonus + secretBonus) * diffMult));

  let stars: 1 | 2 | 3 = 1;
  if (params.won) {
    if (params.niceMeter >= 82 && params.trapsTriggered <= 1 && params.elapsedSeconds <= 115) {
      stars = 3;
    } else if (params.niceMeter >= 65 && params.trapsTriggered <= 3) {
      stars = 2;
    }
  }

  const coinsEarned = params.won
    ? Math.round(20 + stars * 12 + params.secretRoomsFound * 10 + (params.goldenPresentFound ? 15 : 0))
    : Math.max(5, Math.round(params.deliveriesCompleted * 4));

  return {
    cityIndex: params.cityIndex,
    cityName: params.cityName,
    difficulty: params.difficulty,
    score: totalScore,
    stars,
    coinsEarned,
    realCookiesCollected: params.realCookiesCollected,
    requiredCookies: params.requiredCookies,
    deliveriesCompleted: params.deliveriesCompleted,
    requiredDeliveries: params.requiredDeliveries,
    trapsTriggered: params.trapsTriggered,
    secretRoomsFound: params.secretRoomsFound,
    goldenPresentFound: params.goldenPresentFound,
    elfHelped: params.elfHelped,
    niceMeter: Math.max(0, Math.min(100, Math.round(params.niceMeter))),
    elapsedSeconds: Math.round(params.elapsedSeconds),
    won: params.won,
    defeatReason: params.won ? undefined : params.defeatReason ?? 'timeout',
  };
}
