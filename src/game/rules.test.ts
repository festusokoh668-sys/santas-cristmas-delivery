import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIES, buildCityLevel, verifyLevelSolvability } from './cities';
import {
  COSMETICS,
  buyCosmetic,
  calculateLevelSummary,
  canDeliverToHouse,
  createDefaultProgress,
  getFakeCookiePenalty,
  getGearBonuses,
  isPortalUnlocked,
  moveWithWallCollision,
  parseProgress,
} from './rules';
import {
  computeGridNextWaypoint,
  findNearestPatrolIndex,
  shouldLoseTrack,
} from './stealth';
import { Difficulty, TileKind } from './types';

test('all 10 cities across all 3 difficulties are solvable and have clear spawn plazas', () => {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  for (const city of CITIES) {
    for (const diff of difficulties) {
      const level = buildCityLevel(city.index, diff);
      const check = verifyLevelSolvability(level);
      assert.equal(
        check.solvable,
        true,
        `City ${city.city} (${diff}) failed solvability: ${check.reason}`
      );
      assert.ok(
        check.reachableRealCookies >= level.city.requiredCookies,
        `Expected >= ${level.city.requiredCookies} reachable real cookies in ${city.city} (${diff}), got ${check.reachableRealCookies}`
      );
    }
  }
});

test('wall collision blocks solid walls and slides smoothly along open corridors', () => {
  const level = buildCityLevel(0, 'easy');
  const startX = level.spawn.x + 0.5;
  const startY = level.spawn.y + 0.5;

  // Attempt to tunnel straight out of bounds into outer wall
  const blocked = moveWithWallCollision(level.grid, 1.5, 1.5, -2.0, 0, 0.3);
  assert.ok(blocked.x >= 1.0, 'Santa must not pass through solid outer maze walls');

  // Small move inside the 3x3 spawn plaza succeeds cleanly
  const moved = moveWithWallCollision(level.grid, startX, startY, 0.25, 0, 0.3);
  assert.equal(moved.hitWall, false);
  assert.ok(Math.abs(moved.x - (startX + 0.25)) < 1e-6);
});

test('portal unlocks only when both required real cookies and required deliveries are met', () => {
  assert.equal(isPortalUnlocked(7, 8, 3, 3), false);
  assert.equal(isPortalUnlocked(8, 8, 2, 3), false);
  assert.equal(isPortalUnlocked(8, 8, 3, 3), true);
  assert.equal(isPortalUnlocked(12, 8, 4, 3), true);
});

test('locked delivery house requires matching key before delivery', () => {
  const lockedHouse = {
    id: 'h1',
    x: 5,
    y: 5,
    name: 'Royal Flat',
    type: 'locked_key' as const,
    delivered: false,
    requiresKeyId: 'key-1',
    lightProgress: 0,
  };
  assert.equal(canDeliverToHouse(lockedHouse, new Set()), false);
  assert.equal(canDeliverToHouse(lockedHouse, new Set(['key-1'])), true);
});

test('fake cookies impose non-fatal prank penalties and nice meter updates', () => {
  const frozen = getFakeCookiePenalty('frozen');
  assert.ok(frozen.slowFactor < 0.6);
  assert.ok(frozen.slowDuration > 1);
  assert.ok(frozen.niceDelta < 0);
});

test('scoring, star rating, coin rewards, and cosmetic purchases work deterministically', () => {
  const summary3 = calculateLevelSummary({
    cityIndex: 0,
    cityName: 'North Pole',
    difficulty: 'medium',
    baseScore: 900,
    realCookiesCollected: 10,
    requiredCookies: 10,
    deliveriesCompleted: 3,
    requiredDeliveries: 3,
    trapsTriggered: 0,
    secretRoomsFound: 1,
    goldenPresentFound: true,
    elfHelped: true,
    niceMeter: 96,
    elapsedSeconds: 80,
    won: true,
  });
  assert.equal(summary3.stars, 3);
  assert.ok(summary3.coinsEarned > 40);

  let progress = createDefaultProgress();
  progress = { ...progress, coins: 100 };
  const buyFail = buyCosmetic(progress, 'outfit_tropical_festive'); // costs 120
  assert.equal(buyFail.purchased, false);
  assert.equal(buyFail.progress.coins, 100);

  const buyOk = buyCosmetic(progress, 'outfit_royal_gold'); // costs 60
  assert.equal(buyOk.purchased, true);
  assert.equal(buyOk.progress.coins, 40);
  assert.equal(buyOk.progress.equippedCosmetics.outfit, 'outfit_royal_gold');
});

import {
  applyLevelSummaryToMissions,
  applyMissionEvent,
  claimAllMissionRewards,
  claimMissionReward,
  generateDailyMissions,
  resolveMissionClearProgression,
  syncDailyMissions,
} from './missions';
import { getTrapPadState } from './rules';
import {
  calculateStepNoise,
  computeSuspicionDelta,
  computeTrapPursuitStep,
  isLaserBarrierActive,
  isPointInVisionCone,
  isTargetTouchedByTrackingLight,
} from './stealth';

test('progress parser restores valid data and guards corrupted JSON, including theme', () => {
  const fallback = parseProgress('not-json');
  assert.equal(fallback.unlockedLevelIndex, 0);
  assert.equal(fallback.settings.theme, 'dark');

  const loaded = parseProgress(
    JSON.stringify({
      unlockedLevelIndex: 4,
      coins: 150,
      difficulty: 'hard',
      settings: { theme: 'light', muted: true },
    })
  );
  assert.equal(loaded.unlockedLevelIndex, 4);
  assert.equal(loaded.coins, 150);
  assert.equal(loaded.difficulty, 'hard');
  assert.equal(loaded.settings.theme, 'light');
  assert.equal(loaded.settings.muted, true);
});

test('daily missions generate 3 missions including 50 cookies and secret room under 3 minutes', () => {
  const dateKey = '2026-11-13';
  const board = generateDailyMissions(dateKey);
  assert.equal(board.dateKey, dateKey);
  assert.equal(board.missions.length, 3);

  const cookieMission = board.missions.find((m) => m.kind === 'collect_cookies');
  const secretMission = board.missions.find((m) => m.kind === 'secret_room_fast');
  assert.ok(cookieMission, 'Expected 50-cookie mission on anchor day');
  assert.equal(cookieMission.target, 50);
  assert.ok(secretMission, 'Expected secret room under 3 minutes mission on anchor day');
  assert.equal(secretMission.timeLimitSeconds, 180);

  // Secret room at 185s (> 3 mins) must NOT complete the timed secret room mission
  const tooSlow = applyMissionEvent(board, { type: 'secret_room', elapsedSeconds: 185 }, dateKey);
  assert.equal(tooSlow.newlyCompleted.length, 0);
  assert.equal(tooSlow.board.missions.find((m) => m.kind === 'secret_room_fast')?.completed, false);

  // Secret room at 120s (<= 3 mins) completes it
  const inTime = applyMissionEvent(tooSlow.board, { type: 'secret_room', elapsedSeconds: 120 }, dateKey);
  assert.equal(inTime.newlyCompleted.length, 1);
  assert.equal(inTime.board.missions.find((m) => m.kind === 'secret_room_fast')?.completed, true);

  // Collecting 50 cookies completes cookie mission
  let curBoard = inTime.board;
  for (let i = 0; i < 50; i++) {
    curBoard = applyMissionEvent(curBoard, { type: 'cookie' }, dateKey).board;
  }
  const doneCookie = curBoard.missions.find((m) => m.kind === 'collect_cookies');
  assert.equal(doneCookie?.progress, 50);
  assert.equal(doneCookie?.completed, true);

  // Claiming rewards adds coins once and prevents double-claim
  const progress = { ...createDefaultProgress(), coins: 25, dailyMissions: curBoard };
  const secretId = secretMission.id;
  const firstClaim = claimMissionReward(progress, secretId);
  assert.equal(firstClaim.coinsAwarded, secretMission.rewardCoins);
  assert.equal(firstClaim.progress.coins, 25 + secretMission.rewardCoins);

  const secondClaim = claimMissionReward(firstClaim.progress, secretId);
  assert.equal(secondClaim.coinsAwarded, 0);
  assert.equal(secondClaim.progress.coins, 25 + secretMission.rewardCoins);

  const claimRest = claimAllMissionRewards(secondClaim.progress);
  assert.equal(claimRest.coinsAwarded, cookieMission.rewardCoins);
  assert.equal(
    claimRest.progress.coins,
    25 + secretMission.rewardCoins + cookieMission.rewardCoins
  );
});

test('daily missions refresh automatically on new date and support level summary missions', () => {
  const day2 = generateDailyMissions('2026-11-14');
  assert.equal(day2.dateKey, '2026-11-14');
  const speedSummary = {
    cityIndex: 0,
    cityName: 'North Pole',
    difficulty: 'easy' as const,
    score: 500,
    stars: 3 as const,
    coinsEarned: 56,
    realCookiesCollected: 8,
    requiredCookies: 8,
    deliveriesCompleted: 3,
    requiredDeliveries: 3,
    trapsTriggered: 0,
    secretRoomsFound: 1,
    goldenPresentFound: false,
    elfHelped: false,
    niceMeter: 95,
    elapsedSeconds: 95,
    won: true,
  };
  const evalDay2 = applyLevelSummaryToMissions(day2, speedSummary, '2026-11-14');
  assert.ok(evalDay2.newlyCompleted.some((m) => m.kind === 'speed_delivery'));

  // Date rollover replaces yesterday's board
  const rolled = syncDailyMissions(day2, '2026-11-15');
  assert.equal(rolled.dateKey, '2026-11-15');
  assert.ok(rolled.missions.every((m) => m.progress === 0 && !m.completed && !m.claimed));
});

test('gate keys and missionCleared control mission gate unlocking and progression', () => {
  // Needs gate keys even if cookies & deliveries are met
  assert.equal(isPortalUnlocked(8, 8, 3, 3, 1, 2, false), false);
  assert.equal(isPortalUnlocked(8, 8, 3, 3, 2, 2, false), true);
  // Clearing a mission allows unlocking gate with required gate keys
  assert.equal(isPortalUnlocked(0, 8, 0, 3, 1, 2, true), false);
  assert.equal(isPortalUnlocked(0, 8, 0, 3, 2, 2, true), true);

  const dateKey = '2026-11-13';
  const board = generateDailyMissions(dateKey);
  const res = applyMissionEvent(board, { type: 'secret_room', elapsedSeconds: 45 }, dateKey);
  const prog = { ...createDefaultProgress(), coins: 20, dailyMissions: res.board };
  const progResult = resolveMissionClearProgression(prog, 0, res.newlyCompleted, 10);
  assert.equal(progResult.coinsAwarded, res.newlyCompleted[0].rewardCoins);
  assert.equal(progResult.progress.coins, 20 + res.newlyCompleted[0].rewardCoins);
  assert.equal(progResult.progress.unlockedLevelIndex, 1);
  assert.equal(progResult.nextCityIndex, 1);

  // Calling again on already-claimed mission does not double-award coins
  const second = resolveMissionClearProgression(progResult.progress, 0, res.newlyCompleted, 10);
  assert.equal(second.coinsAwarded, 0);
  assert.equal(second.progress.coins, progResult.progress.coins);
});

test('stealth noise, vision cone occlusion, suspicion delta, and hazards compute accurately', () => {
  const carpetSneak = calculateStepNoise({
    tile: 'carpet',
    stance: 'sneak',
    isMoving: true,
    silentBootsActive: false,
  });
  const toyRun = calculateStepNoise({
    tile: 'toy_floor',
    stance: 'run',
    isMoving: true,
    silentBootsActive: false,
  });
  const silentRun = calculateStepNoise({
    tile: 'toy_floor',
    stance: 'run',
    isMoving: true,
    silentBootsActive: true,
  });
  assert.ok(carpetSneak < 15);
  assert.equal(toyRun, 100);
  assert.equal(silentRun, 4);

  // 5x5 grid with a center wall at (2, 2)
  const grid: TileKind[][] = Array.from({ length: 5 }, () => Array(5).fill('floor'));
  grid[2][2] = 'wall';

  // Looking straight down (+Y -> yaw = 0)
  assert.equal(
    isPointInVisionCone({
      viewerX: 1.5,
      viewerY: 1.5,
      viewerYaw: 0,
      targetX: 1.5,
      targetY: 3.5,
      range: 5,
      halfAngleRad: 0.6,
      grid,
    }),
    true
  );

  // Blocked by wall at (2,2)
  assert.equal(
    isPointInVisionCone({
      viewerX: 1.5,
      viewerY: 1.5,
      viewerYaw: Math.PI / 4,
      targetX: 3.5,
      targetY: 3.5,
      range: 6,
      halfAngleRad: 0.8,
      grid,
    }),
    false
  );

  // Hiding / disguise / smoke prevent suspicion gain
  const hiddenDelta = computeSuspicionDelta({
    spottedInCone: true,
    distance: 2,
    maxRange: 5,
    tile: 'floor',
    stance: 'walk',
    isHiding: true,
    disguised: false,
    smokeConcealed: false,
    role: 'guard',
    enemyState: 'patrol',
    dt: 0.5,
  });
  assert.ok(hiddenDelta < 0);

  const shadowGain = computeSuspicionDelta({
    spottedInCone: true,
    distance: 2,
    maxRange: 5,
    tile: 'shadow',
    stance: 'sneak',
    isHiding: false,
    disguised: false,
    smokeConcealed: false,
    role: 'homeowner',
    enemyState: 'patrol',
    dt: 0.5,
  });
  const litGain = computeSuspicionDelta({
    spottedInCone: true,
    distance: 2,
    maxRange: 5,
    tile: 'floor',
    stance: 'run',
    isHiding: false,
    disguised: false,
    smokeConcealed: false,
    role: 'guard',
    enemyState: 'patrol',
    dt: 0.5,
  });
  assert.ok(shadowGain > 0 && shadowGain < litGain);

  assert.equal(getTrapPadState(0.1, 0, 4.0), 'safe');
  assert.equal(getTrapPadState(2.2, 0, 4.0), 'warning');
  assert.equal(getTrapPadState(3.2, 0, 4.0), 'active');
  assert.equal(isLaserBarrierActive(0.5, 4.0, 0, false), true);
  assert.equal(isLaserBarrierActive(3.5, 4.0, 0, false), false);
  assert.equal(isLaserBarrierActive(0.5, 4.0, 0, true), false);
});

test('trap tracking lights detect Santa when touched, respect cover/walls, and steer pursuit around walls', () => {
  const grid: TileKind[][] = Array.from({ length: 6 }, () => Array(6).fill('floor'));
  grid[2][2] = 'wall';

  // Santa directly inside tracking light beam -> triggers pursuit
  assert.equal(
    isTargetTouchedByTrackingLight({
      lightX: 1.5,
      lightY: 1.5,
      lightYaw: 0,
      lightRange: 3.6,
      lightHalfAngle: 0.42,
      targetX: 1.5,
      targetY: 3.8,
      isHiding: false,
      smokeConcealed: false,
      grid,
    }),
    true
  );

  // Hiding or Elf Smoke blocks tracking light lock-on
  assert.equal(
    isTargetTouchedByTrackingLight({
      lightX: 1.5,
      lightY: 1.5,
      lightYaw: 0,
      lightRange: 3.6,
      lightHalfAngle: 0.42,
      targetX: 1.5,
      targetY: 3.8,
      isHiding: true,
      smokeConcealed: false,
      grid,
    }),
    false
  );

  // Wall blocks tracking light beam
  assert.equal(
    isTargetTouchedByTrackingLight({
      lightX: 1.5,
      lightY: 1.5,
      lightYaw: Math.PI / 4,
      lightRange: 5,
      lightHalfAngle: 0.45,
      targetX: 3.5,
      targetY: 3.5,
      isHiding: false,
      smokeConcealed: false,
      grid,
    }),
    false
  );

  // Pursuit step moves toward target and slides cleanly past corner walls
  const step = computeTrapPursuitStep({
    grid,
    x: 1.5,
    y: 2.5,
    targetX: 3.5,
    targetY: 2.5,
    speed: 3.0,
    dt: 0.1,
    radius: 0.28,
    moveWithCollision: moveWithWallCollision,
  });
  assert.ok(step.x > 1.5 || step.y !== 2.5, 'Pursuit step must advance toward or slide around obstacle');

  // Verify every city spawns traps with valid tracking lights
  for (const city of CITIES) {
    const level = buildCityLevel(city.index, 'medium');
    assert.ok(level.hazards.length >= 2, `${city.city} should have moving hazards`);
    assert.ok(level.trapPads.length >= 2, `${city.city} should have trap pads`);
    for (const h of level.hazards) {
      assert.ok(h.lightRange > 2.5);
      assert.ok(h.lightHalfAngle > 0.2);
      assert.equal(h.pursuing, false);
    }
    for (const tp of level.trapPads) {
      assert.ok(tp.lightRange > 2.5);
      assert.equal(tp.curX, tp.homeX);
      assert.equal(tp.curY, tp.homeY);
      assert.equal(tp.pursuing, false);
    }
  }
});

test('expanded Santa store offers items across all 4 slots with working gear perks and safe legacy parsing', () => {
  const outfits = COSMETICS.filter((c) => c.slot === 'outfit');
  const sleighs = COSMETICS.filter((c) => c.slot === 'sleigh');
  const reindeer = COSMETICS.filter((c) => c.slot === 'reindeer');
  const gear = COSMETICS.filter((c) => c.slot === 'gear');

  assert.ok(outfits.length >= 8);
  assert.ok(sleighs.length >= 7);
  assert.ok(reindeer.length >= 7);
  assert.ok(gear.length >= 6);

  // Buying and equipping Workshop Perks updates coins, ownership, and perk multipliers
  let progress = createDefaultProgress();
  progress.coins = 300;
  const buyHeart = buyCosmetic(progress, 'gear_extra_heart');
  assert.equal(buyHeart.purchased, true);
  assert.equal(buyHeart.progress.equippedCosmetics.gear, 'gear_extra_heart');
  assert.equal(getGearBonuses(buyHeart.progress.equippedCosmetics.gear).maxHearts, 4);
  assert.equal(getGearBonuses('gear_cookie_magnet').pickupRadiusMultiplier, 1.55);
  assert.equal(getGearBonuses('gear_muffled_slippers').noiseMultiplier, 0.75);

  // Legacy saved JSON missing `gear` restores safely with default gear equipped
  const legacyRestored = parseProgress(
    JSON.stringify({
      unlockedLevelIndex: 2,
      coins: 120,
      equippedCosmetics: {
        outfit: 'outfit_classic',
        sleigh: 'sleigh_crimson',
        reindeer: 'reindeer_bells',
      },
    })
  );
  assert.equal(legacyRestored.equippedCosmetics.gear, 'gear_standard_bell');
  assert.equal(legacyRestored.ownedCosmetics.includes('gear_standard_bell'), true);
});

import {
  get3dRenderRangeConfig,
  isWithinRenderRange,
  wrapSnowflakeCoord,
} from './renderRange';
import {
  AMBIENT_CHIME_NOTES,
  HolidayAudioEngine,
  SLEIGH_BELL_FREQS,
  pickAmbientHolidayCue,
} from './audio';

test('minimized 3D render range scales tightly for desktop and compact/mobile viewports', () => {
  const desktop = get3dRenderRangeConfig('slightly_3d', false);
  const mobile = get3dRenderRangeConfig('slightly_3d', true);

  assert.ok(desktop.farPlane <= 24, 'Desktop far plane must be tightly minimized');
  assert.ok(desktop.camZOffset <= 3.0, 'Default 3D tilt must stay gentle and slightly 3D');
  assert.ok(mobile.farPlane < desktop.farPlane, 'Mobile far plane must be tighter than desktop');
  assert.ok(mobile.cullRadius < desktop.cullRadius, 'Mobile cull radius must be tighter');
  assert.ok(mobile.maxPixelRatio <= 1.0, 'Mobile pixel ratio must stay capped at 1.0 for smooth FPS');
  assert.ok(desktop.fogFar <= desktop.farPlane && desktop.fogNear < desktop.fogFar);

  assert.equal(isWithinRenderRange(10, 10, 10, 10, 10), true);
  assert.equal(isWithinRenderRange(18, 16, 10, 10, 10), true); // 64+36 = 100 <= 100
  assert.equal(isWithinRenderRange(21, 10, 10, 10, 10), false);

  // Localized snowfall coordinate wraps seamlessly around moving camera center
  const wrappedRight = wrapSnowflakeCoord(25, 10, 12); // max is 22 -> wraps to -2 + 3 = 1
  assert.ok(wrappedRight >= -2 && wrappedRight <= 22);
  const wrappedLeft = wrapSnowflakeCoord(-5, 10, 12); // min is -2 -> wraps to 22 - 3 = 19
  assert.ok(wrappedLeft >= -2 && wrappedLeft <= 22);
});

test('HolidayAudioEngine selects and safely triggers ambient sleigh bells and wind chimes', () => {
  assert.ok(AMBIENT_CHIME_NOTES.length >= 5);
  assert.ok(SLEIGH_BELL_FREQS.length >= 4);
  assert.equal(pickAmbientHolidayCue(0), 'sleigh_bells');
  assert.equal(pickAmbientHolidayCue(1), 'wind_chimes');
  assert.equal(pickAmbientHolidayCue(2, 0.2), 'twilight_combo');

  const engine = new HolidayAudioEngine(createDefaultProgress().settings);
  engine.startMusic('north_pole');
  engine.playDistantSleighBells();
  engine.playWindChimes();
  engine.updateSettings({ ...createDefaultProgress().settings, muted: true });
  engine.stopMusic();
  engine.destroy();
});

test('dangers start reduced on Level 1 and progressively scale up with new types as levels increase', () => {
  const countTotalDangers = (lvl: ReturnType<typeof buildCityLevel>) =>
    lvl.hazards.length +
    lvl.trapPads.length +
    lvl.launchers.length +
    lvl.stealthEnemies.length +
    lvl.securityCameras.length +
    lvl.laserBarriers.length;

  const l1Easy = buildCityLevel(0, 'easy');
  assert.equal(l1Easy.hazards.length, 1);
  assert.equal(l1Easy.trapPads.length, 1);
  assert.equal(l1Easy.launchers.length, 0);
  assert.equal(l1Easy.securityCameras.length, 0);
  assert.equal(l1Easy.laserBarriers.length, 0);
  assert.equal(
    l1Easy.stealthEnemies.some((e) => e.role === 'naughty_kid'),
    false
  );

  for (const diff of ['easy', 'medium', 'hard'] as Difficulty[]) {
    const early = buildCityLevel(0, diff);
    const mid = buildCityLevel(4, diff);
    const late = buildCityLevel(9, diff);

    assert.ok(
      countTotalDangers(early) < countTotalDangers(mid),
      `Expected mid-game (${diff}) to have more dangers than Level 1`
    );
    assert.ok(
      countTotalDangers(mid) < countTotalDangers(late),
      `Expected late-game (${diff}) to have more dangers than mid-game`
    );
    assert.ok(late.launchers.length > early.launchers.length);
    assert.ok(late.securityCameras.length > early.securityCameras.length);
    assert.ok(late.laserBarriers.length > early.laserBarriers.length);
    assert.equal(
      late.stealthEnemies.some((e) => e.role === 'naughty_kid'),
      true
    );
  }
});

import {
  CONFETTI_COLORS,
  createConfettiExplosion,
  stepConfettiParticles,
} from './confetti';

test('confetti explosion spawns festive multi-shape particles and settles cleanly to expiration', () => {
  assert.ok(CONFETTI_COLORS.length >= 5);

  const reduced = createConfettiExplosion({ width: 1280, height: 800, reducedMotion: true });
  assert.equal(reduced.length, 0, 'Reduced motion must suppress celebratory confetti burst');

  const wave0 = createConfettiExplosion({ width: 1280, height: 800, wave: 0 });
  const wave1 = createConfettiExplosion({ width: 1280, height: 800, wave: 1 });
  assert.ok(wave0.length >= 100, 'Primary victory explosion should emit a rich burst');
  assert.ok(wave1.length >= 40, 'Secondary wave should emit follow-up shimmer');

  const shapes = new Set(wave0.map((p) => p.shape));
  assert.ok(shapes.size >= 3, 'Confetti should mix shapes (ribbons, stars, diamonds, circles)');

  const initialY = wave0[0].y;
  const aliveAfterOneStep = stepConfettiParticles(wave0, 0.05);
  assert.equal(aliveAfterOneStep, wave0.length);
  assert.notEqual(wave0[0].y, initialY);

  // Advance enough seconds for all particles to expire cleanly
  let alive = aliveAfterOneStep;
  for (let i = 0; i < 100 && alive > 0; i++) {
    alive = stepConfettiParticles(wave0, 0.05);
  }
  assert.equal(alive, 0, 'All confetti particles should expire cleanly after animation finishes');
});

test('enemies lose track when Santa leaves their range or hides and navigate around walls back to their route', () => {
  // Hiding immediately drops track
  const hiddenLoss = shouldLoseTrack({
    currentlyDetected: false,
    distance: 2.0,
    trackRange: 4.0,
    lostTimer: 0,
    dt: 0.05,
    isHiding: true,
    smokeConcealed: false,
  });
  assert.equal(hiddenLoss.lost, true);

  // Far out of tracking range disengages quickly (~1.0s)
  const farStep1 = shouldLoseTrack({
    currentlyDetected: false,
    distance: 7.5,
    trackRange: 4.0,
    lostTimer: 0.6,
    dt: 0.5,
    isHiding: false,
    smokeConcealed: false,
  });
  assert.equal(farStep1.lost, true);

  // Nearest patrol index picks closest route point when returning
  const route = [
    { x: 1.5, y: 1.5 },
    { x: 5.5, y: 1.5 },
    { x: 5.5, y: 4.5 },
  ];
  assert.equal(findNearestPatrolIndex(route, 5.2, 4.1), 2);

  // Grid waypoint routes around solid wall barrier instead of getting stuck walking straight into wall
  const grid: TileKind[][] = [
    ['wall', 'wall', 'wall', 'wall', 'wall'],
    ['wall', 'floor', 'wall', 'floor', 'wall'],
    ['wall', 'floor', 'wall', 'floor', 'wall'],
    ['wall', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'wall', 'wall', 'wall', 'wall'],
  ];
  // From (1.5, 1.5) back to route home (3.5, 1.5), wall blocks (2,1) & (2,2), so must step down to (1.5, 2.5)
  const nextWp = computeGridNextWaypoint(grid, 1.5, 1.5, 3.5, 1.5);
  assert.deepEqual(nextWp, { x: 1.5, y: 2.5 });
});

import { TOTAL_LEVELS, getLevelMeta } from './cities';
import {
  RateLimitError,
  SafeRequestClient,
  computeBackoffDelayMs,
  getFriendlyNetworkErrorMessage,
  isRateLimitError,
  parseRetryAfterMs,
} from '../utils/networkGuard';

test('200-level progression metadata, late-level solvability, and progress unlock clamping work cleanly', () => {
  assert.equal(TOTAL_LEVELS, 200);
  const first = getLevelMeta(0);
  const last = getLevelMeta(TOTAL_LEVELS - 1);
  assert.equal(first.levelNumber, 1);
  assert.equal(first.city.id, 'north-pole');
  assert.equal(last.levelNumber, 200);
  assert.equal(last.city.id, 'final-mission');

  const finalLevel = buildCityLevel(TOTAL_LEVELS - 1, 'medium');
  assert.equal(verifyLevelSolvability(finalLevel).solvable, true);

  const saved199 = parseProgress(JSON.stringify({ unlockedLevelIndex: 150 }));
  assert.equal(saved199.unlockedLevelIndex, 150);
  const clamped = parseProgress(JSON.stringify({ unlockedLevelIndex: 999 }));
  assert.equal(clamped.unlockedLevelIndex, TOTAL_LEVELS - 1);
});

test('SafeRequestClient deduplicates concurrent calls, caches responses, and handles Rate exceeded with bounded backoff', async () => {
  assert.equal(isRateLimitError(new Error('Rate exceeded')), true);
  assert.equal(isRateLimitError(new Error('HTTP 429 Too Many Requests')), true);
  assert.equal(isRateLimitError(new Error('SyntaxError')), false);

  assert.equal(parseRetryAfterMs('3'), 3000);
  assert.ok(computeBackoffDelayMs(0, 500, 10000, 2000, 0) >= 2000);
  assert.equal(
    getFriendlyNetworkErrorMessage(new RateLimitError('Rate exceeded')).includes('Rate exceeded'),
    false,
    'Player-facing message should remain friendly instead of raw error string'
  );

  const client = new SafeRequestClient({
    minIntervalMs: 0,
    maxRetries: 2,
    baseDelayMs: 5,
    maxDelayMs: 25,
    defaultCacheTtlMs: 5000,
  });

  // Deduplication & caching
  let calls = 0;
  const fetcher = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return { ok: true, calls };
  };
  const [a, b] = await Promise.all([
    client.run('test:dedup', fetcher),
    client.run('test:dedup', fetcher),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);

  // Subsequent call hits cache without executing again
  const c = await client.run('test:dedup', fetcher);
  assert.equal(calls, 1);
  assert.deepEqual(c, a);

  // Transient 429 recovers via bounded retry
  let flakeyAttempts = 0;
  const recovered = await client.run(
    'test:recover',
    async () => {
      flakeyAttempts++;
      if (flakeyAttempts < 2) {
        throw new RateLimitError('Rate exceeded', { status: 429, retryAfterMs: 5 });
      }
      return 'ok';
    },
    { bypassCache: true }
  );
  assert.equal(recovered, 'ok');
  assert.equal(flakeyAttempts, 2);

  // Exhausted retries stop cleanly (never infinite loop) and set cooldown
  let exhaustedAttempts = 0;
  await assert.rejects(
    () =>
      client.run(
        'test:exhaust',
        async () => {
          exhaustedAttempts++;
          throw new RateLimitError('Rate exceeded', { status: 429, retryAfterMs: 10 });
        },
        { bypassCache: true, maxRetries: 2 }
      ),
    (err: unknown) => err instanceof RateLimitError && err.status === 429
  );
  assert.equal(exhaustedAttempts, 3);
  assert.ok(client.getCooldownRemainingMs('test:exhaust') > 0);
});
