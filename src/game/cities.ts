import {
  ChimneyLink,
  CityDefinition,
  CookieItem,
  DeliveryHouse,
  Difficulty,
  FakeCookieKind,
  GoldenPresent,
  HidingSpot,
  HidingSpotKind,
  KeyItem,
  LaserBarrier,
  LevelInstance,
  MovingHazard,
  MysteryElf,
  PowerUpKind,
  PowerUpPickup,
  RealCookieKind,
  SecretSwitch,
  SecurityCamera,
  StaticProp,
  StealthEnemy,
  TileKind,
  TrapKind,
  Vec2,
} from './types';

function isStandardFloorTile(t: TileKind | undefined): boolean {
  return (
    t === 'floor' ||
    t === 'ice' ||
    t === 'carpet' ||
    t === 'wood' ||
    t === 'shadow' ||
    t === 'toy_floor' ||
    t === 'metal'
  );
}

export const LEVELS_PER_CITY = 20;
export const TOTAL_LEVELS = 200;

export interface LevelMetaInfo {
  levelIndex: number;
  levelNumber: number;
  cityIndex: number;
  stageInCity: number;
  city: CityDefinition;
  displayTitle: string;
  stageLabel: string;
  nextLevelLabel: string;
}

export const CITIES: CityDefinition[] = [
  {
    index: 0,
    id: 'north-pole',
    city: 'North Pole',
    country: "Santa's Workshop",
    subtitle: 'Snowy Toy Village & Candy Bridges',
    landmarkName: 'Grand Workshop Spire',
    nextCityLabel: 'New York, USA',
    description:
      'Start your sleigh run in the snowy North Pole! Collect real magic cookies, deliver gifts to elf cottages, and step into the portal.',
    tutorialHint: 'Use WASD or Arrow Keys to guide Santa. Press Space near glowing houses or for a quick dash!',
    hasCountdown: false,
    countdownSeconds: 0,
    baseCols: 21,
    baseRows: 17,
    requiredCookies: 8,
    totalRealCookies: 14,
    fakeCookieCount: 3,
    requiredDeliveries: 3,
    movingHazardCount: 2,
    powerUpCount: 3,
    hazardTheme: 'snowmen',
    musicMotif: 'north_pole',
    palette: {
      skyTop: '#0f172a',
      skyBottom: '#1e3a8a',
      floorPrimary: '#dceeff',
      floorSecondary: '#cce2f8',
      wallTop: '#ffffff',
      wallFront: '#7ea6cc',
      wallTrim: '#dc2626',
      accent: '#f59e0b',
      lightGlow: '#fef08a',
      particleColor: '#ffffff',
      weather: 'snow',
    },
  },
  {
    index: 1,
    id: 'new-york',
    city: 'New York',
    country: 'USA',
    subtitle: 'The Christmas City & Central Park',
    landmarkName: 'Rockefeller Tree Plaza',
    nextCityLabel: 'London, UK',
    description:
      'Weave past Central Park snowdrifts, glowing brownstones, and zippy yellow taxis rushing through Midtown.',
    hasCountdown: true,
    countdownSeconds: 170,
    baseCols: 23,
    baseRows: 17,
    requiredCookies: 10,
    totalRealCookies: 16,
    fakeCookieCount: 5,
    requiredDeliveries: 4,
    movingHazardCount: 4,
    powerUpCount: 4,
    hazardTheme: 'taxis',
    musicMotif: 'new_york',
    palette: {
      skyTop: '#0f172a',
      skyBottom: '#1e293b',
      floorPrimary: '#e2e8f0',
      floorSecondary: '#cbd5e1',
      wallTop: '#78350f',
      wallFront: '#451a03',
      wallTrim: '#dc2626',
      accent: '#facc15',
      lightGlow: '#fef08a',
      particleColor: '#ffffff',
      weather: 'snow',
    },
  },
  {
    index: 2,
    id: 'london',
    city: 'London',
    country: 'UK',
    subtitle: 'The Royal Christmas Maze',
    landmarkName: 'Big Ben & Red Phone Boxes',
    nextCityLabel: 'Paris, France',
    description:
      'Navigate misty cobblestone lanes past Big Ben, classic red phone boxes, and a secret royal courtyard delivery.',
    hasCountdown: true,
    countdownSeconds: 175,
    baseCols: 23,
    baseRows: 19,
    requiredCookies: 11,
    totalRealCookies: 17,
    fakeCookieCount: 5,
    requiredDeliveries: 4,
    movingHazardCount: 4,
    powerUpCount: 4,
    hazardTheme: 'guards',
    musicMotif: 'london',
    palette: {
      skyTop: '#0f172a',
      skyBottom: '#1e293b',
      floorPrimary: '#e2e8f0',
      floorSecondary: '#cbd5e1',
      wallTop: '#64748b',
      wallFront: '#334155',
      wallTrim: '#dc2626',
      accent: '#f59e0b',
      lightGlow: '#fde047',
      particleColor: '#cbd5e1',
      weather: 'snow',
    },
  },
  {
    index: 3,
    id: 'paris',
    city: 'Paris',
    country: 'France',
    subtitle: 'The City of Christmas Lights',
    landmarkName: 'Eiffel Tower Boulevard',
    nextCityLabel: 'Lagos, Nigeria',
    description:
      'Stroll illuminated boulevards and cozy Christmas cafes beneath the sparkling Eiffel Tower while dodging clever kid traps.',
    hasCountdown: true,
    countdownSeconds: 180,
    baseCols: 25,
    baseRows: 19,
    requiredCookies: 12,
    totalRealCookies: 18,
    fakeCookieCount: 6,
    requiredDeliveries: 4,
    movingHazardCount: 5,
    powerUpCount: 4,
    hazardTheme: 'cafes',
    musicMotif: 'paris',
    palette: {
      skyTop: '#1e1b4b',
      skyBottom: '#312e81',
      floorPrimary: '#f8fafc',
      floorSecondary: '#e2e8f0',
      wallTop: '#e2e8f0',
      wallFront: '#78716c',
      wallTrim: '#d97706',
      accent: '#f59e0b',
      lightGlow: '#fef08a',
      particleColor: '#fef08a',
      weather: 'gold_spark',
    },
  },
  {
    index: 4,
    id: 'lagos',
    city: 'Lagos',
    country: 'Nigeria',
    subtitle: 'Christmas in the Tropics',
    landmarkName: 'Festive Waterfront Market',
    nextCityLabel: 'Tokyo, Japan',
    description:
      'Celebrate vibrant Lagos streets lined with colourful decorations, lively Christmas markets, palm trees, and rooftop gifts!',
    hasCountdown: true,
    countdownSeconds: 185,
    baseCols: 25,
    baseRows: 19,
    requiredCookies: 12,
    totalRealCookies: 19,
    fakeCookieCount: 6,
    requiredDeliveries: 5,
    movingHazardCount: 5,
    powerUpCount: 4,
    hazardTheme: 'carnival',
    musicMotif: 'lagos',
    palette: {
      skyTop: '#064e3b',
      skyBottom: '#047857',
      floorPrimary: '#fef3c7',
      floorSecondary: '#fde68a',
      wallTop: '#b45309',
      wallFront: '#78350f',
      wallTrim: '#059669',
      accent: '#10b981',
      lightGlow: '#fef08a',
      particleColor: '#fde68a',
      weather: 'petals',
    },
  },
  {
    index: 5,
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    subtitle: 'The Neon Christmas Maze',
    landmarkName: 'Shibuya Winter Lights',
    nextCityLabel: 'Rio de Janeiro, Brazil',
    description:
      'Dash through radiant Tokyo illuminations and multi-route alleyways while outsmarting patrolling holiday drones.',
    hasCountdown: true,
    countdownSeconds: 190,
    baseCols: 27,
    baseRows: 19,
    requiredCookies: 14,
    totalRealCookies: 20,
    fakeCookieCount: 7,
    requiredDeliveries: 5,
    movingHazardCount: 6,
    powerUpCount: 4,
    hazardTheme: 'drones',
    musicMotif: 'tokyo',
    palette: {
      skyTop: '#090d16',
      skyBottom: '#111827',
      floorPrimary: '#334155',
      floorSecondary: '#1e293b',
      wallTop: '#475569',
      wallFront: '#1e293b',
      wallTrim: '#06b6d4',
      accent: '#ec4899',
      lightGlow: '#67e8f9',
      particleColor: '#38bdf8',
      weather: 'neon_rain',
    },
  },
  {
    index: 6,
    id: 'rio',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    subtitle: 'A Tropical Christmas',
    landmarkName: 'Copacabana Star Tree',
    nextCityLabel: 'Sydney, Australia',
    description:
      'Deliver presents along sunny beachfront avenues, palm-fringed plazas, and colourful carnival Christmas alleys.',
    hasCountdown: true,
    countdownSeconds: 190,
    baseCols: 27,
    baseRows: 21,
    requiredCookies: 14,
    totalRealCookies: 21,
    fakeCookieCount: 7,
    requiredDeliveries: 5,
    movingHazardCount: 6,
    powerUpCount: 5,
    hazardTheme: 'carnival',
    musicMotif: 'rio',
    palette: {
      skyTop: '#064e3b',
      skyBottom: '#0d9488',
      floorPrimary: '#fef3c7',
      floorSecondary: '#fde68a',
      wallTop: '#059669',
      wallFront: '#065f46',
      wallTrim: '#f59e0b',
      accent: '#10b981',
      lightGlow: '#fef08a',
      particleColor: '#86efac',
      weather: 'petals',
    },
  },
  {
    index: 7,
    id: 'sydney',
    city: 'Sydney',
    country: 'Australia',
    subtitle: 'Summer Christmas Harbour',
    landmarkName: 'Harbour Sails & Beach',
    nextCityLabel: 'Dubai, UAE',
    description:
      'Cross sunny coastal boardwalks and beachside cottages decorated with surfboards and glittering holiday wreaths.',
    hasCountdown: true,
    countdownSeconds: 195,
    baseCols: 27,
    baseRows: 21,
    requiredCookies: 15,
    totalRealCookies: 22,
    fakeCookieCount: 8,
    requiredDeliveries: 5,
    movingHazardCount: 6,
    powerUpCount: 5,
    hazardTheme: 'beach',
    musicMotif: 'sydney',
    palette: {
      skyTop: '#0c4a6e',
      skyBottom: '#0284c7',
      floorPrimary: '#fef3c7',
      floorSecondary: '#fde68a',
      wallTop: '#e0f2fe',
      wallFront: '#0369a1',
      wallTrim: '#f97316',
      accent: '#38bdf8',
      lightGlow: '#fef08a',
      particleColor: '#fde047',
      weather: 'gold_spark',
    },
  },
  {
    index: 8,
    id: 'dubai',
    city: 'Dubai',
    country: 'UAE',
    subtitle: 'The Golden Christmas',
    landmarkName: 'Golden Skyscraper Spire',
    nextCityLabel: 'Global Christmas Finale',
    description:
      'Master intricate rooftop chimney routes and gilded skyscraper corridors sparkling with golden Christmas ornaments.',
    hasCountdown: true,
    countdownSeconds: 205,
    baseCols: 29,
    baseRows: 21,
    requiredCookies: 16,
    totalRealCookies: 24,
    fakeCookieCount: 9,
    requiredDeliveries: 6,
    movingHazardCount: 7,
    powerUpCount: 5,
    hazardTheme: 'towers',
    musicMotif: 'dubai',
    palette: {
      skyTop: '#18181b',
      skyBottom: '#27272a',
      floorPrimary: '#fef3c7',
      floorSecondary: '#fde68a',
      wallTop: '#d97706',
      wallFront: '#78350f',
      wallTrim: '#f59e0b',
      accent: '#facc15',
      lightGlow: '#fef08a',
      particleColor: '#fde047',
      weather: 'gold_spark',
    },
  },
  {
    index: 9,
    id: 'final-mission',
    city: 'Global Finale',
    country: 'World Mission',
    subtitle: 'The Final Christmas Delivery',
    landmarkName: 'Aurora Grand Portal',
    nextCityLabel: 'Christmas Morning Saved!',
    description:
      'One grand interconnected world maze before dawn! Gather the magic cookies, outsmart every prankster trap, and complete the final deliveries.',
    hasCountdown: true,
    countdownSeconds: 240,
    baseCols: 31,
    baseRows: 23,
    requiredCookies: 18,
    totalRealCookies: 28,
    fakeCookieCount: 10,
    requiredDeliveries: 6,
    movingHazardCount: 8,
    powerUpCount: 6,
    hazardTheme: 'finale',
    musicMotif: 'finale',
    palette: {
      skyTop: '#090d16',
      skyBottom: '#1e1b4b',
      floorPrimary: '#dceeff',
      floorSecondary: '#cce2f8',
      wallTop: '#9333ea',
      wallFront: '#581c87',
      wallTrim: '#eab308',
      accent: '#38bdf8',
      lightGlow: '#67e8f9',
      particleColor: '#ffffff',
      weather: 'snow',
    },
  },
];

// Deterministic PRNG so every city+difficulty yields a reproducible, verified layout
function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const REAL_KINDS: RealCookieKind[] = [
  'choc_chip',
  'gingerbread',
  'star',
  'candy_cane',
  'magic_glow',
];

const FAKE_KINDS: FakeCookieKind[] = [
  'prank_boom',
  'cardboard',
  'vanishing',
  'frozen',
  'elf_morph',
  'spring_trap',
];

const POWERUP_KINDS: PowerUpKind[] = [
  'magical_milk',
  'reindeer_dash',
  'snowflake_shield',
  'golden_compass',
  'magic_lantern',
  'elf_helper',
  'christmas_wings',
];

const HOUSE_NAMES: Record<string, string[]> = {
  'north-pole': ['Candy Cottage', 'Tinsel Bakery', 'Elf Post Office', 'Cocoa Cabin'],
  'new-york': ['5th Ave Loft', 'Parkside Brownstone', 'Midtown Terrace', 'Brooklyn Stoop', 'Chelsea Penthouse'],
  london: ['Baker St. Flat', 'Royal Mews', 'Thames Townhouse', 'Kensington Row', 'Soho Bookshop'],
  paris: ['Montmartre Cafe', 'Seine Atelier', 'Boulangerie Lune', 'Champs Balcony', 'Marais Courtyard'],
  lagos: ['Victoria Villa', 'Ikoyi Terrace', 'Lekki Palm House', 'Market Pavilion', 'Marina Loft', 'Surulere Home'],
  tokyo: ['Shibuya Loft', 'Akiba Studio', 'Ginza Gallery', 'Asakusa Inn', 'Harajuku Cafe', 'Ueno Pagoda'],
  rio: ['Ipanema Villa', 'Lapa Casa', 'Botafogo Patio', 'Santa Teresa Home', 'Leblon Terrace', 'Copacabana Loft'],
  sydney: ['Bondi Beach House', 'Harbour Cottage', 'Manly Boathouse', 'Surry Hills Terrace', 'Paddington Villa', 'Rocks Inn'],
  dubai: ['Marina Skydeck', 'Palm Residence', 'Gold Souk Villa', 'Creek Penthouse', 'Jumeirah Courtyard', 'Burj Terrace', 'Oasis Villa'],
  'final-mission': ['Arctic Observatory', 'Atlantic Beacon', 'Alpine Chalet', 'Savanna Lodge', 'Pacific Pavilion', 'Aurora Citadel', 'Starlight Hall'],
};

const ELF_CLUES = [
  'Psst Santa! Watch for fake cookies—cardboard ones look pale and frozen traps shimmer blue!',
  'I marked the secret wall switch on your path—flip it to unlock a hidden room of treasures!',
  'Use Spacebar near a rooftop chimney to zip straight across maze walls!',
  'Collect the Golden Compass or Magic Lantern to spot hidden routes and deliveries fast!',
];

export function bfsDistances(
  grid: TileKind[][],
  start: Vec2,
  options?: { allowSecret?: boolean; blockedSet?: Set<string>; chimneys?: ChimneyLink[] }
): Map<string, number> {
  const rows = grid.length;
  const cols = grid[0].length;
  const dist = new Map<string, number>();
  const key = (x: number, y: number) => `${x},${y}`;
  const isPassable = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
    if (options?.blockedSet?.has(key(x, y))) return false;
    const t = grid[y][x];
    if (isStandardFloorTile(t)) return true;
    if (options?.allowSecret && (t === 'secret_floor' || t === 'secret_wall')) return true;
    return false;
  };

  if (!isPassable(start.x, start.y)) return dist;
  const queue: Vec2[] = [start];
  dist.set(key(start.x, start.y), 0);

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const d = dist.get(key(cur.x, cur.y))!;
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const dir of dirs) {
      const nx = cur.x + dir.x;
      const ny = cur.y + dir.y;
      const nk = key(nx, ny);
      if (isPassable(nx, ny) && !dist.has(nk)) {
        dist.set(nk, d + 1);
        queue.push({ x: nx, y: ny });
      }
    }
    if (options?.chimneys) {
      for (const ch of options.chimneys) {
        if (cur.x === ch.entryX && cur.y === ch.entryY) {
          const ek = key(ch.exitX, ch.exitY);
          if (isPassable(ch.exitX, ch.exitY) && !dist.has(ek)) {
            dist.set(ek, d + 1);
            queue.push({ x: ch.exitX, y: ch.exitY });
          }
        }
      }
    }
  }
  return dist;
}

export function getCityForLevel(levelIndex: number): CityDefinition {
  const clamped = Math.max(0, Math.min(TOTAL_LEVELS - 1, Math.floor(levelIndex)));
  const cityIdx = Math.min(CITIES.length - 1, Math.floor(clamped / LEVELS_PER_CITY));
  return CITIES[cityIdx];
}

export function getLevelMeta(levelIndex: number): LevelMetaInfo {
  const clamped = Math.max(0, Math.min(TOTAL_LEVELS - 1, Math.floor(levelIndex)));
  const cityIdx = Math.min(CITIES.length - 1, Math.floor(clamped / LEVELS_PER_CITY));
  const stageInCity = (clamped % LEVELS_PER_CITY) + 1;
  const city = CITIES[cityIdx];
  const isFinal = clamped >= TOTAL_LEVELS - 1;
  const nextCity = isFinal ? null : getCityForLevel(clamped + 1);
  const nextStage = ((clamped + 1) % LEVELS_PER_CITY) + 1;
  const nextLevelLabel = isFinal
    ? 'Christmas Morning Saved!'
    : `Level ${clamped + 2} · ${nextCity!.city} (${nextStage}/${LEVELS_PER_CITY})`;
  return {
    levelIndex: clamped,
    levelNumber: clamped + 1,
    cityIndex: cityIdx,
    stageInCity,
    city,
    displayTitle: `Level ${clamped + 1}: ${city.city}`,
    stageLabel: `Stage ${stageInCity}/${LEVELS_PER_CITY}`,
    nextLevelLabel,
  };
}

export function buildCityLevel(levelIndex: number, difficulty: Difficulty): LevelInstance {
  const clampedIdx = Math.max(0, Math.min(TOTAL_LEVELS - 1, Math.floor(levelIndex)));
  const meta = getLevelMeta(clampedIdx);
  const city = meta.city;
  const progressRatio = TOTAL_LEVELS > 1 ? clampedIdx / (TOTAL_LEVELS - 1) : 0;
  const stageRatio = (meta.stageInCity - 1) / Math.max(1, LEVELS_PER_CITY - 1);

  // Friendly, approachable maze sizes scaling smoothly across 200 levels
  const easyColCap = Math.min(25, Math.round(15 + progressRatio * 10));
  const easyRowCap = Math.min(19, Math.round(13 + progressRatio * 6));
  const rawCols =
    difficulty === 'easy'
      ? easyColCap
      : Math.min(29, Math.round(city.baseCols * 0.85 + progressRatio * 6) + (difficulty === 'hard' ? 2 : 0));
  const rawRows =
    difficulty === 'easy'
      ? easyRowCap
      : Math.min(23, Math.round(city.baseRows * 0.85 + progressRatio * 4) + (difficulty === 'hard' ? 2 : 0));
  // Ensure odd dimensions for clean maze carving
  const cols = rawCols % 2 === 0 ? rawCols + 1 : rawCols;
  const rows = rawRows % 2 === 0 ? rawRows + 1 : rawRows;

  const seed = (clampedIdx + 1) * 9173 + (difficulty === 'easy' ? 11 : difficulty === 'medium' ? 37 : 83);
  const rng = createRng(seed);

  // Initialize solid walls
  const grid: TileKind[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'wall' as TileKind)
  );

  // Recursive backtracker on odd coordinates (1, 3, 5, ...)
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack: Vec2[] = [{ x: 1, y: 1 }];
  visited[1][1] = true;
  grid[1][1] = 'floor';

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const neighbors: Array<{ nx: number; ny: number; wx: number; wy: number }> = [];
    const dirs = [
      { dx: 2, dy: 0 },
      { dx: -2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: 0, dy: -2 },
    ];
    for (const { dx, dy } of dirs) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && !visited[ny][nx]) {
        neighbors.push({ nx, ny, wx: curr.x + dx / 2, wy: curr.y + dy / 2 });
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const pick = neighbors[Math.floor(rng() * neighbors.length)];
      visited[pick.ny][pick.nx] = true;
      grid[pick.wy][pick.wx] = 'floor';
      grid[pick.ny][pick.nx] = 'floor';
      stack.push({ x: pick.nx, y: pick.ny });
    }
  }

  // Braid the maze generously: open extra loops so Santa always has easy alternate routes
  const braidRate = difficulty === 'easy' ? 0.34 : difficulty === 'medium' ? 0.25 : 0.18;
  for (let y = 2; y < rows - 2; y++) {
    for (let x = 2; x < cols - 2; x++) {
      if (grid[y][x] !== 'wall') continue;
      const horizOpen = grid[y][x - 1] === 'floor' && grid[y][x + 1] === 'floor' && grid[y - 1][x] === 'wall' && grid[y + 1][x] === 'wall';
      const vertOpen = grid[y - 1][x] === 'floor' && grid[y + 1][x] === 'floor' && grid[y][x - 1] === 'wall' && grid[y][x + 1] === 'wall';
      if ((horizOpen || vertOpen) && rng() < braidRate) {
        grid[y][x] = 'floor';
      }
    }
  }

  // Carve guaranteed >= 2-tile-wide open Santa Spawn Plaza around (1..3, 1..3)
  for (let sy = 1; sy <= 3; sy++) {
    for (let sx = 1; sx <= 3; sx++) {
      grid[sy][sx] = 'floor';
    }
  }
  const spawn: Vec2 = { x: 2, y: 2 };

  // Carve a 3x3 Secret Room in the bottom-left or top-right quadrant separated by a secret_wall
  const srX = cols - 4;
  const srY = 1;
  for (let y = srY; y <= srY + 2; y++) {
    for (let x = srX; x <= srX + 2; x++) {
      grid[y][x] = 'secret_floor';
    }
  }
  // Ensure outer border remains wall and wall separates secret room except one secret_wall door
  for (let y = srY; y <= srY + 3; y++) {
    if (y < rows - 1 && srX - 1 > 0 && !(y === srY + 1)) {
      grid[y][srX - 1] = 'wall';
    }
  }
  for (let x = srX - 1; x <= srX + 2; x++) {
    if (x > 0 && x < cols - 1) {
      grid[srY + 3][x] = 'wall';
    }
  }
  // Secret doorway at (srX - 1, srY + 1), connected to main maze on (srX - 2, srY + 1)
  const secretDoorPos: Vec2 = { x: srX - 1, y: srY + 1 };
  grid[secretDoorPos.y][secretDoorPos.x] = 'secret_wall';
  grid[srY + 1][srX - 2] = 'floor';

  // Ensure a nice rooftop pocket on bottom-left corner reachable by Chimney Link
  const roofX = 1;
  const roofY = rows - 3;
  grid[roofY][roofX] = 'floor';
  grid[roofY][roofX + 1] = 'floor';
  grid[roofY + 1][roofX] = 'floor';
  grid[roofY + 1][roofX + 1] = 'floor';

  // Add some slippery ice patches in cold cities (or medium/hard)
  if (city.palette.weather === 'snow' || difficulty !== 'easy') {
    const iceTarget = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 9;
    let placedIce = 0;
    for (let tries = 0; tries < 80 && placedIce < iceTarget; tries++) {
      const ix = 2 + Math.floor(rng() * (cols - 4));
      const iy = 2 + Math.floor(rng() * (rows - 4));
      if (
        grid[iy][ix] === 'floor' &&
        Math.hypot(ix - spawn.x, iy - spawn.y) > 3.5 &&
        !(ix <= 3 && iy >= rows - 4)
      ) {
        grid[iy][ix] = 'ice';
        placedIce++;
      }
    }
  }

  // Compute main reachable floor tiles from spawn (without secret room)
  const mainDist = bfsDistances(grid, spawn);
  const reachableTiles: Array<{ x: number; y: number; dist: number }> = [];
  mainDist.forEach((d, k) => {
    const [xStr, yStr] = k.split(',');
    const x = Number(xStr);
    const y = Number(yStr);
    if (d >= 3) {
      reachableTiles.push({ x, y, dist: d });
    }
  });
  reachableTiles.sort((a, b) => a.dist - b.dist);

  // Portal placed in the farthest reachable tile (excluding rooftop pocket if isolated)
  const portalCandidate = reachableTiles[reachableTiles.length - 1] ?? { x: cols - 2, y: rows - 2, dist: 10 };
  const portal: Vec2 = { x: portalCandidate.x, y: portalCandidate.y };

  // Track occupied tiles so items don't overlap awkwardly
  const used = new Set<string>([
    `${spawn.x},${spawn.y}`,
    `${portal.x},${portal.y}`,
    `${secretDoorPos.x},${secretDoorPos.y}`,
  ]);
  for (let sx = 1; sx <= 3; sx++) {
    for (let sy = 1; sy <= 3; sy++) {
      used.add(`${sx},${sy}`);
    }
  }

  const pickReachableTile = (minDistFrac: number, maxDistFrac: number): Vec2 | null => {
    if (reachableTiles.length === 0) return null;
    const minIdx = Math.floor(reachableTiles.length * minDistFrac);
    const maxIdx = Math.max(minIdx + 1, Math.floor(reachableTiles.length * maxDistFrac));
    for (let tries = 0; tries < 40; tries++) {
      const idx = minIdx + Math.floor(rng() * Math.max(1, maxIdx - minIdx));
      const cand = reachableTiles[Math.min(reachableTiles.length - 1, idx)];
      const k = `${cand.x},${cand.y}`;
      if (!used.has(k)) {
        used.add(k);
        return { x: cand.x, y: cand.y };
      }
    }
    for (const cand of reachableTiles) {
      const k = `${cand.x},${cand.y}`;
      if (!used.has(k)) {
        used.add(k);
        return { x: cand.x, y: cand.y };
      }
    }
    return null;
  };

  // Chimney link from mid-maze to rooftop or distant roof terrace
  const chimneys: ChimneyLink[] = [];
  const roofHousePos: Vec2 = { x: roofX, y: roofY + 1 };
  const chimneyExitPos: Vec2 = { x: roofX + 1, y: roofY };
  const chimneyEntryTile = pickReachableTile(0.25, 0.55);
  if (chimneyEntryTile) {
    chimneys.push({
      id: 'chimney-1',
      entryX: chimneyEntryTile.x,
      entryY: chimneyEntryTile.y,
      exitX: chimneyExitPos.x,
      exitY: chimneyExitPos.y,
    });
    used.add(`${chimneyExitPos.x},${chimneyExitPos.y}`);
    used.add(`${roofHousePos.x},${roofHousePos.y}`);
  }

  // Re-run BFS with chimneys so rooftop tiles are included cleanly
  const fullDist = bfsDistances(grid, spawn, { chimneys });
  const roofReachable = fullDist.has(`${roofHousePos.x},${roofHousePos.y}`);

  // Secret Switch placed in reachable mid-maze to unlock secret_wall
  const switches: SecretSwitch[] = [];
  const switchTile = pickReachableTile(0.2, 0.6);
  if (switchTile) {
    switches.push({
      id: 'secret-switch-1',
      x: switchTile.x,
      y: switchTile.y,
      activated: false,
      unlocksTiles: [secretDoorPos],
    });
  }

  // Delivery Houses (easier target counts early & roomy scaling)
  const houseNames = HOUSE_NAMES[city.id] ?? ['Holiday Cottage', 'Starlight Home', 'Festive Manor', 'Snowy Villa'];
  const houses: DeliveryHouse[] = [];
  const keys: KeyItem[] = [];
  const reqDeliveries =
    difficulty === 'easy'
      ? Math.min(4, 2 + Math.floor(progressRatio * 2.5))
      : Math.min(5, 2 + Math.floor(progressRatio * 3) + (difficulty === 'hard' ? 1 : 0));

  for (let i = 0; i < reqDeliveries; i++) {
    if (i === reqDeliveries - 1 && roofReachable && clampedIdx >= 3) {
      // Rooftop chimney delivery
      houses.push({
        id: `house-${i}`,
        x: roofHousePos.x,
        y: roofHousePos.y,
        name: houseNames[i % houseNames.length] + ' (Rooftop)',
        type: 'rooftop_chimney',
        delivered: false,
        lightProgress: 0,
      });
      continue;
    }

    const fracStart = 0.15 + (i / reqDeliveries) * 0.65;
    const pos = pickReachableTile(fracStart, Math.min(0.95, fracStart + 0.22));
    if (!pos) continue;

    if (i === 1 && clampedIdx >= 5) {
      // Locked by key! Place key closer to spawn
      const keyPos = pickReachableTile(0.08, 0.42);
      if (keyPos) {
        const keyId = `key-1`;
        keys.push({
          id: keyId,
          x: keyPos.x,
          y: keyPos.y,
          label: 'Golden House Key',
          kind: 'house',
          collected: false,
        });
        houses.push({
          id: `house-${i}`,
          x: pos.x,
          y: pos.y,
          name: houseNames[i % houseNames.length],
          type: 'locked_key',
          delivered: false,
          requiresKeyId: keyId,
          lightProgress: 0,
        });
        continue;
      }
    }

    houses.push({
      id: `house-${i}`,
      x: pos.x,
      y: pos.y,
      name: houseNames[i % houseNames.length],
      type: i === 2 && clampedIdx >= 10 ? 'guarded' : 'standard',
      delivered: false,
      lightProgress: 0,
    });
  }

  // Gate Keys required to unlock the Exit Mission Gate (easier: 1 early, 2 mid, 3 late)
  const gateKeyTarget =
    difficulty === 'easy'
      ? clampedIdx < 80
        ? 1
        : 2
      : clampedIdx < 60
      ? 1
      : clampedIdx < 140
      ? 2
      : 3;
  let gateKeysPlaced = 0;
  for (let gk = 0; gk < gateKeyTarget; gk++) {
    const minFrac = 0.14 + gk * 0.25;
    const maxFrac = Math.min(0.92, minFrac + 0.28);
    const gkPos = pickReachableTile(minFrac, maxFrac);
    if (gkPos) {
      gateKeysPlaced++;
      keys.push({
        id: `gate-key-${gk + 1}`,
        x: gkPos.x,
        y: gkPos.y,
        label: `Gate Key #${gk + 1}`,
        kind: 'gate',
        collected: false,
      });
    }
  }

  // Bonus secret house inside the Secret Room!
  const secretHousePos: Vec2 = { x: srX + 1, y: srY + 1 };
  used.add(`${secretHousePos.x},${secretHousePos.y}`);
  houses.push({
    id: 'house-secret-bonus',
    x: secretHousePos.x,
    y: secretHousePos.y,
    name: 'Secret Toy Vault',
    type: 'secret_bonus',
    delivered: false,
    isSecretBonus: true,
    lightProgress: 0,
  });

  // Cookies: Abundant Real Magic Cookies & Fewer Fake Trap Cookies
  const reqCookies =
    difficulty === 'easy'
      ? Math.round(5 + progressRatio * 5)
      : difficulty === 'medium'
      ? Math.round(7 + progressRatio * 6)
      : Math.round(9 + progressRatio * 7);
  const totalReal = reqCookies + 7;
  const fakeCount =
    difficulty === 'easy'
      ? Math.round(progressRatio * 4)
      : difficulty === 'medium'
      ? Math.round(1 + progressRatio * 5)
      : Math.round(2 + progressRatio * 6);

  const cookies: CookieItem[] = [];
  // Put 2 bonus real cookies inside the secret room
  const secretCookieSpots: Vec2[] = [
    { x: srX, y: srY },
    { x: srX + 2, y: srY + 2 },
  ];
  secretCookieSpots.forEach((pt, idx) => {
    used.add(`${pt.x},${pt.y}`);
    cookies.push({
      id: `cookie-secret-${idx}`,
      x: pt.x,
      y: pt.y,
      isReal: true,
      kind: 'magic_glow',
      collected: false,
      triggered: false,
      bobOffset: rng() * Math.PI * 2,
    });
  });

  // Main maze real cookies (guaranteed >= reqCookies in main reachable graph!)
  const mainRealCount = Math.max(reqCookies + 2, totalReal - 2);
  for (let i = 0; i < mainRealCount; i++) {
    const pos = pickReachableTile(0.05, 0.96);
    if (!pos) break;
    cookies.push({
      id: `cookie-real-${i}`,
      x: pos.x,
      y: pos.y,
      isReal: true,
      kind: REAL_KINDS[i % REAL_KINDS.length],
      collected: false,
      triggered: false,
      bobOffset: rng() * Math.PI * 2,
    });
  }

  // Fake trap cookies
  for (let i = 0; i < fakeCount; i++) {
    const pos = pickReachableTile(0.12, 0.92);
    if (!pos) break;
    cookies.push({
      id: `cookie-fake-${i}`,
      x: pos.x,
      y: pos.y,
      isReal: false,
      kind: FAKE_KINDS[i % FAKE_KINDS.length],
      collected: false,
      triggered: false,
      bobOffset: rng() * Math.PI * 2,
    });
  }

  // Power-Ups (1 in secret room, rest in main maze)
  const powerUps: PowerUpPickup[] = [];
  const secretPuPos: Vec2 = { x: srX + 2, y: srY };
  used.add(`${secretPuPos.x},${secretPuPos.y}`);
  powerUps.push({
    id: 'pu-secret',
    x: secretPuPos.x,
    y: secretPuPos.y,
    kind: 'golden_compass',
    collected: false,
  });

  const puCount = Math.max(2, city.powerUpCount - (difficulty === 'hard' ? 1 : 0));
  for (let i = 0; i < puCount; i++) {
    const pos = pickReachableTile(0.08, 0.88);
    if (!pos) break;
    powerUps.push({
      id: `pu-${i}`,
      x: pos.x,
      y: pos.y,
      kind: POWERUP_KINDS[(i + clampedIdx) % POWERUP_KINDS.length],
      collected: false,
    });
  }

  // Missing Golden Present in secret room or far corner
  const goldenPos: Vec2 = { x: srX, y: srY + 2 };
  used.add(`${goldenPos.x},${goldenPos.y}`);
  const goldenPresent: GoldenPresent = {
    x: goldenPos.x,
    y: goldenPos.y,
    found: false,
  };

  // Mystery Elf in early-to-mid maze
  const elfTile = pickReachableTile(0.12, 0.45);
  const mysteryElf: MysteryElf | null = elfTile
    ? {
        x: elfTile.x,
        y: elfTile.y,
        helped: false,
        clueText: ELF_CLUES[clampedIdx % ELF_CLUES.length],
        bonusPowerUp: POWERUP_KINDS[(clampedIdx + 2) % POWERUP_KINDS.length],
      }
    : null;

  // Progressive Danger Scaling across 200 levels: relaxed & friendly early, steady gentle climb
  const levelHazardBonus = Math.floor(progressRatio * 4.5);
  const levelSpeedScale =
    (difficulty === 'easy' ? 0.72 : difficulty === 'medium' ? 0.86 : 1.0) *
    (0.84 + progressRatio * 0.24);
  const lightRangeScale = difficulty === 'easy' ? 0.8 : difficulty === 'medium' ? 0.92 : 1.0;

  // Moving Hazards along horizontal AND vertical floor corridors
  const hazards: MovingHazard[] = [];
  const hazardKindMap: Record<CityDefinition['hazardTheme'], TrapKind> = {
    snowmen: 'snowman_guard',
    taxis: 'moving_traffic',
    guards: 'snowman_guard',
    cafes: 'snowball',
    carnival: 'snowball',
    drones: 'neon_drone',
    beach: 'snowball',
    towers: 'neon_drone',
    finale: 'neon_drone',
  };
  const hKind = hazardKindMap[city.hazardTheme];
  const targetHazards = Math.max(
    difficulty === 'easy' && clampedIdx < 3 ? 1 : 2,
    Math.min(
      difficulty === 'easy' ? 5 : 8,
      1 + levelHazardBonus + (difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2)
    )
  );
  const speedBase =
    (difficulty === 'easy' ? 1.85 : difficulty === 'medium' ? 2.45 : 3.15) * levelSpeedScale;

  for (let y = 3; y < rows - 2 && hazards.length < targetHazards; y += 2) {
    for (let x = 4; x < cols - 3 && hazards.length < targetHazards; x += 3) {
      if (grid[y][x] !== 'floor') continue;
      if (Math.hypot(x - spawn.x, y - spawn.y) < 4.5) continue;

      let minX = x;
      let maxX = x;
      while (minX > 1 && grid[y][minX - 1] === 'floor') minX--;
      while (maxX < cols - 2 && grid[y][maxX + 1] === 'floor') maxX++;

      let minY = y;
      let maxY = y;
      while (minY > 1 && grid[minY - 1][x] === 'floor') minY--;
      while (maxY < rows - 2 && grid[maxY + 1][x] === 'floor') maxY++;

      const spanX = maxX - minX;
      const spanY = maxY - minY;
      const preferVertical = hazards.length % 2 === 1 && spanY >= 2;

      if (preferVertical) {
        hazards.push({
          id: `hazard-${hazards.length}`,
          kind: hKind,
          x: x + 0.5,
          y: y + 0.5,
          homeX: x + 0.5,
          homeY: y + 0.5,
          vx: 0,
          vy: speedBase,
          axis: 'y',
          patrolMinX: x + 0.5,
          patrolMaxX: x + 0.5,
          patrolMinY: minY + 0.4,
          patrolMaxY: maxY + 0.6,
          speed: speedBase,
          radius: 0.32,
          stunTimer: 0,
          alerted: false,
          lightYaw: 0,
          lightRange: (3.0 + progressRatio * 0.7) * lightRangeScale,
          lightHalfAngle: difficulty === 'easy' ? 0.34 : 0.38,
          pursuing: false,
          pursuitLostTimer: 0,
        });
      } else if (spanX >= 2) {
        hazards.push({
          id: `hazard-${hazards.length}`,
          kind: hKind,
          x: x + 0.5,
          y: y + 0.5,
          homeX: x + 0.5,
          homeY: y + 0.5,
          vx: speedBase,
          vy: 0,
          axis: 'x',
          patrolMinX: minX + 0.4,
          patrolMaxX: maxX + 0.6,
          patrolMinY: y + 0.5,
          patrolMaxY: y + 0.5,
          speed: speedBase,
          radius: 0.32,
          stunTimer: 0,
          alerted: false,
          lightYaw: Math.PI / 2,
          lightRange: (3.0 + progressRatio * 0.7) * lightRangeScale,
          lightHalfAngle: difficulty === 'easy' ? 0.34 : 0.38,
          pursuing: false,
          pursuitLostTimer: 0,
        });
      }
    }
  }

  // Cycling Pop-Up Toy Spike / Candy Trap Pads on open corridors with Tracking Lights
  const trapPads: LevelInstance['trapPads'] = [];
  const trapPadTarget = Math.min(
    difficulty === 'easy' ? 4 : 6,
    (difficulty === 'easy' && clampedIdx < 3 ? 1 : 2) +
      Math.floor(progressRatio * 3.5) +
      (difficulty === 'hard' ? 1 : 0)
  );
  const trapCycle = difficulty === 'easy' ? 5.4 : difficulty === 'medium' ? 4.4 : 3.6;
  const trapPursuitSpeed =
    (difficulty === 'easy' ? 1.75 : difficulty === 'medium' ? 2.15 : 2.65) * levelSpeedScale;
  for (let i = 0; i < trapPadTarget * 4 && trapPads.length < trapPadTarget; i++) {
    const pos = pickReachableTile(0.18, 0.9);
    if (!pos) break;
    if (Math.hypot(pos.x - spawn.x, pos.y - spawn.y) < 4.5) continue;
    trapPads.push({
      id: `trappad-${trapPads.length}`,
      x: pos.x,
      y: pos.y,
      homeX: pos.x + 0.5,
      homeY: pos.y + 0.5,
      curX: pos.x + 0.5,
      curY: pos.y + 0.5,
      phaseOffset: (trapPads.length * 1.15) % trapCycle,
      cycleSeconds: trapCycle,
      lightYaw: (trapPads.length * 1.4) % (Math.PI * 2),
      lightRange: (2.85 + progressRatio * 0.5) * lightRangeScale,
      lightHalfAngle: difficulty === 'easy' ? 0.3 : 0.34,
      speed: trapPursuitSpeed,
      pursuing: false,
      pursuitLostTimer: 0,
      stunTimer: 0,
    });
  }

  // Wall-mounted Prankster Snowball Launchers introduced gently on higher levels
  const launchers: LevelInstance['launchers'] = [];
  const launcherTarget =
    clampedIdx < 4 && difficulty !== 'hard'
      ? 0
      : Math.min(difficulty === 'easy' ? 3 : 5, 1 + Math.floor(clampedIdx / 8) + (difficulty === 'hard' ? 1 : 0));
  const launcherInterval = difficulty === 'easy' ? 4.8 : difficulty === 'medium' ? 3.8 : 3.0;
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  for (let y = 2; y < rows - 2 && launchers.length < launcherTarget; y += 2) {
    for (let x = 2; x < cols - 2 && launchers.length < launcherTarget; x += 3) {
      if (grid[y][x] !== 'wall') continue;
      if (x >= srX - 1 && y <= srY + 3) continue;
      if (Math.hypot(x - spawn.x, y - spawn.y) < 5.0) continue;

      for (const d of dirs) {
        let openRun = 0;
        for (let step = 1; step <= 4; step++) {
          const tx = x + d.dx * step;
          const ty = y + d.dy * step;
          if (grid[ty]?.[tx] === 'floor' || grid[ty]?.[tx] === 'ice') {
            openRun++;
          } else {
            break;
          }
        }
        if (openRun >= 3) {
          launchers.push({
            id: `launcher-${launchers.length}`,
            x,
            y,
            dirX: d.dx,
            dirY: d.dy,
            cooldown: 1.0 + (launchers.length % 3) * 0.85,
            interval: launcherInterval,
          });
          break;
        }
      }
    }
  }

  // Paint stealth floor surface zones (quiet carpets, dark shadows, creaky wood, noisy toy blocks, metal walkways)
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] !== 'floor') continue;
      if (x <= 3 && y <= 3) continue; // Keep spawn plaza crisp snow/floor
      if (x === portal.x && y === portal.y) continue;
      const roll = rng();
      if (roll < 0.14) {
        grid[y][x] = 'carpet';
      } else if (roll < 0.25) {
        grid[y][x] = 'shadow';
      } else if (roll < 0.36) {
        grid[y][x] = 'wood';
      } else if (roll < 0.43) {
        grid[y][x] = 'toy_floor';
      } else if (clampedIdx >= 4 && roll < 0.49) {
        grid[y][x] = 'metal';
      }
    }
  }

  // Interactive Hiding Spots (wardrobes, beds, curtains, sofas, gift boxes, Christmas trees)
  const hidingSpotDefs: Array<{ kind: HidingSpotKind; label: string }> = [
    { kind: 'gift_box', label: 'Giant Gift Box' },
    { kind: 'tree_cover', label: 'Decorated Tree' },
    { kind: 'wardrobe', label: 'Holiday Wardrobe' },
    { kind: 'sofa', label: 'Cozy Sofa' },
    { kind: 'bed', label: 'Guest Bed' },
    { kind: 'curtain', label: 'Velvet Curtains' },
  ];
  const hidingSpots: HidingSpot[] = [];
  const hidingTarget = Math.min(7, 4 + Math.floor(clampedIdx / 3));
  for (let i = 0; i < hidingTarget; i++) {
    const pos = pickReachableTile(0.12, 0.9);
    if (!pos) break;
    const def = hidingSpotDefs[(i + clampedIdx) % hidingSpotDefs.length];
    hidingSpots.push({
      id: `hide-${i}`,
      kind: def.kind,
      x: pos.x,
      y: pos.y,
      label: def.label,
    });
  }

  // Stealth Enemies: scale from 1 patrol + 1 sleeper on Level 1 up to full security squads on higher levels
  const stealthEnemies: StealthEnemy[] = [];
  const collectPatrolLoop = (sx: number, sy: number): Vec2[] => {
    const pts: Vec2[] = [{ x: sx + 0.5, y: sy + 0.5 }];
    const pDirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of pDirs) {
      let step = 1;
      while (step <= 4 && isStandardFloorTile(grid[sy + d.dy * step]?.[sx + d.dx * step])) {
        step++;
      }
      if (step > 2) {
        pts.push({ x: sx + d.dx * (step - 1) + 0.5, y: sy + d.dy * (step - 1) + 0.5 });
      }
      if (pts.length >= 3) break;
    }
    return pts;
  };

  // Stealth Enemies: forgiving early patrols, scaling gently across 200 levels
  const guardTarget = Math.min(
    difficulty === 'easy' ? 3 : 4,
    1 + Math.floor(progressRatio * 2.5) + (difficulty === 'hard' && clampedIdx >= 5 ? 1 : 0)
  );
  for (let i = 0; i < guardTarget; i++) {
    const pos = pickReachableTile(0.22 + i * 0.14, Math.min(0.92, 0.45 + i * 0.18));
    if (!pos) break;
    const patrol = collectPatrolLoop(pos.x, pos.y);
    const isGuard = i % 2 === 0 && clampedIdx >= 15;
    stealthEnemies.push({
      id: `stealth-patrol-${i}`,
      role: isGuard ? 'guard' : 'homeowner',
      x: pos.x + 0.5,
      y: pos.y + 0.5,
      yaw: 0,
      homeX: pos.x + 0.5,
      homeY: pos.y + 0.5,
      patrolPoints: patrol,
      patrolIndex: patrol.length > 1 ? 1 : 0,
      state: 'patrol',
      suspicion: 0,
      visionRange: ((isGuard ? 3.8 : 3.2) + progressRatio * 0.6) * lightRangeScale,
      visionHalfAngle: (isGuard ? 0.44 : 0.38) * (difficulty === 'easy' ? 0.85 : 1),
      baseSpeed: ((isGuard ? 1.55 : 1.32) + progressRatio * 0.25) * levelSpeedScale,
      awakeTimer: 0,
      investigateX: pos.x + 0.5,
      investigateY: pos.y + 0.5,
      investigateTimer: 0,
      chaseLostTimer: 0,
    });
  }

  // Sleeping Kid (1 early, 2 in late world tour)
  const sleeperCount = clampedIdx >= 100 ? 2 : 1;
  for (let s = 0; s < sleeperCount; s++) {
    const sleeperPos = pickReachableTile(0.24 + s * 0.25, 0.65 + s * 0.2);
    if (sleeperPos) {
      stealthEnemies.push({
        id: `stealth-sleeper-${s}`,
        role: 'sleeping_kid',
        x: sleeperPos.x + 0.5,
        y: sleeperPos.y + 0.5,
        yaw: rng() * Math.PI * 2,
        homeX: sleeperPos.x + 0.5,
        homeY: sleeperPos.y + 0.5,
        patrolPoints: [{ x: sleeperPos.x + 0.5, y: sleeperPos.y + 0.5 }],
        patrolIndex: 0,
        state: 'sleep',
        suspicion: 0,
        visionRange: 3.0 * lightRangeScale,
        visionHalfAngle: 0.54,
        baseSpeed: 1.35 * levelSpeedScale,
        pretendSleep: false,
        awakeTimer: 0,
        investigateX: sleeperPos.x + 0.5,
        investigateY: sleeperPos.y + 0.5,
        investigateTimer: 0,
        chaseLostTimer: 0,
      });
    }
  }

  // Naughty Pretend-Sleep Kids introduced gradually after Level 8
  const naughtyCount = clampedIdx >= 120 ? 2 : clampedIdx >= 8 ? 1 : 0;
  for (let n = 0; n < naughtyCount; n++) {
    const naughtyPos = pickReachableTile(0.42 + n * 0.22, 0.88);
    if (naughtyPos) {
      stealthEnemies.push({
        id: `stealth-naughty-${n}`,
        role: 'naughty_kid',
        x: naughtyPos.x + 0.5,
        y: naughtyPos.y + 0.5,
        yaw: 0,
        homeX: naughtyPos.x + 0.5,
        homeY: naughtyPos.y + 0.5,
        patrolPoints: collectPatrolLoop(naughtyPos.x, naughtyPos.y),
        patrolIndex: 0,
        state: 'sleep',
        suspicion: 0,
        visionRange: 3.3 * lightRangeScale,
        visionHalfAngle: 0.48,
        baseSpeed: (1.52 + progressRatio * 0.25) * levelSpeedScale,
        pretendSleep: true,
        awakeTimer: 0,
        investigateX: naughtyPos.x + 0.5,
        investigateY: naughtyPos.y + 0.5,
        investigateTimer: 0,
        chaseLostTimer: 0,
      });
    }
  }

  // Sweeping Security Cameras introduced gently from Level 6+
  const securityCameras: SecurityCamera[] = [];
  const camTarget =
    clampedIdx < 5 && difficulty !== 'hard'
      ? 0
      : Math.min(difficulty === 'easy' ? 2 : 4, 1 + Math.floor(clampedIdx / 8));
  for (let y = 2; y < rows - 2 && securityCameras.length < camTarget; y += 4) {
    for (let x = 3; x < cols - 3 && securityCameras.length < camTarget; x += 5) {
      if (grid[y][x] !== 'wall') continue;
      if (x >= srX - 1 && y <= srY + 3) continue;
      if (Math.hypot(x - spawn.x, y - spawn.y) < 5) continue;
      const openDir = dirs.find((d) => isStandardFloorTile(grid[y + d.dy]?.[x + d.dx]));
      if (!openDir) continue;
      const baseYaw = Math.atan2(openDir.dx, openDir.dy);
      securityCameras.push({
        id: `cam-${securityCameras.length}`,
        x: x + 0.5,
        y: y + 0.5,
        baseYaw,
        sweepAngle: 0.65,
        speed: 0.65 + progressRatio * 0.25 + (difficulty === 'hard' ? 0.18 : 0),
        range: 3.5 * lightRangeScale,
        halfAngle: 0.32,
        currentYaw: baseYaw,
        disabledTimer: 0,
      });
    }
  }

  // Cycling Laser Detection Beams introduced gently from Level 10+
  const laserBarriers: LaserBarrier[] = [];
  const laserTarget =
    clampedIdx < 9 && !(clampedIdx >= 4 && difficulty === 'hard')
      ? 0
      : Math.min(
          difficulty === 'easy' ? 2 : 4,
          1 + Math.floor(clampedIdx / 8) + (difficulty === 'hard' ? 1 : 0)
        );
  const laserCycle = difficulty === 'easy' ? 5.6 : difficulty === 'medium' ? 4.4 : 3.6;
  for (let y = 3; y < rows - 3 && laserBarriers.length < laserTarget; y += 3) {
    for (let x = 4; x < cols - 3 && laserBarriers.length < laserTarget; x += 4) {
      if (!isStandardFloorTile(grid[y][x])) continue;
      if (Math.hypot(x - spawn.x, y - spawn.y) < 5) continue;
      if (grid[y][x - 1] === 'wall' && grid[y][x + 1] === 'wall') {
        laserBarriers.push({
          id: `laser-${laserBarriers.length}`,
          x1: x + 0.06,
          y1: y + 0.5,
          x2: x + 0.94,
          y2: y + 0.5,
          cycleSeconds: laserCycle,
          phaseOffset: (laserBarriers.length * 1.4) % laserCycle,
          disabledBySwitch: false,
        });
      } else if (grid[y - 1][x] === 'wall' && grid[y + 1][x] === 'wall') {
        laserBarriers.push({
          id: `laser-${laserBarriers.length}`,
          x1: x + 0.5,
          y1: y + 0.06,
          x2: x + 0.5,
          y2: y + 0.94,
          cycleSeconds: laserCycle,
          phaseOffset: (laserBarriers.length * 1.4) % laserCycle,
          disabledBySwitch: false,
        });
      }
    }
  }

  // Decorative Trees / City Landmarks on wall tops or corners
  const props: StaticProp[] = [];
  for (let y = 2; y < rows - 1; y += 2) {
    for (let x = 2; x < cols - 1; x += 3) {
      if (grid[y][x] === 'wall' && !(x >= srX - 1 && y <= srY + 3)) {
        props.push({
          id: `prop-${x}-${y}`,
          kind: props.length % 3 === 0 ? 'lamp' : 'tree',
          x,
          y,
        });
      }
    }
  }

  // Teleportation Portals pair
  const portals: Array<{ id: string; x: number; y: number }> = [];
  for (let y = 3; y < rows - 3 && portals.length < 2; y += 4) {
    for (let x = 3; x < cols - 3 && portals.length < 2; x += 5) {
      if (isStandardFloorTile(grid[y][x]) && Math.hypot(x - spawn.x, y - spawn.y) > 4) {
        portals.push({ id: `portal-${portals.length}`, x, y });
      }
    }
  }

  const hasCountdown = difficulty === 'easy' ? clampedIdx >= 40 : city.hasCountdown;
  const countdownSeconds = hasCountdown
    ? Math.max(150, (city.countdownSeconds || 180) + (difficulty === 'easy' ? 90 : difficulty === 'medium' ? 45 : 15) + Math.round(stageRatio * 20))
    : 0;

  return {
    city: {
      ...city,
      index: clampedIdx,
      city: `${city.city} · Lv.${clampedIdx + 1}`,
      subtitle: `${city.subtitle} (${meta.stageLabel})`,
      nextCityLabel: meta.nextLevelLabel,
      hasCountdown,
      countdownSeconds,
      requiredCookies: reqCookies,
      requiredDeliveries: houses.filter((h) => !h.isSecretBonus).length,
    },
    difficulty,
    cols,
    rows,
    grid,
    spawn,
    portal,
    cookies,
    houses,
    keys,
    switches,
    chimneys,
    powerUps,
    hazards,
    trapPads,
    launchers,
    props,
    hidingSpots,
    stealthEnemies,
    securityCameras,
    laserBarriers,
    portals,
    requiredGateKeys: gateKeysPlaced,
    mysteryElf,
    goldenPresent,
    secretRoomBounds: { x: srX, y: srY, w: 3, h: 3 },
  };
}

export function verifyLevelSolvability(level: LevelInstance): {
  solvable: boolean;
  reason?: string;
  reachableRealCookies: number;
  reachableRequiredHouses: number;
} {
  // Check Santa spawn clearance (>= 2 open adjacent tiles in spawn plaza)
  let openCount = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tile = level.grid[level.spawn.y + dy]?.[level.spawn.x + dx];
      if (isStandardFloorTile(tile)) openCount++;
    }
  }
  if (openCount < 4) {
    return {
      solvable: false,
      reason: 'Spawn plaza is too narrow',
      reachableRealCookies: 0,
      reachableRequiredHouses: 0,
    };
  }

  const dist = bfsDistances(level.grid, level.spawn, { chimneys: level.chimneys });
  const key = (x: number, y: number) => `${x},${y}`;

  if (!dist.has(key(level.portal.x, level.portal.y))) {
    return {
      solvable: false,
      reason: 'Portal is unreachable from spawn',
      reachableRealCookies: 0,
      reachableRequiredHouses: 0,
    };
  }

  for (const k of level.keys) {
    if (!dist.has(key(k.x, k.y))) {
      return {
        solvable: false,
        reason: `Key ${k.id} is unreachable`,
        reachableRealCookies: 0,
        reachableRequiredHouses: 0,
      };
    }
  }

  const requiredHouses = level.houses.filter((h) => !h.isSecretBonus);
  let reachableRequiredHouses = 0;
  for (const h of requiredHouses) {
    if (!dist.has(key(h.x, h.y))) {
      return {
        solvable: false,
        reason: `Required house ${h.id} (${h.name}) is unreachable`,
        reachableRealCookies: 0,
        reachableRequiredHouses,
      };
    }
    reachableRequiredHouses++;
  }

  const reachableRealCookies = level.cookies.filter(
    (c) => c.isReal && dist.has(key(c.x, c.y))
  ).length;

  if (reachableRealCookies < level.city.requiredCookies) {
    return {
      solvable: false,
      reason: `Only ${reachableRealCookies} real cookies reachable, need ${level.city.requiredCookies}`,
      reachableRealCookies,
      reachableRequiredHouses,
    };
  }

  return {
    solvable: true,
    reachableRealCookies,
    reachableRequiredHouses,
  };
}
