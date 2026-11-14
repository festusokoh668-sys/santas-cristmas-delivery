import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import workshopBanner from '../assets/images/workshop_banner_1794597613564.jpg';
import { COSMETICS } from '../game/rules';
import { CosmeticSlot, PlayerProgress } from '../game/types';
import { CoinIcon } from './GameIcons';

interface WorkshopModalProps {
  progress: PlayerProgress;
  onBuyOrEquip: (itemId: string) => void;
  onClose: () => void;
}

const SLOTS: Array<{ id: CosmeticSlot; label: string }> = [
  { id: 'outfit', label: 'Santa Outfits' },
  { id: 'sleigh', label: 'Sleigh Trails' },
  { id: 'reindeer', label: 'Reindeer Gear' },
  { id: 'gear', label: 'Workshop Perks' },
];

export const WorkshopModal: React.FC<WorkshopModalProps> = ({
  progress,
  onBuyOrEquip,
  onClose,
}) => {
  const [slot, setSlot] = useState<CosmeticSlot>('outfit');
  const items = COSMETICS.filter((c) => c.slot === slot);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Santa's Store and Workshop"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#060c1a]/92"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#0d1933] border border-slate-300 dark:border-slate-400/30 shadow-2xl overflow-hidden">
        {/* Workshop Header Banner */}
        <div className="relative h-36 px-6 py-4 flex items-end justify-between overflow-hidden border-b border-slate-200 dark:border-slate-600/40">
          <img
            src={workshopBanner}
            alt="Santa's North Pole Workshop"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091224] via-[#091224]/60 to-transparent" />

          <div className="relative z-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Santa&apos;s Store &amp; Workshop
            </h2>
            <p className="text-xs sm:text-sm text-slate-200">
              Spend Christmas Coins on outfits, glowing sleigh trails, reindeer gear, and stealth perks.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#091224]/90 border border-amber-300/40">
              <CoinIcon className="w-5 h-5" />
              <span className="font-mono-nums text-base font-bold text-amber-300">
                {progress.coins}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Workshop"
              className="w-10 h-10 rounded-xl bg-[#091224]/90 hover:bg-slate-800 border border-slate-500/35 flex items-center justify-center text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slot Tabs */}
        <div className="px-6 pt-4 flex flex-wrap items-center gap-2">
          {SLOTS.map((s) => {
            const active = slot === s.id;
            const count = COSMETICS.filter((c) => c.slot === s.id).length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlot(s.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#122242] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-slate-500/30'
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Items Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const owned = progress.ownedCosmetics.includes(item.id);
            const equipped = progress.equippedCosmetics[item.slot] === item.id;
            const canAfford = progress.coins >= item.cost;

            return (
              <div
                key={item.id}
                className={`rounded-2xl p-4 border flex flex-col justify-between gap-4 ${
                  equipped
                    ? 'bg-emerald-50 dark:bg-[#172c54] border-emerald-500/60 dark:border-emerald-400/60'
                    : 'bg-slate-50 dark:bg-[#122242] border-slate-300 dark:border-slate-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Color Swatch Preview */}
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 border-2 shadow-inner flex items-center justify-center"
                    style={{
                      backgroundColor: item.primaryColor,
                      borderColor: item.trimColor,
                    }}
                  >
                    {equipped && <Check className="w-5 h-5 text-white drop-shadow" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {item.name}
                    </h3>
                    {item.perkLabel && (
                      <div className="mt-1 inline-block px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        {item.perkLabel}
                      </div>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-600/35">
                  {owned ? (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {equipped ? 'Currently Equipped' : 'Unlocked'}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <CoinIcon className="w-4 h-4" />
                      <span className="font-mono-nums text-sm font-bold text-amber-700 dark:text-amber-300">
                        {item.cost}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!owned && !canAfford}
                    onClick={() => onBuyOrEquip(item.id)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      equipped
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 cursor-default'
                        : owned
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                        : canAfford
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {equipped ? 'Equipped' : owned ? 'Equip' : canAfford ? 'Unlock' : 'Need Coins'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
