import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const XP_PER_LEVEL = 500;

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  streakShieldsRemaining: number;
  totalWorkouts: number;
  xp: number;
  level: number;
  recordStreak: (date?: string) => void;
  useShield: () => boolean;
  addXP: (amount: number) => void;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      streakShieldsRemaining: 0,
      totalWorkouts: 0,
      xp: 0,
      level: 1,

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

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, state.longestStreak),
          lastWorkoutDate: today,
          totalWorkouts: state.totalWorkouts + 1,
        });
      },

      useShield: () => {
        const state = get();
        if (state.streakShieldsRemaining <= 0) return false;
        set({ streakShieldsRemaining: state.streakShieldsRemaining - 1 });
        return true;
      },

      addXP: (amount) =>
        set((state) => {
          const newXP = state.xp + amount;
          return { xp: newXP, level: Math.floor(newXP / XP_PER_LEVEL) + 1 };
        }),
    }),
    { name: 'shape-ward-streak' }
  )
);
