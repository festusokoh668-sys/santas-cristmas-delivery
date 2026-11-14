import React, { useState } from 'react';
import { Moon, RotateCcw, Sun, Volume2, X } from 'lucide-react';
import { GameSettings } from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const currentTheme = settings.theme ?? 'dark';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Settings and Guide"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#060c1a]/92"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#0d1933] border border-slate-300 dark:border-slate-400/30 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-600/40 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Settings & Field Guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#091224] dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-500/35 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Audio Settings */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>Audio</span>
            </h3>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Sound & Music
              </span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, muted: !settings.muted })}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  settings.muted
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-200 border border-rose-400/40'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {settings.muted ? 'Muted' : 'Enabled'}
              </button>
            </div>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>Music Volume</span>
                <span className="font-mono-nums">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })
                }
                className="w-full accent-amber-500"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>Sound Effects Volume</span>
                <span className="font-mono-nums">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })
                }
                className="w-full accent-amber-500"
              />
            </label>
          </section>

          {/* Controls & Accessibility */}
          <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-600/35">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Controls & Display
            </h3>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Appearance Theme
              </span>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#091224] border border-slate-300 dark:border-slate-500/35">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, theme: t })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                      currentTheme === t
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {t === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                On-Screen Touch Joystick
              </span>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#091224] border border-slate-300 dark:border-slate-500/35">
                {(['auto', 'on', 'off'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, mobileJoystick: mode })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                      settings.mobileJoystick === mode
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Reduced Weather Particles
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, reducedMotion: !settings.reducedMotion })
                }
                className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  settings.reducedMotion
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 dark:bg-[#122242] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-500/35'
                }`}
              >
                {settings.reducedMotion ? 'On' : 'Off'}
              </button>
            </div>
          </section>

          {/* Stealth, Cookie & Gate Guide */}
          <section className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-600/35 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Santa&apos;s Field Guide
            </h3>
            <p>
              <strong className="text-slate-900 dark:text-white">Stealth Controls:</strong> Move with
              WASD / Arrows, toggle quiet Sneak with <strong className="text-slate-900 dark:text-white">C</strong>,
              sprint with <strong className="text-slate-900 dark:text-white">Shift</strong>, hide inside beds,
              wardrobes, trees, or gift boxes with <strong className="text-slate-900 dark:text-white">E</strong>,
              and toss a noisy Bell Decoy with <strong className="text-slate-900 dark:text-white">Q</strong>.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Gadgets & Dash:</strong> Press{' '}
              <strong className="text-slate-900 dark:text-white">1</strong> for Box Disguise,{' '}
              <strong className="text-slate-900 dark:text-white">2</strong> for Silent Boots,{' '}
              <strong className="text-slate-900 dark:text-white">3</strong> for Elf Smoke Screen, and{' '}
              <strong className="text-slate-900 dark:text-white">Space</strong> to deliver presents, hop
              chimneys, or Snow Dash away from danger.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Gate Keys & Cookies:</strong> Collect
              Real Magic Cookies and deliver presents (or clear a Daily Mission!), then gather every
              emerald Gate Key to swing open the Mission Gate to the next city.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Traps, Tracking Lights &amp; Cameras:</strong>{' '}
              Patrolling hazards and spike traps sweep glowing tracking lights—if a tracking light
              touches Santa, the trap locks on in red and pursues you! Break line of sight, hide{' '}
              <strong className="text-slate-900 dark:text-white">[E]</strong>, or deploy Elf Smoke{' '}
              <strong className="text-slate-900 dark:text-white">[3]</strong> to shake pursuit, and
              stay in dark shadow tiles to reduce visibility.
            </p>
          </section>

          {/* Reset Progress */}
          <section className="pt-4 border-t border-slate-200 dark:border-slate-600/35 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Reset unlocked cities, stars, and coins
            </span>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Progress</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
