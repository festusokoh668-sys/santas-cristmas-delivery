import React, { useEffect, useRef } from 'react';
import { CalendarClock, Compass, Moon, Play, Settings, Sparkles, Sun } from 'lucide-react';
import titleBg from '../assets/images/title_santa_sleigh_1794597612574.jpg';
import { getLevelMeta } from '../game/cities';
import { getClaimableMissionCount } from '../game/missions';
import { Difficulty, PlayerProgress } from '../game/types';
import { CoinIcon } from './GameIcons';

interface TitleScreenProps {
  progress: PlayerProgress;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onStartPlay: () => void;
  onOpenLevelSelect: () => void;
  onOpenWorkshop: () => void;
  onOpenDailyMissions: () => void;
  onOpenSettings: () => void;
  onChangeDifficulty: (diff: Difficulty) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  theme,
  onToggleTheme,
  onStartPlay,
  onOpenLevelSelect,
  onOpenWorkshop,
  onOpenDailyMissions,
  onOpenSettings,
  onChangeDifficulty,
}) => {
  const snowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelMeta = getLevelMeta(progress.unlockedLevelIndex);
  const currentCity = levelMeta.city;
  const claimableMissions = getClaimableMissionCount(progress.dailyMissions);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartPlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartPlay]);

  // Ambient falling snow & twinkling lights overlay on Title Screen
  useEffect(() => {
    const canvas = snowCanvasRef.current;
    if (!canvas || progress.settings.reducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const flakes = Array.from({ length: 75 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1.5 + Math.random() * 2.8,
      vy: 24 + Math.random() * 42,
      vx: (Math.random() - 0.5) * 18,
      alpha: 0.35 + Math.random() * 0.55,
    }));

    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const f of flakes) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y > canvas.height + 10) {
          f.y = -10;
          f.x = Math.random() * canvas.width;
        }
        if (f.x < -10) f.x = canvas.width + 10;
        if (f.x > canvas.width + 10) f.x = -10;
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = theme === 'light' ? '#e2e8f0' : '#ffffff';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [progress.settings.reducedMotion, theme]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-sky-50 dark:bg-[#091224]">
      {/* Illustrated Key-Art Backdrop */}
      <img
        src={titleBg}
        alt="Santa Claus beside his magical sleigh and reindeer in a snowy Christmas village"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-right select-none pointer-events-none"
      />

      {/* Contrast Scrim on Left Negative Space for Typography */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-transparent dark:from-[#091224]/90 dark:via-[#091224]/55 dark:to-transparent pointer-events-none"
      />

      {/* Live Falling Snow Layer */}
      <canvas
        ref={snowCanvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Top-Right Compact Coin, Theme, Daily Missions & Settings Cluster */}
      <div className="absolute top-5 right-6 z-20 flex flex-wrap items-center justify-end gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#0f172a]/85 border border-amber-500/40 dark:border-amber-300/30 shadow-lg">
          <CoinIcon className="w-5 h-5" />
          <span className="font-mono-nums text-sm font-bold text-amber-700 dark:text-amber-300">
            {progress.coins}
          </span>
        </div>

        <button
          type="button"
          data-testid="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 hover:bg-slate-100 dark:bg-[#0f172a]/85 dark:hover:bg-[#1e293b] border border-slate-300 dark:border-slate-400/30 text-slate-900 dark:text-slate-100 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 shadow-sm"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-300" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-sky-700" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenDailyMissions}
          aria-label="Open Daily Missions"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 hover:bg-slate-100 dark:bg-[#0f172a]/85 dark:hover:bg-[#1e293b] border border-slate-300 dark:border-slate-400/30 text-slate-900 dark:text-slate-100 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 shadow-sm"
        >
          <CalendarClock className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          <span>Daily Missions</span>
          {claimableMissions > 0 && (
            <span className="font-mono-nums text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
              · {claimableMissions} Ready
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open Game Settings"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 hover:bg-slate-100 dark:bg-[#0f172a]/85 dark:hover:bg-[#1e293b] border border-slate-300 dark:border-slate-400/30 text-slate-900 dark:text-slate-100 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 shadow-sm"
        >
          <Settings className="w-4 h-4 text-amber-600 dark:text-amber-300" />
          <span>Settings</span>
        </button>
      </div>

      {/* Main Left-Aligned Negative-Space Menu Stack */}
      <main className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-3xl">
        <div className="mb-7">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.3)] leading-[1.08]">
            Santa&apos;s Christmas
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-300 dark:from-amber-400 dark:via-amber-300 dark:to-yellow-100">
              Delivery
            </span>
          </h1>
        </div>

        {/* Next City & Difficulty Selector */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-medium">
            Next Stop:{' '}
            <span className="font-bold text-slate-950 dark:text-white">
              {levelMeta.displayTitle}, {currentCity.country}
            </span>
          </div>

          <div
            role="group"
            aria-label="Difficulty Selection"
            className="inline-flex items-center p-1 rounded-xl bg-white/90 dark:bg-[#0f172a]/85 border border-slate-300 dark:border-slate-500/30 shadow-sm"
          >
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
              const active = progress.difficulty === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => onChangeDifficulty(diff)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Menu Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStartPlay}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-display text-lg font-bold tracking-wide shadow-[0_8px_24px_rgba(220,38,38,0.45)] border-2 border-amber-300/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>PLAY</span>
          </button>

          <button
            type="button"
            onClick={onOpenLevelSelect}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/92 hover:bg-slate-100 dark:bg-[#0f172a]/90 dark:hover:bg-[#1e293b] text-slate-900 dark:text-slate-100 font-semibold text-sm border border-slate-300 dark:border-slate-400/35 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300 shadow-sm"
          >
            <Compass className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            <span>World Tour Levels</span>
          </button>

          <button
            type="button"
            onClick={onOpenWorkshop}
            data-testid="open-santa-store"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/92 hover:bg-slate-100 dark:bg-[#0f172a]/90 dark:hover:bg-[#1e293b] text-slate-900 dark:text-slate-100 font-semibold text-sm border border-slate-300 dark:border-slate-400/35 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            <span>Santa Store</span>
          </button>
        </div>
      </main>

      {/* Single Flat Borderless Control Hint Line */}
      <div className="absolute bottom-4 left-6 sm:left-12 lg:left-16 z-10 text-xs text-slate-700 dark:text-slate-300/90 font-medium pointer-events-none">
        WASD Move · C Sneak · E Hide · Q Decoy · Shift Run · Space Deliver / Dash · P Pause
      </div>
    </div>
  );
};
