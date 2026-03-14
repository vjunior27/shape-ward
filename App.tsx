import React, { Suspense, lazy, useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { LoginScreen } from "./screens/LoginScreen";
import { TutorialModal } from "./components/TutorialModal";
import LoadingSpinner from "./components/LoadingSpinner";
import InstallBanner from "./components/InstallBanner";
import CookieConsent from "./components/CookieConsent";
import { BrainCircuit } from "lucide-react";
import { useAppContext } from "./context/AppContext";

// Code-split heavy screens — each loads only when first navigated to
const ChatScreen    = lazy(() => import("./screens/ChatScreen").then(m => ({ default: m.ChatScreen })));
const WorkoutScreen = lazy(() => import("./screens/WorkoutScreen").then(m => ({ default: m.WorkoutScreen })));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen").then(m => ({ default: m.ProfileScreen })));
const DietScreen    = lazy(() => import("./screens/DietScreen").then(m => ({ default: m.DietScreen })));

export default function App() {
  const {
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
  } = useAppContext();

  const {
    currentScreen,
    isAuthenticated,
    userProfile,
    chatMessages,
    isChatLoading,
    isAnalysisPending,
    showDisclaimer,
    workoutHistory,
    aiWorkoutPlan,
    dietHistory,
    user,
  } = state;

  const [showTutorial, setShowTutorial] = useState(false);

  // Show tutorial only on first login for this user
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const key = `sw_tutorial_seen_${user.uid}`;
    if (!localStorage.getItem(key)) {
      setShowTutorial(true);
    }
  }, [isAuthenticated, user]);

  const handleCloseTutorial = () => {
    if (user) {
      localStorage.setItem(`sw_tutorial_seen_${user.uid}`, '1');
    }
    setShowTutorial(false);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} onDemoLogin={handleDemoLogin} />;
  }

  return (
    <Layout
      currentScreen={currentScreen}
      onNavigate={(screen) => dispatch({ type: "SET_SCREEN", payload: screen })}
      onLogout={handleLogout}
      userAvatar={userProfile.avatar}
    >
      <Suspense fallback={<LoadingSpinner />}>
      {currentScreen === "chat" && (
        <ChatScreen
          messages={chatMessages}
          isLoading={isChatLoading}
          onSendMessage={handleSendMessage}
          showAnalysisPopup={isAnalysisPending}
          onRunAnalysis={handleRunFullAnalysis}
        />
      )}

      {currentScreen === "workouts" && (
        <WorkoutScreen
          startDate={userProfile.startDate}
          history={workoutHistory}
          aiPlan={aiWorkoutPlan}
          weeklyGoal={parseInt(userProfile.workoutsPerWeek) || 3}
          userName={userProfile.name}
          onUpdateWeek={handleUpdateWorkout}
          onUpdateAIPlan={handleUpdateAIWorkoutPlan}
          onNavigateToChat={(prefill) => {
            dispatch({ type: "SET_SCREEN", payload: "chat" });
            if (prefill) setTimeout(() => handleSendMessage(prefill), 300);
          }}
        />
      )}

      {currentScreen === "diet" && (
        <DietScreen dietHistory={dietHistory} onUpdateDietDay={handleUpdateDietDay} />
      )}

      {currentScreen === "profile" && (
        <ProfileScreen
          initialProfile={userProfile}
          onSave={handleSaveProfile}
          workoutHistory={workoutHistory}
          dietHistory={dietHistory}
        />
      )}

      {/* Disclaimer modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,255,148,0.2)] p-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BrainCircuit className="text-primary" size={32} />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">Aviso Importante</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              As sugestões de treino e dieta geradas pela TitanAI são baseadas em algoritmos e
              recomendações gerais de saúde.
              <br />
              <br />
              <span className="text-primary font-bold">
                É essencial consultar um profissional de saúde, nutricionista ou educador físico
                antes de iniciar qualquer novo plano.
              </span>
            </p>
            <button
              onClick={() => dispatch({ type: "SET_SHOW_DISCLAIMER", payload: false })}
              className="w-full bg-primary text-black font-bold py-4 rounded-2xl hover:bg-primaryDark transition-all shadow-lg shadow-primary/20"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* First-time tutorial */}
      {showTutorial && !showDisclaimer && (
        <TutorialModal onClose={handleCloseTutorial} />
      )}
      </Suspense>
      <InstallBanner />
      <CookieConsent />
    </Layout>
  );
}
