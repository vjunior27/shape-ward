import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

/**
 * Calls the Firebase Cloud Function to send a message to TitanAI.
 * Health documents are now fetched autonomously by the Cloud Function from
 * Firebase Storage — no file data needs to be sent from the client.
 */
interface HydrationContext {
  todayMl: number;
  goalMl: number;
  percentage: number;
  weeklyAverage: number;
  daysMetGoal: number;
}

export const sendMessageToGemini = async (text: string, hydration?: HydrationContext): Promise<string> => {
  try {
    const chatWithTitan = httpsCallable(functions, "chatWithTitan", { timeout: 120_000 });
    const result = await chatWithTitan({ text, hydration });
    const data = result.data as { text: string };
    if (!data?.text) throw new Error("Resposta inválida do servidor de IA.");
    return data.text;
  } catch (error: any) {
    console.error("Error calling AI function:", error);
    if (error.code === "unauthenticated") return "Sua sessão expirou. Por favor, faça login novamente.";
    if (error.code === "not-found") return "Perfil não encontrado. Por favor, complete seu cadastro.";
    throw new Error(error.message || "Erro de conexão com o servidor neural.");
  }
};

/**
 * Calls the silent generateFullPlan Cloud Function.
 * Triggered after profile save — generates nutrition, workout and hydration
 * plan silently without adding any messages to chat.
 */
export const callGenerateFullPlan = async (): Promise<void> => {
  try {
    const fn = httpsCallable(functions, "generateFullPlan", { timeout: 180_000 });
    await fn({});
  } catch (error: any) {
    // Non-fatal: plans can still be requested manually via chat
    console.warn("[generateFullPlan] Failed:", error?.message ?? error);
    throw error;
  }
};

// No-op kept for backward-compat with existing call sites
export const initializeChat = async () => Promise.resolve();
