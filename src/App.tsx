import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConfettiOverlay } from './components/ConfettiOverlay';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { PauseModal, SummaryModal } from './components/GameModals';
import { GameNotice, HUD } from './components/HUD';
import { LevelSelectModal } from './components/LevelSelectModal';
import { MobileControls } from './components/MobileControls';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { WorkshopModal } from './components/WorkshopModal';
import { HolidayAudioEngine } from './game/audio';
import { LEVELS_PER_CITY, TOTAL_LEVELS, getLevelMeta } from './game/cities';
import type { SantaMazeEngine } from './game/engine3d';
import {
  applyLevelSummaryToMissions,
  applyMissionEvent,
  claimAllMissionRewards,
  claimMissionReward,
  getClaimableMissionCount,
  resolveMissionClearProgression,
} from './game/missions';
import {
  buyCosmetic,
  createDefaultProgress,
  createEmptyPowerUps,
  getGearBonuses,
  loadPlayerProgress,
  savePlayerProgress,
} from './game/rules';
import {
  Difficulty,
  GameSettings,
  HudSnapshot,
  LevelScoreSummary,
  MissionEvent,
  PlayerProgress,
  ScreenState,
} from './game/types';
import {
  getFriendlyNetworkErrorMessage,
  loadModuleWithRetry,
  sharedRequestClient,
} from './utils/networkGuard';

function createInitialHud(
  levelIndex: number,
  difficulty: Difficulty,
  gearId?: string
): HudSnapshot {
  const meta = getLevelMeta(levelIndex);
  const city = meta.city;
  const gearBonuses = getGearBonuses(gearId);
  return {
    cityIndex: meta.levelIndex,
    cityName: `${city.city} · Lv.${meta.levelNumber}`,
    subtitle: `${city.subtitle} (${meta.stageLabel})`,
    difficulty,
    realCookies: 0,
    requiredCookies: city.requiredCookies,
    deliveriesDone: 0,
    requiredDeliveries: city.requiredDeliveries,
    totalHouses: city.requiredDeliveries,
    keysHeld: 0,
    totalKeys: 0,
    gateKeysHeld: 0,
    requiredGateKeys: Math.min(3, 2 + Math.floor(city.index / 4)),
    missionCleared: false,
    niceMeter: 85,
    score: 0,
    coinsEarned: 0,
    trapsTriggered: 0,
    secretRoomsFound: 0,
    portalUnlocked: false,
    countdownRemaining: city.hasCountdown ? city.countdownSeconds : null,
    elapsedSeconds: 0,
    activePowerUps: createEmptyPowerUps(),
    nearbyPrompt: null,
    statusBanner: null,
    elfClue: null,
    santaSpeedPenalty: 1,
    goldenPresentFound: false,
    hearts: gearBonuses.maxHearts,
    maxHearts: gearBonuses.maxHearts,
    dashReady: true,
    dashCooldownRatio: 0,
    stance: 'walk',
    noiseLevel: 0,
    suspicionLevel: 0,
    surfaceLabel: 'Snowy Path',
    inShadow: false,
    isHiding: false,
    isChased: false,
    disguised: false,
    stealthAbilities: {
      disguiseActive: 0,
      disguiseCooldown: 0,
      silentBootsActive: 0,
      silentBootsCooldown: 0,
      elfSmokeActive: 0,
      elfSmokeCooldown: 0,
      decoyCooldown: 0,
    },
    miniMap: null,
  };
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadPlayerProgress());
  const [screenState, setScreenState] = useState<ScreenState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });

  const [activeCityIndex, setActiveCityIndex] = useState<number>(() =>
    Math.min(loadPlayerProgress().unlockedLevelIndex, TOTAL_LEVELS - 1)
  );
  const [hud, setHud] = useState<HudSnapshot>(() => {
    const initial = loadPlayerProgress();
    return createInitialHud(activeCityIndex, initial.difficulty, initial.equippedCosmetics.gear);
  });
  const [summary, setSummary] = useState<LevelScoreSummary | null>(null);

  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [showDailyMissions, setShowDailyMissions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTouchOrSmallViewport, setIsTouchOrSmallViewport] = useState(false);
  const [notices, setNotices] = useState<GameNotice[]>([]);
  const [hideOnScreenPopups, setHideOnScreenPopups] = useState(false);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineLoadError, setEngineLoadError] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SantaMazeEngine | null>(null);
  const audioRef = useRef<HolidayAudioEngine | null>(null);
  const notifiedMissionsRef = useRef<Set<string>>(new Set());
  const lastBannerRef = useRef<string | null>(null);
  const lastClueRef = useRef<string | null>(null);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const screenStateRef = useRef(screenState);
  screenStateRef.current = screenState;
  const activeCityIndexRef = useRef(activeCityIndex);
  activeCityIndexRef.current = activeCityIndex;

  const theme: 'dark' | 'light' = progress.settings.theme === 'light' ? 'light' : 'dark';

  // Sync Tailwind .dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Persist progress whenever updated
  useEffect(() => {
    savePlayerProgress(progress);
    audioRef.current?.updateSettings(progress.settings);
    engineRef.current?.updateProgress(progress);
  }, [progress]);

  // Sync document.body.dataset.state for predictable testability
  useEffect(() => {
    const mapped =
      screenState === 'victory' || screenState === 'gameover' ? 'gameover' : screenState;
    document.body.dataset.state = mapped;
  }, [screenState]);

  // Detect touch / small viewport for mobile virtual controls
  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setIsTouchOrSmallViewport(coarse || window.innerWidth < 900);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setProgress((prev) => {
      const nextTheme: 'dark' | 'light' = prev.settings.theme === 'light' ? 'dark' : 'light';
      return {
        ...prev,
        settings: { ...prev.settings, theme: nextTheme },
      };
    });
  }, []);

  const handleMissionEvent = useCallback((event: MissionEvent) => {
    const current = progressRef.current;
    const updated = applyMissionEvent(current.dailyMissions, event);
    if (updated.board === current.dailyMissions) return;

    let nextProgress: PlayerProgress = {
      ...current,
      dailyMissions: updated.board,
    };

    if (updated.newlyCompleted.length > 0) {
      const res = resolveMissionClearProgression(
        nextProgress,
        activeCityIndexRef.current,
        updated.newlyCompleted,
        TOTAL_LEVELS
      );
      nextProgress = res.progress;
      const freshClears = res.clearedMissions.filter(
        (m) => !notifiedMissionsRef.current.has(m.id)
      );
      if (freshClears.length > 0) {
        freshClears.forEach((m) => notifiedMissionsRef.current.add(m.id));
        engineRef.current?.notifyMissionCleared(
          freshClears.map((m) => m.title).join(', '),
          res.coinsAwarded
        );
      }
    }

    progressRef.current = nextProgress;
    setProgress(nextProgress);
  }, []);

  const handleLevelComplete = useCallback((result: LevelScoreSummary) => {
    setSummary(result);
    setProgress((prev) => {
      const meta = getLevelMeta(result.cityIndex);
      const recordKey =
        meta.levelIndex === meta.cityIndex * LEVELS_PER_CITY
          ? meta.city.id
          : `level_${meta.levelIndex}`;
      const existing = prev.levelRecords[recordKey];
      const nextRecords = {
        ...prev.levelRecords,
        [recordKey]: {
          completed: Boolean(existing?.completed || result.won),
          stars: result.won ? Math.max(existing?.stars ?? 0, result.stars) : existing?.stars ?? 0,
          bestScore: Math.max(existing?.bestScore ?? 0, result.score),
          bestTimeSeconds: result.won
            ? existing?.bestTimeSeconds != null
              ? Math.min(existing.bestTimeSeconds, result.elapsedSeconds)
              : result.elapsedSeconds
            : existing?.bestTimeSeconds ?? null,
        },
      };
      const nextUnlocked =
        result.won && result.cityIndex >= prev.unlockedLevelIndex
          ? Math.min(TOTAL_LEVELS - 1, result.cityIndex + 1)
          : prev.unlockedLevelIndex;
      const missionEval = applyLevelSummaryToMissions(prev.dailyMissions, result);
      let nextProgress: PlayerProgress = {
        ...prev,
        unlockedLevelIndex: nextUnlocked,
        coins: prev.coins + result.coinsEarned,
        levelRecords: nextRecords,
        dailyMissions: missionEval.board,
      };
      if (missionEval.newlyCompleted.length > 0) {
        nextProgress = resolveMissionClearProgression(
          nextProgress,
          result.cityIndex,
          missionEval.newlyCompleted,
          TOTAL_LEVELS
        ).progress;
      }
      return nextProgress;
    });
    setScreenState(result.won ? 'victory' : 'gameover');
  }, []);

  const recordNotice = useCallback((text: string, kind: GameNotice['kind'], elapsedSeconds: number) => {
    const secs = Math.max(0, Math.floor(elapsedSeconds));
    const timeLabel = `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
    setNotices((prev) => {
      if (prev[0]?.text === text) return prev;
      return [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text,
          kind,
          timeLabel,
        },
        ...prev,
      ].slice(0, 30);
    });
  }, []);

  const callbacksRef = useRef({
    onHudUpdate: (nextHud: HudSnapshot) => {
      setHud(nextHud);
      if (nextHud.statusBanner && nextHud.statusBanner !== lastBannerRef.current) {
        lastBannerRef.current = nextHud.statusBanner;
        const isAlert = /SPOTTED|PURSUING|TRAP|PRANK|CAMERA|FROZEN|OUCH/i.test(nextHud.statusBanner);
        recordNotice(nextHud.statusBanner, isAlert ? 'alert' : 'info', nextHud.elapsedSeconds);
      } else if (!nextHud.statusBanner) {
        lastBannerRef.current = null;
      }
      if (nextHud.elfClue && nextHud.elfClue !== lastClueRef.current) {
        lastClueRef.current = nextHud.elfClue;
        recordNotice(`Mystery Elf: "${nextHud.elfClue}"`, 'clue', nextHud.elapsedSeconds);
      } else if (!nextHud.elfClue) {
        lastClueRef.current = null;
      }
    },
    onLevelComplete: handleLevelComplete,
    onPauseRequested: () => setScreenState('paused'),
    onMissionEvent: handleMissionEvent,
  });
  callbacksRef.current.onLevelComplete = handleLevelComplete;
  callbacksRef.current.onMissionEvent = handleMissionEvent;

  const isInGame = screenState !== 'title';

  // Lazy-load & mount gameplay engine only when leaving the Title Screen
  useEffect(() => {
    if (!isInGame) {
      setEngineLoading(false);
      setEngineLoadError(null);
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      return;
    }

    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    if (!audioRef.current) {
      audioRef.current = new HolidayAudioEngine(progressRef.current.settings);
    }

    if (engineRef.current) return;

    let cancelled = false;
    setEngineLoading(true);
    setEngineLoadError(null);

    loadModuleWithRetry('engine3d', () => import('./game/engine3d'))
      .then(({ SantaMazeEngine }) => {
        if (cancelled || !canvasMountRef.current || engineRef.current) return;
        const engine = new SantaMazeEngine(
          canvasMountRef.current,
          progressRef.current,
          activeCityIndexRef.current,
          progressRef.current.difficulty,
          audioRef.current!,
          {
            onHudUpdate: (h) => callbacksRef.current.onHudUpdate(h),
            onLevelComplete: (s) => callbacksRef.current.onLevelComplete(s),
            onPauseRequested: () => callbacksRef.current.onPauseRequested(),
            onMissionEvent: (ev) => callbacksRef.current.onMissionEvent(ev),
          }
        );
        engineRef.current = engine;
        engine.setPaused(screenStateRef.current !== 'playing');
        engine.setHideOnScreenPopups(hideOnScreenPopups);
        engine.start();
        setEngineLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[SantaMaze] Failed to initialize game engine:', err);
        setEngineLoading(false);
        setEngineLoadError(getFriendlyNetworkErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [isInGame]);

  useEffect(() => {
    engineRef.current?.setPaused(screenState !== 'playing');
  }, [screenState]);

  useEffect(() => {
    engineRef.current?.setHideOnScreenPopups(hideOnScreenPopups);
  }, [hideOnScreenPopups]);

  // Global Keyboard & Focus-Loss Hygiene
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showLevelSelect || showWorkshop || showDailyMissions || showSettings) {
        if (e.code === 'Escape') {
          setShowLevelSelect(false);
          setShowWorkshop(false);
          setShowDailyMissions(false);
          setShowSettings(false);
        }
        return;
      }

      const st = screenStateRef.current;
      if (st === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          setScreenState('paused');
          return;
        }
        if (e.code === 'KeyM') {
          e.preventDefault();
          setProgress((prev) => ({
            ...prev,
            settings: { ...prev.settings, muted: !prev.settings.muted },
          }));
          return;
        }
        if (e.code === 'KeyR') {
          e.preventDefault();
          engineRef.current?.loadLevel(
            activeCityIndex,
            progressRef.current.difficulty,
            progressRef.current
          );
          return;
        }
        if (
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight' ||
          e.code === 'Space'
        ) {
          e.preventDefault();
        }
        audioRef.current?.unlock();
        engineRef.current?.handleKeyDown(e.code);
      } else if (st === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
        e.preventDefault();
        setScreenState('playing');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.handleKeyUp(e.code);
    };

    const onBlurOrHide = () => {
      engineRef.current?.clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrHide);
    document.addEventListener('visibilitychange', onBlurOrHide);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrHide);
      document.removeEventListener('visibilitychange', onBlurOrHide);
    };
  }, [activeCityIndex, showLevelSelect, showWorkshop, showDailyMissions, showSettings]);

  // Cleanup audio & 3D engine on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      audioRef.current?.destroy();
    };
  }, []);

  const startCityLevel = useCallback((cityIndex: number, diffOverride?: Difficulty) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    audioRef.current?.unlock();
    const diff = diffOverride ?? progressRef.current.difficulty;
    setActiveCityIndex(cityIndex);
    setSummary(null);
    setShowLevelSelect(false);
    setShowWorkshop(false);
    setShowDailyMissions(false);
    setShowSettings(false);
    setScreenState('playing');
    if (engineRef.current) {
      engineRef.current.loadLevel(cityIndex, diff, progressRef.current);
      engineRef.current.setPaused(false);
    }
  }, []);

  const handleDifficultyChange = (diff: Difficulty) => {
    setProgress((prev) => ({ ...prev, difficulty: diff }));
  };

  const handleUpdateSettings = (next: GameSettings) => {
    setProgress((prev) => ({ ...prev, settings: next }));
  };

  const handleResetProgress = () => {
    const fresh = createDefaultProgress();
    notifiedMissionsRef.current.clear();
    setProgress(fresh);
    setActiveCityIndex(0);
    if (screenState !== 'title') {
      setScreenState('title');
    }
  };

  const handleBuyOrEquip = (itemId: string) => {
    setProgress((prev) => buyCosmetic(prev, itemId).progress);
  };

  const handleClaimMission = (missionId: string) => {
    setProgress((prev) => {
      const res = claimMissionReward(prev, missionId);
      if (res.coinsAwarded > 0) {
        audioRef.current?.playPowerUp();
      }
      return res.progress;
    });
  };

  const handleClaimAllMissions = () => {
    setProgress((prev) => {
      const res = claimAllMissionRewards(prev);
      if (res.coinsAwarded > 0) {
        audioRef.current?.playPowerUp();
      }
      return res.progress;
    });
  };

  const claimableMissions = getClaimableMissionCount(progress.dailyMissions);

  const showMobileControls =
    screenState === 'playing' &&
    !showLevelSelect &&
    !showWorkshop &&
    !showDailyMissions &&
    !showSettings &&
    (progress.settings.mobileJoystick === 'on' ||
      (progress.settings.mobileJoystick === 'auto' && isTouchOrSmallViewport));

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-[#091224]">
      {/* Title Screen */}
      {screenState === 'title' && (
        <TitleScreen
          progress={progress}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onStartPlay={() => startCityLevel(activeCityIndex)}
          onOpenLevelSelect={() => setShowLevelSelect(true)}
          onOpenWorkshop={() => setShowWorkshop(true)}
          onOpenDailyMissions={() => setShowDailyMissions(true)}
          onOpenSettings={() => setShowSettings(true)}
          onChangeDifficulty={handleDifficultyChange}
        />
      )}

      {/* Active 3D Gameplay Canvas Container */}
      {screenState !== 'title' && (
        <div
          ref={canvasMountRef}
          data-testid="game-canvas-container"
          className="relative w-full h-full"
        >
          <HUD
            hud={hud}
            muted={progress.settings.muted}
            theme={theme}
            notices={notices}
            hideOnScreenPopups={hideOnScreenPopups}
            onToggleHidePopups={() => setHideOnScreenPopups((v) => !v)}
            onToggleTheme={handleToggleTheme}
            onToggleMute={() =>
              setProgress((prev) => ({
                ...prev,
                settings: { ...prev.settings, muted: !prev.settings.muted },
              }))
            }
            onRestart={() => startCityLevel(activeCityIndex)}
            onPause={() => setScreenState('paused')}
            onHome={() => setScreenState('title')}
            onToggleCamera={() => engineRef.current?.toggleCameraMode()}
            onToggleSneak={() => engineRef.current?.toggleSneak()}
            onTriggerHide={() => engineRef.current?.triggerHide()}
            onThrowDecoy={() => engineRef.current?.throwDecoy()}
            onActivateAbility={(id) => engineRef.current?.activateAbility(id)}
          />

          {engineLoading && !engineLoadError && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100/80 dark:bg-[#091224]/85">
              <div className="rounded-2xl bg-white dark:bg-[#0d1933] border border-amber-500/40 px-6 py-4 shadow-xl text-center">
                <div className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Preparing Holiday Maze...
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {getLevelMeta(activeCityIndex).displayTitle}
                </div>
              </div>
            </div>
          )}

          {engineLoadError && (
            <div
              role="alert"
              className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-[#060c1a]/90"
            >
              <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1933] border border-amber-500/40 p-6 shadow-2xl text-center space-y-4">
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Sleigh Connection Paused
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{engineLoadError}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sharedRequestClient.clearCache('module:engine3d');
                      setEngineLoadError(null);
                      const url = new URL(window.location.href);
                      url.searchParams.set('autostart', '1');
                      window.location.replace(url.toString());
                    }}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm cursor-pointer"
                  >
                    Retry Loading Maze
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEngineLoadError(null);
                      setScreenState('title');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#16284d] border border-slate-300 dark:border-slate-500/40 text-xs font-bold cursor-pointer"
                  >
                    Title Screen
                  </button>
                </div>
              </div>
            </div>
          )}

          {showMobileControls && (
            <MobileControls
              isSneaking={hud.stance === 'sneak'}
              isHiding={hud.isHiding}
              onMoveVector={(vx, vy) => engineRef.current?.setJoystickVector(vx, vy)}
              onAction={() => engineRef.current?.triggerAction()}
              onToggleSneak={() => engineRef.current?.toggleSneak()}
              onTriggerHide={() => engineRef.current?.triggerHide()}
              onThrowDecoy={() => engineRef.current?.throwDecoy()}
            />
          )}
        </div>
      )}

      {/* Pause Modal */}
      {screenState === 'paused' && !showLevelSelect && !showDailyMissions && !showSettings && (
        <PauseModal
          cityName={getLevelMeta(activeCityIndex).displayTitle}
          claimableMissions={claimableMissions}
          onResume={() => setScreenState('playing')}
          onRestart={() => startCityLevel(activeCityIndex)}
          onLevelSelect={() => setShowLevelSelect(true)}
          onOpenDailyMissions={() => setShowDailyMissions(true)}
          onOpenSettings={() => setShowSettings(true)}
          onReturnTitle={() => setScreenState('title')}
        />
      )}

      {/* Victory / Game Over Modal */}
      {(screenState === 'victory' || screenState === 'gameover') &&
        summary &&
        !showLevelSelect &&
        !showDailyMissions && (
          <SummaryModal
            summary={summary}
            claimableMissions={claimableMissions}
            onNextLevel={() => startCityLevel(Math.min(TOTAL_LEVELS - 1, summary.cityIndex + 1))}
            onReplay={() => startCityLevel(summary.cityIndex)}
            onLevelSelect={() => setShowLevelSelect(true)}
            onOpenDailyMissions={() => setShowDailyMissions(true)}
            onReturnTitle={() => setScreenState('title')}
          />
        )}

      {/* Celebratory Victory Confetti Explosion */}
      <ConfettiOverlay
        active={screenState === 'victory' && Boolean(summary?.won)}
        triggerKey={`${summary?.cityIndex ?? -1}-${summary?.score ?? 0}-${summary?.elapsedSeconds ?? 0}`}
        reducedMotion={progress.settings.reducedMotion}
      />

      {/* World Tour Level Selection Modal */}
      {showLevelSelect && (
        <LevelSelectModal
          progress={progress}
          onSelectLevel={(idx) => startCityLevel(idx)}
          onChangeDifficulty={handleDifficultyChange}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {/* Santa Workshop Cosmetics Shop */}
      {showWorkshop && (
        <WorkshopModal
          progress={progress}
          onBuyOrEquip={handleBuyOrEquip}
          onClose={() => setShowWorkshop(false)}
        />
      )}

      {/* Daily Missions Modal */}
      {showDailyMissions && (
        <DailyMissionsModal
          board={progress.dailyMissions}
          coins={progress.coins}
          onClaimMission={handleClaimMission}
          onClaimAll={handleClaimAllMissions}
          onClose={() => setShowDailyMissions(false)}
        />
      )}

      {/* Settings & Field Guide */}
      {showSettings && (
        <SettingsModal
          settings={progress.settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
