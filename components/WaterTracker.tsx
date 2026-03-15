import React from 'react';
import { Droplets } from 'lucide-react';

interface WaterTrackerProps {
  current: number; // ml
  goal: number;    // ml
  onAdd: (ml: number) => void;
}

const WaterTracker: React.FC<WaterTrackerProps> = ({ current, goal, onAdd }) => {
  const pct = Math.min((current / goal) * 100, 100);
  const goalHit = current >= goal;

  const fmt = (ml: number) =>
    ml >= 1000
      ? `${(ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} L`
      : `${ml} ml`;

  return (
    <div
      className={`bg-surface rounded-2xl border p-4 transition-all ${
        goalHit ? 'border-primary/50 shadow-[0_0_16px_rgba(0,255,148,0.15)]' : 'border-[#1E1E2A]'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Drop icon with fill gradient */}
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full" aria-hidden>
            <defs>
              <clipPath id="water-clip">
                {/* Fill from bottom based on pct */}
                <rect x="0" y={56 - (56 * pct) / 100} width="56" height="56" />
              </clipPath>
            </defs>
            {/* Drop outline */}
            <Droplets
              size={56}
              className="absolute inset-0"
              style={{ color: '#1E1E2A' }}
            />
          </svg>
          {/* Use Droplets icon with clip trick via CSS */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-10 h-10">
              <Droplets size={40} className="text-[#1E1E2A]" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}
              >
                <Droplets
                  size={40}
                  className={goalHit ? 'text-primary' : 'text-blue-400'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#A1A1AA] mb-1">Hidratação</p>
          <p className="text-lg font-bold text-white leading-none">
            {fmt(current)}{' '}
            <span className="text-sm font-normal text-[#A1A1AA]">/ {fmt(goal)}</span>
          </p>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#1E1E2A] rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: '#00FF94' }}
            />
          </div>
        </div>

        {goalHit && (
          <div className="text-primary text-lg shrink-0" title="Meta atingida!">
            ✓
          </div>
        )}
      </div>

      {/* Quick-add buttons */}
      <div className="flex gap-2 mt-3">
        {[
          { label: '+250ml', ml: 250 },
          { label: '+500ml', ml: 500 },
          { label: '+1L', ml: 1000 },
        ].map(({ label, ml }) => (
          <button
            key={label}
            onClick={() => onAdd(ml)}
            className="flex-1 py-2 text-xs font-semibold rounded-xl bg-[#1a1a28] border border-[#1E1E2A] text-[#A1A1AA] hover:border-primary/40 hover:text-primary transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WaterTracker;
