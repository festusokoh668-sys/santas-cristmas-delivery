/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HolidayAudioEngine } from './audio';
import { buildCityLevel } from './cities';
import {
  COSMETICS,
  calculateLevelSummary,
  canDeliverToHouse,
  createEmptyPowerUps,
  getFakeCookiePenalty,
  getGearBonuses,
  getPowerUpInfo,
  getTrapPadState,
  isPortalUnlocked,
  moveWithWallCollision,
} from './rules';
import {
  ActivePowerUps,
  CookieItem,
  Difficulty,
  FakeCookieKind,
  HudSnapshot,
  LevelInstance,
  LevelScoreSummary,
  PlayerProgress,
  StealthAbilityId,
} from './types';

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onLevelComplete: (summary: LevelScoreSummary) => void;
  onPauseRequested: () => void;
  onMissionEvent: (event: any) => void;
}

export class SantaMazeEngine2D {
  private mountEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private progress: PlayerProgress;
  private audio: HolidayAudioEngine;
  private callbacks: EngineCallbacks;

  private level!: LevelInstance;
  private running = false;
  private paused = false;
  private finished = false;
  private rafId: number | null = null;
  private lastTs = 0;
  private animTime = 0;

  // Santa state
  private santaX = 2.5;
  private santaY = 2.5;
  private santaDirX = 0;
  private santaDirY = 1;
  private santaYaw = 0;
  private santaRadius = 0.28;
  private santaWalkDist = 0;
  private slowTimer = 0;
  private slowFactor = 1;
  private invulnTimer = 0;
  private dashTimer = 0;
  private dashCooldown = 0;
  private hitstopTimer = 0;
  private shakeTrauma = 0;

  // Companion
  private reindeerX = 2.0;
  private reindeerY = 2.5;

  // Camera
  private camX = 2.5;
  private camY = 2.5;

  // Input
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private actionQueued = false;
  private dashQueued = false;
  private hideQueued = false;
  private decoyQueued = false;

  // Stealth & Game counters
  private sneakToggled = false;
  private isHiding = false;
  private hideGraceTimer = 0;
  private activeHidingSpotId: string | null = null;
  private noiseLevel = 0;
  private suspicionLevel = 0;
  private stance: 'walk' | 'sneak' | 'run' | 'hide' = 'walk';
  private stealthAbilities = {
    disguiseActive: 0,
    disguiseCooldown: 0,
    silentBootsActive: 0,
    silentBootsCooldown: 0,
    elfSmokeActive: 0,
    elfSmokeCooldown: 0,
    decoyCooldown: 0,
  };
  private decoySnowball = { active: false, x: 0, y: 0, vx: 0, vy: 0 };

  private hearts = 3;
  private maxHearts = 3;
  private realCookiesCollected = 0;
  private deliveriesDone = 0;
  private heldKeys = new Set<string>();
  private heldGateKeys = new Set<string>();
  private portalUnlocked = false;
  private score = 0;
  private trapsTriggered = 0;
  private secretRoomsFound = 0;
  private secretRoomDiscovered = false;
  private goldenPresentFound = false;
  private elfHelped = false;
  private niceMeter = 85;
  private elapsedSeconds = 0;
  private countdownRemaining: number | null = null;
  private activePowerUps: ActivePowerUps = createEmptyPowerUps();
  private hudSyncTimer = 0;

  private resizeObserver: ResizeObserver;

  constructor(
    mountEl: HTMLElement,
    progress: PlayerProgress,
    cityIndex: number,
    difficulty: Difficulty,
    audio: HolidayAudioEngine,
    callbacks: EngineCallbacks
  ) {
    this.mountEl = mountEl;
    this.progress = progress;
    this.audio = audio;
    this.callbacks = callbacks;

    this.canvas = document.createElement('canvas');
    this.canvas.dataset.testid = 'game-canvas-2d';
    this.canvas.className = 'block w-full h-full outline-none select-none';
    this.mountEl.prepend(this.canvas);

    const ctx2d = this.canvas.getContext('2d');
    if (!ctx2d) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx2d;

    this.handleResize();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.mountEl);

    this.loadLevel(cityIndex, difficulty, progress);
  }

  public loadLevel(cityIndex: number, difficulty: Difficulty, progress: PlayerProgress) {
    this.progress = progress;
    const gearBonuses = getGearBonuses(progress.equippedCosmetics.gear);
    this.maxHearts = gearBonuses.maxHearts;
    this.level = buildCityLevel(cityIndex, difficulty);

    this.santaX = this.level.spawn.x + 0.5;
    this.santaY = this.level.spawn.y + 0.5;
    this.reindeerX = this.santaX - 0.6;
    this.reindeerY = this.santaY;
    this.camX = this.santaX;
    this.camY = this.santaY;

    this.hearts = this.maxHearts;
    this.realCookiesCollected = 0;
    this.deliveriesDone = 0;
    this.heldKeys.clear();
    this.heldGateKeys.clear();
    this.portalUnlocked = false;
    this.score = 0;
    this.trapsTriggered = 0;
    this.secretRoomsFound = 0;
    this.secretRoomDiscovered = false;
    this.goldenPresentFound = false;
    this.elfHelped = false;
    this.niceMeter = 85;
    this.elapsedSeconds = 0;
    this.countdownRemaining = this.level.city.hasCountdown ? this.level.city.countdownSeconds : null;
    this.activePowerUps = createEmptyPowerUps();
    this.finished = false;
    this.paused = false;

    this.emitHud();
  }

  public notifyMissionCleared(_title: string, _coins: number) {}

  public setHideOnScreenPopups(_hide: boolean) {}

  private handleResize() {
    if (!this.mountEl) return;
    const width = Math.max(1, this.mountEl.clientWidth || window.innerWidth);
    const height = Math.max(1, this.mountEl.clientHeight || window.innerHeight);
    this.canvas.width = Math.round(width * window.devicePixelRatio);
    this.canvas.height = Math.round(height * window.devicePixelRatio);
    this.ctx.imageSmoothingEnabled = true;
  }

  public start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    this.audio.startMusic(this.level.city.musicMotif);
    this.loop(this.lastTs);
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    this.keys.clear();
    this.joyX = 0;
    this.joyY = 0;
    if (paused) {
      this.audio.stopMusic();
    } else if (!this.finished) {
      this.audio.resumeMusic();
    }
  }

  public updateProgress(progress: PlayerProgress) {
    this.progress = progress;
  }

  public destroy() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver.disconnect();
    this.audio.stopMusic();
    if (this.canvas.parentNode === this.mountEl) {
      this.mountEl.removeChild(this.canvas);
    }
  }

  public handleKeyDown(code: string) {
    if (this.paused || this.finished) return;
    if (code === 'Space') this.actionQueued = true;
    if (code === 'KeyC') this.toggleSneak();
    if (code === 'KeyE') this.hideQueued = true;
    if (code === 'KeyQ') this.decoyQueued = true;
    if (code === 'Digit1') this.activateAbility('disguise');
    if (code === 'Digit2') this.activateAbility('silent_boots');
    if (code === 'Digit3') this.activateAbility('elf_smoke');
    this.keys.add(code);
  }

  public handleKeyUp(code: string) {
    this.keys.delete(code);
  }

  public clearInputs() {
    this.keys.clear();
    this.joyX = 0;
    this.joyY = 0;
  }

  public setJoystickVector(x: number, y: number) {
    this.joyX = x;
    this.joyY = y;
  }

  public toggleSneak() {
    this.sneakToggled = !this.sneakToggled;
    this.audio.playHideToggle();
  }

  public triggerHide() {
    this.hideQueued = true;
  }

  public throwDecoy() {
    this.decoyQueued = true;
  }

  public triggerAction() {
    this.actionQueued = true;
  }

  public activateAbility(id: StealthAbilityId) {
    const sa = this.stealthAbilities;
    if (id === 'disguise' && sa.disguiseCooldown <= 0) {
      sa.disguiseActive = 7.0;
      sa.disguiseCooldown = 18.0;
      this.audio.playPowerUp();
    } else if (id === 'silent_boots' && sa.silentBootsCooldown <= 0) {
      sa.silentBootsActive = 9.0;
      sa.silentBootsCooldown = 20.0;
      this.audio.playPowerUp();
    } else if (id === 'elf_smoke' && sa.elfSmokeCooldown <= 0) {
      sa.elfSmokeActive = 6.0;
      sa.elfSmokeCooldown = 22.0;
      this.audio.playPowerUp();
    }
  }

  private loop = (ts: number) => {
    if (!this.running) return;
    const rawDt = Math.max(0, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    const dt = Math.min(0.05, rawDt);

    this.tick(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private tick(dt: number) {
    this.animTime += dt;
    if (this.paused || this.finished) return;

    this.elapsedSeconds += dt;
    if (this.countdownRemaining !== null) {
      this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
      if (this.countdownRemaining <= 0) {
        this.finishLevel(false, 'timeout');
        return;
      }
    }

    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer === 0) this.slowFactor = 1;
    }
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.dashTimer > 0) this.dashTimer = Math.max(0, this.dashTimer - dt);

    const gearBonuses = getGearBonuses(this.progress.equippedCosmetics.gear);
    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt * gearBonuses.dashRechargeMultiplier);
    }

    const sa = this.stealthAbilities;
    const cdMult = gearBonuses.abilityCooldownMultiplier;
    sa.disguiseActive = Math.max(0, sa.disguiseActive - dt);
    sa.disguiseCooldown = Math.max(0, sa.disguiseCooldown - dt * cdMult);
    sa.silentBootsActive = Math.max(0, sa.silentBootsActive - dt);
    sa.silentBootsCooldown = Math.max(0, sa.silentBootsCooldown - dt * cdMult);
    sa.elfSmokeActive = Math.max(0, sa.elfSmokeActive - dt);
    sa.elfSmokeCooldown = Math.max(0, sa.elfSmokeCooldown - dt * cdMult);
    sa.decoyCooldown = Math.max(0, sa.decoyCooldown - dt * cdMult);

    const apu = this.activePowerUps;
    for (const k of Object.keys(apu) as Array<keyof ActivePowerUps>) {
      if (apu[k] > 0) {
        apu[k] = Math.max(0, apu[k] - dt);
      }
    }

    if (this.hideGraceTimer > 0) this.hideGraceTimer = Math.max(0, this.hideGraceTimer - dt);

    // Movement Input
    let ix = this.joyX;
    let iy = this.joyY;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) ix -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) ix += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) iy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) iy += 1;

    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }

    // Handle Hide toggle [E]
    if (this.hideQueued) {
      this.hideQueued = false;
      if (this.isHiding) {
        this.isHiding = false;
        this.activeHidingSpotId = null;
        this.audio.playHideToggle();
      } else {
        let bestSpot: any = null;
        let bestD = 1.15;
        for (const hs of this.level.hidingSpots) {
          const d = Math.hypot(hs.x + 0.5 - this.santaX, hs.y + 0.5 - this.santaY);
          if (d < bestD) {
            bestD = d;
            bestSpot = hs;
          }
        }
        if (bestSpot) {
          this.isHiding = true;
          this.hideGraceTimer = 0.28;
          this.activeHidingSpotId = bestSpot.id;
          this.santaX = bestSpot.x + 0.5;
          this.santaY = bestSpot.y + 0.5;
          this.audio.playHideToggle();
        }
      }
    } else if (this.isHiding && mag > 0.3 && this.hideGraceTimer <= 0) {
      this.isHiding = false;
      this.activeHidingSpotId = null;
      this.audio.playHideToggle();
    }

    const isSprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    this.stance = this.isHiding
      ? 'hide'
      : this.sneakToggled
      ? 'sneak'
      : isSprinting && mag > 0.1
      ? 'run'
      : 'walk';

    const currentTile = this.level.grid[Math.floor(this.santaY)]?.[Math.floor(this.santaX)];
    const onIce = currentTile === 'ice';
    const dashBoost = this.dashTimer > 0 ? 1.95 : 1;
    const iceBoost = onIce ? 1.22 : 1;
    const stanceSpeedMult =
      this.stance === 'hide' ? 0 : this.stance === 'sneak' ? 0.64 : this.stance === 'run' ? 1.44 : 1.0;
    const speedTilesPerSec =
      4.45 * stanceSpeedMult * this.slowFactor * dashBoost * iceBoost * gearBonuses.speedMultiplier;

    let actuallyMoved = false;
    if (!this.isHiding && mag > 0.05) {
      this.santaDirX = ix / (mag > 1 ? 1 : mag);
      this.santaDirY = iy / (mag > 1 ? 1 : mag);
      this.santaYaw = Math.atan2(this.santaDirX, this.santaDirY);

      const stepDx = ix * speedTilesPerSec * dt;
      const stepDy = iy * speedTilesPerSec * dt;
      const res = moveWithWallCollision(
        this.level.grid,
        this.santaX,
        this.santaY,
        stepDx,
        stepDy,
        this.santaRadius,
        false
      );
      const movedDist = Math.hypot(res.x - this.santaX, res.y - this.santaY);
      actuallyMoved = movedDist > 0.001;
      this.santaX = res.x;
      this.santaY = res.y;
      this.santaWalkDist += movedDist;
    }

    // Teleportation Portals Check
    if (this.level.portals && this.level.portals.length >= 2) {
      for (const p of this.level.portals) {
        const pd = Math.hypot(p.x + 0.5 - this.santaX, p.y + 0.5 - this.santaY);
        if (pd < 0.45 && !this.portalCooldown) {
          const target = this.level.portals.find((tp) => tp.id !== p.id);
          if (target) {
            this.santaX = target.x + 0.5;
            this.santaY = target.y + 0.5;
            this.portalCooldown = 1.2;
            this.audio.playPortalUnlock();
          }
        }
      }
    }
    if (this.portalCooldown && this.portalCooldown > 0) {
      this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    }

    // Companion Reindeer
    const targetRx = this.santaX - this.santaDirX * 0.65;
    const targetRy = this.santaY - this.santaDirY * 0.65;
    this.reindeerX += (targetRx - this.reindeerX) * Math.min(1, dt * 5.2);
    this.reindeerY += (targetRy - this.reindeerY) * Math.min(1, dt * 5.2);

    // Camera follow
    this.camX += (this.santaX - this.camX) * Math.min(1, dt * 9.5);
    this.camY += (this.santaY - this.camY) * Math.min(1, dt * 9.5);

    // Check Cookies
    for (const c of this.level.cookies) {
      if (c.collected || c.triggered) continue;
      const dist = Math.hypot(c.x + 0.5 - this.santaX, c.y + 0.5 - this.santaY);
      if (dist < 0.62 * gearBonuses.pickupRadiusMultiplier) {
        if (c.isReal) {
          c.collected = true;
          this.realCookiesCollected++;
          this.score += 50;
          this.niceMeter = Math.min(100, this.niceMeter + 2);
          this.audio.playCookieCollect(this.realCookiesCollected);
          this.callbacks.onMissionEvent({ type: 'cookie' });
          this.checkPortalUnlock();
        } else {
          c.triggered = true;
          this.trapsTriggered++;
          const pen = getFakeCookiePenalty(c.kind as FakeCookieKind);
          this.score = Math.max(0, this.score + pen.scoreDelta);
          this.niceMeter = Math.max(0, this.niceMeter + pen.niceDelta);
          this.slowTimer = pen.slowDuration;
          this.slowFactor = pen.slowFactor;
          this.audio.playTrapHit();
        }
      }
    }

    // Check Power-Ups
    for (const pu of this.level.powerUps) {
      if (pu.collected) continue;
      const dist = Math.hypot(pu.x + 0.5 - this.santaX, pu.y + 0.5 - this.santaY);
      if (dist < 0.68) {
        pu.collected = true;
        const info = getPowerUpInfo(pu.kind);
        this.activePowerUps[pu.kind] = info.duration;
        if (pu.kind === 'magical_milk' && this.hearts < this.maxHearts) {
          this.hearts++;
        }
        this.score += 75;
        this.audio.playPowerUp();
        this.callbacks.onMissionEvent({ type: 'powerup' });
      }
    }

    // Check Keys
    for (const k of this.level.keys) {
      if (k.collected) continue;
      const dist = Math.hypot(k.x + 0.5 - this.santaX, k.y + 0.5 - this.santaY);
      if (dist < 0.68) {
        k.collected = true;
        if (k.kind === 'gate') {
          this.heldGateKeys.add(k.id);
          this.score += 100;
          this.audio.playPowerUp();
          this.checkPortalUnlock();
        } else {
          this.heldKeys.add(k.id);
          this.score += 80;
          this.audio.playPowerUp();
        }
      }
    }

    // Check Secret Switches
    for (const sw of this.level.switches) {
      if (sw.activated) continue;
      const dist = Math.hypot(sw.x + 0.5 - this.santaX, sw.y + 0.5 - this.santaY);
      if (dist < 0.68) {
        sw.activated = true;
        for (const t of sw.unlocksTiles) {
          if (this.level.grid[t.y]?.[t.x] === 'secret_wall') {
            this.level.grid[t.y][t.x] = 'secret_floor';
          }
        }
        this.secretRoomsFound++;
        this.score += 150;
        this.audio.playPortalUnlock();
      }
    }

    // Check Delivery Houses [Space]
    if (this.actionQueued) {
      this.actionQueued = false;
      for (const h of this.level.houses) {
        if (!h.delivered && Math.hypot(h.x + 0.5 - this.santaX, h.y + 0.5 - this.santaY) < 1.35) {
          if (canDeliverToHouse(h, this.heldKeys)) {
            h.delivered = true;
            this.deliveriesDone++;
            this.score += 120;
            this.niceMeter = Math.min(100, this.niceMeter + 4);
            this.audio.playDeliveryComplete();
            this.callbacks.onMissionEvent({ type: 'delivery' });
            this.checkPortalUnlock();
          }
        }
      }
    }

    // Dodge Dash
    if (this.dashQueued && this.dashCooldown <= 0 && this.dashTimer <= 0) {
      this.dashTimer = 0.32;
      this.dashCooldown = 2.3;
      this.audio.playPowerUp();
    }
    this.dashQueued = false;

    // Check Portal Entry
    const dPortal = Math.hypot(
      this.level.portal.x + 0.5 - this.santaX,
      this.level.portal.y + 0.5 - this.santaY
    );
    if (this.portalUnlocked && dPortal < 0.78) {
      this.finishLevel(true);
      return;
    }

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private portalCooldown = 0;

  private checkPortalUnlock() {
    if (
      !this.portalUnlocked &&
      this.realCookiesCollected >= this.level.city.requiredCookies &&
      this.deliveriesDone >= this.level.city.requiredDeliveries &&
      this.heldGateKeys.size >= this.level.requiredGateKeys
    ) {
      this.portalUnlocked = true;
      this.audio.playPortalUnlock();
    }
  }

  private finishLevel(won: boolean, defeatReason?: 'timeout' | 'hearts') {
    if (this.finished) return;
    this.finished = true;
    this.audio.stopMusic();
    if (won) {
      this.audio.playVictory();
    } else {
      this.audio.playDefeat();
    }

    const summary = calculateLevelSummary({
      cityIndex: this.level.city.index,
      cityName: this.level.city.city,
      difficulty: this.level.difficulty,
      baseScore: this.score,
      realCookiesCollected: this.realCookiesCollected,
      requiredCookies: this.level.city.requiredCookies,
      deliveriesCompleted: this.deliveriesDone,
      requiredDeliveries: this.level.city.requiredDeliveries,
      trapsTriggered: this.trapsTriggered,
      secretRoomsFound: this.secretRoomsFound,
      goldenPresentFound: this.goldenPresentFound,
      elfHelped: this.elfHelped,
      niceMeter: this.niceMeter,
      elapsedSeconds: this.elapsedSeconds,
      won,
      defeatReason,
    });

    this.emitHud();
    this.callbacks.onLevelComplete(summary);
  }

  private emitHud() {
    const pal = this.level.city.palette;
    const hud: HudSnapshot = {
      cityIndex: this.level.city.index,
      cityName: this.level.city.city,
      subtitle: this.level.city.subtitle,
      difficulty: this.level.difficulty,
      realCookies: this.realCookiesCollected,
      requiredCookies: this.level.city.requiredCookies,
      deliveriesDone: this.deliveriesDone,
      requiredDeliveries: this.level.city.requiredDeliveries,
      totalHouses: this.level.houses.length,
      keysHeld: this.heldKeys.size,
      totalKeys: this.level.keys.length,
      gateKeysHeld: this.heldGateKeys.size,
      requiredGateKeys: this.level.requiredGateKeys,
      missionCleared: this.portalUnlocked,
      niceMeter: Math.round(this.niceMeter),
      score: this.score,
      coinsEarned: 0,
      trapsTriggered: this.trapsTriggered,
      secretRoomsFound: this.secretRoomsFound,
      portalUnlocked: this.portalUnlocked,
      countdownRemaining: this.countdownRemaining,
      elapsedSeconds: this.elapsedSeconds,
      activePowerUps: this.activePowerUps,
      nearbyPrompt: null,
      statusBanner: null,
      elfClue: null,
      santaSpeedPenalty: this.slowFactor,
      goldenPresentFound: this.goldenPresentFound,
      hearts: this.hearts,
      maxHearts: this.maxHearts,
      dashReady: this.dashCooldown <= 0,
      dashCooldownRatio: Math.max(0, Math.min(1, this.dashCooldown / 2.3)),
      stance: this.stance,
      noiseLevel: Math.round(this.noiseLevel),
      suspicionLevel: Math.round(this.suspicionLevel),
      surfaceLabel: pal.weather === 'snow' ? 'Snowy Path' : 'City Pavement',
      inShadow: false,
      isHiding: this.isHiding,
      isChased: false,
      disguised: this.stealthAbilities.disguiseActive > 0,
      stealthAbilities: {
        disguiseActive: this.stealthAbilities.disguiseActive,
        disguiseCooldown: this.stealthAbilities.disguiseCooldown,
        silentBootsActive: this.stealthAbilities.silentBootsActive,
        silentBootsCooldown: this.stealthAbilities.silentBootsCooldown,
        elfSmokeActive: this.stealthAbilities.elfSmokeActive,
        elfSmokeCooldown: this.stealthAbilities.elfSmokeCooldown,
        decoyCooldown: this.stealthAbilities.decoyCooldown,
      },
      miniMap: null,
    };
    this.callbacks.onHudUpdate(hud);
  }

  private render() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const pal = this.level.city.palette;
    ctx.fillStyle = pal.skyBottom;
    ctx.fillRect(0, 0, width, height);

    const tileSize = 48 * window.devicePixelRatio;
    const screenCenterX = width / 2;
    const screenCenterY = height / 2;

    ctx.save();
    ctx.translate(screenCenterX, screenCenterY);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.translate(-this.camX * 48, -this.camY * 48);

    const minTx = Math.max(0, Math.floor(this.camX - width / 96));
    const maxTx = Math.min(this.level.cols, Math.ceil(this.camX + width / 96));
    const minTy = Math.max(0, Math.floor(this.camY - height / 96));
    const maxTy = Math.min(this.level.rows, Math.ceil(this.camY + height / 96));

    // Render floor tiles
    for (let y = minTy; y < maxTy; y++) {
      for (let x = minTx; x < maxTx; x++) {
        const tile = this.level.grid[y]?.[x];
        const isWall = tile === 'wall' || tile === 'secret_wall';

        ctx.fillStyle = isWall
          ? pal.wallFront
          : (x + y) % 2 === 0
          ? pal.floorPrimary
          : pal.floorSecondary;
        ctx.fillRect(x * 48, y * 48, 48, 48);

        if (isWall) {
          ctx.fillStyle = pal.wallTop;
          ctx.fillRect(x * 48 + 3, y * 48 + 3, 42, 14);
          ctx.strokeStyle = pal.wallTrim;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x * 48 + 2, y * 48 + 2, 44, 44);
        } else {
          ctx.strokeStyle = 'rgba(0,0,0,0.06)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * 48, y * 48, 48, 48);
        }
      }
    }

    // Render Teleportation Portals
    if (this.level.portals) {
      for (const p of this.level.portals) {
        const px = (p.x + 0.5) * 48;
        const py = (p.y + 0.5) * 48;
        const pulse = 18 + Math.sin(this.animTime * 6) * 3;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(px, py, pulse * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render Delivery Houses
    for (const h of this.level.houses) {
      const hx = h.x * 48;
      const hy = h.y * 48;
      ctx.fillStyle = h.delivered ? '#10b981' : '#b45309';
      ctx.fillRect(hx + 4, hy + 4, 40, 40);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(hx + 14, hy + 20, 20, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(h.delivered ? '✓' : '🎁', hx + 24, hy + 16);
    }

    // Render Portal
    const portalX = (this.level.portal.x + 0.5) * 48;
    const portalY = (this.level.portal.y + 0.5) * 48;
    ctx.fillStyle = this.portalUnlocked ? '#10b981' : '#64748b';
    ctx.beginPath();
    ctx.arc(portalX, portalY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.portalUnlocked ? '🌀' : '🔒', portalX, portalY + 5);

    // Render Cookies
    for (const c of this.level.cookies) {
      if (c.collected || c.triggered) continue;
      const cx = (c.x + 0.5) * 48;
      const cy = (c.y + 0.5) * 48;
      ctx.fillStyle = c.isReal ? '#f59e0b' : '#cbd5e1';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Render Power-Ups
    for (const pu of this.level.powerUps) {
      if (pu.collected) continue;
      const pux = (pu.x + 0.5) * 48;
      const puy = (pu.y + 0.5) * 48;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(pux, puy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', pux, puy + 4);
    }

    // Render Keys
    for (const k of this.level.keys) {
      if (k.collected) continue;
      const kx = (k.x + 0.5) * 48;
      const ky = (k.y + 0.5) * 48;
      ctx.fillStyle = k.kind === 'gate' ? '#eab308' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(kx, ky, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔑', kx, ky + 4);
    }

    // Render Secret Switches
    for (const sw of this.level.switches) {
      if (sw.activated) continue;
      const swx = (sw.x + 0.5) * 48;
      const swy = (sw.y + 0.5) * 48;
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(swx, swy, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5b21b6';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎛️', swx, swy + 4);
    }

    // Render Santa
    const sx = this.santaX * 48;
    const sy = this.santaY * 48;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy - 8, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}
