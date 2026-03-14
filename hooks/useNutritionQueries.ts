import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../stores/useUserStore';
import { useNutritionStore } from '../stores/useNutritionStore';
import * as nutritionService from '../services/nutritionService';
import type { NutritionMeal, FavoriteMeal } from '../types';

export function useDailyNutrition(date: string) {
  const userId = useUserStore((s) => s.user?.uid);
  const goals = useNutritionStore((s) => s.goals);
  return useQuery({
    queryKey: ['nutrition', userId, 'daily', date],
    queryFn: () => nutritionService.getDailyNutrition(userId!, date, goals),
    enabled: !!userId && !!date,
    staleTime: 2 * 60 * 1000,
  });
}

export function useNutritionHistory(days = 30) {
  const userId = useUserStore((s) => s.user?.uid);
  return useQuery({
    queryKey: ['nutrition', userId, 'history', days],
    queryFn: () => nutritionService.getNutritionHistory(userId!, days),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFavoriteMeals() {
  const userId = useUserStore((s) => s.user?.uid);
  return useQuery({
    queryKey: ['favoriteMeals', userId],
    queryFn: () => nutritionService.getFavoriteMeals(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSearchFoods(searchQuery: string) {
  return useQuery({
    queryKey: ['foodSearch', searchQuery],
    queryFn: () => nutritionService.searchFoods(searchQuery),
    enabled: searchQuery.trim().length >= 2,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSaveMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: nutritionService.saveMeal,
    onSuccess: (_, meal) => {
      qc.invalidateQueries({ queryKey: ['nutrition', meal.userId, 'daily', meal.date] });
    },
  });
}

export function useDeleteMeal() {
  const userId = useUserStore((s) => s.user?.uid);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mealId, date }: { mealId: string; date: string }) =>
      nutritionService.deleteMeal(userId!, mealId),
    onSuccess: (_, { date }) => {
      qc.invalidateQueries({ queryKey: ['nutrition', userId, 'daily', date] });
    },
  });
}

export function useSaveFavoriteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: nutritionService.saveFavoriteMeal,
    onSuccess: (_, fav) => {
      qc.invalidateQueries({ queryKey: ['favoriteMeals', fav.userId] });
    },
  });
}
