import React, { useEffect, useRef } from 'react';
import {
  ConfettiParticle,
  createConfettiExplosion,
  stepConfettiParticles,
} from '../game/confetti';

interface ConfettiOverlayProps {
  active: boolean;
  triggerKey: string | number;
  reducedMotion?: boolean;
}

function drawConfettiParticle(ctx: CanvasRenderingContext2D, p: ConfettiParticle) {
  const fade = p.life / p.maxLife;
  const alpha = fade < 0.35 ? Math.max(0, fade / 0.35) : 1;
  if (alpha <= 0.01) return;

  const flipScaleY = Math.max(0.22, Math.abs(Math.cos(p.tilt)));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.scale(1, flipScaleY);
  ctx.fillStyle = p.color;

  const s = p.size;
  if (p.shape === 'ribbon') {
    ctx.fillRect(-s * 0.65, -s * 0.32, s * 1.3, s * 0.64);
  } else if (p.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(s * 0.46, 0);
    ctx.lineTo(0, s * 0.6);
    ctx.lineTo(-s * 0.46, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    // 4-point festive star
    const outer = s * 0.62;
    const inner = s * 0.24;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({
  active,
  triggerKey,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number | null = null;
    let waveTimerId: number | null = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
    };

    resize();
    window.addEventListener('resize', resize);

    const particles: ConfettiParticle[] = createConfettiExplosion({
      width,
      height,
      reducedMotion: false,
      wave: 0,
    });

    waveTimerId = window.setTimeout(() => {
      const waveTwo = createConfettiExplosion({
        width,
        height,
        reducedMotion: false,
        wave: 1,
      });
      particles.push(...waveTwo);
    }, 420);

    let lastTs = performance.now();
    const frame = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
      lastTs = ts;

      const alive = stepConfettiParticles(particles, dt);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        if (particles[i].life > 0) {
          drawConfettiParticle(ctx, particles[i]);
        }
      }

      if (alive > 0) {
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (waveTimerId !== null) clearTimeout(waveTimerId);
      window.removeEventListener('resize', resize);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, triggerKey, reducedMotion]);

  if (!active || reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="victory-confetti-canvas"
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-none w-full h-full"
    />
  );
};
