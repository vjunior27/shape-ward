import React, { useState } from 'react';
import { useStreakStore, ALL_ACHIEVEMENTS } from '../stores/useStreakStore';
import XPBar from '../components/gamification/XPBar';
import StreakDisplay from '../components/gamification/StreakDisplay';
import type { Achievement } from '../types';

type Category = 'all' | 'streak' | 'workout' | 'nutrition' | 'social';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'Todas',
  streak: '🔥 Streak',
  workout: '🏋️ Treino',
  nutrition: '🥗 Nutrição',
  social: '📱 Social',
};

export default function AchievementsScreen() {
  const unlockedIds = useStreakStore((s) => s.unlockedAchievementIds);
  const totalWorkouts = useStreakStore((s) => s.totalWorkouts);
  const xp = useStreakStore((s) => s.xp);
  const [filter, setFilter] = useState<Category>('all');

  const achievements: Achievement[] = ALL_ACHIEVEMENTS.map((a) => ({
    ...a,
    unlockedAt: unlockedIds.includes(a.id) ? 'unlocked' : undefined,
  }));

  const filtered = filter === 'all'
    ? achievements
    : achievements.filter((a) => a.category === filter);

  const unlocked = achievements.filter((a) => a.unlockedAt).length;
  const total = achievements.length;

  return (
    <div className="flex flex-col min-h-full bg-gray-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-white font-black text-2xl mb-4">Conquistas</h1>
        <XPBar />
        <div className="mt-3">
          <StreakDisplay compact={false} />
        </div>

        {/* Progress summary */}
        <div className="mt-3 bg-gray-900 rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-white font-bold">{unlocked}/{total} desbloqueadas</p>
            <div className="h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.round((unlocked / total) * 100)}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-yellow-400 font-bold text-xl">{Math.round((unlocked / total) * 100)}%</p>
            <p className="text-gray-500 text-xs">completo</p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="px-4 py-2 overflow-x-auto">
        <div className="flex gap-2 whitespace-nowrap">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === cat
                  ? 'bg-primary text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements grid */}
      <div className="px-4 py-2 grid grid-cols-2 gap-3">
        {filtered.map((a) => {
          const isUnlocked = !!a.unlockedAt;
          return (
            <div
              key={a.id}
              className={`rounded-2xl p-4 border transition-all ${
                isUnlocked
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-gray-900 border-gray-800 opacity-50'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className={`text-2xl ${!isUnlocked && 'grayscale'}`}>{a.icon}</span>
                {isUnlocked && (
                  <span className="ml-auto text-yellow-400 text-xs font-bold">+{a.xpReward} XP</span>
                )}
              </div>
              <p className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                {a.name}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{a.description}</p>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="px-4 mt-4">
        <div className="bg-gray-900 rounded-2xl p-4 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Treinos', value: totalWorkouts },
            { label: 'XP Total', value: xp.toLocaleString('pt-BR') },
            { label: 'Conquistas', value: `${unlocked}/${total}` },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white font-bold text-lg tabular-nums">{s.value}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
