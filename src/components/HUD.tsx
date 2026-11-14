import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  Box,
  Camera,
  CloudFog,
  Eye,
  EyeOff,
  Footprints,
  Heart,
  Home,
  Moon,
  Pause,
  RotateCcw,
  ShieldAlert,
  Sun,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { getPowerUpInfo } from '../game/rules';
import { ActivePowerUps, HudSnapshot, StealthAbilityId } from '../game/types';
import { CoinIcon, CookieIcon, KeyIcon, PortalIcon, PresentIcon } from './GameIcons';
import { MiniMap } from './MiniMap';

export interface GameNotice {
  id: string;
  text: string;
  kind: 'alert' | 'clue' | 'info';
  timeLabel: string;
}

interface HUDProps {
  hud: HudSnapshot;
  muted: boolean;
  theme: 'dark' | 'light';
  notices: GameNotice[];
  hideOnScreenPopups: boolean;
  onToggleHidePopups: () => void;
  onToggleTheme: () => void;
  onToggleMute: () => void;
  onRestart: () => void;
  onPause: () => void;
  onHome: () => void;
  onToggleCamera?: () => void;
  onToggleSneak: () => void;
  onTriggerHide: () => void;
  onThrowDecoy: () => void;
  onActivateAbility: (id: StealthAbilityId) => void;
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  muted,
  theme,
  notices,
  hideOnScreenPopups,
  onToggleHidePopups,
  onToggleTheme,
  onToggleMute,
  onRestart,
  onPause,
  onHome,
  onToggleCamera,
  onToggleSneak,
  onTriggerHide,
  onThrowDecoy,
  onActivateAbility,
}) => {
  const activePowerUpList = (Object.keys(hud.activePowerUps) as Array<keyof ActivePowerUps>)
    .filter((k) => hud.activePowerUps[k] > 0)
    .map((k) => ({
      key: k,
      remaining: hud.activePowerUps[k],
      ...getPowerUpInfo(k),
    }));

  const formatTimer = (sec: number) => {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const objectivesReady =
    hud.missionCleared ||
    (hud.realCookies >= hud.requiredCookies && hud.deliveriesDone >= hud.requiredDeliveries);

  const sa = hud.stealthAbilities;

  const statusBadgeText = hud.isChased
    ? 'CHASED! ESCAPE!'
    : hud.isHiding
    ? 'HIDDEN IN COVER'
    : hud.disguised
    ? 'BOX DISGUISE'
    : hud.inShadow
    ? 'IN SHADOW'
    : hud.stance === 'sneak'
    ? 'SNEAKING'
    : hud.stance === 'run'
    ? 'RUNNING'
    : 'WALKING';

  const statusBadgeClass = hud.isChased
    ? 'bg-rose-600/95 border-rose-300 text-white'
    : hud.isHiding || hud.disguised
    ? 'bg-emerald-600/95 border-emerald-300 text-white'
    : hud.inShadow || hud.stance === 'sneak'
    ? 'bg-sky-700/95 border-sky-300 text-sky-50'
    : hud.stance === 'run'
    ? 'bg-amber-600/95 border-amber-300 text-white'
    : 'bg-slate-200 dark:bg-slate-800/90 border-slate-400/50 dark:border-slate-400/40 text-slate-900 dark:text-slate-100';

  const panelClass =
    'bg-white/92 dark:bg-[#091224]/92 border border-slate-300/85 dark:border-slate-500/35 text-slate-900 dark:text-slate-100 shadow-lg backdrop-blur-md';

  const iconBtnClass =
    'w-10 h-10 rounded-xl bg-white/92 hover:bg-slate-100 dark:bg-[#091224]/90 dark:hover:bg-[#1e293b] border border-slate-300 dark:border-slate-400/35 flex items-center justify-center text-slate-800 dark:text-slate-100 transition-colors cursor-pointer shadow-sm';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* Top Perimeter Corners */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left Cluster: City, Hearts, Objectives & Stealth Meters */}
        <div className="flex flex-col gap-2 max-w-[70vw] sm:max-w-xl">
          <div className={`flex flex-wrap items-center gap-3 px-3.5 py-2 rounded-2xl ${panelClass}`}>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Mission {hud.cityIndex + 1} · {hud.difficulty}
              </div>
              <div className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {hud.cityName}
              </div>
            </div>

            {/* Sleigh Hearts */}
            <div
              className="flex items-center gap-1 shrink-0"
              aria-label={`Hearts ${hud.hearts} of ${hud.maxHearts}`}
            >
              {Array.from({ length: hud.maxHearts }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`w-4 h-4 ${
                    idx < hud.hearts
                      ? 'text-rose-500 fill-rose-500'
                      : 'text-slate-300 fill-slate-200 dark:text-slate-600 dark:fill-slate-800'
                  }`}
                />
              ))}
            </div>

            {hud.countdownRemaining !== null && (
              <div className="pl-3 border-l border-slate-300 dark:border-slate-600/60">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Dawn In
                </div>
                <div
                  className={`font-mono-nums text-base sm:text-lg font-bold ${
                    hud.countdownRemaining <= 30
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {formatTimer(hud.countdownRemaining)}
                </div>
              </div>
            )}
          </div>

          {/* Core Objectives Strip */}
          <div className={`flex flex-wrap items-center gap-3 px-3.5 py-2 rounded-2xl ${panelClass}`}>
            <div className="flex items-center gap-1.5" aria-label="Real Cookies Collected">
              <CookieIcon className="w-5 h-5" />
              <span className="font-mono-nums text-sm sm:text-base font-bold text-amber-700 dark:text-amber-300">
                {hud.realCookies}/{hud.requiredCookies}
              </span>
            </div>

            <div className="flex items-center gap-1.5" aria-label="Deliveries Completed">
              <PresentIcon className="w-5 h-5" />
              <span className="font-mono-nums text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300">
                {hud.deliveriesDone}/{hud.requiredDeliveries}
              </span>
            </div>

            <div className="flex items-center gap-1.5" aria-label="Gate Keys Collected">
              <KeyIcon className="w-5 h-5" />
              <span className="font-mono-nums text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-200">
                {hud.gateKeysHeld}/{hud.requiredGateKeys} Gate
              </span>
            </div>

            {hud.totalKeys > 0 && (
              <div className="flex items-center gap-1" aria-label="House Keys Held">
                <span className="font-mono-nums text-xs font-bold text-amber-800 dark:text-yellow-200">
                  House Key {hud.keysHeld}/{hud.totalKeys}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5" aria-label="Gate Status">
              <PortalIcon unlocked={hud.portalUnlocked} className="w-5 h-5" />
              <span
                className={`text-xs font-bold whitespace-nowrap ${
                  hud.portalUnlocked
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : objectivesReady
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {hud.portalUnlocked
                  ? 'Gate Open!'
                  : objectivesReady
                  ? 'Need Gate Keys'
                  : 'Gate Locked'}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1 pl-2 border-l border-slate-300 dark:border-slate-600/50">
              <Zap
                className={`w-3.5 h-3.5 ${
                  hud.dashReady ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span
                className={`text-[11px] font-bold ${
                  hud.dashReady ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {hud.dashReady ? 'Dash Ready' : 'Recharging'}
              </span>
            </div>
          </div>

          {/* Stealth Meters Strip: Noise, Suspicion, Surface & Stance */}
          <div className={`flex flex-wrap items-center gap-3 px-3.5 py-2 rounded-2xl ${panelClass}`}>
            <div
              className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-extrabold tracking-wide ${statusBadgeClass}`}
            >
              {statusBadgeText}
            </div>

            {/* Noise Meter */}
            <div className="flex items-center gap-2" aria-label={`Noise Level ${hud.noiseLevel}%`}>
              <Footprints className="w-4 h-4 text-sky-600 dark:text-sky-300" />
              <div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  <span>Noise</span>
                  <span className="font-mono-nums">{hud.noiseLevel}%</span>
                </div>
                <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      hud.noiseLevel >= 65
                        ? 'bg-rose-500 dark:bg-rose-400'
                        : hud.noiseLevel >= 35
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-sky-500 dark:bg-sky-400'
                    }`}
                    style={{ width: `${Math.min(100, hud.noiseLevel)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Suspicion Meter */}
            <div className="flex items-center gap-2" aria-label={`Suspicion Level ${hud.suspicionLevel}%`}>
              {hud.isChased ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              ) : (
                <Eye className="w-4 h-4 text-amber-600 dark:text-amber-300" />
              )}
              <div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  <span>Alert</span>
                  <span className="font-mono-nums">{hud.suspicionLevel}%</span>
                </div>
                <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      hud.suspicionLevel >= 75
                        ? 'bg-rose-500'
                        : hud.suspicionLevel >= 35
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-emerald-500 dark:bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, hud.suspicionLevel)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="hidden sm:block text-[11px] font-semibold text-slate-600 dark:text-slate-300 pl-2 border-l border-slate-300 dark:border-slate-600/50">
              {hud.surfaceLabel}
            </div>
          </div>
        </div>

        {/* Top-Right Cluster: Score, Nice Meter, Utility Controls & Mini-Map */}
        <div className="flex flex-col items-end gap-2 shrink-0 max-w-[54vw] sm:max-w-none">
          <div className="flex flex-wrap justify-end items-center gap-1.5 sm:gap-2 pointer-events-auto">
            <div className={`hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-2xl ${panelClass}`}>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Score
                </div>
                <div className="font-mono-nums text-base font-bold text-slate-900 dark:text-white">
                  {hud.score}
                </div>
              </div>
              <div className="pl-3 border-l border-slate-300 dark:border-slate-600/60">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Nice Meter
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        hud.niceMeter >= 70
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : hud.niceMeter >= 45
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-rose-500 dark:bg-rose-400'
                      }`}
                      style={{ width: `${hud.niceMeter}%` }}
                    />
                  </div>
                  <span className="font-mono-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                    {hud.niceMeter}%
                  </span>
                </div>
              </div>
              <div className="pl-3 border-l border-slate-300 dark:border-slate-600/60 flex items-center gap-1.5">
                <CoinIcon className="w-4 h-4" />
                <span className="font-mono-nums text-sm font-bold text-amber-700 dark:text-amber-300">
                  +{hud.coinsEarned}
                </span>
              </div>
            </div>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-theme-toggle"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleTheme();
              }}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              className={iconBtnClass}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-sky-700" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Unmute Sound [M]' : 'Mute Sound [M]'}
              title="Mute [M]"
              className={iconBtnClass}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-300" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-300" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Restart Level [R]"
              title="Restart [R]"
              className={iconBtnClass}
            >
              <RotateCcw className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause Game [P]"
              title="Pause [P]"
              className={iconBtnClass}
            >
              <Pause className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            </button>

            {onToggleCamera && (
              <button
                type="button"
                tabIndex={-1}
                data-testid="hud-camera-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleCamera();
                }}
                aria-label="Toggle Camera View [V]"
                title="Camera: Slightly 3D / Top-Down / Cinematic [V]"
                className="h-10 px-2.5 sm:px-3 rounded-xl bg-white/92 hover:bg-slate-100 dark:bg-[#091224]/90 dark:hover:bg-[#1e293b] border border-slate-300 dark:border-slate-400/35 flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer shadow-sm"
              >
                <Camera className="w-4 h-4 text-sky-600 dark:text-sky-300" />
                <span className="hidden md:inline text-xs font-bold">3D View</span>
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-notices-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleHidePopups();
              }}
              aria-label="Toggle On-Screen Popups"
              title={hideOnScreenPopups ? 'Show On-Screen Popups' : 'Hide On-Screen Popups'}
              className={`h-10 px-2.5 sm:px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
                hideOnScreenPopups
                  ? 'bg-amber-400/20 border-amber-500/60 text-amber-800 dark:text-amber-200'
                  : 'bg-white/92 hover:bg-slate-100 dark:bg-[#091224]/90 dark:hover:bg-[#1e293b] border-slate-300 dark:border-slate-400/35 text-slate-800 dark:text-slate-100'
              }`}
            >
              {hideOnScreenPopups ? (
                <BellOff className="w-4 h-4 text-amber-600 dark:text-amber-300" />
              ) : (
                <Bell className="w-4 h-4 text-sky-600 dark:text-sky-300" />
              )}
              <span className="hidden sm:inline text-xs font-bold">Notices</span>
              {notices.length > 0 && (
                <span className="font-mono-nums text-[11px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100">
                  {notices.length}
                </span>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-home-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onHome();
              }}
              aria-label="Home"
              title="Return to Home Screen"
              className="h-10 px-2.5 sm:px-3 rounded-xl bg-white/92 hover:bg-slate-100 dark:bg-[#091224]/90 dark:hover:bg-[#1e293b] border border-slate-300 dark:border-slate-400/35 flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer shadow-sm"
            >
              <Home className="w-4 h-4 text-rose-600 dark:text-rose-300" />
              <span className="hidden md:inline text-xs font-bold">Home</span>
            </button>
          </div>

          {hud.miniMap && <MiniMap map={hud.miniMap} />}
        </div>
      </div>

      {/* Bottom Perimeter Cues: Alerts, Prompts, Power-Ups & Stealth Ability Bar */}
      <div className="flex flex-col items-center gap-2 mb-32 lg:mb-1">
        {!hideOnScreenPopups && hud.elfClue && (
          <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50/95 dark:bg-emerald-950/95 border border-emerald-500/50 text-emerald-900 dark:text-emerald-100 text-xs sm:text-sm font-medium shadow-lg max-w-lg text-center">
            <span>Mystery Elf: &ldquo;{hud.elfClue}&rdquo;</span>
            <button
              type="button"
              tabIndex={-1}
              onClick={onToggleHidePopups}
              aria-label="Hide on-screen popups without deleting"
              title="Hide popups (kept in Notices)"
              className="p-1 rounded-lg hover:bg-emerald-500/20 cursor-pointer shrink-0"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!hideOnScreenPopups && hud.statusBanner && (
          <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#091224]/90 border border-amber-500/50 dark:border-amber-300/40 text-amber-900 dark:text-amber-100 text-xs sm:text-sm font-semibold shadow-lg text-center max-w-xl">
            <span>{hud.statusBanner}</span>
            <button
              type="button"
              tabIndex={-1}
              onClick={onToggleHidePopups}
              aria-label="Hide on-screen notifications without deleting"
              title="Hide popups (kept in Notices)"
              className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 cursor-pointer shrink-0"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {hud.nearbyPrompt && (
          <div className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg">
            {hud.nearbyPrompt}
          </div>
        )}

        {activePowerUpList.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {activePowerUpList.map((pu) => (
              <div
                key={pu.key}
                className="px-3 py-1 rounded-xl bg-white/92 dark:bg-[#091224]/90 border border-sky-500/50 dark:border-sky-400/45 text-xs font-semibold text-sky-900 dark:text-sky-100 flex items-center gap-2 shadow"
              >
                <span>{pu.name}</span>
                <span className="font-mono-nums text-sky-700 dark:text-sky-300">
                  {pu.remaining.toFixed(1)}s
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Stealth Action & Ability Bar */}
        <div
          className={`hidden sm:flex items-center gap-2 pointer-events-auto px-3.5 py-2 rounded-2xl ${panelClass} shadow-xl`}
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSneak();
            }}
            aria-label="Toggle Sneak Mode [C]"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              hud.stance === 'sneak'
                ? 'bg-sky-500 text-slate-950 border-sky-300'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600/60'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>[C] Sneak</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerHide();
            }}
            aria-label="Hide in Nearby Cover [E]"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              hud.isHiding
                ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600/60'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>[E] {hud.isHiding ? 'Exit' : 'Hide'}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            disabled={sa.decoyCooldown > 0}
            onClick={(e) => {
              e.currentTarget.blur();
              onThrowDecoy();
            }}
            aria-label="Throw Bell Decoy [Q]"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              sa.decoyCooldown > 0
                ? 'bg-slate-100/70 dark:bg-slate-900/70 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                : 'bg-amber-50 hover:bg-amber-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-200 border-amber-400/50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="font-mono-nums">
              {sa.decoyCooldown > 0 ? `${Math.ceil(sa.decoyCooldown)}s` : '[Q] Decoy'}
            </span>
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

          <button
            type="button"
            tabIndex={-1}
            disabled={sa.disguiseCooldown > 0 && sa.disguiseActive <= 0}
            onClick={(e) => {
              e.currentTarget.blur();
              onActivateAbility('disguise');
            }}
            aria-label="Magic Gift Box Disguise [1]"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              sa.disguiseActive > 0
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : sa.disguiseCooldown > 0
                ? 'bg-slate-100/70 dark:bg-slate-900/70 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-200 border-slate-300 dark:border-slate-600/60'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="font-mono-nums">
              {sa.disguiseActive > 0
                ? `Box ${sa.disguiseActive.toFixed(0)}s`
                : sa.disguiseCooldown > 0
                ? `${Math.ceil(sa.disguiseCooldown)}s`
                : '[1] Disguise'}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            disabled={sa.silentBootsCooldown > 0 && sa.silentBootsActive <= 0}
            onClick={(e) => {
              e.currentTarget.blur();
              onActivateAbility('silent_boots');
            }}
            aria-label="Silent Snow Boots [2]"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              sa.silentBootsActive > 0
                ? 'bg-sky-400 text-slate-950 border-sky-200'
                : sa.silentBootsCooldown > 0
                ? 'bg-slate-100/70 dark:bg-slate-900/70 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-sky-800 dark:text-sky-200 border-slate-300 dark:border-slate-600/60'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span className="font-mono-nums">
              {sa.silentBootsActive > 0
                ? `Silent ${sa.silentBootsActive.toFixed(0)}s`
                : sa.silentBootsCooldown > 0
                ? `${Math.ceil(sa.silentBootsCooldown)}s`
                : '[2] Silent'}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            disabled={sa.elfSmokeCooldown > 0 && sa.elfSmokeActive <= 0}
            onClick={(e) => {
              e.currentTarget.blur();
              onActivateAbility('elf_smoke');
            }}
            aria-label="Elf Magic Smoke Screen [3]"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              sa.elfSmokeActive > 0
                ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                : sa.elfSmokeCooldown > 0
                ? 'bg-slate-100/70 dark:bg-slate-900/70 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-200 border-slate-300 dark:border-slate-600/60'
            }`}
          >
            <CloudFog className="w-3.5 h-3.5" />
            <span className="font-mono-nums">
              {sa.elfSmokeActive > 0
                ? `Smoke ${sa.elfSmokeActive.toFixed(0)}s`
                : sa.elfSmokeCooldown > 0
                ? `${Math.ceil(sa.elfSmokeCooldown)}s`
                : '[3] Smoke'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
