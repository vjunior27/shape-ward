import React from 'react';
import { Flame, Shield } from 'lucide-react';
import { useStreakStore } from '../../stores/useStreakStore';

interface Props {
  compact?: boolean;
  onUseShield?: () => void;
}

export default function StreakDisplay({ compact = false, onUseShield }: Props) {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const shields = useStreakStore((s) => s.streakShieldsRemaining);
  const useShield = useStreakStore((s) => s.useShield);
  const lastDate = useStreakStore((s) => s.lastWorkoutDate);

  const isAtRisk = (() => {
    if (!lastDate) return false;
    const today = new Date().toISOString().split('T')[0];
    const diff = Math.floor((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000);
    return diff >= 1 && currentStreak > 0;
  })();

  const isOnFire = currentStreak >= 7;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Flame size={14} className={isOnFire ? 'text-orange-400' : 'text-gray-500'} />
        <span className={`text-sm font-bold tabular-nums ${isOnFire ? 'text-orange-400' : 'text-gray-400'}`}>
          {currentStreak}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center gap-4">
        {/* Streak number */}
        <div className="flex items-center gap-2">
          <Flame
            size={28}
            className={isOnFire ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]' : 'text-gray-600'}
          />
          <div>
            <p className={`text-3xl font-black tabular-nums ${isOnFire ? 'text-orange-400' : 'text-white'}`}>
              {currentStreak}
            </p>
            <p className="text-gray-500 text-xs">dias seguidos</p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Best */}
        <div className="text-right">
          <p className="text-gray-400 text-xs">Recorde</p>
          <p className="text-white font-bold">{longestStreak}d</p>
        </div>

        {/* Shields */}
        {shields > 0 && (
          <button
            onClick={() => { if (isAtRisk) { useShield(); onUseShield?.(); } }}
            disabled={!isAtRisk}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isAtRisk
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                : 'bg-gray-800 text-gray-600 cursor-default'
            }`}
          >
            <Shield size={12} />
            <span>{shields}</span>
          </button>
        )}
      </div>

      {/* Milestone badges */}
      {[7, 30, 60, 90, 180, 365].some((m) => currentStreak >= m) && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            { days: 7, label: '1 semana', icon: '🔥' },
            { days: 30, label: '1 mês', icon: '📅' },
            { days: 90, label: '3 meses', icon: '💪' },
            { days: 180, label: '6 meses', icon: '🏆' },
            { days: 365, label: '1 ano', icon: '👑' },
          ]
            .filter((m) => currentStreak >= m.days)
            .map((m) => (
              <span key={m.days} className="bg-orange-500/10 text-orange-400 text-xs px-2 py-1 rounded-lg border border-orange-500/20">
                {m.icon} {m.label}
              </span>
            ))}
        </div>
      )}

      {isAtRisk && (
        <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
          ⚠️ Seu streak está em risco! Treine hoje para manter.
        </p>
      )}
    </div>
  );
}
