export type Difficulty = 'easy' | 'medium' | 'hard';

export type ScreenState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type TileKind =
  | 'wall'
  | 'floor'
  | 'ice'
  | 'carpet'
  | 'wood'
  | 'shadow'
  | 'toy_floor'
  | 'metal'
  | 'secret_wall'
  | 'secret_floor'
  | 'candy_barrier';

export type SantaStance = 'walk' | 'sneak' | 'run' | 'hide';

export type StealthEnemyRole = 'sleeping_kid' | 'homeowner' | 'guard' | 'naughty_kid';

export type StealthEnemyState = 'sleep' | 'patrol' | 'suspicious' | 'chase' | 'distracted';

export type HidingSpotKind = 'bed' | 'wardrobe' | 'curtain' | 'sofa' | 'gift_box' | 'tree_cover';

export type RealCookieKind =
  | 'choc_chip'
  | 'gingerbread'
  | 'star'
  | 'candy_cane'
  | 'magic_glow';

export type FakeCookieKind =
  | 'prank_boom'
  | 'cardboard'
  | 'vanishing'
  | 'frozen'
  | 'elf_morph'
  | 'spring_trap';

export type PowerUpKind =
  | 'magical_milk'
  | 'reindeer_dash'
  | 'snowflake_shield'
  | 'golden_compass'
  | 'magic_lantern'
  | 'elf_helper'
  | 'christmas_wings';

export type DeliveryType =
  | 'standard'
  | 'guarded'
  | 'locked_key'
  | 'rooftop_chimney'
  | 'secret_bonus';

export type TrapKind =
  | 'snowball'
  | 'ice_patch'
  | 'toy_blocks'
  | 'snowman_guard'
  | 'candy_barrier'
  | 'moving_traffic'
  | 'neon_drone';

export interface Vec2 {
  x: number;
  y: number;
}

export interface CookieItem {
  id: string;
  x: number;
  y: number;
  isReal: boolean;
  kind: RealCookieKind | FakeCookieKind;
  collected: boolean;
  triggered: boolean;
  bobOffset: number;
  disappearTimer?: number;
}

export interface DeliveryHouse {
  id: string;
  x: number;
  y: number;
  name: string;
  type: DeliveryType;
  delivered: boolean;
  requiresKeyId?: string;
  isSecretBonus?: boolean;
  lightProgress: number;
}

export interface KeyItem {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: 'house' | 'gate';
  collected: boolean;
}

export interface SecretSwitch {
  id: string;
  x: number;
  y: number;
  activated: boolean;
  unlocksTiles: Vec2[];
}

export interface ChimneyLink {
  id: string;
  entryX: number;
  entryY: number;
  exitX: number;
  exitY: number;
}

export interface PowerUpPickup {
  id: string;
  x: number;
  y: number;
  kind: PowerUpKind;
  collected: boolean;
}

export interface MovingHazard {
  id: string;
  kind: TrapKind;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  axis: 'x' | 'y';
  patrolMinX: number;
  patrolMaxX: number;
  patrolMinY: number;
  patrolMaxY: number;
  speed: number;
  radius: number;
  stunTimer: number;
  alerted: boolean;
  lightYaw: number;
  lightRange: number;
  lightHalfAngle: number;
  pursuing: boolean;
  pursuitLostTimer: number;
}

export interface TrapPad {
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  curX: number;
  curY: number;
  phaseOffset: number;
  cycleSeconds: number;
  lightYaw: number;
  lightRange: number;
  lightHalfAngle: number;
  speed: number;
  pursuing: boolean;
  pursuitLostTimer: number;
  stunTimer: number;
}

export interface SnowballLauncher {
  id: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  cooldown: number;
  interval: number;
}

export interface SnowballProjectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface StaticProp {
  id: string;
  kind: 'tree' | 'lamp' | 'landmark' | 'toy_blocks' | 'present_pile';
  x: number;
  y: number;
}

export interface HidingSpot {
  id: string;
  kind: HidingSpotKind;
  x: number;
  y: number;
  label: string;
}

export interface StealthEnemy {
  id: string;
  role: StealthEnemyRole;
  x: number;
  y: number;
  yaw: number;
  homeX: number;
  homeY: number;
  patrolPoints: Vec2[];
  patrolIndex: number;
  state: StealthEnemyState;
  suspicion: number;
  visionRange: number;
  visionHalfAngle: number;
  baseSpeed: number;
  pretendSleep?: boolean;
  awakeTimer: number;
  investigateX: number;
  investigateY: number;
  investigateTimer: number;
  chaseLostTimer: number;
}

export interface SecurityCamera {
  id: string;
  x: number;
  y: number;
  baseYaw: number;
  sweepAngle: number;
  speed: number;
  range: number;
  halfAngle: number;
  currentYaw: number;
  disabledTimer: number;
}

export interface LaserBarrier {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cycleSeconds: number;
  phaseOffset: number;
  disabledBySwitch: boolean;
}

export interface DecoySnowball {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
}

export type StealthAbilityId = 'disguise' | 'silent_boots' | 'elf_smoke';

export interface StealthAbilitiesState {
  disguiseActive: number;
  disguiseCooldown: number;
  silentBootsActive: number;
  silentBootsCooldown: number;
  elfSmokeActive: number;
  elfSmokeCooldown: number;
  decoyCooldown: number;
}

export interface MiniMapSnapshot {
  cols: number;
  rows: number;
  grid: TileKind[][];
  santa: Vec2;
  portal: Vec2;
  portalUnlocked: boolean;
  houses: Array<{ x: number; y: number; delivered: boolean }>;
  gateKeys: Array<{ x: number; y: number; collected: boolean }>;
  hidingSpots: Array<{ x: number; y: number }>;
  enemies: Array<{ x: number; y: number; state: StealthEnemyState; role: StealthEnemyRole }>;
}

export interface MysteryElf {
  x: number;
  y: number;
  helped: boolean;
  clueText: string;
  bonusPowerUp: PowerUpKind;
}

export interface GoldenPresent {
  x: number;
  y: number;
  found: boolean;
}

export interface CityPalette {
  skyTop: string;
  skyBottom: string;
  floorPrimary: string;
  floorSecondary: string;
  wallTop: string;
  wallFront: string;
  wallTrim: string;
  accent: string;
  lightGlow: string;
  particleColor: string;
  weather: 'snow' | 'petals' | 'gold_spark' | 'neon_rain';
}

export type MusicMotif =
  | 'north_pole'
  | 'new_york'
  | 'london'
  | 'paris'
  | 'lagos'
  | 'tokyo'
  | 'rio'
  | 'sydney'
  | 'dubai'
  | 'finale';

export interface CityDefinition {
  index: number;
  id: string;
  city: string;
  country: string;
  subtitle: string;
  landmarkName: string;
  nextCityLabel: string;
  description: string;
  tutorialHint?: string;
  hasCountdown: boolean;
  countdownSeconds: number;
  baseCols: number;
  baseRows: number;
  requiredCookies: number;
  totalRealCookies: number;
  fakeCookieCount: number;
  requiredDeliveries: number;
  movingHazardCount: number;
  powerUpCount: number;
  hazardTheme: 'snowmen' | 'taxis' | 'guards' | 'cafes' | 'carnival' | 'drones' | 'beach' | 'towers' | 'finale';
  musicMotif: MusicMotif;
  palette: CityPalette;
}

export interface LevelInstance {
  city: CityDefinition;
  difficulty: Difficulty;
  cols: number;
  rows: number;
  grid: TileKind[][];
  spawn: Vec2;
  portal: Vec2;
  cookies: CookieItem[];
  houses: DeliveryHouse[];
  keys: KeyItem[];
  switches: SecretSwitch[];
  chimneys: ChimneyLink[];
  powerUps: PowerUpPickup[];
  hazards: MovingHazard[];
  trapPads: TrapPad[];
  launchers: SnowballLauncher[];
  props: StaticProp[];
  hidingSpots: HidingSpot[];
  stealthEnemies: StealthEnemy[];
  securityCameras: SecurityCamera[];
  laserBarriers: LaserBarrier[];
  portals: Array<{ id: string; x: number; y: number }>;
  requiredGateKeys: number;
  mysteryElf: MysteryElf | null;
  goldenPresent: GoldenPresent | null;
  secretRoomBounds: { x: number; y: number; w: number; h: number } | null;
}

export interface ActivePowerUps {
  magical_milk: number;
  reindeer_dash: number;
  snowflake_shield: number;
  golden_compass: number;
  magic_lantern: number;
  elf_helper: number;
  christmas_wings: number;
}

export interface LevelScoreSummary {
  cityIndex: number;
  cityName: string;
  difficulty: Difficulty;
  score: number;
  stars: 1 | 2 | 3;
  coinsEarned: number;
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
}

export interface LevelProgressRecord {
  completed: boolean;
  stars: number;
  bestScore: number;
  bestTimeSeconds: number | null;
}

export type CosmeticSlot = 'outfit' | 'sleigh' | 'reindeer' | 'gear';

export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  perkLabel?: string;
  cost: number;
  primaryColor: string;
  trimColor: string;
}

export interface GameSettings {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  mobileJoystick: 'auto' | 'on' | 'off';
  reducedMotion: boolean;
  theme?: 'dark' | 'light';
}

export type DailyMissionKind =
  | 'collect_cookies'
  | 'secret_room_fast'
  | 'deliver_presents'
  | 'golden_present'
  | 'help_elf'
  | 'clean_run'
  | 'speed_delivery';

export interface DailyMissionState {
  id: string;
  kind: DailyMissionKind;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardCoins: number;
  timeLimitSeconds?: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyMissionsBoard {
  dateKey: string;
  missions: DailyMissionState[];
}

export type MissionEvent =
  | { type: 'cookie' }
  | { type: 'delivery' }
  | { type: 'secret_room'; elapsedSeconds: number }
  | { type: 'golden_present' }
  | { type: 'elf' };

export interface PlayerProgress {
  unlockedLevelIndex: number;
  coins: number;
  difficulty: Difficulty;
  levelRecords: Record<string, LevelProgressRecord>;
  ownedCosmetics: string[];
  equippedCosmetics: {
    outfit: string;
    sleigh: string;
    reindeer: string;
    gear: string;
  };
  settings: GameSettings;
  dailyMissions: DailyMissionsBoard;
}

export interface HudSnapshot {
  cityIndex: number;
  cityName: string;
  subtitle: string;
  difficulty: Difficulty;
  realCookies: number;
  requiredCookies: number;
  deliveriesDone: number;
  requiredDeliveries: number;
  totalHouses: number;
  keysHeld: number;
  totalKeys: number;
  gateKeysHeld: number;
  requiredGateKeys: number;
  missionCleared: boolean;
  niceMeter: number;
  score: number;
  coinsEarned: number;
  trapsTriggered: number;
  secretRoomsFound: number;
  portalUnlocked: boolean;
  countdownRemaining: number | null;
  elapsedSeconds: number;
  activePowerUps: ActivePowerUps;
  nearbyPrompt: string | null;
  statusBanner: string | null;
  elfClue: string | null;
  santaSpeedPenalty: number;
  goldenPresentFound: boolean;
  hearts: number;
  maxHearts: number;
  dashReady: boolean;
  dashCooldownRatio: number;
  stance: SantaStance;
  noiseLevel: number;
  suspicionLevel: number;
  surfaceLabel: string;
  inShadow: boolean;
  isHiding: boolean;
  isChased: boolean;
  disguised: boolean;
  stealthAbilities: StealthAbilitiesState;
  miniMap: MiniMapSnapshot | null;
}
