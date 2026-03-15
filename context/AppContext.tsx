import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { User } from "firebase/auth";
import {
  AIWorkoutDisplay,
  DailyDiet,
  Message,
  UserProfile,
  WeeklyDietPlan,
  WeeklyWorkoutPlan,
} from "../types";
import { sendMessageToGemini, initializeChat } from "../services/geminiService";
import {
  getUserProfile,
  logoutUser,
  saveAIWorkoutPlan,
  saveChatHistory,
  saveDietHistory,
  saveUserProfile,
  saveWorkoutHistory,
  subscribeToAuth,
  subscribeToUserData,
  requestPushPermission,
  onForegroundMessage,
} from "../services/firebase";
import { logEvent } from "../services/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Screen = "login" | "chat" | "workouts" | "diet" | "profile" | "active-workout" | "achievements" | "settings" | "terms" | "privacy" | "workout-history";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  startDate: Date.now(),
  age: "",
  sex: "",
  weight: "",
  height: "",
  fatPercentage: "",
  workoutsPerWeek: "",
  profession: "",
  routine: "",
  rotinaDiaria: "",
  historicoLesoes: "",
  objective: "",
  files: [],
  documentosSaude: [],
};

const DEFAULT_DIET: WeeklyDietPlan[] = [
  { id: "current", label: "Esta Semana", days: [] },
  { id: "last", label: "Semana Passada", days: [] },
];

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  currentScreen: Screen;
  chatMessages: Message[];
  isChatLoading: boolean;
  hasInitializedChat: boolean;
  isAnalysisPending: boolean;
  showDisclaimer: boolean;
  userProfile: UserProfile;
  workoutHistory: WeeklyWorkoutPlan[];
  aiWorkoutPlan: AIWorkoutDisplay | null;
  dietHistory: WeeklyDietPlan[];
}

type AppAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_AUTHENTICATED"; payload: boolean }
  | { type: "SET_IS_DEMO"; payload: boolean }
  | { type: "SET_SCREEN"; payload: Screen }
  | { type: "SET_CHAT_MESSAGES"; payload: Message[] }
  | { type: "SET_CHAT_LOADING"; payload: boolean }
  | { type: "SET_CHAT_INITIALIZED"; payload: boolean }
  | { type: "SET_ANALYSIS_PENDING"; payload: boolean }
  | { type: "SET_SHOW_DISCLAIMER"; payload: boolean }
  | { type: "SET_USER_PROFILE"; payload: UserProfile }
  | { type: "SET_WORKOUT_HISTORY"; payload: WeeklyWorkoutPlan[] }
  | { type: "SET_AI_WORKOUT_PLAN"; payload: AIWorkoutDisplay | null }
  | { type: "SET_DIET_HISTORY"; payload: WeeklyDietPlan[] }
  | { type: "LOGOUT" };

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  handleSendMessage: (text: string) => Promise<void>;
  handleRunFullAnalysis: () => Promise<void>;
  handleUpdateWorkout: (week: WeeklyWorkoutPlan) => Promise<void>;
  handleUpdateDietDay: (planId: "current" | "last", day: DailyDiet) => Promise<void>;
  handleUpdateAIWorkoutPlan: (plan: AIWorkoutDisplay | null) => Promise<void>;
  handleLogin: () => void;
  handleLogout: () => Promise<void>;
  handleSaveProfile: (profile: UserProfile) => Promise<void>;
  handleDemoLogin: () => void;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isDemo: false,
  currentScreen: "login",
  chatMessages: [],
  isChatLoading: false,
  hasInitializedChat: false,
  isAnalysisPending: false,
  showDisclaimer: false,
  userProfile: DEFAULT_PROFILE,
  workoutHistory: [],
  aiWorkoutPlan: null,
  dietHistory: DEFAULT_DIET,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER": return { ...state, user: action.payload };
    case "SET_AUTHENTICATED": return { ...state, isAuthenticated: action.payload };
    case "SET_IS_DEMO": return { ...state, isDemo: action.payload };
    case "SET_SCREEN": return { ...state, currentScreen: action.payload };
    case "SET_CHAT_MESSAGES": return { ...state, chatMessages: action.payload };
    case "SET_CHAT_LOADING": return { ...state, isChatLoading: action.payload };
    case "SET_CHAT_INITIALIZED": return { ...state, hasInitializedChat: action.payload };
    case "SET_ANALYSIS_PENDING": return { ...state, isAnalysisPending: action.payload };
    case "SET_SHOW_DISCLAIMER": return { ...state, showDisclaimer: action.payload };
    case "SET_USER_PROFILE": return { ...state, userProfile: action.payload };
    case "SET_WORKOUT_HISTORY": return { ...state, workoutHistory: action.payload };
    case "SET_AI_WORKOUT_PLAN": return { ...state, aiWorkoutPlan: action.payload };
    case "SET_DIET_HISTORY": return { ...state, dietHistory: action.payload };
    case "LOGOUT": return { ...initialState, dietHistory: DEFAULT_DIET };
    default: return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Holds the Firestore onSnapshot unsubscribe for the user data listener
  const dataUnsubRef = useRef<(() => void) | null>(null);

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (stateRef.current.isDemo) return;

    const unsubscribe = subscribeToAuth(async (currentUser) => {
      dispatch({ type: "SET_USER", payload: currentUser });
      dispatch({ type: "SET_AUTHENTICATED", payload: !!currentUser });

      // Always tear down the previous data subscription first
      dataUnsubRef.current?.();
      dataUnsubRef.current = null;

      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        const isNewUser = !profile?.name;
        if (profile) {
          dispatch({ type: "SET_USER_PROFILE", payload: { ...DEFAULT_PROFILE, ...profile } });
          dispatch({ type: "SET_SCREEN", payload: profile.name ? "chat" : "profile" });
        } else {
          dispatch({ type: "SET_SCREEN", payload: "profile" });
        }

        // Real-time listener: workout/diet/aiPlan update whenever Firestore changes
        // (including when TitanAI writes via function calling).
        // chatHistory is only loaded on the first snapshot to avoid overwriting
        // an active conversation mid-session.
        let initialLoad = true;
        dataUnsubRef.current = subscribeToUserData(currentUser.uid, (data) => {
          if (data.workoutHistory)
            dispatch({ type: "SET_WORKOUT_HISTORY", payload: data.workoutHistory });
          if (data.dietHistory)
            dispatch({ type: "SET_DIET_HISTORY", payload: data.dietHistory });
          if (data.aiWorkoutPlan !== undefined)
            dispatch({ type: "SET_AI_WORKOUT_PLAN", payload: data.aiWorkoutPlan });

          if (initialLoad) {
            if (data.chatHistory) {
              dispatch({ type: "SET_CHAT_MESSAGES", payload: data.chatHistory });
              dispatch({ type: "SET_CHAT_INITIALIZED", payload: true });
            }
            initialLoad = false;
          }
        });

        if (isNewUser) logEvent({ name: "onboarding_completed" });
        setTimeout(() => requestPushPermission(currentUser.uid), 3_000);
        onForegroundMessage((title, body) => console.info(`[Push] ${title}: ${body}`));
      } else {
        dispatch({ type: "LOGOUT" });
      }
    });

    return () => {
      unsubscribe();
      dataUnsubRef.current?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chat initialization ────────────────────────────────────────────────────
  useEffect(() => {
    const { isAuthenticated, hasInitializedChat, userProfile } = stateRef.current;
    if (!isAuthenticated || hasInitializedChat || !userProfile.name) return;

    const init = async () => {
      try {
        await initializeChat();
        dispatch({
          type: "SET_CHAT_MESSAGES",
          payload: [
            {
              id: "welcome",
              role: "model",
              text: `Olá, **${userProfile.name}**. Sou o **TitanAI** — seu coach de performance.\n\nPosso:\n• 💪 Criar e periodizar seu **plano de treino** completo\n• 🥑 Montar sua **dieta com macros e calorias** calculados\n• 🩺 Analisar seus **exames de saúde** (adicione na aba Perfil)\n• 📈 Detectar estagnações e ajustar seu programa\n\nPara começar com precisão, diga-me seu **objetivo principal** e há quanto tempo você treina.`,
              timestamp: Date.now(),
            },
          ],
        });
        dispatch({ type: "SET_CHAT_INITIALIZED", payload: true });
      } catch (e) {
        console.error("Erro ao iniciar chat", e);
      }
    };

    init();
  }, [state.isAuthenticated, state.userProfile.name, state.hasInitializedChat]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const generateDietDaysFromTemplate = (templateMeals: DailyDiet["meals"]) => {
    const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        dayName: DAY_NAMES[i],
        date: date.toISOString().split("T")[0],
        meals: JSON.parse(JSON.stringify(templateMeals)),
      };
    });
  };

  // ── AI response processor ──────────────────────────────────────────────────

  const processAIResponse = useCallback(
    async (responseText: string): Promise<string> => {
      const { dietHistory, user } = stateRef.current;
      const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
      let updatedDiet = false;
      let updatedWorkout = false;
      let newAiWorkoutPlan: AIWorkoutDisplay | null = null;
      let newDietHistory: WeeklyDietPlan[] | null = null;

      for (const match of Array.from(responseText.matchAll(jsonRegex))) {
        try {
          const data = JSON.parse(match[1]);

          if (data.type === "diet_plan") {
            const dietData: DailyDiet["meals"] | null = Array.isArray(data.data)
              ? data.data
              : Array.isArray(data) ? data : null;
            if (dietData) {
              const newCurrentDays = generateDietDaysFromTemplate(dietData);
              newDietHistory = [
                { id: "current", label: "Esta Semana", days: newCurrentDays },
                { id: "last", label: "Semana Passada", days: dietHistory.find((p) => p.id === "current")?.days ?? [] },
              ];
              dispatch({ type: "SET_DIET_HISTORY", payload: newDietHistory });
              updatedDiet = true;
            }
          }

          if (data.type === "workout_plan") {
            const { type: _type, ...rest } = data;
            newAiWorkoutPlan = (data.data ?? rest) as AIWorkoutDisplay;
            dispatch({ type: "SET_AI_WORKOUT_PLAN", payload: newAiWorkoutPlan });
            updatedWorkout = true;
          }
        } catch (e) {
          console.error("Erro ao processar JSON da IA", e);
        }
      }

      let cleanText = responseText.replace(jsonRegex, "").trim();

      if (updatedDiet) {
        cleanText += "\n\n🥑 **Dieta atualizada na aba Nutrição (Seg-Dom).**";
        dispatch({ type: "SET_SHOW_DISCLAIMER", payload: true });
        logEvent({ name: "ai_plan_applied", plan_type: "diet" });
      }
      if (updatedWorkout) {
        cleanText += "\n💪 **Novo treino disponível na aba Treinos.**";
        dispatch({ type: "SET_SHOW_DISCLAIMER", payload: true });
        logEvent({ name: "ai_plan_applied", plan_type: "workout" });
      }

      if (user) {
        if (updatedDiet && newDietHistory) await saveDietHistory(user.uid, newDietHistory);
        if (updatedWorkout && newAiWorkoutPlan) await saveAIWorkoutPlan(user.uid, newAiWorkoutPlan);
      }

      return cleanText.trim();
    },
    [dispatch]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (text: string) => {
      const { chatMessages, user } = stateRef.current;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        text,
        timestamp: Date.now(),
      };
      const newMessages = [...chatMessages, userMsg];
      dispatch({ type: "SET_CHAT_MESSAGES", payload: newMessages });
      dispatch({ type: "SET_CHAT_LOADING", payload: true });

      // saveChatHistory already prunes messages > 7 days
      if (user) await saveChatHistory(user.uid, newMessages);

      const hasPlanRequest = /gerar|criar|mudar|atualizar|montar|faça/i.test(text);
      logEvent({ name: "titan_message_sent", has_plan_request: hasPlanRequest });

      if (chatMessages.length === 1) {
        const secondsSinceStart = Math.round((Date.now() - (stateRef.current.userProfile.startDate ?? Date.now())) / 1000);
        logEvent({ name: "time_to_first_value", seconds: secondsSinceStart });
        logEvent({ name: "first_titan_message" });
      }

      try {
        const responseText = await sendMessageToGemini(text);
        const processedText = await processAIResponse(responseText);

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: processedText,
          timestamp: Date.now(),
        };
        const finalMessages = [...newMessages, aiMsg];
        dispatch({ type: "SET_CHAT_MESSAGES", payload: finalMessages });
        if (user) await saveChatHistory(user.uid, finalMessages);
      } catch (error: any) {
        let errorText = "Erro de conexão com o servidor neural.";
        if (error.message?.includes("limite de 15 interações")) errorText = error.message;
        dispatch({
          type: "SET_CHAT_MESSAGES",
          payload: [
            ...newMessages,
            { id: (Date.now() + 1).toString(), role: "model", text: errorText, timestamp: Date.now() },
          ],
        });
      } finally {
        dispatch({ type: "SET_CHAT_LOADING", payload: false });
      }
    },
    [dispatch, processAIResponse]
  );

  const handleRunFullAnalysis = useCallback(async () => {
    dispatch({ type: "SET_ANALYSIS_PENDING", payload: false });
    await handleSendMessage(
      "Analise meu perfil completo, meus exames de saúde e histórico. Com base nisso: 1) Faça uma avaliação do meu estado de saúde. 2) Crie uma dieta atualizada (JSON). 3) Crie um plano de treino atualizado (JSON)."
    );
  }, [handleSendMessage]);

  const handleUpdateWorkout = useCallback(async (updatedWeek: WeeklyWorkoutPlan) => {
    const { workoutHistory, isDemo, user } = stateRef.current;
    const isFirst = workoutHistory.every((w) => w.days.every((d) => d.exercises.length === 0));
    const newHistory = workoutHistory.some((w) => w.id === updatedWeek.id)
      ? workoutHistory.map((w) => (w.id === updatedWeek.id ? updatedWeek : w))
      : [...workoutHistory, updatedWeek];
    dispatch({ type: "SET_WORKOUT_HISTORY", payload: newHistory });

    const activeDays = updatedWeek.days.filter((d) => d.exercises.length > 0);
    if (activeDays.length > 0) {
      const lastActiveDay = activeDays[activeDays.length - 1];
      logEvent({ name: "workout_logged", day_name: lastActiveDay.dayName, exercise_count: lastActiveDay.exercises.length });
      if (isFirst) logEvent({ name: "first_workout_logged" });
    }

    if (isDemo) localStorage.setItem("demo_workouts", JSON.stringify(newHistory));
    else if (user) await saveWorkoutHistory(user.uid, newHistory);
  }, []);

  const handleUpdateDietDay = useCallback(async (planId: "current" | "last", updatedDay: DailyDiet) => {
    const { dietHistory, isDemo, user } = stateRef.current;
    const newHistory = dietHistory.map((plan) => {
      if (plan.id !== planId) return plan;
      return { ...plan, days: plan.days.map((d) => (d.date === updatedDay.date ? updatedDay : d)) };
    });
    dispatch({ type: "SET_DIET_HISTORY", payload: newHistory });
    if (isDemo) localStorage.setItem("demo_diet", JSON.stringify(newHistory));
    else if (user) await saveDietHistory(user.uid, newHistory);
  }, []);

  const handleUpdateAIWorkoutPlan = useCallback(async (updatedPlan: AIWorkoutDisplay | null) => {
    const { isDemo, user } = stateRef.current;
    dispatch({ type: "SET_AI_WORKOUT_PLAN", payload: updatedPlan });
    if (isDemo) localStorage.setItem("demo_ai_workout", JSON.stringify(updatedPlan));
    else if (user) await saveAIWorkoutPlan(user.uid, updatedPlan);
  }, []);

  const handleLogin = useCallback(() => {}, []);

  const handleLogout = useCallback(async () => {
    if (stateRef.current.isDemo) dispatch({ type: "LOGOUT" });
    else await logoutUser();
  }, []);

  const handleSaveProfile = useCallback(async (profile: UserProfile) => {
    const { isDemo, user } = stateRef.current;
    dispatch({ type: "SET_USER_PROFILE", payload: profile });

    try {
      await initializeChat();
    } catch (e) {
      console.error("Erro ao atualizar contexto do chat", e);
    }

    // Trigger analysis popup if the user has health docs or basic metrics
    if ((profile.documentosSaude?.length ?? 0) > 0 || (profile.weight && profile.workoutsPerWeek)) {
      dispatch({ type: "SET_ANALYSIS_PENDING", payload: true });
    }
    dispatch({ type: "SET_SCREEN", payload: "chat" });

    if (isDemo) {
      localStorage.setItem("demo_profile", JSON.stringify(profile));
    } else if (user) {
      // Save profile to Firestore — documentosSaude is already persisted to Storage by ProfileScreen,
      // so we only store the lightweight metadata (no base64) here.
      const profileForDb: Partial<UserProfile> = {
        ...profile,
        // Strip any legacy base64 file data from the old `files` field
        files: (profile.files ?? []).map(({ name, type, mimeType }) => ({ name, type, mimeType })),
      };
      await saveUserProfile(user.uid, profileForDb);
    }
  }, []);

  const handleDemoLogin = useCallback(() => {
    dispatch({ type: "SET_IS_DEMO", payload: true });
    dispatch({ type: "SET_AUTHENTICATED", payload: true });

    const savedProfile = localStorage.getItem("demo_profile");
    if (savedProfile) {
      dispatch({ type: "SET_USER_PROFILE", payload: JSON.parse(savedProfile) });
      dispatch({ type: "SET_SCREEN", payload: "chat" });
    } else {
      dispatch({ type: "SET_SCREEN", payload: "profile" });
    }

    const savedWorkouts = localStorage.getItem("demo_workouts");
    if (savedWorkouts) dispatch({ type: "SET_WORKOUT_HISTORY", payload: JSON.parse(savedWorkouts) });

    const savedDiet = localStorage.getItem("demo_diet");
    if (savedDiet) dispatch({ type: "SET_DIET_HISTORY", payload: JSON.parse(savedDiet) });
  }, []);

  const value: AppContextType = {
    state,
    dispatch,
    handleSendMessage,
    handleRunFullAnalysis,
    handleUpdateWorkout,
    handleUpdateDietDay,
    handleUpdateAIWorkoutPlan,
    handleLogin,
    handleLogout,
    handleSaveProfile,
    handleDemoLogin,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
