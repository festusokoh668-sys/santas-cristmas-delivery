import React from 'react';
import { CalendarClock, CheckCircle2, Sparkles, X } from 'lucide-react';
import { DailyMissionsBoard } from '../game/types';
import { CoinIcon } from './GameIcons';

interface DailyMissionsModalProps {
  board: DailyMissionsBoard;
  coins: number;
  onClaimMission: (missionId: string) => void;
  onClaimAll: () => void;
  onClose: () => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  board,
  coins,
  onClaimMission,
  onClaimAll,
  onClose,
}) => {
  const claimableCount = board.missions.filter((m) => m.completed && !m.claimed).length;
  const totalRewardReady = board.missions
    .filter((m) => m.completed && !m.claimed)
    .reduce((acc, m) => acc + m.rewardCoins, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Missions"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#060c1a]/92"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#0d1933] border border-amber-500/40 dark:border-amber-300/35 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-600/40 flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-[#102040]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <CalendarClock className="w-4 h-4" />
              <span>Daily Sleigh Assignments · {board.dateKey}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5">
              Daily Missions
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#091224] border border-amber-500/40 dark:border-amber-300/35">
              <CoinIcon className="w-5 h-5" />
              <span className="font-mono-nums text-base font-bold text-amber-700 dark:text-amber-300">
                {coins}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Daily Missions"
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#091224] dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-500/35 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mission List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {board.missions.map((mission) => {
            const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
            const readyToClaim = mission.completed && !mission.claimed;

            return (
              <div
                key={mission.id}
                className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  mission.claimed
                    ? 'bg-slate-50 dark:bg-[#0a1429] border-slate-200 dark:border-slate-700/60'
                    : readyToClaim
                    ? 'bg-emerald-50 dark:bg-[#15294d] border-emerald-500/60 shadow-md'
                    : 'bg-slate-100 dark:bg-[#122242] border-slate-300 dark:border-slate-500/30'
                }`}
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {mission.title}
                    </h3>
                    {mission.timeLimitSeconds && (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        · Under {Math.round(mission.timeLimitSeconds / 60)} min
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {mission.description}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-2.5 rounded-full bg-white dark:bg-[#091224] overflow-hidden border border-slate-300 dark:border-slate-600/40">
                      <div
                        className={`h-full transition-colors ${
                          mission.completed ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono-nums text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {mission.progress}/{mission.target}
                    </span>
                  </div>
                </div>

                {/* Reward & Claim Control */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <CoinIcon className="w-4 h-4" />
                    <span className="font-mono-nums text-sm font-bold text-amber-700 dark:text-amber-300">
                      +{mission.rewardCoins}
                    </span>
                  </div>

                  {mission.claimed ? (
                    <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-bold whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Claimed</span>
                    </span>
                  ) : readyToClaim ? (
                    <button
                      type="button"
                      onClick={() => onClaimMission(mission.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold whitespace-nowrap cursor-pointer shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Claim +{mission.rewardCoins}</span>
                    </button>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#091224] border border-slate-300 dark:border-slate-600/40 text-slate-600 dark:text-slate-300 text-xs font-semibold whitespace-nowrap">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-600/40 bg-slate-50 dark:bg-[#0a1326] flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clearing any Daily Mission automatically unlocks the next city & awards bonus coins!
          </p>

          {claimableCount > 0 && (
            <button
              type="button"
              onClick={onClaimAll}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold whitespace-nowrap cursor-pointer"
            >
              Claim All (+{totalRewardReady} Coins)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
