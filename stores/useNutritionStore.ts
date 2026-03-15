import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number; // ml
}

interface NutritionStoreState {
  goals: NutritionGoals;
  waterToday: number;   // ml consumed today
  lastWaterDate: string | null;

  setGoals: (updates: Partial<NutritionGoals>) => void;
  addWater: (ml: number) => void;
  resetWaterIfNewDay: () => void;
  getWaterProgress: () => number; // 0-100
}

export const useNutritionStore = create<NutritionStoreState>()(
  persist(
    (set, get) => ({
      goals: { calories: 2200, protein: 150, carbs: 250, fat: 70, water: 3000 },
      waterToday: 0,
      lastWaterDate: null,

      setGoals: (updates) =>
        set((state) => ({ goals: { ...state.goals, ...updates } })),

      addWater: (ml) => {
        get().resetWaterIfNewDay();
        set((state) => ({
          waterToday: state.waterToday + ml,
          lastWaterDate: new Date().toISOString().split('T')[0],
        }));
      },

      resetWaterIfNewDay: () => {
        const today = new Date().toISOString().split('T')[0];
        if (get().lastWaterDate !== today) {
          set({ waterToday: 0, lastWaterDate: today });
        }
      },

      getWaterProgress: () => {
        const s = get();
        return Math.min(100, Math.round((s.waterToday / s.goals.water) * 100));
      },
    }),
    { name: 'trainova-nutrition' }
  )
);
