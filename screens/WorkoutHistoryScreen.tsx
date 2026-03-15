import React, { useState, useMemo } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Award } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useWorkoutHistory, useExerciseProgress } from '../hooks/useWorkoutQueries';
import type { FinishedWorkout } from '../types';

interface Props {
  onBack: () => void;
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function buildHeatmap(workouts: FinishedWorkout[]) {
  const byDate: Record<string, number> = {};
  workouts.forEach((w) => {
    const d = w.startedAt?.split('T')[0];
    if (!d) return;
    byDate[d] = (byDate[d] ?? 0) + (w.totalVolume ?? 0);
  });

  // Build 5 weeks × 7 days grid ending today
  const today = new Date();
  const cells: { date: string; volume: number }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    cells.push({ date: key, volume: byDate[key] ?? 0 });
  }
  return cells;
}

function heatColor(volume: number, max: number) {
  if (volume === 0 || max === 0) return '#1E1E2A';
  const ratio = Math.min(volume / max, 1);
  if (ratio < 0.25) return '#003d22';
  if (ratio < 0.5) return '#007a44';
  if (ratio < 0.75) return '#00bb66';
  return '#00FF94';
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────────

function DaySheet({
  date,
  workouts,
  onClose,
}: {
  date: string;
  workouts: FinishedWorkout[];
  onClose: () => void;
}) {
  const dayWorkouts = workouts.filter((w) => w.startedAt?.startsWith(date));
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-[#12121a] border-t border-[#1E1E2A] rounded-t-3xl p-5 max-h-[60vh] overflow-y-auto animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#1E1E2A] rounded-full mx-auto mb-4" />
        <p className="text-white font-bold mb-3">
          {new Date(date + 'T12:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
        </p>
        {dayWorkouts.length === 0 ? (
          <p className="text-[#A1A1AA] text-sm">Nenhum treino neste dia.</p>
        ) : (
          dayWorkouts.map((w) => (
            <div key={w.id} className="bg-[#1a1a28] rounded-xl p-3 mb-2">
              <p className="text-white font-semibold text-sm">{w.templateName ?? 'Treino livre'}</p>
              <p className="text-[#A1A1AA] text-xs mt-1">
                {w.durationMinutes}min · {(w.totalVolume ?? 0).toLocaleString('pt-BR')}kg volume ·{' '}
                {w.totalSets} séries
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Workout Card ─────────────────────────────────────────────────────────────

function WorkoutCard({ workout }: { workout: FinishedWorkout }) {
  const [expanded, setExpanded] = useState(false);
  const hasPR = false; // PRs are stored separately; badge shown as placeholder

  return (
    <div className="bg-[#12121a] border border-[#1E1E2A] rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm">
              {workout.templateName ?? 'Treino livre'}
            </p>
            {hasPR && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                <Award size={10} /> PR
              </span>
            )}
          </div>
          <p className="text-[#A1A1AA] text-xs mt-0.5">
            {new Date(workout.startedAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · {workout.durationMinutes}min
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-primary font-bold text-sm">
              {(workout.totalVolume ?? 0).toLocaleString('pt-BR')} kg
            </p>
            <p className="text-[#52525B] text-xs">{workout.totalSets} séries</p>
          </div>
          {expanded ? (
            <ChevronDown size={16} className="text-primary" />
          ) : (
            <ChevronRight size={16} className="text-[#52525B]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-[#1E1E2A]">
          {(workout.exercises ?? []).map((ex) => (
            <div key={ex.id} className="flex justify-between text-xs py-1">
              <span className="text-white">{ex.exerciseName}</span>
              <span className="text-[#A1A1AA]">
                {ex.sets.filter((s) => s.completed).length} séries completadas
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Exercise Progress Chart ───────────────────────────────────────────────────

const PERIODS: { label: string; months: number }[] = [
  { label: '1m', months: 1 },
  { label: '3m', months: 3 },
  { label: '6m', months: 6 },
];

function ExerciseChart({
  exerciseId,
  period,
}: {
  exerciseId: string;
  period: number;
}) {
  const { data, isLoading } = useExerciseProgress(exerciseId);

  const filtered = useMemo(() => {
    if (!data) return [];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - period);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return data.filter((p) => p.date >= cutoffStr);
  }, [data, period]);

  if (isLoading) {
    return (
      <div className="h-40 flex items-center justify-center text-[#A1A1AA] text-sm">
        Carregando...
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="h-40 flex items-center justify-center text-[#52525B] text-sm">
        Sem dados no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={filtered} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#A1A1AA', fontSize: 10 }}
          tickFormatter={(v) => {
            const d = new Date(v + 'T12:00');
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
        />
        <YAxis tick={{ fill: '#A1A1AA', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#12121a', border: '1px solid #1E1E2A', borderRadius: 8 }}
          labelStyle={{ color: '#A1A1AA', fontSize: 11 }}
          itemStyle={{ color: '#00FF94' }}
          formatter={(v: number) => [`${v} kg`, 'Máx']}
        />
        <Line
          type="monotone"
          dataKey="maxWeight"
          stroke="#00FF94"
          strokeWidth={2}
          dot={{ fill: '#00FF94', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutHistoryScreen({ onBack }: Props) {
  const { data: workouts = [], isLoading } = useWorkoutHistory(100);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [period, setPeriod] = useState(3);

  const cells = useMemo(() => buildHeatmap(workouts), [workouts]);
  const maxVol = useMemo(
    () => Math.max(...cells.map((c) => c.volume), 1),
    [cells]
  );

  // Collect unique exercises from all workouts for dropdown
  const exercises = useMemo(() => {
    const map = new Map<string, string>();
    workouts.forEach((w) =>
      (w.exercises ?? []).forEach((ex) => {
        if (!map.has(ex.exerciseId)) map.set(ex.exerciseId, ex.exerciseName);
      })
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [workouts]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] overflow-hidden">
      {/* Header */}
      <div className="bg-[#12121a] border-b border-[#1E1E2A] px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-[#1a1a28] text-[#A1A1AA] hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-bold text-lg">Histórico</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Heatmap */}
        <section>
          <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-3">
            Últimas 5 semanas
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
              <p key={d} className="text-center text-[9px] text-[#52525B] pb-1">
                {d}
              </p>
            ))}
            {cells.map((cell) => (
              <button
                key={cell.date}
                title={cell.date}
                className="aspect-square rounded-md transition-transform hover:scale-110"
                style={{ backgroundColor: heatColor(cell.volume, maxVol) }}
                onClick={() => setSelectedDate(cell.date)}
              />
            ))}
          </div>
        </section>

        {/* Workout list */}
        <section>
          <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-3">
            Treinos ({workouts.length})
          </p>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[#12121a] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <p className="text-[#52525B] text-sm text-center py-8">
              Nenhum treino registrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {workouts.map((w) => (
                <WorkoutCard key={w.id} workout={w} />
              ))}
            </div>
          )}
        </section>

        {/* Exercise progress */}
        {exercises.length > 0 && (
          <section>
            <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-3">
              Evolução por exercício
            </p>
            <div className="bg-[#12121a] border border-[#1E1E2A] rounded-2xl p-4 space-y-4">
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="w-full bg-[#1a1a28] border border-[#1E1E2A] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="">Selecionar exercício...</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>

              {selectedExerciseId && (
                <>
                  <div className="flex gap-2">
                    {PERIODS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setPeriod(p.months)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          period === p.months
                            ? 'bg-primary text-black'
                            : 'bg-[#1a1a28] text-[#A1A1AA] border border-[#1E1E2A]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <ExerciseChart exerciseId={selectedExerciseId} period={period} />
                </>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Bottom sheet for heatmap tap */}
      {selectedDate && (
        <DaySheet
          date={selectedDate}
          workouts={workouts}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
