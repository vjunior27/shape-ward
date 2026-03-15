import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BrainCircuit, Calendar, ChevronDown, ChevronRight, ChevronLeft, Check,
  Copy, Crown, Dumbbell, ExternalLink, Info, Mic, MicOff, MessageSquare,
  Plus, Trash2, TrendingUp, X, PlayCircle, Zap, Home,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { AIWorkoutDisplay, DailyWorkout, Exercise, WeeklyWorkoutPlan, WeekSummary } from "../types";
import { useStreakStore } from "../stores/useStreakStore";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { formatParsedFeedback, parseSpeechToExercise } from "../utils/parseSpeechToExercise";

import { getExerciseGif, getExerciseData, ExerciseData } from "../services/gifService";
import { detectPlateaus, getProgressionSuggestions } from "../utils/detectPlateau";
import { logEvent } from "../services/analytics";

// ─── Constants ────────────────────────────────────────────────────────────────

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
  onStartWorkout?: () => void;
}

// ─── Post-Workout Debriefing Modal ────────────────────────────────────────────

const DebriefingModal: React.FC<{
  dayName: string;
  onClose: () => void;
  onSendToChat: (text: string) => void;
  onSave?: (text: string) => void;
}> = ({ dayName, onClose, onSendToChat, onSave }) => {
  const [transcript, setTranscript] = useState("");
  const [sent, setSent] = useState(false);

  const { isListening, isSupported, start, stop } = useSpeechInput({
    onResult: (t) => setTranscript((prev) => (prev ? prev + " " + t : t)),
  });

  const handleSend = () => {
    if (!transcript.trim()) return;
    const trimmed = transcript.trim();
    onSave?.(trimmed);
    const message = `📋 Debrief pós-treino (${dayName}): ${trimmed}`;
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

const ECG_PATH = "M-72 0 L-40 0 C-38 0 -38 -20 -36 -20 L-30 -20 C-28 -20 -28 0 -26 0 L-22 0 C-20 0 -20 -18 -18 -18 C-16 -18 -16 -10 -14 -10 C-12 -10 -14 -18 -12 -18 C-10 -18 -10 0 -8 0 L-4 0 C-2 0 0 -24 2 -24 C4 -24 6 0 8 0 C8 -8 8 -12 10 -12 L12 0 L16 0 C18 0 18 -18 20 -18 C22 -18 22 0 22 0 L26 0 C28 0 28 -18 30 -18 C32 -18 32 -8 34 -8 C36 -8 34 -18 36 -18 C38 -18 38 0 40 0 L72 0";

// Single-letter day labels in Mon→Sun order matching WEEK_DAY_TRACKER
const WEEK_SINGLE_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

const GoalPopup: React.FC<{ summary: WeekSummary; userName: string; onClose: () => void }> = ({
  summary, userName, onClose,
}) => {
  const stickerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Build weekDays array: 7 days Mon→Sun
  const weekDays = WEEK_DAY_TRACKER.map(({ full }, i) => ({
    label: WEEK_SINGLE_LABELS[i],
    trained: summary.trainedDays.includes(full),
  }));

  // Days trained this week (same data that fills the squares)
  const daysTrainedThisWeek = weekDays.filter((d) => d.trained).length;

  /** Captures stickerRef via html2canvas and returns a PNG Blob. */
  const captureSticker = async (): Promise<Blob | null> => {
    if (!stickerRef.current) return null;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(stickerRef.current, {
      backgroundColor: null,
      scale: 4,
      useCORS: true,
      logging: false,
      removeContainer: true,
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
      a.download = `trainova-semana-${daysTrainedThisWeek}d.png`;
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
      const file = new File([blob], `trainova-semana-${daysTrainedThisWeek}d.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${daysTrainedThisWeek} dias treinados esta semana no Trainova!` });
      } else {
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

  const busy = isDownloading || isSharing;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#111318] border border-primary/40 w-full max-w-sm rounded-3xl shadow-[0_0_60px_rgba(0,255,148,0.25)] overflow-hidden">

        {/* ── STICKER — captured by html2canvas at scale 4 ── */}
        <div className="flex justify-center pt-6 pb-4 px-5">
          <div ref={stickerRef} style={{ width: 300, lineHeight: 1 }}>
            <svg
              viewBox="0 0 600 700"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block", width: 300, height: 350 }}
            >
              {/* Background */}
              <rect width="600" height="700" rx="48" fill="#0a0a0f" fillOpacity="0.55"
                stroke="#00FF94" strokeWidth="1.2" strokeOpacity="0.15"/>

              {/* Trainova logo — barbell + ECG */}
              <g transform="translate(300, 76) scale(0.38)">
                <rect x="-108" y="-36" width="16" height="72" rx="5"
                  fill="#12121a" stroke="#00FF94" strokeWidth="4"/>
                <rect x="-88" y="-26" width="12" height="52" rx="4"
                  fill="#12121a" stroke="#00FF94" strokeWidth="4"/>
                <path d={ECG_PATH} fill="none" stroke="#00FF94"
                  strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="76" y="-26" width="12" height="52" rx="4"
                  fill="#12121a" stroke="#00FF94" strokeWidth="4"/>
                <rect x="92" y="-36" width="16" height="72" rx="5"
                  fill="#12121a" stroke="#00FF94" strokeWidth="4"/>
              </g>

              {/* Wordmark */}
              <text x="300" y="200" textAnchor="middle"
                fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
                fontSize="22" fontWeight="500" fill="#00FF94" letterSpacing="3.5">
                TRAINOVA
              </text>

              {/* Separator */}
              <line x1="160" y1="224" x2="440" y2="224" stroke="#1E1E2A" strokeWidth="1"/>

              {/* Flame — outer */}
              <path d="M276 274 C276 258 284 246 292 238 C286 246 284 256 284 262 C284 274 292 282 300 282 C308 282 316 274 316 262 C316 256 314 246 308 238 C316 246 324 258 324 274 C324 290 314 302 300 302 C286 302 276 290 276 274Z"
                fill="#F97316" opacity="0.9"/>
              {/* Flame — inner */}
              <path d="M288 278 C288 270 292 262 296 258 C294 264 294 268 294 272 C294 278 298 282 300 282 C302 282 306 278 306 272 C306 268 306 264 304 258 C308 262 312 270 312 278 C312 286 306 292 300 292 C294 292 288 286 288 278Z"
                fill="#FBBF24" opacity="0.85"/>

              {/* Days this week */}
              <text x="300" y="410" textAnchor="middle"
                fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
                fontSize="144" fontWeight="500" fill="#FAFAFA">
                {daysTrainedThisWeek}
              </text>
              <text x="300" y="456" textAnchor="middle"
                fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
                fontSize="28" fill="#A1A1AA" letterSpacing="2">
                dias esta semana
              </text>

              {/* Separator */}
              <line x1="120" y1="488" x2="480" y2="488" stroke="#1E1E2A" strokeWidth="1"/>

              {/* Week day squares */}
              {weekDays.map((day, i) => {
                const x = 87 + i * 62;
                return (
                  <g key={i}>
                    <rect x={x} y="512" width="52" height="52" rx="12"
                      fill={day.trained ? '#00FF94' : '#1E1E2A'}/>
                    <text x={x + 26} y="545" textAnchor="middle"
                      fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
                      fontSize="20" fontWeight={day.trained ? "500" : "400"}
                      fill={day.trained ? '#0a0a0f' : '#52525B'}>
                      {day.label}
                    </text>
                  </g>
                );
              })}

              {/* User name */}
              <text x="300" y="610" textAnchor="middle"
                fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
                fontSize="20" fill="#52525B" letterSpacing="1">
                {userName}
              </text>

              {/* App link */}
              <text x="300" y="640" textAnchor="middle"
                fontFamily="'SF Pro Display','Helvetica Neue',Arial,sans-serif"
                fontSize="18" fill="#3f3f46" letterSpacing="0.5">
                trainova.app
              </text>
            </svg>
          </div>
        </div>

        {/* ── Buttons — NOT captured ── */}
        <div className="px-6 pb-6 pt-0 flex flex-col gap-2">
          <button
            onClick={handleShare}
            disabled={busy}
            className="w-full bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white font-bold py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 shadow-[0_0_28px_rgba(225,48,108,0.45)] text-base"
          >
            {isSharing
              ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Gerando imagem...</>
              : <><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg> Compartilhar via Instagram</>}
          </button>
          <button
            onClick={handleDownload}
            disabled={busy}
            className="w-full bg-white/[0.06] border border-white/[0.10] text-white font-semibold py-2.5 rounded-2xl hover:bg-white/[0.10] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            {isDownloading ? "Gerando PNG..." : <><span className="text-base">⬇</span> Baixar Sticker (PNG transparente)</>}
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
        {/* Carga — input livre */}
        <div className="bg-background rounded-lg p-2 text-center">
          <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Carga (kg)</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            max="999"
            placeholder="0"
            value={ex.weight}
            onChange={(e) => onUpdate(wIdx, dIdx, exIdx, "weight", e.target.value)}
            onBlur={(e) => { if (!e.target.value) onUpdate(wIdx, dIdx, exIdx, "weight", "0"); }}
            className="w-full bg-transparent text-primary text-sm font-mono text-center focus:outline-none focus:text-primary"
          />
        </div>
        {/* Reps e Séries — select */}
        {[
          { label: "Reps", field: "reps" as keyof Exercise, opts: REP_OPTIONS },
          { label: "Séries", field: "sets" as keyof Exercise, opts: SET_OPTIONS },
        ].map(({ label, field, opts }) => (
          <div key={field} className="bg-background rounded-lg p-2 text-center">
            <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">{label}</p>
            <select className="w-full bg-transparent text-white text-sm font-mono text-center focus:outline-none appearance-none cursor-pointer"
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

// ─── Exercise Progress View ──────────────────────────────────────────────────

type ProgressMetric = "maxWeight" | "volume" | "bestSet";
type ProgressPeriod = "1m" | "3m" | "6m" | "1a" | "all";

const METRIC_LABELS: Record<ProgressMetric, string> = {
  maxWeight: "Carga máx.",
  volume: "Volume total",
  bestSet: "Melhor série",
};

const PERIOD_LABELS: Record<ProgressPeriod, string> = {
  "1m": "1m", "3m": "3m", "6m": "6m", "1a": "1a", "all": "Tudo",
};

function filterByPeriod(
  data: { date: string; maxWeight: number; volume: number; bestSet: number }[],
  period: ProgressPeriod
) {
  if (period === "all") return data;
  const months = { "1m": 1, "3m": 3, "6m": 6, "1a": 12 }[period];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return data.filter((d) => d.date >= cutoffStr);
}

const ExerciseProgressView: React.FC<{
  name: string;
  history: WeeklyWorkoutPlan[];
  onBack: () => void;
}> = ({ name, history, onBack }) => {
  const [metric, setMetric] = useState<ProgressMetric>("maxWeight");
  const [period, setPeriod] = useState<ProgressPeriod>("3m");

  const allSessions = history
    .flatMap((w) =>
      w.days.flatMap((d) => {
        const exs = d.exercises.filter(
          (ex) => ex.name.toLowerCase() === name.toLowerCase() && ex.weight
        );
        if (!exs.length) return [];
        const weights = exs.map((ex) => parseFloat(ex.weight) || 0);
        const repsArr = exs.map((ex) => parseInt(ex.reps) || 0);
        const setsArr = exs.map((ex) => parseInt(ex.sets) || 0);
        const maxWeight = Math.max(...weights);
        const volume = exs.reduce(
          (acc, ex, i) => acc + weights[i] * repsArr[i] * setsArr[i],
          0
        );
        const bestSet = exs.reduce(
          (acc, ex, i) => Math.max(acc, weights[i] * repsArr[i]),
          0
        );
        return [{ date: d.date, maxWeight, volume, bestSet }];
      })
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const filtered = filterByPeriod(allSessions, period);

  const chartData = filtered.map((s) => ({
    date: new Date(s.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    value: metric === "maxWeight" ? s.maxWeight : metric === "volume" ? s.volume : s.bestSet,
    raw: s,
  }));

  const unit = metric === "volume" ? "kg·rep" : "kg";
  const latest = filtered[filtered.length - 1];
  const prev = filtered[filtered.length - 2];
  const diff = latest && prev ? latest[metric] - prev[metric] : null;

  return (
    <div className="space-y-4 animate-fadeIn">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} /> Voltar
      </button>

      <div>
        <h3 className="text-lg font-bold text-white">{name}</h3>
        {latest && (
          <p className="text-xs text-gray-500 mt-0.5">
            Último registro:{" "}
            <span className="text-primary font-mono font-bold">
              {latest[metric].toLocaleString("pt-BR")}{unit}
            </span>
            {diff !== null && (
              <span className={`ml-2 font-bold ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                {diff >= 0 ? "+" : ""}{diff.toLocaleString("pt-BR")}{unit}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Metric toggle */}
      <div className="flex gap-1.5 flex-wrap">
        {(Object.keys(METRIC_LABELS) as ProgressMetric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              metric === m
                ? "bg-primary text-black"
                : "bg-surface border border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Period filter */}
      <div className="flex gap-1.5">
        {(Object.keys(PERIOD_LABELS) as ProgressPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
              period === p
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 ? (
        <div className="bg-surface border border-white/5 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF94" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#52525B", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#52525B", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                contentStyle={{ background: "#1a1a28", border: "1px solid #1E1E2A", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#A1A1AA" }}
                itemStyle={{ color: "#00FF94" }}
                formatter={(v: number) => [`${v.toLocaleString("pt-BR")}${unit}`, METRIC_LABELS[metric]]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#00FF94"
                strokeWidth={2}
                fill="url(#progressGradient)"
                dot={{ fill: "#00FF94", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#00FF94" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-surface border border-white/5 rounded-2xl p-8 text-center">
          <p className="text-gray-500 text-sm">Poucos dados no período selecionado.</p>
          <button onClick={() => setPeriod("all")} className="mt-2 text-xs text-primary hover:underline">
            Ver tudo
          </button>
        </div>
      )}

      {/* Session list */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">
          Histórico de sessões
        </p>
        {[...filtered].reverse().map((s, i) => (
          <div key={i} className="bg-surface border border-white/5 p-3 rounded-xl flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {new Date(s.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </p>
            <div className="flex gap-4 text-xs font-mono">
              <span className="text-primary font-bold">{s.maxWeight}kg</span>
              <span className="text-gray-400">vol {s.volume.toLocaleString("pt-BR")}kg</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  startDate, history, aiPlan, weeklyGoal, userName, onUpdateWeek, onUpdateAIPlan, onNavigateToChat, onStartWorkout,
}) => {
  const [activeTab, setActiveTab] = useState<"journal" | "ai">("journal");
  const [displayWeeks, setDisplayWeeks] = useState<WeeklyWorkoutPlan[]>([]);
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null);
  const [weekIndex, setWeekIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [importingDay, setImportingDay] = useState<AIWorkoutDisplay["days"][0] | null>(null);
  const [viewingExercise, setViewingExercise] = useState<{ name: string; obs?: string } | null>(null);
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null);
  const [showGoalPopup, setShowGoalPopup] = useState(false);
  const [debriefDay, setDebriefDay] = useState<{ dayName: string; wIdx: number; dIdx: number } | null>(null);
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

  const updateDayNotes = useCallback((wIdx: number, dIdx: number, notes: string) => {
    setDisplayWeeks((prev) => {
      const next = prev.map((w, wi) => {
        if (wi !== wIdx) return w;
        const days = w.days.map((d, di) => di === dIdx ? { ...d, notes } : d);
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
          dayName={debriefDay.dayName}
          onClose={() => setDebriefDay(null)}
          onSendToChat={(text) => {
            onNavigateToChat?.(text);
            setDebriefDay(null);
          }}
          onSave={(text) => {
            updateDayNotes(debriefDay.wIdx, debriefDay.dIdx, text);
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

            {/* ── Exercise search ── */}
            <div className="relative">
              <Dumbbell size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Buscar exercício no histórico..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedExercise(null); }}
                className="w-full bg-surface border border-white/5 rounded-2xl py-3.5 pl-11 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/30 transition-all" />
              {searchTerm && <button onClick={() => { setSearchTerm(""); setSelectedExercise(null); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={16} /></button>}
            </div>

            {/* ── Instagram share banner ── */}
            {weekSummary && !searchTerm && !selectedExercise && (
              <button
                onClick={() => setShowGoalPopup(true)}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl text-white font-medium text-sm active:scale-[0.98] transition-transform"
                style={{ background: "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5"/>
                  <circle cx="12" cy="12" r="5"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
                Compartilhar progresso da semana
              </button>
            )}

            {/* ── Exercise progress chart ── */}
            {selectedExercise ? (
              <ExerciseProgressView
                name={selectedExercise}
                history={displayWeeks}
                onBack={() => { setSelectedExercise(null); setSearchTerm(""); }}
              />
            ) : searchTerm.length > 2 ? (() => {
              // Collect unique exercise names matching search
              const uniqueNames = Array.from(new Set(
                displayWeeks.flatMap((w) => w.days.flatMap((d) =>
                  d.exercises
                    .filter((ex) => ex.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((ex) => ex.name)
                ))
              ));
              return (
                <div className="space-y-2 animate-fadeIn">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">
                    Exercícios encontrados
                  </p>
                  {uniqueNames.length > 0 ? (
                    uniqueNames.map((name) => {
                      const sessions = getExerciseHistory(name);
                      const latest = sessions[0];
                      return (
                        <button
                          key={name}
                          onClick={() => { setSelectedExercise(name); setSearchTerm(name); }}
                          className="w-full bg-surface border border-white/5 hover:border-primary/30 p-4 rounded-2xl flex items-center justify-between transition-all group"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{name}</p>
                            {latest && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {sessions.length} sessão{sessions.length !== 1 ? "ões" : ""} · último: {latest.weight || "0"}kg
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-gray-600 group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-center py-10 text-gray-500 text-sm">Nenhum registro para "{searchTerm}"</p>
                  )}
                </div>
              );
            })() : (() => {
              // ── Week selector + 7-day accordion ──
              const currentWeek = displayWeeks[weekIndex];
              if (!currentWeek) return null;
              const wIdx = weekIndex;
              const daysWithEx = currentWeek.days.filter((d) => d.exercises.length > 0).length;
              const goalMet = daysWithEx >= weeklyGoal;

              return (
                <div className="space-y-3 animate-fadeIn">
                  {/* Week selector */}
                  <div className="flex items-center justify-between bg-surface border border-white/5 rounded-2xl px-4 py-3">
                    <button
                      onClick={() => { setWeekIndex((i) => Math.min(i + 1, displayWeeks.length - 1)); setExpandedDayIndex(null); }}
                      disabled={weekIndex >= displayWeeks.length - 1}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-sm font-bold text-white">
                          Semana {currentWeek.weekNumber} · {currentWeek.year}
                        </p>
                        {goalMet && <Crown size={13} className="text-primary" />}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(currentWeek.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        {" – "}
                        {new Date(currentWeek.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        <span className="ml-2 text-primary font-bold">{daysWithEx} dia{daysWithEx !== 1 ? "s" : ""}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => { setWeekIndex((i) => Math.max(i - 1, 0)); setExpandedDayIndex(null); }}
                      disabled={weekIndex <= 0}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* 7-day accordion */}
                  <div className="space-y-2">
                    {currentWeek.days.map((day, dIdx) => {
                      const isDayExpanded = expandedDayIndex === dIdx;
                      const hasEx = day.exercises.length > 0;
                      const isWeekend = day.dayName === "Sábado" || day.dayName === "Domingo";
                      const isToday = day.date === todayStr;
                      return (
                        <div key={day.date} className={`rounded-xl border transition-all ${isDayExpanded ? "border-primary/30 bg-background" : "border-white/5 bg-surface"}`}>
                          <button
                            onClick={() => setExpandedDayIndex(isDayExpanded ? null : dIdx)}
                            className="w-full flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                hasEx ? "bg-primary text-black" : isToday ? "border border-primary/40 text-primary" : "bg-white/5 text-gray-600"
                              }`}>
                                {hasEx ? <Check size={14} /> : <Dumbbell size={13} />}
                              </div>
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <p className={`font-semibold text-sm ${isToday ? "text-primary" : isWeekend ? "text-gray-400" : "text-white"}`}>
                                    {day.dayName}
                                  </p>
                                  {isToday && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">HOJE</span>}
                                  {day.notes && <span className="text-[9px] text-gray-500" title={day.notes}>📝</span>}
                                </div>
                                <p className="text-[10px] text-gray-500">
                                  {new Date(day.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                  {hasEx && <span className="text-primary ml-1 font-bold">· {day.exercises.length} exercício{day.exercises.length !== 1 ? "s" : ""}</span>}
                                </p>
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
                                    onClick={() => setDebriefDay({ dayName: day.dayName, wIdx, dIdx })}
                                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-primary transition-colors"
                                  >
                                    <Zap size={11} /> Debrief{day.notes ? " ✏️" : ""}
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
                              {day.notes && (
                                <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-xl animate-fadeIn">
                                  <p className="text-[10px] uppercase tracking-wider text-primary/60 font-bold mb-1">📝 Debrief</p>
                                  <p className="text-xs text-gray-300 leading-relaxed">{day.notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
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
