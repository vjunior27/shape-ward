/**
 * GIF Service — Exercise demonstration GIFs
 * Source: Kaggle omarxadel/fitness-exercises-dataset (1,324 exercises)
 * GIFs hosted at https://v2.exercisedb.io/image/
 */

export interface ExerciseData {
  id: string;
  name: string;
  gifUrl: string;
  imageUrl?: string | null;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

type ExerciseIndex = Map<string, ExerciseData>;

let cachedIndex: ExerciseIndex | null = null;

/** Normalizes a string for fuzzy matching (lowercase, no accents, no punctuation) */
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

/** Loads and indexes the exercise database from the public JSON file */
async function loadIndex(): Promise<ExerciseIndex> {
  if (cachedIndex) return cachedIndex;
  try {
    const res = await fetch("/exercise-db.json");
    if (!res.ok) throw new Error("exercise-db.json not found");
    const exercises: ExerciseData[] = await res.json();
    const index: ExerciseIndex = new Map();
    for (const ex of exercises) {
      index.set(normalize(ex.name), ex);
    }
    cachedIndex = index;
    return index;
  } catch {
    cachedIndex = new Map();
    return cachedIndex;
  }
}

/**
 * Returns the full ExerciseData for a given exercise name.
 * Tries exact match → word-overlap match → keyword fallback.
 */
export async function getExerciseData(exerciseName: string): Promise<ExerciseData | null> {
  const index = await loadIndex();
  const query = normalize(exerciseName);

  // 1. Exact normalized match
  if (index.has(query)) return index.get(query)!;

  // 2. Dataset name contains all query words (e.g. "supino reto" → "barbell bench press")
  const queryWords = query.split(/\s+/).filter(Boolean);

  // Portuguese → English keyword bridge for common exercises
  const ptToEn: Record<string, string> = {
    supino: "bench press", agachamento: "squat", terra: "deadlift",
    flexao: "push up", barra: "pull up", remada: "row",
    elevacao: "raise", desenvolvimento: "press", rosca: "curl",
    triceps: "tricep", biceps: "bicep", panturrilha: "calf",
    abdominal: "crunch", prancha: "plank", afundo: "lunge",
    passada: "lunge", leg: "leg", puxada: "pulldown",
    crucifixo: "fly", hack: "hack", stiff: "stiff",
    arnold: "arnold", militar: "military", franzido: "shrug",
  };

  // Translate query words to English equivalents
  const translatedWords = queryWords.flatMap((w) => {
    const en = ptToEn[w];
    return en ? [w, ...en.split(" ")] : [w];
  });

  let bestMatch: ExerciseData | null = null;
  let bestScore = 0;

  for (const [key, ex] of index) {
    const keyWords = key.split(/\s+/);
    const score = translatedWords.filter((w) => keyWords.some((kw) => kw.includes(w) || w.includes(kw))).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = ex;
    }
  }

  if (bestScore > 0) return bestMatch;

  return null;
}

/**
 * Returns the best available image URL for a given exercise name.
 * Prefers wger imageUrl (working), falls back to gifUrl (exercisedb.io, may be broken),
 * then falls back to keyword-based fallback.
 */
export async function getExerciseGif(exerciseName: string): Promise<string> {
  const ex = await getExerciseData(exerciseName);
  if (ex) return ex.imageUrl || ex.gifUrl;
  return getFallbackGif(exerciseName);
}

/** Synchronous keyword fallback for when the dataset has no match */
export function getFallbackGif(name: string): string {
  const n = normalize(name);
  if (n.includes("supino") || n.includes("bench")) return "https://v2.exercisedb.io/image/3CE7tz2-UrMl5o"; // barbell bench press
  if (n.includes("agachamento") || n.includes("squat")) return "https://v2.exercisedb.io/image/A0MpQcJqLnhLLf"; // barbell squat
  if (n.includes("terra") || n.includes("deadlift")) return "https://v2.exercisedb.io/image/qSH31Hm9oXbC_X"; // barbell deadlift
  if (n.includes("flexao") || n.includes("push")) return "https://v2.exercisedb.io/image/5pONMLoYGzJWtw"; // push-up
  if (n.includes("barra") || n.includes("pull")) return "https://v2.exercisedb.io/image/x15-Xh5V48YjKM"; // pull-up
  if (n.includes("remada") || n.includes("row")) return "https://v2.exercisedb.io/image/1QHQLQQtIwvxH4"; // barbell row
  if (n.includes("rosca") || n.includes("curl")) return "https://v2.exercisedb.io/image/ZhFpM4NIAB90EL"; // barbell curl
  if (n.includes("triceps") || n.includes("tricep")) return "https://v2.exercisedb.io/image/k0VhV-Lmwi5dfe"; // tricep pushdown
  if (n.includes("panturrilha") || n.includes("calf")) return "https://v2.exercisedb.io/image/MOnK4iG0MEt9h8"; // calf raise
  if (n.includes("abdominal") || n.includes("abs") || n.includes("prancha")) return "https://v2.exercisedb.io/image/PERWLDGUxVbpHS"; // crunch
  if (n.includes("leg press")) return "https://v2.exercisedb.io/image/qSH31Hm9oXbC_X";
  return "https://v2.exercisedb.io/image/3CE7tz2-UrMl5o";
}

/** Clears the in-memory cache */
export function clearGifCache(): void {
  cachedIndex = null;
}
