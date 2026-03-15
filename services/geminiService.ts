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

// No-op kept for backward-compat with existing call sites
export const initializeChat = async () => Promise.resolve();
