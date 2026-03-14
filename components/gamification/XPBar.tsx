import React from 'react';
import { useStreakStore } from '../../stores/useStreakStore';

export default function XPBar({ compact = false }: { compact?: boolean }) {
  const getLevel = useStreakStore((s) => s.getLevel);
  const getNextLevel = useStreakStore((s) => s.getNextLevel);
  const getLevelProgress = useStreakStore((s) => s.getLevelProgress);
  const xp = useStreakStore((s) => s.xp);

  const level = getLevel();
  const next = getNextLevel();
  const progress = getLevelProgress();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-base">{level.icon}</span>
        <div className="flex-1">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-gray-400 text-xs font-mono">{level.level}</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{level.icon}</span>
        <div>
          <p className="text-white font-bold">{level.name}</p>
          <p className="text-gray-500 text-xs">Nível {level.level}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-primary font-mono font-bold">{xp.toLocaleString('pt-BR')}</p>
          <p className="text-gray-600 text-xs">XP total</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-red-400 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>{progress}%</span>
          {next && <span>Próximo: {next.icon} {next.name} ({(next.minXP - xp).toLocaleString('pt-BR')} XP)</span>}
        </div>
      </div>
    </div>
  );
}
