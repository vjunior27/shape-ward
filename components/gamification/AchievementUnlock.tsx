import React, { useEffect } from 'react';
import { useStreakStore } from '../../stores/useStreakStore';

export default function AchievementUnlock() {
  const pending = useStreakStore((s) => s.pendingAchievement);
  const clear = useStreakStore((s) => s.clearPendingAchievement);

  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(clear, 5000);
    return () => clearTimeout(id);
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      className="fixed top-4 left-4 right-4 z-[200] flex items-center gap-3 bg-gray-900 border border-yellow-500/40 rounded-2xl p-4 shadow-2xl shadow-yellow-500/10 animate-slide-up"
      onClick={clear}
    >
      <span className="text-3xl">{pending.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-yellow-400 font-bold text-sm">🏆 Conquista Desbloqueada!</p>
        <p className="text-white font-semibold text-sm truncate">{pending.name}</p>
        <p className="text-gray-400 text-xs">{pending.description}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-primary font-bold text-sm">+{pending.xpReward}</p>
        <p className="text-gray-600 text-xs">XP</p>
      </div>
    </div>
  );
}
