import { WeeklyWorkoutPlan } from '../types';

export interface PlateauAlert {
  exerciseName: string;
  currentWeight: string;
  weeksStagnant: number;
  suggestion: string;
}

export interface ProgressionSuggestion {
  exerciseName: string;
  currentWeight: string;
  suggestedWeight: string;
}

/**
 * Detects exercises with no weight progression over N consecutive weeks.
 * Only considers exercises with non-zero weight.
 */
export function detectPlateaus(
  history: WeeklyWorkoutPlan[],
  weeksThreshold = 3
): PlateauAlert[] {
  // Build map: normalizedName → [{week, weight}]
  const map = new Map<string, Array<{ week: string; weight: number }>>();

  for (const week of history) {
    for (const day of week.days) {
      for (const ex of day.exercises) {
        if (!ex.name || !ex.weight) continue;
        const w = parseFloat(ex.weight);
        if (isNaN(w) || w <= 0) continue;
        const key = ex.name.toLowerCase().trim();
        if (!map.has(key)) map.set(key, []);
        const arr = map.get(key)!;
        if (!arr.some((e) => e.week === week.id)) {
          arr.push({ week: week.id, weight: w });
        }
      }
    }
  }

  const alerts: PlateauAlert[] = [];

  for (const [rawName, entries] of map) {
    if (entries.length < weeksThreshold) continue;
    const sorted = [...entries].sort((a, b) => b.week.localeCompare(a.week));
    const recent = sorted.slice(0, weeksThreshold);
    const allSame = recent.every((e) => e.weight === recent[0].weight);
    if (!allSame) continue;

    const w = recent[0].weight;
    const increment = w < 20 ? 1 : w < 50 ? 2.5 : 5;
    const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    alerts.push({
      exerciseName: displayName,
      currentWeight: String(w),
      weeksStagnant: weeksThreshold,
      suggestion: `Aumente para ${(w + increment).toFixed(1)}kg ou mude cadência/RIR para forçar adaptação.`,
    });
  }

  return alerts;
}

/**
 * Suggests a small load progression (~2.5%) for exercises from the latest week.
 * Returns at most 3 suggestions.
 */
export function getProgressionSuggestions(
  history: WeeklyWorkoutPlan[]
): ProgressionSuggestion[] {
  if (history.length < 2) return [];

  const suggestions: ProgressionSuggestion[] = [];
  const seen = new Set<string>();

  for (const day of history[0].days) {
    for (const ex of day.exercises) {
      if (!ex.name || !ex.weight || seen.has(ex.name)) continue;
      const w = parseFloat(ex.weight);
      if (isNaN(w) || w <= 0) continue;
      seen.add(ex.name);

      // Round up to nearest 2.5kg increment after 2.5% increase
      const increment = w < 20 ? 1 : 2.5;
      const raw = w + increment;
      const suggested = Math.round(raw / increment) * increment;
      if (suggested > w) {
        suggestions.push({
          exerciseName: ex.name,
          currentWeight: String(w),
          suggestedWeight: String(suggested),
        });
      }
    }
  }

  return suggestions.slice(0, 3);
}
