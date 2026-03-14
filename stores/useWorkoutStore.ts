import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveSet, ActiveExercise, FinishedWorkout, WorkoutTemplate, MuscleGroup } from '../types';

interface ActiveWorkoutState {
  id: string;
  userId: string;
  templateId?: string;
  templateName?: string;
  startedAt: string;
  exercises: ActiveExercise[];
  notes: string;
  mood?: 1 | 2 | 3 | 4 | 5;
}

interface WorkoutStoreState {
  activeWorkout: ActiveWorkoutState | null;
  isResting: boolean;
  restTimeRemaining: number;
  restTimeTotal: number;

  // Workout lifecycle
  startWorkout: (userId: string, template?: WorkoutTemplate) => void;
  cancelWorkout: () => void;
  finishWorkout: () => FinishedWorkout | null;

  // Exercise management
  addExercise: (ex: { exerciseId: string; exerciseName: string; muscleGroup: MuscleGroup; restSeconds?: number }) => void;
  removeExercise: (exerciseId: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;

  // Set management (ID-based)
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<ActiveSet>) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => void;

  // Metadata
  setNotes: (notes: string) => void;
  setExerciseNotes: (exerciseId: string, notes: string) => void;
  setMood: (mood: 1 | 2 | 3 | 4 | 5) => void;

  // Rest timer
  startRest: (seconds: number) => void;
  stopRest: () => void;
  tickRest: () => void;

  // Computed helpers
  getElapsedMinutes: () => number;
  getTotalVolume: () => number;
  getTotalSetsCompleted: () => number;
}

function makeSet(): ActiveSet {
  return {
    id: crypto.randomUUID(),
    reps: 0,
    weight: 0,
    unit: 'kg',
    isWarmup: false,
    isDropset: false,
    completed: false,
  };
}

export const useWorkoutStore = create<WorkoutStoreState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      isResting: false,
      restTimeRemaining: 0,
      restTimeTotal: 0,

      // ── Lifecycle ────────────────────────────────────────────────────────────

      startWorkout: (userId, template) => {
        const exercises: ActiveExercise[] = template
          ? template.exercises.map((te) => ({
              id: crypto.randomUUID(),
              exerciseId: te.exerciseId,
              exerciseName: te.exerciseName,
              muscleGroup: 'chest' as MuscleGroup,
              sets: Array.from({ length: te.targetSets }, makeSet),
              restSeconds: te.restSeconds,
            }))
          : [];

        set({
          activeWorkout: {
            id: crypto.randomUUID(),
            userId,
            templateId: template?.id,
            templateName: template?.name,
            startedAt: new Date().toISOString(),
            exercises,
            notes: '',
          },
        });
      },

      cancelWorkout: () =>
        set({ activeWorkout: null, isResting: false, restTimeRemaining: 0, restTimeTotal: 0 }),

      finishWorkout: () => {
        const state = get();
        if (!state.activeWorkout) return null;

        const now = new Date();
        const durationMinutes = Math.round(
          (now.getTime() - new Date(state.activeWorkout.startedAt).getTime()) / 60000
        );

        let totalVolume = 0;
        let totalSets = 0;
        state.activeWorkout.exercises.forEach((ex) =>
          ex.sets.forEach((s) => {
            if (s.completed) {
              totalVolume += s.weight * s.reps;
              totalSets++;
            }
          })
        );

        const finished: FinishedWorkout = {
          ...state.activeWorkout,
          finishedAt: now.toISOString(),
          durationMinutes,
          totalVolume,
          totalSets,
          createdAt: now.toISOString(),
        };

        set({ activeWorkout: null, isResting: false, restTimeRemaining: 0, restTimeTotal: 0 });
        return finished;
      },

      // ── Exercises ────────────────────────────────────────────────────────────

      addExercise: ({ exerciseId, exerciseName, muscleGroup, restSeconds = 90 }) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          const newEx: ActiveExercise = {
            id: crypto.randomUUID(),
            exerciseId,
            exerciseName,
            muscleGroup,
            sets: [makeSet()],
            restSeconds,
          };
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: [...state.activeWorkout.exercises, newEx],
            },
          };
        }),

      removeExercise: (exerciseId) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.filter((e) => e.id !== exerciseId),
            },
          };
        }),

      reorderExercises: (fromIndex, toIndex) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = [...state.activeWorkout.exercises];
          const [moved] = exercises.splice(fromIndex, 1);
          exercises.splice(toIndex, 0, moved);
          return { activeWorkout: { ...state.activeWorkout, exercises } };
        }),

      // ── Sets ─────────────────────────────────────────────────────────────────

      addSet: (exerciseId) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((ex) => {
                if (ex.id !== exerciseId) return ex;
                const last = ex.sets.at(-1);
                const newSet: ActiveSet = {
                  ...makeSet(),
                  reps: last?.reps ?? 0,
                  weight: last?.weight ?? 0,
                  unit: last?.unit ?? 'kg',
                };
                return { ...ex, sets: [...ex.sets, newSet] };
              }),
            },
          };
        }),

      updateSet: (exerciseId, setId, data) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((ex) =>
                ex.id !== exerciseId
                  ? ex
                  : { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...data } : s)) }
              ),
            },
          };
        }),

      removeSet: (exerciseId, setId) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((ex) =>
                ex.id !== exerciseId
                  ? ex
                  : { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
              ),
            },
          };
        }),

      toggleSetComplete: (exerciseId, setId) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((ex) =>
                ex.id !== exerciseId
                  ? ex
                  : {
                      ...ex,
                      sets: ex.sets.map((s) =>
                        s.id !== setId
                          ? s
                          : {
                              ...s,
                              completed: !s.completed,
                              completedAt: !s.completed ? new Date().toISOString() : undefined,
                            }
                      ),
                    }
              ),
            },
          };
        }),

      // ── Metadata ─────────────────────────────────────────────────────────────

      setNotes: (notes) =>
        set((state) => ({
          activeWorkout: state.activeWorkout ? { ...state.activeWorkout, notes } : null,
        })),

      setExerciseNotes: (exerciseId, notes) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, notes } : ex
              ),
            },
          };
        }),

      setMood: (mood) =>
        set((state) => ({
          activeWorkout: state.activeWorkout ? { ...state.activeWorkout, mood } : null,
        })),

      // ── Rest timer ───────────────────────────────────────────────────────────

      startRest: (seconds) =>
        set({ isResting: true, restTimeRemaining: seconds, restTimeTotal: seconds }),

      stopRest: () =>
        set({ isResting: false, restTimeRemaining: 0, restTimeTotal: 0 }),

      tickRest: () =>
        set((state) => {
          const next = state.restTimeRemaining - 1;
          if (next <= 0) return { isResting: false, restTimeRemaining: 0, restTimeTotal: 0 };
          return { restTimeRemaining: next };
        }),

      // ── Computed ─────────────────────────────────────────────────────────────

      getElapsedMinutes: () => {
        const aw = get().activeWorkout;
        if (!aw) return 0;
        return Math.round((Date.now() - new Date(aw.startedAt).getTime()) / 60000);
      },

      getTotalVolume: () => {
        const aw = get().activeWorkout;
        if (!aw) return 0;
        let vol = 0;
        aw.exercises.forEach((ex) => ex.sets.forEach((s) => { if (s.completed) vol += s.weight * s.reps; }));
        return vol;
      },

      getTotalSetsCompleted: () => {
        const aw = get().activeWorkout;
        if (!aw) return 0;
        let count = 0;
        aw.exercises.forEach((ex) => ex.sets.forEach((s) => { if (s.completed) count++; }));
        return count;
      },
    }),
    {
      name: 'shape-ward-active-workout',
      // Only persist the workout data, not the timer state
      partialize: (state) => ({ activeWorkout: state.activeWorkout }),
    }
  )
);
