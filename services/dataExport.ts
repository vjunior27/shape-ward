import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { getAuth, deleteUser } from "firebase/auth";

export async function exportUserData(userId: string): Promise<void> {
  const db = getFirestore();
  const userSnap = await getDoc(doc(db, "users", userId));
  const userData = userSnap.exists() ? userSnap.data() : {};

  // Remove fields that contain large binary blobs (health doc base64)
  const sanitized = { ...userData };
  if (Array.isArray(sanitized.documentosSaude)) {
    sanitized.documentosSaude = sanitized.documentosSaude.map((d: any) => ({
      name: d.name,
      mimeType: d.mimeType,
      storagePath: d.storagePath,
      storageUrl: d.storageUrl,
      uploadedAt: d.uploadedAt,
    }));
  }

  const blob = new Blob([JSON.stringify({ userId, exportedAt: new Date().toISOString(), ...sanitized }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shape-ward-dados-${userId.slice(0, 8)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteAllUserData(userId: string): Promise<void> {
  const db = getFirestore();

  // Delete sub-collections (tokens)
  const subCollections = ["tokens"];
  for (const col of subCollections) {
    const snap = await getDocs(collection(db, "users", userId, col));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }

  // Delete main user document (workout history, diet, etc. are stored as fields)
  await deleteDoc(doc(db, "users", userId));

  // Delete Firebase Auth account — must be the currently signed-in user
  const auth = getAuth();
  if (auth.currentUser && auth.currentUser.uid === userId) {
    await deleteUser(auth.currentUser);
  }
}
