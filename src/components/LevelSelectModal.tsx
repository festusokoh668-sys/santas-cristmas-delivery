import React, { useState } from 'react';
import { Lock, Play, X } from 'lucide-react';
import worldTourMap from '../assets/images/world_tour_map_1794597616898.jpg';
import { CITIES, LEVELS_PER_CITY, TOTAL_LEVELS } from '../game/cities';
import { Difficulty, PlayerProgress } from '../game/types';
import { CityArtwork } from './CityArtwork';
import { StarIcon } from './GameIcons';

interface LevelSelectModalProps {
  progress: PlayerProgress;
  onSelectLevel: (levelIndex: number) => void;
  onChangeDifficulty: (diff: Difficulty) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  progress,
  onSelectLevel,
  onChangeDifficulty,
  onClose,
}) => {
  const [selectedStageByCity, setSelectedStageByCity] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const city of CITIES) {
      const startIdx = city.index * LEVELS_PER_CITY;
      const endIdx = startIdx + LEVELS_PER_CITY - 1;
      const clampedUnlocked = Math.min(endIdx, Math.max(startIdx, progress.unlockedLevelIndex));
      initial[city.index] = clampedUnlocked - startIdx;
    }
    return initial;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="World Tour Level Selection"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#060c1a]/92"
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#0d1933] border border-slate-300 dark:border-slate-400/30 shadow-2xl overflow-hidden">
        {/* Crisp World Tour Map Header Banner */}
        <div className="relative h-32 sm:h-36 px-6 py-4 border-b border-slate-200 dark:border-slate-600/40 flex flex-wrap items-end justify-between gap-4 overflow-hidden bg-[#091224]">
          <img
            src={worldTourMap}
            alt="World tour Christmas delivery map"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091224]/92 via-[#091224]/50 to-[#091224]/25 pointer-events-none" />

          <div className="relative z-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white drop-shadow">
              World Tour Cities ({TOTAL_LEVELS} Levels)
            </h2>
            <p className="text-xs sm:text-sm text-slate-100 mt-0.5 drop-shadow">
              10 festive cities with 20 stages each. Complete mazes or Daily Missions to unlock the next level.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div
              role="group"
              aria-label="Difficulty"
              className="inline-flex items-center p-1 rounded-xl bg-[#091224]/90 border border-slate-400/35"
            >
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
                const active = progress.difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => onChangeDifficulty(diff)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Level Selection"
              className="w-10 h-10 rounded-xl bg-[#091224]/90 hover:bg-slate-800 border border-slate-400/35 flex items-center justify-center text-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 10 City Cards Grid (20 Stages per City = 200 Levels) */}
        <div className="p-5 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CITIES.map((city) => {
            const startIdx = city.index * LEVELS_PER_CITY;
            const endIdx = startIdx + LEVELS_PER_CITY - 1;
            const unlocked = progress.unlockedLevelIndex >= startIdx;
            const maxUnlockedStageOffset = Math.min(
              LEVELS_PER_CITY - 1,
              Math.max(0, progress.unlockedLevelIndex - startIdx)
            );
            const selectedOffset = Math.min(
              maxUnlockedStageOffset,
              selectedStageByCity[city.index] ?? 0
            );
            const targetLevelIndex = startIdx + selectedOffset;
            const rec =
              progress.levelRecords[`level_${targetLevelIndex}`] ??
              (selectedOffset === 0 ? progress.levelRecords[city.id] : undefined);
            const stars = rec?.stars ?? 0;

            return (
              <div
                key={city.id}
                className={`rounded-2xl border p-3.5 transition-colors overflow-hidden flex flex-col justify-between gap-3 ${
                  unlocked
                    ? 'bg-slate-50 dark:bg-[#122242] border-slate-300 dark:border-slate-400/30 shadow-md'
                    : 'bg-slate-100/80 dark:bg-[#0a1326] border-slate-200 dark:border-slate-700/60'
                }`}
              >
                {/* Illustrated City Picture */}
                <div>
                  <div className="h-32 rounded-xl mb-3 relative overflow-hidden border border-slate-400/30 shadow-inner">
                    <CityArtwork city={city} unlocked={unlocked} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#091224]/85 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 drop-shadow">
                          Levels {startIdx + 1}–{endIdx + 1} · {city.country}
                        </div>
                        <div className="font-display text-lg font-bold text-white leading-tight drop-shadow">
                          {city.city}
                        </div>
                      </div>

                      {!unlocked ? (
                        <div className="w-8 h-8 rounded-full bg-slate-900/90 border border-slate-400/40 flex items-center justify-center text-slate-200 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectLevel(targetLevelIndex)}
                          aria-label={`Play ${city.city} Level ${targetLevelIndex + 1}`}
                          className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow shrink-0 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p
                    className={`text-xs font-semibold mb-1 ${
                      unlocked ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {city.subtitle}
                  </p>
                  <p
                    className={`text-xs ${
                      unlocked ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {unlocked
                      ? city.description
                      : `Complete Level ${startIdx} (${CITIES[city.index - 1]?.city}) to unlock this city.`}
                  </p>
                </div>

                {/* Stage Selector & Footer */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-600/35 flex flex-col gap-2">
                  {unlocked && (
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`stage-select-${city.id}`}
                        className="text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Stage
                      </label>
                      <select
                        id={`stage-select-${city.id}`}
                        value={selectedOffset}
                        onChange={(e) =>
                          setSelectedStageByCity((prev) => ({
                            ...prev,
                            [city.index]: Number(e.target.value),
                          }))
                        }
                        className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-[#091224] border border-slate-300 dark:border-slate-500/40 text-xs font-semibold text-slate-900 dark:text-slate-100"
                      >
                        {Array.from({ length: maxUnlockedStageOffset + 1 }, (_, sIdx) => (
                          <option key={sIdx} value={sIdx}>
                            Level {startIdx + sIdx + 1} (Stage {sIdx + 1}/{LEVELS_PER_CITY})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onSelectLevel(targetLevelIndex)}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer shrink-0"
                      >
                        Play
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1" aria-label={`${stars} of 3 stars`}>
                      {[1, 2, 3].map((n) => (
                        <StarIcon key={n} filled={n <= stars} className="w-4 h-4" />
                      ))}
                    </div>
                    <div className="text-xs font-mono-nums text-slate-600 dark:text-slate-300">
                      {rec?.bestScore
                        ? `Best: ${rec.bestScore}`
                        : unlocked
                        ? `Lv.${targetLevelIndex + 1}`
                        : 'Locked'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
