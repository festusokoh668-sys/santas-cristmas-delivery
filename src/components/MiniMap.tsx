import React from 'react';
import { MiniMapSnapshot } from '../game/types';

interface MiniMapProps {
  map: MiniMapSnapshot;
}

export const MiniMap: React.FC<MiniMapProps> = ({ map }) => {
  const { cols, rows, grid, santa, portal, portalUnlocked, houses, gateKeys, hidingSpots, enemies } =
    map;

  return (
    <div
      aria-label="Maze Mini-Map"
      data-santa-x={santa.x.toFixed(2)}
      data-santa-y={santa.y.toFixed(2)}
      data-portal-unlocked={portalUnlocked ? 'true' : 'false'}
      className="hidden sm:block rounded-2xl bg-white/92 dark:bg-[#091224]/92 border border-slate-300/80 dark:border-slate-500/40 p-2 shadow-xl pointer-events-none"
    >
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 px-0.5">
        <span>Radar</span>
        <span className={portalUnlocked ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
          {portalUnlocked ? 'Gate Open' : 'Stealth Map'}
        </span>
      </div>
      <svg
        width={140}
        height={Math.round((140 * rows) / Math.max(1, cols))}
        viewBox={`0 0 ${cols} ${rows}`}
        className="rounded-lg bg-slate-100 dark:bg-[#050a14] border border-slate-300 dark:border-slate-700/60 block"
      >
        {grid.map((row, y) =>
          row.map((tile, x) => {
            if (tile === 'wall' || tile === 'secret_wall') {
              return (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width={1.02}
                  height={1.02}
                  fill={tile === 'secret_wall' ? '#d97706' : '#1e3a5f'}
                />
              );
            }
            if (tile === 'shadow') {
              return (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width={1.02}
                  height={1.02}
                  fill="#0b1528"
                />
              );
            }
            return null;
          })
        )}

        {/* Hiding spots */}
        {hidingSpots.map((hs, i) => (
          <circle key={`hs-${i}`} cx={hs.x} cy={hs.y} r={0.32} fill="#38bdf8" opacity={0.8} />
        ))}

        {/* Remaining delivery houses */}
        {houses.map((h, i) =>
          h.delivered ? null : (
            <rect
              key={`h-${i}`}
              x={h.x - 0.35}
              y={h.y - 0.35}
              width={0.7}
              height={0.7}
              rx={0.12}
              fill="#4ade80"
            />
          )
        )}

        {/* Uncollected Gate Keys */}
        {gateKeys.map((k, i) =>
          k.collected ? null : (
            <circle key={`k-${i}`} cx={k.x} cy={k.y} r={0.38} fill="#fde047" />
          )
        )}

        {/* Mission Gate */}
        <rect
          x={portal.x - 0.45}
          y={portal.y - 0.45}
          width={0.9}
          height={0.9}
          rx={0.2}
          fill={portalUnlocked ? '#34d399' : '#94a3b8'}
          stroke="#ffffff"
          strokeWidth={0.12}
        />

        {/* Stealth Enemies */}
        {enemies.map((e, i) => (
          <circle
            key={`e-${i}`}
            cx={e.x}
            cy={e.y}
            r={e.state === 'chase' ? 0.46 : 0.36}
            fill={
              e.state === 'chase'
                ? '#f43f5e'
                : e.state === 'sleep'
                ? '#38bdf8'
                : '#f97316'
            }
          />
        ))}

        {/* Santa Marker */}
        <circle cx={santa.x} cy={santa.y} r={0.48} fill="#ffffff" />
        <circle cx={santa.x} cy={santa.y} r={0.28} fill="#ef4444" />
      </svg>
    </div>
  );
};
