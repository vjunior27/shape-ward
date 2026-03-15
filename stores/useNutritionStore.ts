import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number; // ml
}

export interface WaterEntry {
  id: string;
  ml: number;
  time: string; // ISO timestamp
  date: string; // YYYY-MM-DD
}

interface NutritionStoreState {
  goals: NutritionGoals;
  waterToday: number;   // ml consumed today
  lastWaterDate: string | null;
  waterEntries: WaterEntry[];
  waterHistory: Record<string, number>; // date → total ml

  setGoals: (updates: Partial<NutritionGoals>) => void;
  addWater: (ml: number) => string; // returns entry id
  removeWaterEntry: (id: string) => void;
  resetWaterIfNewDay: () => void;
  getWaterProgress: () => number; // 0-100
}

export const useNutritionStore = create<NutritionStoreState>()(
  persist(
    (set, get) => ({
      goals: { calories: 2200, protein: 150, carbs: 250, fat: 70, water: 3000 },
      waterToday: 0,
      lastWaterDate: null,
      waterEntries: [],
      waterHistory: {},

      setGoals: (updates) =>
        set((state) => ({ goals: { ...state.goals, ...updates } })),

      addWater: (ml) => {
        get().resetWaterIfNewDay();
        const today = new Date().toISOString().split('T')[0];
        const id = crypto.randomUUID();
        const entry: WaterEntry = {
          id,
          ml,
          time: new Date().toISOString(),
          date: today,
        };
        set((state) => {
          const newTotal = state.waterToday + ml;
          return {
            waterToday: newTotal,
            lastWaterDate: today,
            waterEntries: [entry, ...state.waterEntries].slice(0, 200), // keep last 200
            waterHistory: {
              ...state.waterHistory,
              [today]: newTotal,
            },
          };
        });
        return id;
      },

      removeWaterEntry: (id) => {
        set((state) => {
          const entry = state.waterEntries.find((e) => e.id === id);
          if (!entry) return state;
          const today = new Date().toISOString().split('T')[0];
          const newEntries = state.waterEntries.filter((e) => e.id !== id);
          // Recalculate today total
          const todayTotal = newEntries
            .filter((e) => e.date === today)
            .reduce((s, e) => s + e.ml, 0);
          return {
            waterEntries: newEntries,
            waterToday: todayTotal,
            waterHistory: { ...state.waterHistory, [today]: todayTotal },
          };
        });
      },

      resetWaterIfNewDay: () => {
        const today = new Date().toISOString().split('T')[0];
        const state = get();
        if (state.lastWaterDate !== today) {
          // Carry forward today's entries (if any were added before midnight logic ran)
          const todayTotal = state.waterEntries
            .filter((e) => e.date === today)
            .reduce((s, e) => s + e.ml, 0);
          set({ waterToday: todayTotal, lastWaterDate: today });
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
