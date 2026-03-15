import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BrainCircuit, Calendar, ChevronDown, ChevronRight, Copy, Crown,
  Dumbbell, ExternalLink, Info, Instagram, Mic, MicOff, MessageSquare, Plus, Trash2,
  TrendingUp, X, PlayCircle, Zap, Home,
} from "lucide-react";
import { AIWorkoutDisplay, DailyWorkout, Exercise, WeeklyWorkoutPlan, WeekSummary } from "../types";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { formatParsedFeedback, parseSpeechToExercise } from "../utils/parseSpeechToExercise";

import { getExerciseGif, getExerciseData, ExerciseData } from "../services/gifService";
import { detectPlateaus, getProgressionSuggestions } from "../utils/detectPlateau";
import { logEvent } from "../services/analytics";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEIGHT_OPTIONS = Array.from({ length: 41 }, (_, i) => (i * 5).toString());
const REP_OPTIONS = Array.from({ length: 50 }, (_, i) => (i + 1).toString());
const SET_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getWeekNumber = (d: Date): number => {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const calculateStreak = (history: WeeklyWorkoutPlan[], goal: number): number => {
  const sorted = [...history].sort((a, b) => b.id.localeCompare(a.id));
  let streak = 0;
  for (const week of sorted) {
    if (week.days.filter((d) => d.exercises.length > 0).length >= goal) streak++;
    else break;
  }
  return streak;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutScreenProps {
  startDate: number;
  history: WeeklyWorkoutPlan[];
  aiPlan: AIWorkoutDisplay | null;
  weeklyGoal: number;
  userName: string;
  onUpdateWeek: (week: WeeklyWorkoutPlan) => void;
  onUpdateAIPlan: (plan: AIWorkoutDisplay | null) => void;
  onNavigateToChat?: (prefillText?: string) => void;
}

// ─── Post-Workout Debriefing Modal ────────────────────────────────────────────

const DebriefingModal: React.FC<{
  dayName: string;
  onClose: () => void;
  onSendToChat: (text: string) => void;
}> = ({ dayName, onClose, onSendToChat }) => {
  const [transcript, setTranscript] = useState("");
  const [sent, setSent] = useState(false);

  const { isListening, isSupported, start, stop } = useSpeechInput({
    onResult: (t) => setTranscript((prev) => (prev ? prev + " " + t : t)),
  });

  const handleSend = () => {
    if (!transcript.trim()) return;
    const message = `📋 Debrief pós-treino (${dayName}): ${transcript.trim()}`;
    onSendToChat(message);
    logEvent({ name: "voice_input_used", context: "debriefing" });
    setSent(true);
  };

  if (sent) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
        <div className="bg-surface border border-primary/40 w-full max-w-sm rounded-3xl p-6 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="text-xl font-bold text-white mb-2">Debrief enviado!</h3>
          <p className="text-gray-400 text-sm mb-5">TitanAI vai analisar e sugerir ajustes no próximo treino.</p>
          <button onClick={onClose} className="w-full bg-primary text-black font-bold py-3 rounded-2xl">Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-surface border border-white/10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background">
          <div>
            <h3 className="font-display text-lg font-bold text-white">Debrief do Treino</h3>
            <p className="text-xs text-gray-500">{dayName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-400">Como foi o treino? Fale ou escreva: sensações, dores, cargas, energia.</p>

          {isSupported && (
            <button
              onClick={() => isListening ? stop() : start()}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${isListening ? "bg-primary text-black animate-pulse" : "bg-white/5 text-primary border border-primary/30 hover:bg-primary/10"}`}
            >
              {isListening ? <><MicOff size={18} /> Parar gravação</> : <><Mic size={18} /> Gravar por voz</>}
            </button>
          )}

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary/50 focus:outline-none resize-none"
            rows={4}
            placeholder='ex: "Peito ativou bem. Ombro direito incomodou no supino. Energia 8/10."'
          />

          <button
            onClick={handleSend}
            disabled={!transcript.trim()}
            className="w-full bg-primary text-black font-bold py-3 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} /> Enviar para TitanAI
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Exercise Guide Modal ─────────────────────────────────────────────────────

const ExerciseGuideModal: React.FC<{ name: string; obs?: string; onClose: () => void }> = ({ name, obs, onClose }) => {
  const [gifUrl, setGifUrl] = useState("");
  const [exData, setExData] = useState<ExerciseData | null>(null);

  useEffect(() => {
    getExerciseData(name).then((data) => {
      if (data) {
        setGifUrl(data.imageUrl || data.gifUrl);
        setExData(data);
      } else {
        getExerciseGif(name).then(setGifUrl);
      }
    });
  }, [name]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background">
          <h3 className="font-display text-xl font-bold text-white truncate pr-2">{name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><X size={22} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {gifUrl && (
            <div className="w-full aspect-square bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
              <img src={gifUrl} alt={name} className="w-full h-full object-contain" />
            </div>
          )}

          {/* Muscle & equipment tags */}
          {exData && (
            <div className="flex flex-wrap gap-2">
              {[exData.bodyPart, exData.target, exData.equipment].filter(Boolean).map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium capitalize">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* TitanAI coach tips (from workout plan obs) */}
          {obs && (
            <div className="bg-background p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Dicas do Coach</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{obs}</p>
            </div>
          )}

          {/* Step-by-step instructions from dataset */}
          {exData && exData.instructions.length > 0 && (
            <div className="bg-background p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Execução</span>
              </div>
              <ol className="space-y-2">
                {exData.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-300 leading-relaxed">
                    <span className="text-primary font-bold shrink-0 mt-0.5">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <a href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(exData?.name ?? name)}`}
            target="_blank" rel="noreferrer"
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium">
            <ExternalLink size={16} /> Ver tutorial no YouTube
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Weekly Goal Popup ────────────────────────────────────────────────────────

// Week days ordered Mon→Sun, matching WorkoutScreen's DAY_NAMES array
const WEEK_DAY_TRACKER = [
  { abbr3: "Seg", full: "Segunda-feira" },
  { abbr3: "Ter", full: "Terça-feira" },
  { abbr3: "Qua", full: "Quarta-feira" },
  { abbr3: "Qui", full: "Quinta-feira" },
  { abbr3: "Sex", full: "Sexta-feira" },
  { abbr3: "Sáb", full: "Sábado" },
  { abbr3: "Dom", full: "Domingo" },
];

const GoalPopup: React.FC<{ summary: WeekSummary; userName: string; onClose: () => void }> = ({
  summary, userName, onClose,
}) => {
  const stickerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  /** Captures stickerRef via html2canvas and returns a PNG Blob. */
  const captureSticker = async (): Promise<Blob | null> => {
    if (!stickerRef.current) return null;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(stickerRef.current, {
      backgroundColor: null,   // transparent — rounded corners become see-through
      scale: 4,                // 4× for crisp Retina rendering when pinch-zoomed in Stories
      useCORS: true,           // allows cross-origin images (e.g. avatar URLs)
      logging: false,
      removeContainer: true,   // removes the temporary off-screen container after capture
    });
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await captureSticker();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trainova-semana-${summary.weekNumber}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Erro ao gerar sticker:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const blob = await captureSticker();
      if (!blob) return;
      const file = new File([blob], `trainova-semana-${summary.weekNumber}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        // Mobile: opens native share sheet (Instagram, WhatsApp, etc.)
        await navigator.share({ files: [file], title: `Trainova — Semana ${summary.weekNumber}` });
      } else {
        // Desktop fallback: download the sticker
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      console.error("Erro ao compartilhar:", e);
    } finally {
      setIsSharing(false);
    }
  };

  const avatarLetter = userName.trim().charAt(0).toUpperCase() || "?";
  const busy = isDownloading || isSharing;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#111318] border border-primary/40 w-full max-w-sm rounded-3xl shadow-[0_0_60px_rgba(0,255,148,0.25)] overflow-hidden">

        {/* ── STICKER CONTENT — only this div is captured by html2canvas ── */}
        {/* Outer centering wrapper gives the badge compact proportions */}
        <div className="flex justify-center pt-6 pb-4 px-5">
          <div
            ref={stickerRef}
            style={{
              background: "#111318",
              borderRadius: 18,
              border: "1px solid rgba(0,255,148,0.18)",
              padding: "18px 18px 14px",
              width: 300,
            }}
          >
            {/* 🔥 Title */}
            <p className="text-center font-display font-black tracking-widest text-white mb-0.5"
               style={{ fontSize: "1.05rem", letterSpacing: "0.11em" }}>
              🔥 RESUMO SEMANAL
            </p>
            <p className="text-center text-[11px] mb-4" style={{ color: "#6b7280" }}>
              Week {summary.weekNumber} · {summary.year}
            </p>

            {/* Avatar + name */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(0,255,148,0.15)", border: "1.5px solid rgba(0,255,148,0.4)",
                color: "#00ff94", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: "bold", flexShrink: 0,
              }}>
                {avatarLetter}
              </div>
              <span className="font-semibold text-sm text-white">{userName}</span>
            </div>

            {/* Days count */}
            <div className="text-center mb-4">
              <span style={{ color: "#00ff94", fontWeight: 900, fontSize: "2rem", lineHeight: 1 }}>
                {summary.trainedDays.length}
              </span>
              <span className="text-sm ml-1.5" style={{ color: "#9ca3af" }}>
                {summary.trainedDays.length === 1 ? "dia treinado" : "dias treinados"}
              </span>
              {summary.goalReached && <span className="ml-1.5">👑</span>}
            </div>

            {/* Day tracker — Seg Ter Qua Qui Sex Sáb Dom */}
            <div className="flex justify-center gap-[5px] mb-4">
              {WEEK_DAY_TRACKER.map(({ abbr3, full }) => {
                const trained = summary.trainedDays.includes(full);
                return (
                  <div key={full} style={{
                    width: 36, height: 44, borderRadius: 8, flexShrink: 0,
                    background: trained ? "#00ff94" : "rgba(255,255,255,0.06)",
                    boxShadow: trained ? "0 0 9px rgba(0,255,148,0.45)" : "none",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 2,
                  }}>
                    <span style={{ color: trained ? "#000" : "#4b5563", fontSize: 10, fontWeight: "bold", lineHeight: 1 }}>
                      {abbr3}
                    </span>
                    <span style={{ color: trained ? "#000" : "#374151", fontSize: 10, lineHeight: 1 }}>
                      {trained ? "✓" : "·"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Watermark */}
            <p className="text-center" style={{ color: "rgba(0,255,148,0.3)", fontSize: 8, fontWeight: "bold", letterSpacing: "0.35em" }}>
              ◆ TRAINOVA ◆
            </p>
          </div>
        </div>

        {/* ── Buttons — NOT captured ── */}
        <div className="px-6 pb-6 pt-0 flex flex-col gap-2">
          <button
            onClick={handleDownload}
            disabled={busy}
            className="w-full bg-white/[0.06] border border-white/[0.10] text-white font-semibold py-2.5 rounded-2xl hover:bg-white/[0.10] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            {isDownloading ? "Gerando PNG..." : <><span className="text-base">⬇</span> Baixar Sticker (PNG transparente)</>}
          </button>
          <button
            onClick={handleShare}
            disabled={busy}
            className="w-full bg-gradient-to-r from-[#E1306C] via-[#833AB4] to-[#405DE6] text-white font-bold py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 shadow-[0_0_28px_rgba(225,48,108,0.45)] text-base"
          >
            {isSharing
              ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Gerando imagem...</>
              : <><Instagram size={20} /> Compartilhar no Instagram</>}
          </button>
          <button onClick={onClose} disabled={busy} className="w-full py-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-colors text-sm disabled:opacity-40">
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

// ─── Exercise Row (with voice input) ─────────────────────────────────────────

const ExerciseRow: React.FC<{
  ex: Exercise; exIdx: number; wIdx: number; dIdx: number;
  onUpdate: (wi: number, di: number, ei: number, field: keyof Exercise, val: string) => void;
  onRemove: (wi: number, di: number, ei: number) => void;
  onView: (name: string, obs?: string) => void;
}> = ({ ex, exIdx, wIdx, dIdx, onUpdate, onRemove, onView }) => {
  const [isActiveVoice, setIsActiveVoice] = useState(false);

  const { isListening, isSupported, start, stop } = useSpeechInput({
    onResult: (transcript) => {
      const parsed = parseSpeechToExercise(transcript);
      if (parsed.name) onUpdate(wIdx, dIdx, exIdx, "name", parsed.name);
      if (parsed.weight) onUpdate(wIdx, dIdx, exIdx, "weight", parsed.weight);
      if (parsed.reps) onUpdate(wIdx, dIdx, exIdx, "reps", parsed.reps);
      if (parsed.sets) onUpdate(wIdx, dIdx, exIdx, "sets", parsed.sets);
      // Show feedback in console (in production: show a toast)
      console.info("[Voice]", formatParsedFeedback(parsed));
      setIsActiveVoice(false);
    },
  });

  const handleMicClick = () => {
    if (isListening && isActiveVoice) { stop(); setIsActiveVoice(false); }
    else { setIsActiveVoice(true); start(); }
  };

  return (
    <div className={`rounded-xl border p-3 mb-2 transition-all ${isListening && isActiveVoice ? "border-primary/60 bg-primary/5" : "border-white/5 bg-surface"}`}>
      {/* Name row */}
      <div className="flex items-center gap-2 mb-3">
        {isSupported && (
          <button onClick={handleMicClick}
            className={`p-1.5 rounded-lg shrink-0 transition-all ${isListening && isActiveVoice ? "bg-primary text-black animate-pulse" : "bg-white/5 text-gray-500 hover:text-primary"}`}
            title="Falar exercício">
            {isListening && isActiveVoice ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        )}
        <input
          className="flex-1 bg-transparent text-white font-semibold text-sm border-b border-transparent focus:border-primary/50 focus:outline-none py-1 min-w-0"
          placeholder="Nome do exercício"
          value={ex.name}
          onChange={(e) => onUpdate(wIdx, dIdx, exIdx, "name", e.target.value)}
        />
        {ex.name && (
          <button onClick={() => onView(ex.name)} className="p-1 text-gray-600 hover:text-primary transition-colors shrink-0">
            <PlayCircle size={15} />
          </button>
        )}
        <button onClick={() => onRemove(wIdx, dIdx, exIdx)} className="p-1 text-gray-700 hover:text-red-400 transition-colors shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Carga (kg)", field: "weight" as keyof Exercise, opts: WEIGHT_OPTIONS, color: "text-primary" },
          { label: "Reps", field: "reps" as keyof Exercise, opts: REP_OPTIONS, color: "text-white" },
          { label: "Séries", field: "sets" as keyof Exercise, opts: SET_OPTIONS, color: "text-white" },
        ].map(({ label, field, opts, color }) => (
          <div key={field} className="bg-background rounded-lg p-2 text-center">
            <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">{label}</p>
            <select className={`w-full bg-transparent ${color} text-sm font-mono text-center focus:outline-none appearance-none cursor-pointer`}
              value={ex[field]} onChange={(e) => onUpdate(wIdx, dIdx, exIdx, field, e.target.value)}>
              <option value="" className="bg-surface text-gray-500">—</option>
              {opts.map((o) => <option key={o} value={o} className="bg-surface">{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {isListening && isActiveVoice && (
        <p className="text-[10px] text-primary mt-2 animate-pulse text-center">
          🎤 Ouvindo... ex: "Supino reto, 80 quilos, 12 repetições, 4 séries"
        </p>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  startDate, history, aiPlan, weeklyGoal, userName, onUpdateWeek, onUpdateAIPlan, onNavigateToChat,
}) => {
  const [activeTab, setActiveTab] = useState<"journal" | "ai">("journal");
  const [displayWeeks, setDisplayWeeks] = useState<WeeklyWorkoutPlan[]>([]);
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [importingDay, setImportingDay] = useState<AIWorkoutDisplay["days"][0] | null>(null);
  const [viewingExercise, setViewingExercise] = useState<{ name: string; obs?: string } | null>(null);
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null);
  const [showGoalPopup, setShowGoalPopup] = useState(false);
  const [debriefDay, setDebriefDay] = useState<string | null>(null);
  const [dismissedPlateaus, setDismissedPlateaus] = useState<Set<string>>(new Set());
  const prevGoalRef = useRef(false);

  // ── Contextual banners ───────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const isOutsideGymHours = hour < 6 || hour > 22;
  const todayStr = new Date().toISOString().split("T")[0];
  const trainedToday = displayWeeks[0]?.days.some((d) => d.date === todayStr && d.exercises.length > 0) ?? false;
  const showEquipmentFreeBanner = isOutsideGymHours && !trainedToday;

  // ── Plateau detection ────────────────────────────────────────────────────────
  const plateauAlerts = detectPlateaus(history, 3).filter((a) => !dismissedPlateaus.has(a.exerciseName));
  const progressionTips = getProgressionSuggestions(history);

  // ── Generate weeks ───────────────────────────────────────────────────────────
  useEffect(() => {
    const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
    const iter = new Date(startDate);
    const dayOfWeek = iter.getDay() || 7;
    if (dayOfWeek !== 1) iter.setDate(iter.getDate() - (dayOfWeek - 1));
    const now = new Date();
    const weeks: WeeklyWorkoutPlan[] = [];

    while (iter <= now || weeks.length === 0) {
      const year = iter.getFullYear();
      const weekNum = getWeekNumber(iter);
      const id = `${year}-W${weekNum}`;
      const existing = history.find((h) => h.id === id);

      if (existing) {
        weeks.push(existing);
      } else {
        const weekStart = new Date(iter);
        const days: DailyWorkout[] = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + i);
          return { date: d.toISOString().split("T")[0], dayName: DAY_NAMES[i], exercises: [] };
        });
        weeks.push({ id, year, weekNumber: weekNum, startDate: weekStart.toISOString(), endDate: new Date(weekStart.getTime() + 6 * 86400000).toISOString(), days });
      }
      iter.setDate(iter.getDate() + 7);
    }

    weeks.sort((a, b) => {
      const [aYear, aWeek] = a.id.split('-W').map(Number);
      const [bYear, bWeek] = b.id.split('-W').map(Number);
      return bYear !== aYear ? bYear - aYear : bWeek - aWeek;
    });
    setDisplayWeeks(weeks);
    if (!expandedWeekId && weeks.length > 0) setExpandedWeekId(weeks[0].id);
  }, [startDate, history]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Goal detection ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!displayWeeks.length) return;
    const current = displayWeeks[0];
    const trainedDays = current.days.filter((d) => d.exercises.length > 0).map((d) => d.dayName);
    const goalReached = trainedDays.length >= weeklyGoal;
    const summary: WeekSummary = { weekNumber: current.weekNumber, year: current.year, trainedDays, goalReached, streakWeeks: 0 };
    setWeekSummary(summary);
    if (goalReached && !prevGoalRef.current) setShowGoalPopup(true);
    prevGoalRef.current = goalReached;
  }, [displayWeeks, weeklyGoal, history]);

  // ── Workout CRUD ─────────────────────────────────────────────────────────────
  const updateExercise = useCallback((wIdx: number, dIdx: number, exIdx: number, field: keyof Exercise, value: string) => {
    setDisplayWeeks((prev) => {
      const next = prev.map((w, wi) => {
        if (wi !== wIdx) return w;
        const days = w.days.map((d, di) => {
          if (di !== dIdx) return d;
          return { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx ? { ...ex, [field]: value } : ex) };
        });
        return { ...w, days };
      });
      onUpdateWeek(next[wIdx]);
      return next;
    });
  }, [onUpdateWeek]);

  const addExercise = useCallback((wIdx: number, dIdx: number) => {
    setDisplayWeeks((prev) => {
      const next = prev.map((w, wi) => {
        if (wi !== wIdx) return w;
        const days = w.days.map((d, di) => {
          if (di !== dIdx) return d;
          return { ...d, exercises: [...d.exercises, { id: `${Date.now()}${Math.random()}`, name: "", weight: "", reps: "", sets: "" }] };
        });
        return { ...w, days };
      });
      onUpdateWeek(next[wIdx]);
      return next;
    });
  }, [onUpdateWeek]);

  const removeExercise = useCallback((wIdx: number, dIdx: number, exIdx: number) => {
    setDisplayWeeks((prev) => {
      const next = prev.map((w, wi) => {
        if (wi !== wIdx) return w;
        const days = w.days.map((d, di) => {
          if (di !== dIdx) return d;
          return { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) };
        });
        return { ...w, days };
      });
      onUpdateWeek(next[wIdx]);
      return next;
    });
  }, [onUpdateWeek]);

  const copyLastWorkout = useCallback((wIdx: number, dIdx: number) => {
    const dayName = displayWeeks[wIdx].days[dIdx].dayName;
    let found: Exercise[] = [];
    for (let i = wIdx + 1; i < displayWeeks.length; i++) {
      const prev = displayWeeks[i].days.find((d) => d.dayName === dayName);
      if (prev?.exercises.length) { found = prev.exercises; break; }
    }
    if (!found.length) { alert("Nenhum treino encontrado em semanas anteriores."); return; }
    const copies: Exercise[] = found.map((ex) => ({ id: `${Date.now()}${Math.random()}`, name: ex.name, weight: "", reps: "", sets: "" }));
    setDisplayWeeks((prev) => {
      const next = prev.map((w, wi) => {
        if (wi !== wIdx) return w;
        const days = w.days.map((d, di) => di === dIdx ? { ...d, exercises: [...d.exercises, ...copies] } : d);
        return { ...w, days };
      });
      onUpdateWeek(next[wIdx]);
      return next;
    });
  }, [displayWeeks, onUpdateWeek]);

  // ── AI Plan CRUD ─────────────────────────────────────────────────────────────
  const updateAI = (path: "title" | "description", val: string) => aiPlan && onUpdateAIPlan({ ...aiPlan, [path]: val });
  const updateAIDay = (di: number, field: string, val: string) => aiPlan && onUpdateAIPlan({ ...aiPlan, days: aiPlan.days.map((d, i) => i === di ? { ...d, [field]: val } : d) });
  const updateAIEx = (di: number, ei: number, field: string, val: string) => aiPlan && onUpdateAIPlan({ ...aiPlan, days: aiPlan.days.map((d, i) => i !== di ? d : { ...d, exercises: d.exercises.map((ex, j) => j === ei ? { ...ex, [field]: val } : ex) }) });
  const addAIEx = (di: number) => aiPlan && onUpdateAIPlan({ ...aiPlan, days: aiPlan.days.map((d, i) => i === di ? { ...d, exercises: [...d.exercises, { name: "", sets: "", reps: "", weight: "0", obs: "" }] } : d) });
  const removeAIEx = (di: number, ei: number) => aiPlan && onUpdateAIPlan({ ...aiPlan, days: aiPlan.days.map((d, i) => i === di ? { ...d, exercises: d.exercises.filter((_, j) => j !== ei) } : d) });
  const addAIDay = () => aiPlan && onUpdateAIPlan({ ...aiPlan, days: [...aiPlan.days, { dayName: "Novo Dia", focus: "Foco", exercises: [] }] });
  const removeAIDay = (di: number) => aiPlan && onUpdateAIPlan({ ...aiPlan, days: aiPlan.days.filter((_, i) => i !== di) });

  const handleImportToJournal = (targetWeekId: string, targetDayDate: string) => {
    if (!importingDay) return;
    const week = displayWeeks.find((w) => w.id === targetWeekId);
    if (!week) return;
    const newEx: Exercise[] = importingDay.exercises.map((ex) => ({ id: `${Date.now()}${Math.random()}`, name: ex.name, weight: ex.weight ?? "", reps: ex.reps, sets: ex.sets }));
    const updated = { ...week, days: week.days.map((d) => d.date === targetDayDate ? { ...d, exercises: [...d.exercises, ...newEx] } : d) };
    onUpdateWeek(updated);
    setImportingDay(null);
    setActiveTab("journal");
    setExpandedWeekId(targetWeekId);
    setExpandedDayIndex(updated.days.findIndex((d) => d.date === targetDayDate));
  };

  const getExerciseHistory = (query: string) =>
    displayWeeks.flatMap((w) => w.days.flatMap((d) =>
      d.exercises.filter((ex) => ex.name.toLowerCase().includes(query.toLowerCase()) && query.length > 2)
        .map((ex) => ({ date: d.date, weight: ex.weight, reps: ex.reps, sets: ex.sets }))
    )).sort((a, b) => b.date.localeCompare(a.date));


  const trainedCount = displayWeeks[0]?.days.filter((d) => d.exercises.length > 0).length ?? 0;
  const goalPct = Math.min((trainedCount / Math.max(weeklyGoal, 1)) * 100, 100);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* ── Modals ── */}
      {viewingExercise && (
        <ExerciseGuideModal
          {...viewingExercise}
          onClose={() => setViewingExercise(null)}
        />
      )}

      {showGoalPopup && weekSummary && (
        <GoalPopup summary={weekSummary} userName={userName} onClose={() => setShowGoalPopup(false)} />
      )}

      {debriefDay && (
        <DebriefingModal
          dayName={debriefDay}
          onClose={() => setDebriefDay(null)}
          onSendToChat={(text) => {
            onNavigateToChat?.(text);
            setDebriefDay(null);
          }}
        />
      )}

      {importingDay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background">
              <h3 className="font-display text-xl font-bold text-white">Importar para Diário</h3>
              <button onClick={() => setImportingDay(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={22} className="text-gray-400" /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              <p className="text-sm text-gray-400">Importar: <span className="text-primary font-bold">{importingDay.dayName}</span></p>
              {displayWeeks.slice(0, 2).map((week) => (
                <div key={week.id} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Semana {week.weekNumber}</p>
                  {week.days.map((day) => (
                    <button key={day.date} onClick={() => handleImportToJournal(week.id, day.date)}
                      className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-primary/10 hover:border-primary/30 border border-transparent rounded-xl transition-all">
                      <span className="text-sm text-gray-200">{day.dayName}</span>
                      <span className="text-[10px] text-gray-500">{new Date(day.date + "T12:00").toLocaleDateString("pt-BR")}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="bg-surface border-b border-white/5 px-4 pt-3 pb-0">
        {displayWeeks[0] && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-500">Meta semanal</span>
              <div className="flex items-center gap-1.5">
                {weekSummary?.goalReached && <Crown size={12} className="text-primary" />}
                <span className="text-xs font-bold text-primary">{trainedCount}/{weeklyGoal} dias</span>
                {weekSummary && (
                  <button onClick={() => setShowGoalPopup(true)} className="ml-1 text-gray-600 hover:text-primary transition-colors">
                    <Instagram size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primaryDark rounded-full transition-all duration-700" style={{ width: `${goalPct}%` }} />
            </div>
          </div>
        )}
        <div className="flex gap-4">
          {[
            { id: "journal" as const, label: "Meu Diário" },
            { id: "ai" as const, label: "Plano da IA", icon: <BrainCircuit size={13} /> },
          ].map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === id ? "border-primary text-white" : "border-transparent text-gray-500"}`}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">

        {/* JOURNAL */}
        {activeTab === "journal" && (
          <div className="space-y-4">

            {/* ── Modo Sem Equipamento Banner ── */}
            {showEquipmentFreeBanner && (
              <div className="bg-surface border border-white/10 rounded-2xl p-4 flex items-start gap-3 animate-fadeIn">
                <Home size={18} className="text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">Treino em casa hoje?</p>
                  <p className="text-gray-500 text-xs mt-0.5">TitanAI monta um treino bodyweight baseado no seu nível agora.</p>
                </div>
                <button
                  onClick={() => onNavigateToChat?.("Crie um treino bodyweight completo para hoje, sem equipamento, baseado no meu nível e objetivo.")}
                  className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  Pedir treino
                </button>
              </div>
            )}

            {/* ── Plateau Alerts ── */}
            {plateauAlerts.length > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Coach Anti-Plateau</span>
                </div>
                {plateauAlerts.map((alert) => (
                  <div key={alert.exerciseName} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{alert.exerciseName}</p>
                      <p className="text-yellow-500/70 text-xs">{alert.weeksStagnant} sem. em {alert.currentWeight}kg — {alert.suggestion}</p>
                    </div>
                    <button
                      onClick={() => setDismissedPlateaus((prev) => new Set(prev).add(alert.exerciseName))}
                      className="text-gray-600 hover:text-white shrink-0 p-0.5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Progressive Overload Tips ── */}
            {progressionTips.length > 0 && history.length >= 2 && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Sobrecarga Progressiva</span>
                </div>
                {progressionTips.map((tip) => (
                  <p key={tip.exerciseName} className="text-xs text-gray-300">
                    <span className="text-white font-semibold">{tip.exerciseName}</span>
                    <span className="text-gray-500"> {tip.currentWeight}kg → </span>
                    <span className="text-primary font-bold">{tip.suggestedWeight}kg</span>
                  </p>
                ))}
              </div>
            )}

            <div className="relative">
              <Dumbbell size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Buscar exercício no histórico..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-white/5 rounded-2xl py-3.5 pl-11 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/30 transition-all" />
              {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={16} /></button>}
            </div>

            {searchTerm.length > 2 ? (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 ml-1">
                  <BrainCircuit size={13} className="text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Histórico: {searchTerm}</span>
                </div>
                {getExerciseHistory(searchTerm).length > 0 ? (
                  getExerciseHistory(searchTerm).map((item, idx) => (
                    <div key={idx} className="bg-surface border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{new Date(item.date + "T12:00").toLocaleDateString("pt-BR")}</p>
                        <p className="text-sm font-bold text-white uppercase tracking-tight mt-0.5">{searchTerm}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-right"><p className="text-[9px] text-gray-500 uppercase">Carga</p><p className="text-sm font-mono text-primary">{item.weight || "0"}kg</p></div>
                        <div className="text-right"><p className="text-[9px] text-gray-500 uppercase">Séries×Reps</p><p className="text-sm font-mono text-white">{item.sets || "0"}×{item.reps || "0"}</p></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-gray-500 text-sm">Nenhum registro para "{searchTerm}"</p>
                )}
              </div>
            ) : (
              displayWeeks.map((week, wIdx) => {
                const isExpanded = expandedWeekId === week.id;
                const daysWithEx = week.days.filter((d) => d.exercises.length > 0).length;
                const goalMet = daysWithEx >= weeklyGoal;

                return (
                  <div key={week.id} className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-md">
                    <button onClick={() => { setExpandedWeekId(isExpanded ? null : week.id); setExpandedDayIndex(null); }}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isExpanded ? "bg-primary text-black" : "bg-white/5 text-gray-400"}`}><Calendar size={18} /></div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white">Semana {week.weekNumber} · {week.year}</h3>
                            {goalMet && <Crown size={13} className="text-primary" />}
                          </div>
                          <p className="text-xs text-gray-400">
                            {new Date(week.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} – {new Date(week.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                            <span className="ml-2 text-primary font-bold">{daysWithEx} dias</span>
                          </p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown size={18} className="text-primary" /> : <ChevronRight size={18} className="text-gray-500" />}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 bg-background">
                        {week.days.map((day, dIdx) => {
                          const isDayExpanded = expandedDayIndex === dIdx;
                          const hasEx = day.exercises.length > 0;
                          const isWeekend = day.dayName === "Sábado" || day.dayName === "Domingo";
                          return (
                            <div key={day.date} className={`rounded-xl border transition-all ${isDayExpanded ? "border-primary/30" : "border-white/5"}`}>
                              <button onClick={() => setExpandedDayIndex(isDayExpanded ? null : dIdx)}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${hasEx ? "bg-primary text-black" : "bg-surface text-gray-600"}`}>
                                    {hasEx ? "✓" : <Dumbbell size={13} />}
                                  </div>
                                  <div className="text-left">
                                    <p className={`font-semibold text-sm ${isWeekend ? "text-gray-400" : "text-white"}`}>{day.dayName}</p>
                                    {hasEx && <p className="text-[10px] text-primary">{day.exercises.length} exercício{day.exercises.length !== 1 ? "s" : ""}</p>}
                                  </div>
                                </div>
                                {isDayExpanded ? <ChevronDown size={15} className="text-primary" /> : <ChevronRight size={15} className="text-gray-600" />}
                              </button>

                              {isDayExpanded && (
                                <div className="px-3 pb-3 animate-fadeIn">
                                  <div className="flex justify-between items-center mb-2">
                                    <button onClick={() => copyLastWorkout(wIdx, dIdx)} className="text-xs flex items-center gap-1 text-primary hover:underline">
                                      <Copy size={11} /> Copiar último treino
                                    </button>
                                    {hasEx && (
                                      <button
                                        onClick={() => setDebriefDay(day.dayName)}
                                        className="text-xs flex items-center gap-1 text-gray-500 hover:text-primary transition-colors"
                                      >
                                        <Zap size={11} /> Debrief
                                      </button>
                                    )}
                                  </div>
                                  {day.exercises.map((ex, exIdx) => (
                                    <ExerciseRow key={ex.id} ex={ex} exIdx={exIdx} wIdx={wIdx} dIdx={dIdx}
                                      onUpdate={updateExercise} onRemove={removeExercise}
                                      onView={(name, obs) => setViewingExercise({ name, obs })} />
                                  ))}
                                  <button onClick={() => addExercise(wIdx, dIdx)}
                                    className="w-full mt-1 py-2.5 border border-dashed border-white/15 rounded-xl text-gray-500 hover:text-primary hover:border-primary/40 text-xs flex items-center justify-center gap-1.5 transition-all">
                                    <Plus size={13} /> Adicionar Exercício
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* AI PLAN */}
        {activeTab === "ai" && (
          <div className="space-y-4 animate-fadeIn">
            {!aiPlan ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-white/10 rounded-2xl">
                <BrainCircuit size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-400">Nenhum plano gerado</h3>
                <p className="text-sm text-gray-500 mt-2">Peça ao TitanAI no chat:<br />"Crie um plano de treino para mim"</p>
              </div>
            ) : (
              <div className="bg-surface rounded-2xl border border-white/5 p-4">
                <div className="mb-4 border-b border-white/10 pb-4">
                  <input className="text-xl font-display font-bold text-primary bg-transparent w-full focus:outline-none" value={aiPlan.title} onChange={(e) => updateAI("title", e.target.value)} />
                  <input className="text-sm text-gray-400 mt-1 bg-transparent w-full focus:outline-none" value={aiPlan.description} onChange={(e) => updateAI("description", e.target.value)} />
                </div>
                <div className="space-y-5">
                  {aiPlan.days.map((day, di) => (
                    <div key={di} className="bg-background rounded-xl p-4 border border-white/5 relative group/day">
                      <button onClick={() => removeAIDay(di)} className="absolute top-3 right-3 text-gray-700 hover:text-red-400 opacity-0 group-hover/day:opacity-100 transition-all"><Trash2 size={13} /></button>
                      <div className="flex items-start justify-between mb-3 pr-6">
                        <div className="flex-1">
                          <input className="font-bold text-white bg-transparent focus:outline-none w-full" value={day.dayName} onChange={(e) => updateAIDay(di, "dayName", e.target.value)} />
                          <input className="text-xs text-primary uppercase tracking-wider bg-transparent focus:outline-none w-full mt-0.5" value={day.focus} onChange={(e) => updateAIDay(di, "focus", e.target.value)} />
                        </div>
                        <button onClick={() => setImportingDay(day)} className="ml-2 shrink-0 flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-bold transition-all border border-primary/20">
                          <Plus size={12} /> Importar
                        </button>
                      </div>
                      <div className="space-y-2">
                        {day.exercises.map((ex, ei) => (
                          <div key={ei} className="bg-surface/60 rounded-lg p-3 group/ex">
                            <div className="flex items-center gap-2 mb-2">
                              <button onClick={() => setViewingExercise({ name: ex.name, obs: ex.obs })} className="text-gray-600 hover:text-primary transition-colors"><PlayCircle size={13} /></button>
                              <input className="flex-1 bg-transparent text-white text-sm font-semibold focus:outline-none border-b border-transparent focus:border-primary/40" value={ex.name} onChange={(e) => updateAIEx(di, ei, "name", e.target.value)} placeholder="Nome" />
                              <button onClick={() => removeAIEx(di, ei)} className="opacity-0 group-hover/ex:opacity-100 text-gray-700 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                              {[{ l: "Séries", k: "sets" }, { l: "Reps", k: "reps" }, { l: "Carga", k: "weight" }, { l: "Obs", k: "obs" }].map(({ l, k }) => (
                                <div key={k} className="bg-background rounded p-1.5">
                                  <p className="text-[8px] text-gray-600 uppercase mb-0.5">{l}</p>
                                  <input className={`w-full bg-transparent text-center focus:outline-none text-xs ${k === "weight" ? "text-primary" : k === "obs" ? "text-gray-400" : "text-white"}`}
                                    value={(ex as Record<string, string>)[k] ?? ""}
                                    onChange={(e) => updateAIEx(di, ei, k, e.target.value)} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addAIEx(di)} className="w-full mt-2 py-2 border border-dashed border-white/10 rounded-lg text-gray-500 hover:text-primary hover:border-primary/30 text-xs flex items-center justify-center gap-1 transition-all">
                        <Plus size={12} /> Adicionar Exercício
                      </button>
                    </div>
                  ))}
                  <button onClick={addAIDay} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-gray-500 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-bold">
                    <Plus size={18} /> Adicionar Dia de Treino
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
