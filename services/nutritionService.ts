import {
  collection, doc, setDoc, getDocs, deleteDoc,
  query, where, orderBy, limit, getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { NutritionMeal, FavoriteMeal, FoodItem, DailyNutritionSummary } from "../types";

// ─── Meals ────────────────────────────────────────────────────────────────────

export async function saveMeal(meal: NutritionMeal): Promise<void> {
  await setDoc(doc(db, "users", meal.userId, "meals", meal.id), meal);
}

export async function getMealsByDate(userId: string, date: string): Promise<NutritionMeal[]> {
  const q = query(
    collection(db, "users", userId, "meals"),
    where("date", "==", date),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NutritionMeal));
}

export async function deleteMeal(userId: string, mealId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "meals", mealId));
}

export async function getDailyNutrition(
  userId: string,
  date: string,
  goals: { calories: number; protein: number; carbs: number; fat: number; water: number }
): Promise<DailyNutritionSummary> {
  const meals = await getMealsByDate(userId, date);
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totalCalories,
      protein: acc.protein + m.totalProtein,
      carbs: acc.carbs + m.totalCarbs,
      fat: acc.fat + m.totalFat,
      water: acc.water,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 }
  );
  return { date, meals, totals, goals };
}

export async function getNutritionHistory(
  userId: string,
  days: number
): Promise<DailyNutritionSummary[]> {
  const q = query(
    collection(db, "users", userId, "meals"),
    orderBy("date", "desc"),
    limit(days * 6) // up to 6 meals/day
  );
  const snap = await getDocs(q);
  const byDate = new Map<string, NutritionMeal[]>();
  snap.docs.forEach((d) => {
    const m = { id: d.id, ...d.data() } as NutritionMeal;
    if (!byDate.has(m.date)) byDate.set(m.date, []);
    byDate.get(m.date)!.push(m);
  });

  return Array.from(byDate.entries()).map(([date, meals]) => {
    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.totalCalories,
        protein: acc.protein + m.totalProtein,
        carbs: acc.carbs + m.totalCarbs,
        fat: acc.fat + m.totalFat,
        water: 0,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 }
    );
    return { date, meals, totals, goals: { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 } };
  });
}

// ─── Favorite meals ───────────────────────────────────────────────────────────

export async function saveFavoriteMeal(fav: FavoriteMeal): Promise<void> {
  await setDoc(doc(db, "users", fav.userId, "favoriteMeals", fav.id), fav);
}

export async function getFavoriteMeals(userId: string): Promise<FavoriteMeal[]> {
  const q = query(
    collection(db, "users", userId, "favoriteMeals"),
    orderBy("usageCount", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FavoriteMeal));
}

// ─── Food search (OpenFoodFacts) ──────────────────────────────────────────────

export async function searchFoods(query: string): Promise<FoodItem[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&cc=br&lc=pt`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.products ?? [])
      .filter((p: any) => p.product_name)
      .map((p: any): FoodItem => ({
        id: p.id ?? p._id ?? crypto.randomUUID(),
        name: p.product_name ?? 'Alimento',
        brand: p.brands ?? undefined,
        barcode: p.code ?? undefined,
        servingSize: p.serving_size ? parseFloat(p.serving_size) || 100 : 100,
        servingUnit: 'g',
        calories: Math.round(p.nutriments?.['energy-kcal_100g'] ?? p.nutriments?.['energy-kcal'] ?? 0),
        protein: Math.round((p.nutriments?.proteins_100g ?? 0) * 10) / 10,
        carbs: Math.round((p.nutriments?.carbohydrates_100g ?? 0) * 10) / 10,
        fat: Math.round((p.nutriments?.fat_100g ?? 0) * 10) / 10,
        fiber: p.nutriments?.fiber_100g ?? undefined,
        isCustom: false,
      }));
  } catch {
    return [];
  }
}
