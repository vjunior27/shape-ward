import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import {
  UserProfile,
  WeeklyWorkoutPlan,
  WeeklyDietPlan,
  Message,
  AIWorkoutDisplay,
  HealthDocument,
} from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
  console.error("ERRO CRÍTICO: Firebase API Key não encontrada. Verifique o arquivo .env.");
} else {
  console.log("Firebase configurado para o projeto:", firebaseConfig.projectId);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);

// ─── 7-day TTL ────────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Removes messages older than 7 days before saving to Firestore. */
const pruneOldMessages = (messages: Message[]): Message[] => {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  return messages.filter((m) => m.timestamp >= cutoff);
};

// ─── FCM (Push Notifications) ─────────────────────────────────────────────────

export async function requestPushPermission(uid: string): Promise<void> {
  try {
    const supported = await isSupported();
    if (!supported) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey) return;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
    });
    if (token) await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
  } catch (err) {
    console.warn("[FCM] Push setup skipped:", err);
  }
}

export async function onForegroundMessage(
  handler: (title: string, body: string) => void
): Promise<() => void> {
  try {
    const supported = await isSupported();
    if (!supported) return () => {};
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      handler(payload.notification?.title ?? "Trainova", payload.notification?.body ?? "");
    });
  } catch {
    return () => {};
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const subscribeToAuth = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

export const logoutUser = () => signOut(auth);

// ─── Firebase Storage — Health Documents ──────────────────────────────────────

/**
 * Uploads a health document (PDF or image) to Firebase Storage under
 * `healthDocs/{uid}/{timestamp}_{filename}` and appends the metadata to the
 * user's `documentosSaude` array in Firestore.
 */
export async function uploadHealthDocument(uid: string, file: File): Promise<HealthDocument> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `healthDocs/${uid}/${timestamp}_${safeName}`;

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const storageUrl = await getDownloadURL(storageRef);

  const newDoc: HealthDocument = {
    name: file.name,
    mimeType: file.type,
    storagePath,
    storageUrl,
    uploadedAt: timestamp,
  };

  await updateDoc(doc(db, "users", uid), { documentosSaude: arrayUnion(newDoc) });

  return newDoc;
}

/**
 * Deletes a health document from Firebase Storage and removes it from
 * the user's Firestore `documentosSaude` array.
 */
export async function deleteHealthDocument(uid: string, target: HealthDocument): Promise<void> {
  try {
    await deleteObject(ref(storage, target.storagePath));
  } catch (err) {
    console.warn("[Storage] Could not delete file:", err);
  }

  await updateDoc(doc(db, "users", uid), { documentosSaude: arrayRemove(target) });
}

// ─── Firestore Helpers ────────────────────────────────────────────────────────

export const saveUserProfile = async (uid: string, profile: Partial<UserProfile>) => {
  try {
    await setDoc(doc(db, "users", uid), JSON.parse(JSON.stringify(profile)), { merge: true });
  } catch (error) {
    console.error("Error saving profile:", error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

export const saveWorkoutHistory = async (uid: string, history: WeeklyWorkoutPlan[]) => {
  try {
    await setDoc(doc(db, "users", uid), { workoutHistory: history }, { merge: true });
  } catch (error) {
    console.error("Error saving workout history:", error);
    throw error;
  }
};

export const saveDietHistory = async (uid: string, history: WeeklyDietPlan[]) => {
  try {
    await setDoc(doc(db, "users", uid), { dietHistory: history }, { merge: true });
  } catch (error) {
    console.error("Error saving diet history:", error);
    throw error;
  }
};

/**
 * Saves chat history to Firestore, pruning messages older than 7 days automatically.
 */
export const saveChatHistory = async (uid: string, messages: Message[]) => {
  try {
    const pruned = pruneOldMessages(messages);
    await setDoc(doc(db, "users", uid), { chatHistory: pruned }, { merge: true });
  } catch (error) {
    console.error("Error saving chat history:", error);
    throw error;
  }
};

export const saveAIWorkoutPlan = async (uid: string, plan: AIWorkoutDisplay | null) => {
  try {
    await setDoc(doc(db, "users", uid), { aiWorkoutPlan: plan }, { merge: true });
  } catch (error) {
    console.error("Error saving AI workout plan:", error);
    throw error;
  }
};

export const getUserData = async (uid: string) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

/**
 * Real-time listener on the user's Firestore document.
 * Fires immediately with current data, then on every change.
 * Covers workoutHistory, dietHistory, aiWorkoutPlan, and chatHistory.
 * Returns an unsubscribe function.
 */
export function subscribeToUserData(
  uid: string,
  onData: (data: {
    workoutHistory?: WeeklyWorkoutPlan[];
    dietHistory?: WeeklyDietPlan[];
    aiWorkoutPlan?: AIWorkoutDisplay | null;
    chatHistory?: Message[];
  }) => void
): () => void {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    onData({
      workoutHistory: d.workoutHistory,
      dietHistory: d.dietHistory,
      aiWorkoutPlan: d.aiWorkoutPlan ?? null,
      chatHistory: d.chatHistory,
    });
  });
}
