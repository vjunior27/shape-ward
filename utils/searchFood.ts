import { TACO_FOODS, TacoFood } from '../data/taco';

export type { TacoFood };

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[,.\-\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchFood(query: string): TacoFood[] {
  if (!query || query.length < 2) return [];

  const normalized = normalizeText(query);
  const terms = normalized.split(' ').filter((t) => t.length > 1);
  if (terms.length === 0) return [];

  const results = TACO_FOODS.filter((food) =>
    terms.every((term) => food.searchName.includes(term))
  );

  results.sort((a, b) => {
    const aStarts = a.searchName.startsWith(normalized) ? 0 : 1;
    const bStarts = b.searchName.startsWith(normalized) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.name.length - b.name.length;
  });

  return results.slice(0, 12);
}

export function calculateMacros(
  food: TacoFood,
  quantityGrams: number
): { calories: number; protein: number; carbs: number; fat: number; fiber: number } {
  const f = quantityGrams / 100;
  return {
    calories: Math.round(food.per100g.calories * f),
    protein:  Math.round(food.per100g.protein  * f * 10) / 10,
    carbs:    Math.round(food.per100g.carbs    * f * 10) / 10,
    fat:      Math.round(food.per100g.fat      * f * 10) / 10,
    fiber:    Math.round(food.per100g.fiber    * f * 10) / 10,
  };
}
