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
  calories?: number; // kcal por porção (opcional, preenchido pela IA ou manualmente)
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
