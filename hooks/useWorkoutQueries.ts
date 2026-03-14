import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../stores/useUserStore';
import * as workoutService from '../services/workoutService';
import type { FinishedWorkout, WorkoutTemplate } from '../types';

export function useWorkoutHistory(limitCount = 30) {
  const userId = useUserStore((s) => s.user?.uid);
  return useQuery({
    queryKey: ['workouts', userId, limitCount],
    queryFn: () => workoutService.getWorkoutHistory(userId!, limitCount),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorkoutsByDateRange(startDate: string, endDate: string) {
  const userId = useUserStore((s) => s.user?.uid);
  return useQuery({
    queryKey: ['workouts', userId, 'range', startDate, endDate],
    queryFn: () => workoutService.getWorkoutsByDateRange(userId!, startDate, endDate),
    enabled: !!userId && !!startDate && !!endDate,
  });
}

export function useTemplates() {
  const userId = useUserStore((s) => s.user?.uid);
  return useQuery({
    queryKey: ['templates', userId],
    queryFn: () => workoutService.getTemplates(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePersonalRecords() {
  const userId = useUserStore((s) => s.user?.uid);
  return useQuery({
    queryKey: ['personalRecords', userId],
    queryFn: () => workoutService.getPersonalRecords(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useExerciseProgress(exerciseId: string) {
  const userId = useUserStore((s) => s.user?.uid);
  return useQuery({
    queryKey: ['exerciseProgress', userId, exerciseId],
    queryFn: () => workoutService.getExerciseProgressData(userId!, exerciseId),
    enabled: !!userId && !!exerciseId,
  });
}

export function useLastExerciseData(exerciseId: string) {
  const userId = useUserStore((s) => s.user?.uid);
  return useQuery({
    queryKey: ['lastExercise', userId, exerciseId],
    queryFn: () => workoutService.getLastWorkoutForExercise(userId!, exerciseId),
    enabled: !!userId && !!exerciseId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSaveWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workoutService.saveWorkout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      qc.invalidateQueries({ queryKey: ['personalRecords'] });
    },
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workoutService.saveTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const userId = useUserStore((s) => s.user?.uid);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => workoutService.deleteTemplate(userId!, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteWorkout() {
  const userId = useUserStore((s) => s.user?.uid);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => workoutService.deleteWorkout(userId!, workoutId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}
