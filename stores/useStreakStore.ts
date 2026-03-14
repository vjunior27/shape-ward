import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Achievement } from '../types';

// ─── XP values ────────────────────────────────────────────────────────────────

export const XP_VALUES = {
  COMPLETE_WORKOUT: 100,
  LOG_MEAL: 30,
  HIT_PROTEIN_GOAL: 50,
  HIT_CALORIE_GOAL: 40,
  CHAT_TITANAI: 20,
  NEW_PERSONAL_RECORD: 200,
  FIRST_WORKOUT: 150,
  SHARE_ON_SOCIAL: 30,
  WATER_GOAL_HIT: 20,
} as const;

// ─── Levels ───────────────────────────────────────────────────────────────────

export const LEVELS = [
  { level: 1, name: 'Iniciante',   minXP: 0,       icon: '🌱' },
  { level: 2, name: 'Aprendiz',    minXP: 500,      icon: '🔰' },
  { level: 3, name: 'Regular',     minXP: 1500,     icon: '⚡' },
  { level: 4, name: 'Dedicado',    minXP: 3500,     icon: '🔥' },
  { level: 5, name: 'Guerreiro',   minXP: 7000,     icon: '⚔️' },
  { level: 6, name: 'Espartano',   minXP: 12000,    icon: '🛡️' },
  { level: 7, name: 'Titan',       minXP: 20000,    icon: '🏛️' },
  { level: 8, name: 'Lenda',       minXP: 35000,    icon: '👑' },
  { level: 9, name: 'Imortal',     minXP: 60000,    icon: '💎' },
  { level: 10, name: 'Shape God',  minXP: 100000,   icon: '🌟' },
] as const;

// ─── Achievement definitions ──────────────────────────────────────────────────

export const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  // Streak
  { id: 'streak_7',   name: 'Uma Semana Forte',       description: '7 dias de streak',    icon: '🔥', category: 'streak',    xpReward: 200   },
  { id: 'streak_30',  name: 'Mês de Ferro',           description: '30 dias de streak',   icon: '🗓️', category: 'streak',    xpReward: 1000  },
  { id: 'streak_90',  name: 'Trimestre Titan',        description: '90 dias de streak',   icon: '💪', category: 'streak',    xpReward: 3000  },
  { id: 'streak_180', name: 'Meio Ano Inabalável',    description: '180 dias de streak',  icon: '🏆', category: 'streak',    xpReward: 5000  },
  { id: 'streak_365', name: 'Lenda Anual',            description: '365 dias de streak',  icon: '👑', category: 'streak',    xpReward: 10000 },
  // Workout
  { id: 'first_workout',  name: 'Primeiro Passo',     description: '1º treino completo',  icon: '🎯', category: 'workout',   xpReward: 150  },
  { id: 'workouts_10',    name: 'Esquentando',        description: '10 treinos',           icon: '🌡️', category: 'workout',   xpReward: 300  },
  { id: 'workouts_50',    name: 'Meio Centenário',    description: '50 treinos',           icon: '⭐', category: 'workout',   xpReward: 1000 },
  { id: 'workouts_100',   name: 'Centurião',          description: '100 treinos',          icon: '💯', category: 'workout',   xpReward: 2500 },
  { id: 'workouts_500',   name: 'Meio Milhar',        description: '500 treinos',          icon: '🏛️', category: 'workout',   xpReward: 10000},
  { id: 'first_pr',       name: 'Quebrando Limites',  description: '1º recorde pessoal',   icon: '📈', category: 'workout',   xpReward: 200  },
  // Nutrition
  { id: 'first_meal',     name: 'Primeira Refeição',  description: '1ª refeição registrada', icon: '🍽️', category: 'nutrition', xpReward: 100 },
  // Social
  { id: 'first_share',    name: 'Influencer Fitness', description: '1º compartilhamento',  icon: '📱', category: 'social',    xpReward: 100 },
  { id: 'shares_10',      name: 'Motivador',          description: '10 compartilhamentos', icon: '📣', category: 'social',    xpReward: 300 },
];

// ─── Store ────────────────────────────────────────────────────────────────────

interface StreakStoreState {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  streakShieldsRemaining: number;
  totalWorkouts: number;
  totalShares: number;
  totalMeals: number;
  firstPR: boolean;
  xp: number;
  unlockedAchievementIds: string[];
  pendingAchievement: Achievement | null; // shown in toast

  // Actions
  recordStreak: (date?: string) => void;
  useShield: () => boolean;
  addXP: (amount: number) => void;
  recordShare: () => void;
  recordMeal: () => void;
  recordPR: () => void;
  clearPendingAchievement: () => void;

  // Computed
  getLevel: () => typeof LEVELS[number];
  getNextLevel: () => typeof LEVELS[number] | null;
  getLevelProgress: () => number; // 0-100
  getAllAchievements: () => Achievement[];
}

function computeLevel(xp: number): typeof LEVELS[number] {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export const useStreakStore = create<StreakStoreState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      streakShieldsRemaining: 0,
      totalWorkouts: 0,
      totalShares: 0,
      totalMeals: 0,
      firstPR: false,
      xp: 0,
      unlockedAchievementIds: [],
      pendingAchievement: null,

      // ── Streak ──────────────────────────────────────────────────────────────

      recordStreak: (date) => {
        const today = date ?? new Date().toISOString().split('T')[0];
        const state = get();
        const lastDate = state.lastWorkoutDate;
        let newStreak = state.currentStreak;

        if (!lastDate) {
          newStreak = 1;
        } else {
          const diffDays = Math.floor(
            (new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000
          );
          if (diffDays === 1) newStreak = state.currentStreak + 1;
          else if (diffDays === 0) newStreak = state.currentStreak;
          else newStreak = 1;
        }

        const newTotal = state.totalWorkouts + 1;

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, state.longestStreak),
          lastWorkoutDate: today,
          totalWorkouts: newTotal,
        });

        // Check streak-based achievements
        get()._checkAchievements({ currentStreak: newStreak, totalWorkouts: newTotal });
      },

      useShield: () => {
        const state = get();
        if (state.streakShieldsRemaining <= 0) return false;
        set({ streakShieldsRemaining: state.streakShieldsRemaining - 1 });
        return true;
      },

      addXP: (amount) =>
        set((state) => ({ xp: state.xp + amount })),

      recordShare: () => {
        const newTotal = get().totalShares + 1;
        set({ totalShares: newTotal });
        get()._checkAchievements({ totalShares: newTotal });
      },

      recordMeal: () => {
        const newTotal = get().totalMeals + 1;
        set({ totalMeals: newTotal });
        get()._checkAchievements({ totalMeals: newTotal });
      },

      recordPR: () => {
        set({ firstPR: true });
        get()._checkAchievements({ firstPR: true });
      },

      clearPendingAchievement: () => set({ pendingAchievement: null }),

      // ── Internal achievement checker (not in interface) ──────────────────────

      _checkAchievements: (context: {
        currentStreak?: number;
        totalWorkouts?: number;
        totalShares?: number;
        totalMeals?: number;
        firstPR?: boolean;
      }) => {
        const state = get();
        const streak = context.currentStreak ?? state.currentStreak;
        const workouts = context.totalWorkouts ?? state.totalWorkouts;
        const shares = context.totalShares ?? state.totalShares;
        const meals = context.totalMeals ?? state.totalMeals;
        const hasPR = context.firstPR ?? state.firstPR;

        const conditions: Record<string, boolean> = {
          streak_7:     streak >= 7,
          streak_30:    streak >= 30,
          streak_90:    streak >= 90,
          streak_180:   streak >= 180,
          streak_365:   streak >= 365,
          first_workout: workouts >= 1,
          workouts_10:  workouts >= 10,
          workouts_50:  workouts >= 50,
          workouts_100: workouts >= 100,
          workouts_500: workouts >= 500,
          first_pr:     hasPR,
          first_meal:   meals >= 1,
          first_share:  shares >= 1,
          shares_10:    shares >= 10,
        };

        const newlyUnlocked = ALL_ACHIEVEMENTS.filter(
          (a) => conditions[a.id] && !state.unlockedAchievementIds.includes(a.id)
        );

        if (newlyUnlocked.length > 0) {
          const first = newlyUnlocked[0];
          const now = new Date().toISOString();
          set((s) => ({
            unlockedAchievementIds: [...s.unlockedAchievementIds, ...newlyUnlocked.map((a) => a.id)],
            xp: s.xp + newlyUnlocked.reduce((sum, a) => sum + a.xpReward, 0),
            pendingAchievement: { ...first, unlockedAt: now },
          }));
        }
      },

      // ── Computed ─────────────────────────────────────────────────────────────

      getLevel: () => computeLevel(get().xp),

      getNextLevel: () => {
        const current = computeLevel(get().xp);
        const idx = LEVELS.findIndex((l) => l.level === current.level);
        return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
      },

      getLevelProgress: () => {
        const { xp } = get();
        const current = computeLevel(xp);
        const next = LEVELS.find((l) => l.level === current.level + 1);
        if (!next) return 100;
        const range = next.minXP - current.minXP;
        const earned = xp - current.minXP;
        return Math.round((earned / range) * 100);
      },

      getAllAchievements: () => {
        const { unlockedAchievementIds } = get();
        return ALL_ACHIEVEMENTS.map((a): Achievement => ({
          ...a,
          unlockedAt: unlockedAchievementIds.includes(a.id)
            ? new Date().toISOString() // would be better stored per-achievement
            : undefined,
        }));
      },
    } as any),
    {
      name: 'shape-ward-streak',
      // Exclude internal method from serialization
      partialize: (state: any) => {
        const { _checkAchievements, getLevel, getNextLevel, getLevelProgress, getAllAchievements, ...rest } = state;
        return rest;
      },
    }
  )
);
