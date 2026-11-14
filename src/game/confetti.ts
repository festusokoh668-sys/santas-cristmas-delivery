export type ConfettiShape = 'ribbon' | 'circle' | 'star' | 'diamond';

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: ConfettiShape;
  rotation: number;
  vr: number;
  tilt: number;
  tiltSpeed: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
}

export const CONFETTI_COLORS = [
  '#ef4444', // Crimson
  '#10b981', // Emerald
  '#fbbf24', // Holiday Gold
  '#38bdf8', // Icy Sky
  '#f8fafc', // Snow White
  '#f472b6', // Candy Pink
  '#fb923c', // Tangerine
] as const;

const CONFETTI_SHAPES: readonly ConfettiShape[] = ['ribbon', 'ribbon', 'diamond', 'star', 'circle'];

export interface ConfettiBurstOptions {
  width: number;
  height: number;
  reducedMotion?: boolean;
  wave?: number;
}

function createParticle(
  x: number,
  y: number,
  angle: number,
  speed: number,
  index: number,
  gravity: number,
  lifeMin: number,
  lifeSpan: number
): ConfettiParticle {
  const maxLife = lifeMin + Math.random() * lifeSpan;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 6 + (index % 5) * 1.4,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    shape: CONFETTI_SHAPES[index % CONFETTI_SHAPES.length],
    rotation: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 9,
    tilt: Math.random() * Math.PI * 2,
    tiltSpeed: 5 + Math.random() * 6,
    life: maxLife,
    maxLife,
    gravity,
    drag: 0.985,
  };
}

export function createConfettiExplosion(options: ConfettiBurstOptions): ConfettiParticle[] {
  const { width, height, reducedMotion = false, wave = 0 } = options;
  if (reducedMotion || width <= 0 || height <= 0) {
    return [];
  }

  const out: ConfettiParticle[] = [];
  const scale = Math.max(0.65, Math.min(1.25, Math.min(width, height) / 760));

  if (wave === 0) {
    // Center celebratory starburst
    const cx = width * 0.5;
    const cy = height * 0.42;
    const centerCount = 56;
    for (let i = 0; i < centerCount; i++) {
      const ang = (Math.PI * 2 * i) / centerCount + (Math.random() - 0.5) * 0.25;
      const spd = (240 + Math.random() * 440) * scale;
      const p = createParticle(cx, cy, ang, spd, i, 560 * scale, 2.2, 1.1);
      p.vy -= 140 * scale;
      out.push(p);
    }

    // Left festive cannon
    const lx = width * 0.14;
    const ly = height * 0.84;
    for (let i = 0; i < 32; i++) {
      const ang = -Math.PI * 0.38 + (Math.random() - 0.5) * 0.45;
      const spd = (520 + Math.random() * 380) * scale;
      out.push(createParticle(lx, ly, ang, spd, i + 2, 540 * scale, 2.4, 1.1));
    }

    // Right festive cannon
    const rx = width * 0.86;
    const ry = height * 0.84;
    for (let i = 0; i < 32; i++) {
      const ang = -Math.PI * 0.62 + (Math.random() - 0.5) * 0.45;
      const spd = (520 + Math.random() * 380) * scale;
      out.push(createParticle(rx, ry, ang, spd, i + 4, 540 * scale, 2.4, 1.1));
    }
  } else {
    // Secondary celebratory twin firework pop
    const origins = [
      { x: width * 0.28, y: height * 0.3 },
      { x: width * 0.72, y: height * 0.3 },
    ];
    origins.forEach((orig, oIdx) => {
      for (let i = 0; i < 30; i++) {
        const ang = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.22;
        const spd = (190 + Math.random() * 320) * scale;
        const p = createParticle(orig.x, orig.y, ang, spd, i + oIdx * 3, 460 * scale, 2.0, 0.9);
        p.vy -= 90 * scale;
        out.push(p);
      }
    });
  }

  return out;
}

export function stepConfettiParticles(particles: ConfettiParticle[], dt: number): number {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);
  let alive = 0;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.life <= 0) continue;

    p.life -= clampedDt;
    if (p.life <= 0) {
      p.life = 0;
      continue;
    }

    const dragFactor = Math.pow(p.drag, clampedDt * 60);
    p.vx *= dragFactor;
    p.vy = p.vy * dragFactor + p.gravity * clampedDt;

    // Gentle aerodynamic flutter
    p.tilt += p.tiltSpeed * clampedDt;
    p.rotation += p.vr * clampedDt;
    p.x += (p.vx + Math.sin(p.tilt) * 32) * clampedDt;
    p.y += p.vy * clampedDt;
    alive++;
  }

  return alive;
}
