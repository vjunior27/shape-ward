export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface Exercise {
  id: string;
  name: string;
  weight: string;
  reps: string;
  sets: string;
}

export interface DailyWorkout {
  date: string;
  dayName: string;
  exercises: Exercise[];
  notes?: string;
}

export interface WeeklyWorkoutPlan {
  id: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: DailyWorkout[];
}

export interface AIWorkoutDisplay {
  title: string;
  description: string;
  days: {
    dayName: string;
    focus: string;
    exercises: { name: string; sets: string; reps: string; weight?: string; obs: string }[];
  }[];
}

export interface DietItem {
  id: string;
  name: string;
  quantity: string;
  calories?: number; // kcal por porção
  protein?: number;  // g por porção
  carbs?: number;    // g por porção
  fat?: number;      // g por porção
  isConsumed: boolean;
}

export interface DietMeal {
  id: string;
  time: string;
  name: string;
  items: DietItem[];
}

export interface DailyDiet {
  date: string; // YYYY-MM-DD
  dayName: string;
  meals: DietMeal[];
}

export interface WeeklyDietPlan {
  id: "current" | "last";
  label: string;
  days: DailyDiet[];
}

export interface UserFile {
  name: string;
  type: "pdf" | "image";
  data?: string; // base64 (apenas em memória, não salvo no Firestore)
  mimeType: string;
}

/**
 * Health document stored in Firebase Storage.
 * The storagePath is used by the Cloud Function (admin SDK) to download the file.
 * The storageUrl is the public download URL shown in the UI.
 */
export interface HealthDocument {
  name: string;
  mimeType: string;
  storagePath: string; // path inside the bucket, e.g. "healthDocs/{uid}/{ts}_{name}"
  storageUrl: string;  // Firebase Storage download URL (for UI display)
  uploadedAt: number;  // Unix ms timestamp
}

export interface UserProfile {
  name: string;
  avatar?: string;
  startDate: number;
  age: string;
  sex: "male" | "female" | "other" | "";
  weight: string;
  height: string;
  fatPercentage: string;
  workoutsPerWeek: string;
  profession: string;
  /** @deprecated Use rotinaDiaria instead */
  routine: string;
  /** Daily schedule: work hours, sleep, stress, time available for training */
  rotinaDiaria: string;
  /** Medical history: injuries, surgeries, chronic conditions, physical limitations */
  historicoLesoes: string;
  objective: string;
  files: UserFile[];             // legacy — kept for compat
  documentosSaude: HealthDocument[]; // new: docs stored in Firebase Storage
}

/** Resumo da semana para o popup de metas / compartilhamento */
export interface WeekSummary {
  weekNumber: number;
  year: number;
  trainedDays: string[]; // nomes dos dias treinados
  goalReached: boolean;
  streakWeeks: number; // semanas consecutivas com meta atingida
}

export enum LoadingState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  ERROR = "ERROR",
  SUCCESS = "SUCCESS",
}

// ─── Fase 2: Treino Ativo ──────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'forearms' | 'core' | 'quads' | 'hamstrings' | 'glutes'
  | 'calves' | 'full_body' | 'cardio';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'cable' | 'machine'
  | 'bodyweight' | 'kettlebell' | 'band' | 'other';

/** Exercise from the catalog (exercise-db.json) */
export interface ExerciseCatalog {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  instructions?: string;
  gifUrl?: string;
  isCustom: boolean;
  createdBy?: string;
}

export interface ActiveSet {
  id: string;
  reps: number;
  weight: number;
  unit: 'kg' | 'lbs';
  rpe?: number;
  isWarmup: boolean;
  isDropset: boolean;
  completed: boolean;
  completedAt?: string;
}

export interface ActiveExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: ActiveSet[];
  notes?: string;
  restSeconds: number;
}

export interface FinishedWorkout {
  id: string;
  userId: string;
  templateId?: string;
  templateName?: string;
  startedAt: string;
  finishedAt: string;
  exercises: ActiveExercise[];
  notes: string;
  durationMinutes: number;
  totalVolume: number;
  totalSets: number;
  mood?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  muscleGroups: MuscleGroup[];
  exercises: {
    exerciseId: string;
    exerciseName: string;
    targetSets: number;
    targetReps: string;
    restSeconds: number;
  }[];
  color: string;
  icon: string;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'reps' | 'volume';
  value: number;
  unit: string;
  achievedAt: string;
  workoutId: string;
  previousValue?: number;
}

// ─── Fase 2: Nutrição ─────────────────────────────────────────────────────────

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  isCustom: boolean;
  createdBy?: string;
}

export interface MealEntry {
  id: string;
  foodItemId: string;
  foodName: string;
  quantity: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionMeal {
  id: string;
  userId: string;
  date: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
  entries: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  photoUrl?: string;
  createdAt: string;
}

export interface DailyNutritionSummary {
  date: string;
  meals: NutritionMeal[];
  totals: { calories: number; protein: number; carbs: number; fat: number; water: number };
  goals: { calories: number; protein: number; carbs: number; fat: number; water: number };
}

export interface FavoriteMeal {
  id: string;
  userId: string;
  name: string;
  entries: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  usageCount: number;
  createdAt: string;
}

// ─── Fase 2: Gamificação ──────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'workout' | 'nutrition' | 'social' | 'special';
  xpReward: number;
  unlockedAt?: string;
}
