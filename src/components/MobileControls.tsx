import React, { useRef, useState } from 'react';
import { Bell, Box, Footprints, Sparkles } from 'lucide-react';

interface MobileControlsProps {
  isSneaking: boolean;
  isHiding: boolean;
  onMoveVector: (vx: number, vy: number) => void;
  onAction: () => void;
  onToggleSneak: () => void;
  onTriggerHide: () => void;
  onThrowDecoy: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  isSneaking,
  isHiding,
  onMoveVector,
  onAction,
  onToggleSneak,
  onTriggerHide,
  onThrowDecoy,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  const updateStick = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 14;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onMoveVector(dx / maxR, dy / maxR);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onMoveVector(0, 0);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-30 px-4 flex items-end justify-between pointer-events-none">
      {/* Virtual Thumbstick */}
      <div
        ref={padRef}
        role="application"
        aria-label="Virtual Directional Joystick"
        onPointerDown={(e) => {
          activePointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current === e.pointerId) {
            updateStick(e.clientX, e.clientY);
          }
        }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-white/80 dark:bg-[#091224]/75 border-2 border-slate-400/60 dark:border-slate-300/40 flex items-center justify-center touch-none shadow-xl"
      >
        <div
          className="w-12 h-12 rounded-full bg-amber-400 border-2 border-white shadow-md pointer-events-none"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Stealth & Action Cluster */}
      <div className="flex items-end gap-2.5 pointer-events-auto">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onToggleSneak}
            aria-label="Toggle Sneak"
            className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer ${
              isSneaking
                ? 'bg-sky-400 text-slate-950 border-white'
                : 'bg-white/90 dark:bg-[#091224]/85 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-400/40'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>SNEAK</span>
          </button>

          <button
            type="button"
            onClick={onTriggerHide}
            aria-label="Hide in Cover"
            className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer ${
              isHiding
                ? 'bg-emerald-400 text-slate-950 border-white'
                : 'bg-white/90 dark:bg-[#091224]/85 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-400/40'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>{isHiding ? 'EXIT' : 'HIDE'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onThrowDecoy}
          aria-label="Throw Bell Decoy"
          className="w-12 h-12 rounded-xl bg-white/90 dark:bg-[#091224]/85 border border-amber-500/60 dark:border-amber-300/50 text-amber-800 dark:text-amber-200 font-bold text-[10px] flex flex-col items-center justify-center shadow-lg cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span>DECOY</span>
        </button>

        {/* Action Button */}
        <button
          type="button"
          onClick={onAction}
          aria-label="Action and Deliver Present"
          className="w-20 h-20 rounded-full bg-red-600/90 active:scale-95 border-2 border-amber-300 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xl cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-200" />
          <span>ACTION</span>
        </button>
      </div>
    </div>
  );
};
