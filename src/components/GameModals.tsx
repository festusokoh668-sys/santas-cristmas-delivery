import React from 'react';
import { ArrowRight, CalendarClock, Compass, Home, Play, RotateCcw, Settings } from 'lucide-react';
import { TOTAL_LEVELS, getLevelMeta } from '../game/cities';
import { LevelScoreSummary } from '../game/types';
import { CoinIcon, StarIcon } from './GameIcons';

interface PauseModalProps {
  cityName: string;
  claimableMissions: number;
  onResume: () => void;
  onRestart: () => void;
  onLevelSelect: () => void;
  onOpenDailyMissions: () => void;
  onOpenSettings: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  cityName,
  claimableMissions,
  onResume,
  onRestart,
  onLevelSelect,
  onOpenDailyMissions,
  onOpenSettings,
  onReturnTitle,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Game Paused"
    className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#060c1a]/88"
  >
    <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0d1933] border border-slate-300 dark:border-slate-400/35 p-6 shadow-2xl text-center space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          {cityName}
        </div>
        <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mt-1">
          Delivery Paused
        </h2>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onResume}
          className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Resume</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#16284d] dark:hover:bg-[#1e3566] border border-slate-300 dark:border-slate-400/30 text-slate-900 dark:text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-300" />
          <span>Restart City</span>
        </button>

        <button
          type="button"
          onClick={onLevelSelect}
          className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#16284d] dark:hover:bg-[#1e3566] border border-slate-300 dark:border-slate-400/30 text-slate-900 dark:text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Compass className="w-4 h-4 text-amber-600 dark:text-amber-300" />
          <span>World Tour Levels</span>
        </button>

        <button
          type="button"
          onClick={onOpenDailyMissions}
          className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#16284d] dark:hover:bg-[#1e3566] border border-slate-300 dark:border-slate-400/30 text-slate-900 dark:text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <CalendarClock className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          <span>
            Daily Missions{claimableMissions > 0 ? ` (${claimableMissions} Ready)` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#16284d] dark:hover:bg-[#1e3566] border border-slate-300 dark:border-slate-400/30 text-slate-900 dark:text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={onReturnTitle}
          className="w-full py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-200 dark:bg-[#091224] dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600/40 text-slate-700 dark:text-slate-300 font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Title Screen</span>
        </button>
      </div>
    </div>
  </div>
);

interface SummaryModalProps {
  summary: LevelScoreSummary;
  claimableMissions: number;
  onNextLevel: () => void;
  onReplay: () => void;
  onLevelSelect: () => void;
  onOpenDailyMissions: () => void;
  onReturnTitle: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  summary,
  claimableMissions,
  onNextLevel,
  onReplay,
  onLevelSelect,
  onOpenDailyMissions,
  onReturnTitle,
}) => {
  const hasNextLevel = summary.won && summary.cityIndex < TOTAL_LEVELS - 1;
  const meta = getLevelMeta(summary.cityIndex);
  const nextMeta = hasNextLevel ? getLevelMeta(summary.cityIndex + 1) : null;
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={summary.won ? 'City Complete' : 'Time Up'}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/65 dark:bg-[#060c1a]/90"
    >
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1933] border border-amber-500/40 dark:border-amber-300/35 p-6 shadow-2xl space-y-5">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Level {meta.levelNumber} of {TOTAL_LEVELS} · {meta.city.city}
          </div>
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {summary.won
              ? summary.cityIndex >= TOTAL_LEVELS - 1
                ? 'Christmas Saved!'
                : 'Mission Gate Cleared!'
              : summary.defeatReason === 'hearts'
              ? 'Sleigh Out of Hearts!'
              : 'Morning Arrived Early!'}
          </h2>

          {summary.won && (
            <div className="flex items-center justify-center gap-2 mt-3" aria-label={`${summary.stars} stars`}>
              {[1, 2, 3].map((n) => (
                <StarIcon key={n} filled={n <= summary.stars} className="w-9 h-9" />
              ))}
            </div>
          )}
        </div>

        {/* Stat Breakdown */}
        <div className="grid grid-cols-2 gap-2.5 text-sm">
          <div className="rounded-xl bg-slate-50 dark:bg-[#091224] border border-slate-200 dark:border-slate-600/40 p-3">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Score</div>
            <div className="font-mono-nums text-xl font-bold text-slate-900 dark:text-white">
              {summary.score}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#091224] border border-slate-200 dark:border-slate-600/40 p-3">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Coins Earned</div>
            <div className="flex items-center gap-1.5 font-mono-nums text-xl font-bold text-amber-700 dark:text-amber-300">
              <CoinIcon className="w-5 h-5" />
              <span>+{summary.coinsEarned}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#091224] border border-slate-200 dark:border-slate-600/40 p-2.5 flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-300">Cookies</span>
            <span className="font-mono-nums font-bold text-amber-700 dark:text-amber-200">
              {summary.realCookiesCollected}/{summary.requiredCookies}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#091224] border border-slate-200 dark:border-slate-600/40 p-2.5 flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-300">Deliveries</span>
            <span className="font-mono-nums font-bold text-emerald-700 dark:text-emerald-300">
              {summary.deliveriesCompleted}/{summary.requiredDeliveries}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#091224] border border-slate-200 dark:border-slate-600/40 p-2.5 flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-300">Traps Hit</span>
            <span className="font-mono-nums font-bold text-rose-700 dark:text-rose-300">
              {summary.trapsTriggered}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#091224] border border-slate-200 dark:border-slate-600/40 p-2.5 flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-300">Secret Rooms</span>
            <span className="font-mono-nums font-bold text-sky-700 dark:text-sky-300">
              {summary.secretRoomsFound}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#091224] border border-slate-200 dark:border-slate-600/40 p-2.5 flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-300">Nice Meter</span>
            <span className="font-mono-nums font-bold text-emerald-700 dark:text-emerald-300">
              {summary.niceMeter}%
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#091224] border border-slate-200 dark:border-slate-600/40 p-2.5 flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-300">Time</span>
            <span className="font-mono-nums font-bold text-slate-900 dark:text-slate-100">
              {formatTime(summary.elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Daily Mission Reward Prompt */}
        {claimableMissions > 0 && (
          <button
            type="button"
            onClick={onOpenDailyMissions}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <CalendarClock className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            <span>
              {claimableMissions} Daily Mission Reward{claimableMissions > 1 ? 's' : ''} Ready to Claim!
            </span>
          </button>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {nextMeta ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextLevel}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-base inline-flex items-center justify-center gap-2 border border-amber-300/60 cursor-pointer"
            >
              <span>Next: {nextMeta.displayTitle}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onReplay}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-base inline-flex items-center justify-center gap-2 border border-amber-300/60 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{summary.won ? 'Play Again' : 'Try Again'}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onLevelSelect}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#16284d] dark:hover:bg-[#1e3566] border border-slate-300 dark:border-slate-400/30 text-slate-900 dark:text-white text-xs font-bold cursor-pointer"
            >
              World Tour
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-200 dark:bg-[#091224] dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600/40 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
