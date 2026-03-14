import {
  collection, doc, setDoc, getDocs, getDoc,
  query, where, orderBy, limit, deleteDoc, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FinishedWorkout, WorkoutTemplate, PersonalRecord } from "../types";

// ─── Finished workouts ────────────────────────────────────────────────────────

export async function saveWorkout(workout: FinishedWorkout): Promise<void> {
  await setDoc(
    doc(db, "users", workout.userId, "workouts", workout.id),
    { ...workout, _savedAt: Timestamp.now() }
  );
}

export async function getWorkoutHistory(
  userId: string,
  limitCount = 30
): Promise<FinishedWorkout[]> {
  const q = query(
    collection(db, "users", userId, "workouts"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinishedWorkout));
}

export async function getWorkoutsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<FinishedWorkout[]> {
  const q = query(
    collection(db, "users", userId, "workouts"),
    where("startedAt", ">=", startDate),
    where("startedAt", "<=", endDate),
    orderBy("startedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinishedWorkout));
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "workouts", workoutId));
}

/** Returns the best set (weight × reps) for a given exercise from recent workouts. */
export async function getLastWorkoutForExercise(
  userId: string,
  exerciseId: string
): Promise<{ weight: number; reps: number; sets: number } | null> {
  const q = query(
    collection(db, "users", userId, "workouts"),
    orderBy("createdAt", "desc"),
    limit(30)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const w = d.data() as FinishedWorkout;
    const ex = w.exercises?.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const done = ex.sets.filter((s) => s.completed);
    if (!done.length) continue;
    const best = done.reduce((b, s) => (s.weight > b.weight ? s : b));
    return { weight: best.weight, reps: best.reps, sets: done.length };
  }
  return null;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function saveTemplate(template: WorkoutTemplate): Promise<void> {
  await setDoc(doc(db, "users", template.userId, "templates", template.id), template);
}

export async function getTemplates(userId: string): Promise<WorkoutTemplate[]> {
  const q = query(
    collection(db, "users", userId, "templates"),
    orderBy("usageCount", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkoutTemplate));
}

export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "templates", templateId));
}

// ─── Personal Records ─────────────────────────────────────────────────────────

/**
 * Checks if the given weight is a new PR for the exercise.
 * If so, saves it and returns the new PR. Otherwise returns null.
 */
export async function checkAndSavePersonalRecord(
  userId: string,
  exerciseId: string,
  exerciseName: string,
  weight: number,
  reps: number,
  workoutId: string
): Promise<PersonalRecord | null> {
  if (weight <= 0) return null;

  const prRef = collection(db, "users", userId, "personalRecords");
  const q = query(
    prRef,
    where("exerciseId", "==", exerciseId),
    where("type", "==", "weight")
  );
  const snap = await getDocs(q);

  const existing = snap.empty ? null : (snap.docs[0].data() as PersonalRecord);
  if (existing && weight <= existing.value) return null;

  // Delete old PR if exists
  if (!snap.empty) await deleteDoc(snap.docs[0].ref);

  const newPR: PersonalRecord = {
    id: crypto.randomUUID(),
    userId,
    exerciseId,
    exerciseName,
    type: "weight",
    value: weight,
    unit: "kg",
    achievedAt: new Date().toISOString(),
    workoutId,
    previousValue: existing?.value,
  };
  await setDoc(doc(prRef, newPR.id), newPR);
  return newPR;
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const q = query(
    collection(db, "users", userId, "personalRecords"),
    orderBy("achievedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PersonalRecord));
}

// ─── Exercise progress data for charts ────────────────────────────────────────

export async function getExerciseProgressData(
  userId: string,
  exerciseId: string,
  limitCount = 20
): Promise<{ date: string; maxWeight: number; totalVolume: number }[]> {
  const workouts = await getWorkoutHistory(userId, 100);
  const points: { date: string; maxWeight: number; totalVolume: number }[] = [];

  for (const w of workouts) {
    const ex = w.exercises?.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const done = ex.sets.filter((s) => s.completed);
    if (!done.length) continue;
    points.push({
      date: w.startedAt.split("T")[0],
      maxWeight: Math.max(...done.map((s) => s.weight)),
      totalVolume: done.reduce((sum, s) => sum + s.weight * s.reps, 0),
    });
  }

  return points.reverse().slice(-limitCount);
}
