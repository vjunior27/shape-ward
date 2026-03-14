import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, X, Check, ChevronDown, ChevronUp, Clock, Zap,
  Layers, Minus, SkipForward, Timer, Trophy, Smile
} from 'lucide-react';
import { useWorkoutStore } from '../stores/useWorkoutStore';
import { useStreakStore } from '../stores/useStreakStore';
import { useUserStore } from '../stores/useUserStore';
import { useSaveWorkout } from '../hooks/useWorkoutQueries';
import { checkAndSavePersonalRecord } from '../services/workoutService';
import type { WorkoutTemplate, PersonalRecord } from '../types';
import ExerciseSelector from '../components/ExerciseSelector';

interface Props {
  onClose: () => void;
}

const MOOD_EMOJIS: Record<number, string> = { 1: '😫', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' };
const MUSCLE_ICONS: Record<string, string> = {
  chest: '🫁', back: '🔙', shoulders: '🦾', biceps: '💪', triceps: '💪',
  core: '🎯', quads: '🦵', hamstrings: '🦵', glutes: '🍑', calves: '🦵',
  full_body: '⚡', cardio: '❤️', forearms: '💪',
};

// ─── Rest Timer Overlay ────────────────────────────────────────────────────────

function RestTimerOverlay() {
  const { isResting, restTimeRemaining, restTimeTotal, stopRest, startRest } = useWorkoutStore();

  useEffect(() => {
    if (!isResting) return;
    const id = setInterval(() => useWorkoutStore.getState().tickRest(), 1000);
    return () => clearInterval(id);
  }, [isResting]);

  useEffect(() => {
    if (isResting && restTimeRemaining === 0) {
      try { navigator.vibrate?.([200, 100, 200]); } catch {}
    }
  }, [isResting, restTimeRemaining]);

  if (!isResting) return null;

  const pct = restTimeTotal > 0 ? (restTimeRemaining / restTimeTotal) * 100 : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">Descansando</p>
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={r} fill="none"
              stroke={restTimeRemaining <= 5 ? '#ef4444' : '#22c55e'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <span className="text-4xl font-mono font-bold text-white tabular-nums">
            {restTimeRemaining}s
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => startRest(restTimeRemaining + 30)}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700"
          >
            +30s
          </button>
          <button
            onClick={stopRest}
            className="px-6 py-2 bg-primary text-black rounded-xl text-sm font-bold hover:bg-primaryDark flex items-center gap-2"
          >
            <SkipForward size={14} /> Pular
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Set Row ───────────────────────────────────────────────────────────────────

interface SetRowProps {
  setData: ReturnType<typeof useWorkoutStore.getState>['activeWorkout'] extends null
    ? never
    : ReturnType<typeof useWorkoutStore.getState>['activeWorkout']['exercises'][0]['sets'][0];
  setNumber: number;
  exerciseId: string;
  onComplete: () => void;
}

function SetRow({ setData, setNumber, exerciseId, onComplete }: SetRowProps) {
  const { updateSet, removeSet } = useWorkoutStore();

  const handleComplete = () => {
    if (!setData.completed && (setData.reps === 0 || setData.weight === 0)) return;
    updateSet(exerciseId, setData.id, {
      completed: !setData.completed,
      completedAt: !setData.completed ? new Date().toISOString() : undefined,
    });
    if (!setData.completed) {
      try { navigator.vibrate?.(50); } catch {}
      onComplete();
    }
  };

  return (
    <div className={`flex items-center gap-2 py-2 px-2 rounded-xl transition-colors ${setData.completed ? 'bg-primary/10' : 'bg-gray-800/50'}`}>
      <span className="text-gray-500 text-xs font-mono w-5 text-center">{setNumber}</span>

      {/* Weight */}
      <div className="flex items-center bg-gray-800 rounded-lg flex-1">
        <button
          className="px-2 py-2 text-gray-400 hover:text-white"
          onClick={() => updateSet(exerciseId, setData.id, { weight: Math.max(0, setData.weight - 2.5) })}
        ><Minus size={12} /></button>
        <input
          type="number" inputMode="decimal"
          value={setData.weight || ''}
          onChange={(e) => updateSet(exerciseId, setData.id, { weight: parseFloat(e.target.value) || 0 })}
          className="w-12 bg-transparent text-white text-center text-sm font-mono tabular-nums focus:outline-none"
          placeholder="0"
        />
        <button
          className="px-2 py-2 text-gray-400 hover:text-white"
          onClick={() => updateSet(exerciseId, setData.id, { weight: setData.weight + 2.5 })}
        ><Plus size={12} /></button>
      </div>

      <span className="text-gray-600 text-xs">kg</span>

      {/* Reps */}
      <div className="flex items-center bg-gray-800 rounded-lg flex-1">
        <button
          className="px-2 py-2 text-gray-400 hover:text-white"
          onClick={() => updateSet(exerciseId, setData.id, { reps: Math.max(0, setData.reps - 1) })}
        ><Minus size={12} /></button>
        <input
          type="number" inputMode="numeric"
          value={setData.reps || ''}
          onChange={(e) => updateSet(exerciseId, setData.id, { reps: parseInt(e.target.value) || 0 })}
          className="w-10 bg-transparent text-white text-center text-sm font-mono tabular-nums focus:outline-none"
          placeholder="0"
        />
        <button
          className="px-2 py-2 text-gray-400 hover:text-white"
          onClick={() => updateSet(exerciseId, setData.id, { reps: setData.reps + 1 })}
        ><Plus size={12} /></button>
      </div>

      <span className="text-gray-600 text-xs">rep</span>

      {/* Complete */}
      <button
        onClick={handleComplete}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          setData.completed
            ? 'bg-primary text-black'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
      >
        <Check size={16} />
      </button>

      {/* Remove */}
      <button
        onClick={() => removeSet(exerciseId, setData.id)}
        className="text-gray-700 hover:text-red-400 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Exercise Card ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: NonNullable<ReturnType<typeof useWorkoutStore.getState>['activeWorkout']>['exercises'][0] }) {
  const { addSet, removeExercise, startRest } = useWorkoutStore();
  const [collapsed, setCollapsed] = useState(false);

  const completedSets = exercise.sets.filter((s) => s.completed).length;

  const handleSetComplete = () => {
    startRest(exercise.restSeconds);
  };

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <span className="text-xl">{MUSCLE_ICONS[exercise.muscleGroup] ?? '💪'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{exercise.exerciseName}</p>
          <p className="text-gray-500 text-xs">{completedSets}/{exercise.sets.length} séries</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed((c) => !c)} className="text-gray-500 hover:text-white p-1">
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={() => {
              if (confirm(`Remover "${exercise.exerciseName}"?`)) removeExercise(exercise.id);
            }}
            className="text-gray-700 hover:text-red-400 p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-1">
          {/* Column labels */}
          <div className="flex items-center gap-2 px-2 mb-1">
            <span className="text-gray-600 text-xs w-5 text-center">#</span>
            <span className="text-gray-600 text-xs flex-1 text-center">Peso (kg)</span>
            <span className="text-gray-600 text-xs w-4" />
            <span className="text-gray-600 text-xs flex-1 text-center">Reps</span>
            <span className="text-gray-600 text-xs w-4" />
            <span className="text-gray-600 text-xs w-9 text-center">✓</span>
            <span className="text-gray-600 text-xs w-4" />
          </div>

          {exercise.sets.map((s, i) => (
            <SetRow
              key={s.id}
              setData={s}
              setNumber={i + 1}
              exerciseId={exercise.id}
              onComplete={handleSetComplete}
            />
          ))}

          <button
            onClick={() => addSet(exercise.id)}
            className="w-full py-2 text-gray-500 hover:text-primary text-xs flex items-center justify-center gap-1 transition-colors"
          >
            <Plus size={12} /> Adicionar série
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Finish Modal ──────────────────────────────────────────────────────────────

interface FinishModalProps {
  onSave: (mood: 1 | 2 | 3 | 4 | 5) => void;
  onCancel: () => void;
  duration: number;
  volume: number;
  sets: number;
  prs: PersonalRecord[];
}

function FinishModal({ onSave, onCancel, duration, volume, sets, prs }: FinishModalProps) {
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(4);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-3xl w-full max-w-sm p-6 space-y-5">
        <h3 className="text-xl font-bold text-white text-center">🎯 Treino Finalizado!</h3>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Duração', value: `${duration}min`, icon: <Clock size={16} /> },
            { label: 'Volume', value: `${volume.toLocaleString('pt-BR')}kg`, icon: <Layers size={16} /> },
            { label: 'Séries', value: sets.toString(), icon: <Zap size={16} /> },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-primary flex justify-center mb-1">{s.icon}</div>
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* PRs */}
        {prs.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
            <p className="text-yellow-400 font-bold text-sm mb-2 flex items-center gap-1">
              <Trophy size={14} /> {prs.length} Novo{prs.length > 1 ? 's' : ''} Record{prs.length > 1 ? 'es' : ''}!
            </p>
            {prs.map((pr) => (
              <p key={pr.id} className="text-yellow-300 text-xs">
                {pr.exerciseName}: {pr.value}kg {pr.previousValue ? `(antes: ${pr.previousValue}kg)` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Mood */}
        <div>
          <p className="text-gray-400 text-sm text-center mb-3 flex items-center justify-center gap-1">
            <Smile size={14} /> Como foi o treino?
          </p>
          <div className="flex justify-center gap-3">
            {([1, 2, 3, 4, 5] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`text-2xl p-1 rounded-lg transition-all ${mood === m ? 'bg-primary/20 scale-125' : 'opacity-50'}`}
              >
                {MOOD_EMOJIS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl font-medium text-sm">
            Cancelar
          </button>
          <button onClick={() => onSave(mood)} className="flex-1 py-3 bg-primary text-black rounded-xl font-bold text-sm">
            Salvar Treino
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ActiveWorkoutScreen({ onClose }: Props) {
  const {
    activeWorkout, startWorkout, cancelWorkout, finishWorkout, setMood,
    getTotalVolume, getTotalSetsCompleted, getElapsedMinutes,
  } = useWorkoutStore();
  const { recordStreak, addXP } = useStreakStore();
  const user = useUserStore((s) => s.user);
  const saveWorkout = useSaveWorkout();

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-start if no active workout
  useEffect(() => {
    if (!activeWorkout && user) {
      startWorkout(user.uid);
    }
  }, [user]);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsedMin(getElapsedMinutes()), 30000);
    setElapsedMin(getElapsedMinutes());
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  const handleShowFinish = useCallback(async () => {
    if (!activeWorkout || !user) return;

    // Check PRs
    const newPRs: PersonalRecord[] = [];
    for (const ex of activeWorkout.exercises) {
      const completedSets = ex.sets.filter((s) => s.completed);
      if (!completedSets.length) continue;
      const best = completedSets.reduce((b, s) => (s.weight > b.weight ? s : b));
      const pr = await checkAndSavePersonalRecord(
        user.uid, ex.exerciseId, ex.exerciseName,
        best.weight, best.reps, activeWorkout.id
      );
      if (pr) newPRs.push(pr);
    }
    setPRs(newPRs);
    setShowFinishModal(true);
  }, [activeWorkout, user]);

  const handleSave = async (mood: 1 | 2 | 3 | 4 | 5) => {
    setMood(mood);
    setIsSaving(true);
    try {
      const finished = finishWorkout();
      if (finished) {
        await saveWorkout.mutateAsync({ ...finished, mood });
        recordStreak();
        addXP(100 + prs.length * 200); // 100 XP + 200 per PR
      }
    } catch (err) {
      console.error('Failed to save workout:', err);
    } finally {
      setIsSaving(false);
      setShowFinishModal(false);
      onClose();
    }
  };

  if (!activeWorkout) return null;

  const volume = getTotalVolume();
  const setsCompleted = getTotalSetsCompleted();
  const elapsed = elapsedMin;

  const formatElapsed = (min: number) => {
    if (min < 60) return `${min}min`;
    return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ''}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Fixed header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => {
              if (confirm('Cancelar treino? O progresso será perdido.')) {
                cancelWorkout();
                onClose();
              }
            }}
            className="text-gray-500 hover:text-red-400 p-1"
          >
            <X size={20} />
          </button>
          <h2 className="text-white font-bold text-sm">
            {activeWorkout.templateName ?? 'Treino Livre'}
          </h2>
          <button
            onClick={handleShowFinish}
            disabled={setsCompleted === 0}
            className="bg-primary text-black text-sm font-bold px-4 py-1.5 rounded-xl disabled:opacity-40"
          >
            Finalizar
          </button>
        </div>

        {/* Stats row */}
        <div className="flex justify-around text-center">
          {[
            { icon: <Clock size={12} />, value: formatElapsed(elapsed), label: 'Tempo' },
            { icon: <Layers size={12} />, value: `${volume.toLocaleString('pt-BR')}kg`, label: 'Volume' },
            { icon: <Zap size={12} />, value: setsCompleted.toString(), label: 'Séries' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <span className="text-primary">{s.icon}</span>
              <span className="text-white text-xs font-mono tabular-nums font-bold">{s.value}</span>
              <span className="text-gray-600 text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {activeWorkout.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">🏋️</span>
            <p className="text-gray-400 text-sm">Nenhum exercício adicionado</p>
            <p className="text-gray-600 text-xs mt-1">Toque em + para adicionar</p>
          </div>
        ) : (
          activeWorkout.exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))
        )}
      </div>

      {/* FAB - Add exercise */}
      <div className="fixed bottom-20 right-4 z-20">
        <button
          onClick={() => setShowExerciseSelector(true)}
          className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus size={24} className="text-black" />
        </button>
      </div>

      {/* Modals & overlays */}
      <RestTimerOverlay />

      {showExerciseSelector && (
        <ExerciseSelector
          onSelect={(ex) => {
            useWorkoutStore.getState().addExercise({
              exerciseId: ex.id,
              exerciseName: ex.name,
              muscleGroup: ex.muscleGroup,
              restSeconds: 90,
            });
            setShowExerciseSelector(false);
          }}
          onClose={() => setShowExerciseSelector(false)}
        />
      )}

      {showFinishModal && (
        <FinishModal
          onSave={handleSave}
          onCancel={() => setShowFinishModal(false)}
          duration={elapsed}
          volume={volume}
          sets={setsCompleted}
          prs={prs}
        />
      )}

      {isSaving && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
          <div className="text-white text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Salvando treino...</p>
          </div>
        </div>
      )}
    </div>
  );
}
