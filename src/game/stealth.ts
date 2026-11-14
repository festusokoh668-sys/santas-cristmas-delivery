import { isTileSolid } from './rules';
import {
  SantaStance,
  StealthEnemyRole,
  StealthEnemyState,
  TileKind,
} from './types';

export function getSurfaceNoiseMultiplier(tile: TileKind | undefined): number {
  switch (tile) {
    case 'carpet':
    case 'secret_floor':
      return 0.35;
    case 'shadow':
      return 0.65;
    case 'floor':
      return 0.85;
    case 'wood':
      return 1.25;
    case 'metal':
      return 1.45;
    case 'ice':
      return 1.15;
    case 'toy_floor':
      return 1.95;
    default:
      return 1.0;
  }
}

export function getSurfaceVisibilityMultiplier(tile: TileKind | undefined): number {
  if (tile === 'shadow') return 0.38;
  if (tile === 'secret_floor') return 0.55;
  return 1.0;
}

export function getSurfaceLabel(tile: TileKind | undefined): string {
  switch (tile) {
    case 'carpet':
      return 'Quiet Rug';
    case 'wood':
      return 'Creaky Wood';
    case 'shadow':
      return 'Dark Shadow';
    case 'toy_floor':
      return 'Noisy Toy Blocks!';
    case 'metal':
      return 'Clanky Metal';
    case 'ice':
      return 'Slippery Ice';
    default:
      return 'Snowy Path';
  }
}

export function calculateStepNoise(params: {
  tile: TileKind | undefined;
  stance: SantaStance;
  isMoving: boolean;
  silentBootsActive: boolean;
}): number {
  if (!params.isMoving || params.stance === 'hide') return 0;
  if (params.silentBootsActive) return 4;

  const baseByStance: Record<Exclude<SantaStance, 'hide'>, number> = {
    sneak: 16,
    walk: 42,
    run: 84,
  };
  const base = baseByStance[params.stance];
  const raw = base * getSurfaceNoiseMultiplier(params.tile);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function hasLineOfSight(
  grid: TileKind[][],
  ax: number,
  ay: number,
  bx: number,
  by: number
): boolean {
  const dist = Math.hypot(bx - ax, by - ay);
  if (dist < 0.05) return true;
  const steps = Math.max(2, Math.ceil(dist * 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor(ax + (bx - ax) * t);
    const ty = Math.floor(ay + (by - ay) * t);
    const tile = grid[ty]?.[tx];
    if (isTileSolid(tile, false)) return false;
  }
  return true;
}

export function normalizeAngleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
}

export function isPointInVisionCone(params: {
  viewerX: number;
  viewerY: number;
  viewerYaw: number;
  targetX: number;
  targetY: number;
  range: number;
  halfAngleRad: number;
  grid: TileKind[][];
}): boolean {
  const dx = params.targetX - params.viewerX;
  const dy = params.targetY - params.viewerY;
  const dist = Math.hypot(dx, dy);
  if (dist > params.range) return false;
  if (dist > 0.25) {
    // Yaw convention matches Three.js rotation.y = atan2(dirX, dirY) where +Z is grid +Y
    const angleToTarget = Math.atan2(dx, dy);
    const diff = normalizeAngleDiff(angleToTarget, params.viewerYaw);
    if (diff > params.halfAngleRad) return false;
  }
  return hasLineOfSight(params.grid, params.viewerX, params.viewerY, params.targetX, params.targetY);
}

export function computeSuspicionDelta(params: {
  spottedInCone: boolean;
  distance: number;
  maxRange: number;
  tile: TileKind | undefined;
  stance: SantaStance;
  isHiding: boolean;
  disguised: boolean;
  smokeConcealed: boolean;
  role: StealthEnemyRole;
  enemyState: StealthEnemyState;
  dt: number;
}): number {
  // Hiding inside cover, disguised in a gift box (unless already chasing right next to guard), or smoke-concealed shields Santa
  if (params.isHiding || params.smokeConcealed) {
    return -38 * params.dt;
  }
  if (params.disguised && params.enemyState !== 'chase') {
    return -24 * params.dt;
  }
  if (!params.spottedInCone) {
    const coolRate = params.enemyState === 'chase' ? 14 : 26;
    return -coolRate * params.dt;
  }

  const distFactor = Math.max(0.35, 1.25 - params.distance / Math.max(1, params.maxRange));
  const visMult = getSurfaceVisibilityMultiplier(params.tile);
  const stanceMult =
    params.stance === 'sneak' ? 0.65 : params.stance === 'run' ? 1.35 : 1.0;
  const roleMult =
    params.role === 'guard'
      ? 1.22
      : params.role === 'naughty_kid'
      ? 1.1
      : params.role === 'sleeping_kid'
      ? 0.9
      : 1.0;

  return 78 * distFactor * visMult * stanceMult * roleMult * params.dt;
}

export function isLaserBarrierActive(
  elapsedSeconds: number,
  cycleSeconds: number,
  phaseOffset: number,
  disabledBySwitch: boolean
): boolean {
  if (disabledBySwitch) return false;
  const safeCycle = Math.max(0.5, cycleSeconds);
  const t = (((elapsedSeconds + phaseOffset) % safeCycle) + safeCycle) % safeCycle;
  return t / safeCycle < 0.58;
}

export function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lenSq));
  const cx = x1 + t * vx;
  const cy = y1 + t * vy;
  return Math.hypot(px - cx, py - cy);
}

export function isTargetTouchedByTrackingLight(params: {
  lightX: number;
  lightY: number;
  lightYaw: number;
  lightRange: number;
  lightHalfAngle: number;
  targetX: number;
  targetY: number;
  isHiding: boolean;
  smokeConcealed: boolean;
  grid: TileKind[][];
}): boolean {
  if (params.isHiding || params.smokeConcealed) return false;
  return isPointInVisionCone({
    viewerX: params.lightX,
    viewerY: params.lightY,
    viewerYaw: params.lightYaw,
    targetX: params.targetX,
    targetY: params.targetY,
    range: params.lightRange,
    halfAngleRad: params.lightHalfAngle,
    grid: params.grid,
  });
}

export function computeTrapPursuitStep(params: {
  grid: TileKind[][];
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  dt: number;
  radius: number;
  moveWithCollision: (
    grid: TileKind[][],
    x: number,
    y: number,
    dx: number,
    dy: number,
    radius: number,
    hasWings?: boolean
  ) => { x: number; y: number; hitWall: boolean };
}): { x: number; y: number; vx: number; vy: number } {
  const dx = params.targetX - params.x;
  const dy = params.targetY - params.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.03) {
    return { x: params.x, y: params.y, vx: 0, vy: 0 };
  }
  const ux = dx / dist;
  const uy = dy / dist;
  const stepDist = Math.min(dist, params.speed * params.dt);
  const direct = params.moveWithCollision(
    params.grid,
    params.x,
    params.y,
    ux * stepDist,
    uy * stepDist,
    params.radius,
    false
  );
  const movedDirect = Math.hypot(direct.x - params.x, direct.y - params.y);
  if (movedDirect > stepDist * 0.25) {
    return {
      x: direct.x,
      y: direct.y,
      vx: ux * params.speed,
      vy: uy * params.speed,
    };
  }

  // Fallback axis slide to steer cleanly around maze corners when pursuing
  const tryX = Math.abs(dx) > 0.05
    ? params.moveWithCollision(
        params.grid,
        params.x,
        params.y,
        Math.sign(dx) * stepDist,
        0,
        params.radius,
        false
      )
    : null;
  const tryY = Math.abs(dy) > 0.05
    ? params.moveWithCollision(
        params.grid,
        params.x,
        params.y,
        0,
        Math.sign(dy) * stepDist,
        params.radius,
        false
      )
    : null;

  const movedX = tryX ? Math.hypot(tryX.x - params.x, tryX.y - params.y) : 0;
  const movedY = tryY ? Math.hypot(tryY.x - params.x, tryY.y - params.y) : 0;

  if (movedX >= movedY && movedX > 0.001 && tryX) {
    return {
      x: tryX.x,
      y: tryX.y,
      vx: Math.sign(dx) * params.speed,
      vy: 0,
    };
  }
  if (movedY > 0.001 && tryY) {
    return {
      x: tryY.x,
      y: tryY.y,
      vx: 0,
      vy: Math.sign(dy) * params.speed,
    };
  }

  // Head-on obstacle fallback: probe perpendicular directions to slip around pillars/corners
  const perpOptions: Array<[number, number]> =
    Math.abs(dx) >= Math.abs(dy)
      ? [
          [0, 1],
          [0, -1],
        ]
      : [
          [1, 0],
          [-1, 0],
        ];
  let bestSide: { x: number; y: number; vx: number; vy: number; moved: number } | null = null;
  for (const [px, py] of perpOptions) {
    const attempt = params.moveWithCollision(
      params.grid,
      params.x,
      params.y,
      px * stepDist,
      py * stepDist,
      params.radius,
      false
    );
    const moved = Math.hypot(attempt.x - params.x, attempt.y - params.y);
    if (moved > 0.001 && (!bestSide || moved > bestSide.moved)) {
      bestSide = {
        x: attempt.x,
        y: attempt.y,
        vx: px * params.speed,
        vy: py * params.speed,
        moved,
      };
    }
  }
  if (bestSide) {
    return { x: bestSide.x, y: bestSide.y, vx: bestSide.vx, vy: bestSide.vy };
  }

  return {
    x: direct.x,
    y: direct.y,
    vx: ux * params.speed,
    vy: uy * params.speed,
  };
}

export function shouldLoseTrack(params: {
  currentlyDetected: boolean;
  distance: number;
  trackRange: number;
  lostTimer: number;
  dt: number;
  isHiding: boolean;
  smokeConcealed: boolean;
  maxLostSeconds?: number;
  farLostSeconds?: number;
}): { lost: boolean; nextLostTimer: number } {
  if (params.isHiding || params.smokeConcealed) {
    return { lost: true, nextLostTimer: 0 };
  }
  if (params.currentlyDetected) {
    return { lost: false, nextLostTimer: 0 };
  }
  const nextTimer = params.lostTimer + params.dt;
  const maxWait = params.maxLostSeconds ?? 2.2;
  const farWait = params.farLostSeconds ?? 1.0;
  const outOfRange = params.distance > params.trackRange * 1.45;
  if (nextTimer >= (outOfRange ? farWait : maxWait)) {
    return { lost: true, nextLostTimer: 0 };
  }
  return { lost: false, nextLostTimer: nextTimer };
}

export function findNearestPatrolIndex(
  patrolPoints: Array<{ x: number; y: number }>,
  x: number,
  y: number
): number {
  if (patrolPoints.length <= 1) return 0;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < patrolPoints.length; i++) {
    const d = Math.hypot(patrolPoints[i].x - x, patrolPoints[i].y - y);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function computeGridNextWaypoint(
  grid: TileKind[][],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): { x: number; y: number } {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return { x: toX, y: toY };

  const sx = Math.max(0, Math.min(cols - 1, Math.floor(fromX)));
  const sy = Math.max(0, Math.min(rows - 1, Math.floor(fromY)));
  const tx = Math.max(0, Math.min(cols - 1, Math.floor(toX)));
  const ty = Math.max(0, Math.min(rows - 1, Math.floor(toY)));

  if (sx === tx && sy === ty) {
    return { x: toX, y: toY };
  }

  // If unobstructed clear sightline with safe margin around corners, steer directly
  if (
    Math.hypot(toX - fromX, toY - fromY) <= 1.35 &&
    hasLineOfSight(grid, fromX, fromY, toX, toY)
  ) {
    return { x: toX, y: toY };
  }

  const total = rows * cols;
  const visited = new Uint8Array(total);
  const parent = new Int32Array(total).fill(-1);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const startIdx = sy * cols + sx;
  const goalIdx = ty * cols + tx;
  visited[startIdx] = 1;
  queue[tail++] = startIdx;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let found = false;
  while (head < tail) {
    const cur = queue[head++];
    if (cur === goalIdx) {
      found = true;
      break;
    }
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    for (let d = 0; d < 4; d++) {
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const nIdx = ny * cols + nx;
      if (visited[nIdx]) continue;
      if (isTileSolid(grid[ny]?.[nx], false)) continue;
      visited[nIdx] = 1;
      parent[nIdx] = cur;
      queue[tail++] = nIdx;
    }
  }

  if (!found) {
    return { x: toX, y: toY };
  }

  // Walk back from goal to find the immediate next tile after start
  let stepIdx = goalIdx;
  while (parent[stepIdx] !== -1 && parent[stepIdx] !== startIdx) {
    stepIdx = parent[stepIdx];
  }
  const nextX = stepIdx % cols;
  const nextY = Math.floor(stepIdx / cols);
  return { x: nextX + 0.5, y: nextY + 0.5 };
}

