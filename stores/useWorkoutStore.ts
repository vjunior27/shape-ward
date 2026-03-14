import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkoutSet {
  reps: number;
  weight: number;
  unit: 'kg' | 'lbs';
  completed: boolean;
}

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

interface ActiveWorkout {
  id: string;
  startedAt: string;
  exercises: WorkoutExercise[];
  notes: string;
  restTimerSeconds: number;
}

interface WorkoutState {
  activeWorkout: ActiveWorkout | null;
  isResting: boolean;
  restTimeRemaining: number;
  startWorkout: () => void;
  addExercise: (exercise: Omit<WorkoutExercise, 'sets'>) => void;
  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<WorkoutSet>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  setNotes: (notes: string) => void;
  startRest: (seconds: number) => void;
  stopRest: () => void;
  finishWorkout: () => ActiveWorkout | null;
  cancelWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      isResting: false,
      restTimeRemaining: 0,

      startWorkout: () =>
        set({
          activeWorkout: {
            id: crypto.randomUUID(),
            startedAt: new Date().toISOString(),
            exercises: [],
            notes: '',
            restTimerSeconds: 90,
          },
        }),

      addExercise: (exercise) =>
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? {
                ...state.activeWorkout,
                exercises: [
                  ...state.activeWorkout.exercises,
                  { ...exercise, sets: [{ reps: 0, weight: 0, unit: 'kg', completed: false }] },
                ],
              }
            : null,
        })),

      updateSet: (exerciseIndex, setIndex, data) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = [...state.activeWorkout.exercises];
          const sets = [...exercises[exerciseIndex].sets];
          sets[setIndex] = { ...sets[setIndex], ...data };
          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
          return { activeWorkout: { ...state.activeWorkout, exercises } };
        }),

      addSet: (exerciseIndex) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = [...state.activeWorkout.exercises];
          const lastSet = exercises[exerciseIndex].sets.at(-1);
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: [
              ...exercises[exerciseIndex].sets,
              { reps: lastSet?.reps ?? 0, weight: lastSet?.weight ?? 0, unit: lastSet?.unit ?? 'kg', completed: false },
            ],
          };
          return { activeWorkout: { ...state.activeWorkout, exercises } };
        }),

      removeSet: (exerciseIndex, setIndex) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = [...state.activeWorkout.exercises];
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex),
          };
          return { activeWorkout: { ...state.activeWorkout, exercises } };
        }),

      setNotes: (notes) =>
        set((state) => ({
          activeWorkout: state.activeWorkout ? { ...state.activeWorkout, notes } : null,
        })),

      startRest: (seconds) => set({ isResting: true, restTimeRemaining: seconds }),
      stopRest: () => set({ isResting: false, restTimeRemaining: 0 }),

      finishWorkout: () => {
        const workout = get().activeWorkout;
        set({ activeWorkout: null, isResting: false, restTimeRemaining: 0 });
        return workout;
      },

      cancelWorkout: () =>
        set({ activeWorkout: null, isResting: false, restTimeRemaining: 0 }),
    }),
    { name: 'shape-ward-active-workout' }
  )
);
