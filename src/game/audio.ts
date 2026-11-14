import { GameSettings, MusicMotif } from './types';

const CITY_SCALES: Record<MusicMotif, { tempoMs: number; notes: number[]; wave: OscillatorType }> = {
  north_pole: { tempoMs: 360, notes: [523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 587.33], wave: 'triangle' },
  new_york: { tempoMs: 300, notes: [587.33, 698.46, 880, 783.99, 698.46, 659.25, 587.33, 523.25], wave: 'sine' },
  london: { tempoMs: 380, notes: [493.88, 587.33, 659.25, 739.99, 659.25, 587.33, 523.25, 493.88], wave: 'triangle' },
  paris: { tempoMs: 340, notes: [523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33], wave: 'sine' },
  lagos: { tempoMs: 260, notes: [523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25, 783.99], wave: 'triangle' },
  tokyo: { tempoMs: 240, notes: [587.33, 659.25, 880, 987.77, 1174.66, 987.77, 880, 659.25], wave: 'sine' },
  rio: { tempoMs: 255, notes: [523.25, 659.25, 783.99, 880, 1046.5, 880, 783.99, 659.25], wave: 'triangle' },
  sydney: { tempoMs: 290, notes: [587.33, 739.99, 880, 987.77, 880, 739.99, 659.25, 587.33], wave: 'sine' },
  dubai: { tempoMs: 320, notes: [523.25, 554.37, 698.46, 783.99, 830.61, 783.99, 698.46, 554.37], wave: 'triangle' },
  finale: { tempoMs: 250, notes: [523.25, 659.25, 783.99, 1046.5, 987.77, 880, 783.99, 1046.5], wave: 'triangle' },
};

export const AMBIENT_CHIME_NOTES = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 1975.53];
export const SLEIGH_BELL_FREQS = [2637.02, 3135.96, 3520.0, 4186.01, 4698.63];

export type AmbientHolidayCue = 'sleigh_bells' | 'wind_chimes' | 'twilight_combo';

export function pickAmbientHolidayCue(step: number, randomValue = 0.5): AmbientHolidayCue {
  const mod = Math.abs(step) % 5;
  if (mod === 0 || mod === 3) return 'sleigh_bells';
  if (mod === 1 || mod === 4) return 'wind_chimes';
  return randomValue < 0.5 ? 'twilight_combo' : 'wind_chimes';
}

export class HolidayAudioEngine {
  private ctx: AudioContext | null = null;
  private settings: GameSettings;
  private musicTimer: number | null = null;
  private ambientTimer: number | null = null;
  private step = 0;
  private ambientStep = 0;
  private currentMotif: MusicMotif = 'north_pole';
  private isPlayingMusic = false;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  public updateSettings(settings: GameSettings) {
    this.settings = settings;
    if (settings.muted) {
      this.stopMusicTimerOnly();
      this.stopAmbientLoop();
      return;
    }
    if (this.isPlayingMusic) {
      if (settings.musicVolume <= 0.01) {
        this.stopMusicTimerOnly();
      } else if (this.musicTimer === null) {
        this.startMusicTimer();
      }
      if (settings.sfxVolume <= 0.01) {
        this.stopAmbientLoop();
      } else if (this.ambientTimer === null) {
        this.startAmbientLoop();
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.settings.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public startMusic(motif: MusicMotif) {
    this.currentMotif = motif;
    this.isPlayingMusic = true;
    this.stopMusicTimerOnly();
    this.startAmbientLoop();
    if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
    this.startMusicTimer();
  }

  private startMusicTimer() {
    this.stopMusicTimerOnly();
    if (typeof window === 'undefined') return;
    const cfg = CITY_SCALES[this.currentMotif];
    this.step = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.isPlayingMusic || this.settings.muted || this.settings.musicVolume <= 0.01) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const freq = cfg.notes[this.step % cfg.notes.length];
      this.playTone(ctx, freq, cfg.wave, 0.14, this.settings.musicVolume * 0.11);
      if (this.step % 2 === 0) {
        this.playTone(ctx, freq * 0.5, 'sine', 0.22, this.settings.musicVolume * 0.08);
      }
      this.step++;
    }, cfg.tempoMs);
  }

  private startAmbientLoop() {
    this.stopAmbientLoop();
    if (typeof window === 'undefined') return;
    if (!this.isPlayingMusic || this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    this.scheduleNextAmbient(2400);
  }

  private scheduleNextAmbient(delayMs?: number) {
    if (typeof window === 'undefined') return;
    if (!this.isPlayingMusic || this.settings.muted || this.settings.sfxVolume <= 0.01) {
      this.ambientTimer = null;
      return;
    }
    const waitMs = delayMs ?? 3800 + Math.floor(Math.random() * 3200);
    this.ambientTimer = window.setTimeout(() => {
      this.ambientTimer = null;
      if (!this.isPlayingMusic || this.settings.muted || this.settings.sfxVolume <= 0.01) return;
      const cue = pickAmbientHolidayCue(this.ambientStep++, Math.random());
      if (cue === 'sleigh_bells') {
        this.playDistantSleighBells(0.85 + Math.random() * 0.3);
      } else if (cue === 'wind_chimes') {
        this.playWindChimes(0.85 + Math.random() * 0.3);
      } else {
        this.playWindChimes(0.75);
        this.playDistantSleighBells(0.65);
      }
      this.scheduleNextAmbient();
    }, waitMs);
  }

  private stopAmbientLoop() {
    if (this.ambientTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  private stopMusicTimerOnly() {
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public stopMusic() {
    this.isPlayingMusic = false;
    this.stopMusicTimerOnly();
    this.stopAmbientLoop();
  }

  public resumeMusic() {
    if (!this.isPlayingMusic) {
      this.startMusic(this.currentMotif);
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    duration: number,
    gainPeak: number,
    delay = 0,
    endFreq?: number
  ) {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, gainPeak), now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playCookieCollect(comboIndex = 0) {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.22;
    const pitchBoost = 1 + Math.min(6, comboIndex) * 0.04;
    this.playTone(ctx, 660 * pitchBoost, 'triangle', 0.12, v, 0);
    this.playTone(ctx, 880 * pitchBoost, 'sine', 0.16, v * 0.9, 0.06);
  }

  public playTrapHit() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.24;
    this.playTone(ctx, 320, 'sawtooth', 0.18, v * 0.65, 0, 140);
    this.playTone(ctx, 210, 'square', 0.16, v * 0.4, 0.09, 110);
  }

  public playShieldBlock() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.22;
    this.playTone(ctx, 740, 'sine', 0.16, v, 0, 1040);
  }

  public playDeliveryComplete() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.25;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone(ctx, f, 'triangle', 0.2, v, idx * 0.065);
    });
  }

  public playPowerUp() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.22;
    [587.33, 739.99, 880, 1174.66].forEach((f, idx) => {
      this.playTone(ctx, f, 'sine', 0.14, v, idx * 0.05);
    });
  }

  public playSecretUnlock() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.25;
    [440, 554.37, 659.25, 880, 1108.73].forEach((f, idx) => {
      this.playTone(ctx, f, 'triangle', 0.22, v, idx * 0.07);
    });
  }

  public playPortalUnlock() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.26;
    [523.25, 659.25, 783.99, 987.77, 1318.5].forEach((f, idx) => {
      this.playTone(ctx, f, 'sine', 0.28, v, idx * 0.08);
    });
  }

  public playVictory() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.28;
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      this.playTone(ctx, f, 'triangle', 0.28, v, idx * 0.11);
    });
  }

  public playAlertSfx() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.24;
    this.playTone(ctx, 587.33, 'sawtooth', 0.14, v * 0.65, 0, 880);
    this.playTone(ctx, 783.99, 'square', 0.18, v * 0.5, 0.09, 1046.5);
  }

  public playDecoyThrow() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.2;
    this.playTone(ctx, 480, 'sine', 0.12, v, 0, 920);
    this.playTone(ctx, 1180, 'triangle', 0.11, v * 0.85, 0.16);
  }

  public playHideToggle() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.18;
    this.playTone(ctx, 360, 'sine', 0.1, v, 0, 240);
  }

  public playEscapeSfx() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.22;
    [523.25, 659.25, 783.99].forEach((f, idx) => {
      this.playTone(ctx, f, 'sine', 0.15, v, idx * 0.06);
    });
  }

  public playDefeat() {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const v = this.settings.sfxVolume * 0.24;
    [392, 349.23, 311.13, 261.63].forEach((f, idx) => {
      this.playTone(ctx, f, 'sawtooth', 0.26, v * 0.65, idx * 0.14);
    });
  }

  public playDistantSleighBells(intensity = 1) {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const baseGain = this.settings.sfxVolume * 0.048 * Math.max(0.2, Math.min(1.4, intensity));
    // Soft metallic shimmer cluster evoking distant sleigh bells across snowy rooftops
    const bellHits = 5;
    for (let i = 0; i < bellHits; i++) {
      const f = SLEIGH_BELL_FREQS[(i + this.ambientStep) % SLEIGH_BELL_FREQS.length];
      const delay = i * 0.048 + (i % 2) * 0.012;
      this.playTone(ctx, f, 'sine', 0.14, baseGain * (0.9 - i * 0.08), delay);
      this.playTone(ctx, f * 1.498, 'triangle', 0.09, baseGain * 0.35, delay + 0.005);
    }
  }

  public playWindChimes(intensity = 1) {
    const ctx = this.ensureContext();
    if (!ctx || this.settings.sfxVolume <= 0.01) return;
    const baseGain = this.settings.sfxVolume * 0.042 * Math.max(0.2, Math.min(1.4, intensity));
    const count = 4;
    const startIdx = this.ambientStep % AMBIENT_CHIME_NOTES.length;
    for (let i = 0; i < count; i++) {
      const freq = AMBIENT_CHIME_NOTES[(startIdx + i * 2) % AMBIENT_CHIME_NOTES.length];
      const delay = i * 0.145;
      this.playTone(ctx, freq, 'sine', 0.72, baseGain * (1 - i * 0.1), delay);
      this.playTone(ctx, freq * 2.01, 'sine', 0.42, baseGain * 0.25, delay + 0.01);
    }
  }

  public destroy() {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
