import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WeeklyDietPlan, DailyDiet, DietMeal, NutritionMeal } from '../types';
import {
  Check, Plus, Trash2, Utensils, Clock, X,
  Search, Droplets, Pencil, Undo2, ChevronLeft, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { useNutritionStore } from '../stores/useNutritionStore';
import { useStreakStore, XP_VALUES } from '../stores/useStreakStore';
import { useDailyNutrition, useSearchFoods, useSaveMeal } from '../hooks/useNutritionQueries';
import { useUserStore } from '../stores/useUserStore';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip,
} from 'recharts';

interface DietScreenProps {
  dietHistory: WeeklyDietPlan[];
  onUpdateDietDay: (id: 'current' | 'last', day: DailyDiet) => void;
}

// ─── Macro ring ───────────────────────────────────────────────────────────────

function MacroRing({
  label, consumed, goal, unit,
}: {
  label: string; consumed: number; goal: number; unit: string;
}) {
  const rawPct = goal > 0 ? (consumed / goal) * 100 : 0;
  const pct = Math.min(rawPct, 100);
  const exceeded = rawPct > 100;
  const R = 28;
  const circ = 2 * Math.PI * R;
  const offset = circ - (pct / 100) * circ;
  const color = exceeded ? '#EF4444' : '#00FF94';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={R} fill="none" stroke="#1E1E2A" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={R} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-xs leading-none ${exceeded ? 'text-red-400' : 'text-white'}`}>
            {Math.round(consumed)}
          </span>
          <span className="text-[#A1A1AA] text-[9px]">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-white text-xs font-semibold">{label}</p>
        <p className="text-[#52525B] text-[10px]">/{goal}{unit}</p>
      </div>
    </div>
  );
}

// ─── Add Food Modal ───────────────────────────────────────────────────────────

function AddFoodModal({
  mealType, userId, date, onClose,
}: {
  mealType: NutritionMeal['type']; userId: string; date: string; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const { data: results = [], isFetching } = useSearchFoods(query);
  const saveMeal = useSaveMeal();

  const handleAdd = (food: typeof results[number]) => {
    const meal: NutritionMeal = {
      id: crypto.randomUUID(),
      userId,
      date,
      type: mealType,
      entries: [{
        id: crypto.randomUUID(),
        foodItemId: food.id,
        foodName: food.name,
        quantity: food.servingSize,
        servingUnit: food.servingUnit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      }],
      totalCalories: food.calories,
      totalProtein: food.protein,
      totalCarbs: food.carbs,
      totalFat: food.fat,
      createdAt: new Date().toISOString(),
    };
    saveMeal.mutate(meal, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-[#12121a] border-t border-[#1E1E2A] rounded-t-3xl p-5 max-h-[75vh] flex flex-col animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#1E1E2A] rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">Adicionar alimento</h3>
          <button onClick={onClose} className="p-1 text-[#A1A1AA] hover:text-white"><X size={18} /></button>
        </div>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alimento..." autoFocus
            className="w-full bg-[#1a1a28] border border-[#1E1E2A] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-primary/40"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {isFetching && <p className="text-[#A1A1AA] text-sm text-center py-4">Buscando...</p>}
          {!isFetching && query.length >= 2 && results.length === 0 && (
            <p className="text-[#52525B] text-sm text-center py-4">Nenhum resultado para "{query}"</p>
          )}
          {results.map((food) => (
            <button
              key={food.id}
              onClick={() => handleAdd(food)}
              className="w-full flex items-center justify-between bg-[#1a1a28] border border-[#1E1E2A] rounded-xl p-3 hover:border-primary/30 transition-colors text-left"
            >
              <div>
                <p className="text-white text-sm font-medium">{food.name}</p>
                <p className="text-[#52525B] text-xs">{food.servingSize}{food.servingUnit} · P:{food.protein}g · C:{food.carbs}g · G:{food.fat}g</p>
              </div>
              <p className="text-primary font-bold text-sm shrink-0 ml-3">{food.calories} kcal</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Goal Editor Modal ────────────────────────────────────────────────────────

function GoalEditorModal({
  current, onSave, onClose,
}: {
  current: number; onSave: (ml: number) => void; onClose: () => void;
}) {
  const [value, setValue] = useState(current);
  const weight = useUserStore((s) => s.user?.displayName) ?? '';
  const suggestion = 35 * 70; // default 70kg suggestion

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-[#12121a] border-t border-[#1E1E2A] rounded-t-3xl p-6 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#1E1E2A] rounded-full mx-auto mb-5" />
        <h3 className="text-white font-bold text-lg mb-1">Meta de Hidratação</h3>
        <p className="text-[#A1A1AA] text-xs mb-5">
          Recomendação: 35ml × peso corporal/dia
          {suggestion > 0 && ` ≈ ${(suggestion / 1000).toFixed(1)}L para 70kg`}
        </p>

        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="text-4xl font-bold text-primary">
            {(value / 1000).toFixed(1)}
          </span>
          <span className="text-xl text-[#A1A1AA]">L</span>
        </div>

        <input
          type="range"
          min={500}
          max={6000}
          step={250}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full accent-primary mb-2"
        />
        <div className="flex justify-between text-xs text-[#52525B] mb-6">
          <span>500ml</span>
          <span>6L</span>
        </div>

        {/* Quick presets */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000].map((ml) => (
            <button
              key={ml}
              onClick={() => setValue(ml)}
              className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                value === ml
                  ? 'bg-primary text-black'
                  : 'bg-[#1a1a28] border border-[#1E1E2A] text-[#A1A1AA] hover:border-primary/40'
              }`}
            >
              {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
            </button>
          ))}
        </div>

        <button
          onClick={() => { onSave(value); onClose(); }}
          className="w-full bg-primary text-black font-bold py-4 rounded-2xl hover:bg-primaryDark transition-all"
        >
          Salvar Meta
        </button>
      </div>
    </div>
  );
}

// ─── Custom amount modal ──────────────────────────────────────────────────────

function CustomAmountModal({
  onAdd, onClose,
}: {
  onAdd: (ml: number) => void; onClose: () => void;
}) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const ml = parseInt(value, 10);
    if (ml > 0) { onAdd(ml); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-[#12121a] border-t border-[#1E1E2A] rounded-t-3xl p-6 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#1E1E2A] rounded-full mx-auto mb-5" />
        <h3 className="text-white font-bold text-lg mb-4">Quantidade personalizada</h3>
        <div className="relative mb-4">
          <input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ex: 350"
            autoFocus
            className="w-full bg-[#1a1a28] border border-[#1E1E2A] rounded-xl px-4 py-3 text-white text-lg placeholder-[#52525B] focus:outline-none focus:border-primary/40 pr-16"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA]">ml</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!value || parseInt(value) <= 0}
          className="w-full bg-primary text-black font-bold py-4 rounded-2xl hover:bg-primaryDark transition-all disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

// ─── Undo Toast ───────────────────────────────────────────────────────────────

function UndoToast({ ml, onUndo, onDismiss }: { ml: number; onUndo: () => void; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const duration = 5000;
    const tick = 100;
    const decrement = (tick / duration) * 100;
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p <= 0) { onDismiss(); return 0; }
        return p - decrement;
      });
    }, tick);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [onDismiss]);

  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}ml`;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-fadeIn">
      <div className="bg-[#1a1a28] border border-[#1E1E2A] rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-blue-400" />
            <span className="text-white text-sm font-medium">+{fmt(ml)} adicionado</span>
          </div>
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 text-primary text-sm font-bold hover:text-primaryDark transition-colors"
          >
            <Undo2 size={14} />
            Desfazer
          </button>
        </div>
        <div className="h-0.5 bg-[#1E1E2A]">
          <div
            className="h-full bg-primary transition-none rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Hidra Tab ────────────────────────────────────────────────────────────────

function HidraTab() {
  const { goals, waterToday, waterEntries, waterHistory, addWater, removeWaterEntry, setGoals, resetWaterIfNewDay } =
    useNutritionStore();
  const { addXP, recordWaterGoalHit } = useStreakStore();

  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [undoEntry, setUndoEntry] = useState<{ id: string; ml: number } | null>(null);
  const goalMetRef = useRef(false);

  useEffect(() => { resetWaterIfNewDay(); }, []);

  const goalMl = goals.water;
  const pct = Math.min((waterToday / goalMl) * 100, 100);
  const goalHit = waterToday >= goalMl;

  // Award XP once when goal is first hit
  useEffect(() => {
    if (goalHit && !goalMetRef.current) {
      goalMetRef.current = true;
      addXP(XP_VALUES.WATER_GOAL_HIT);
      recordWaterGoalHit();
    }
    if (!goalHit) goalMetRef.current = false;
  }, [goalHit]);

  const fmt = (ml: number) =>
    ml >= 1000
      ? `${(ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L`
      : `${ml}ml`;

  const handleAdd = (ml: number) => {
    const id = addWater(ml);
    setUndoEntry({ id, ml });
  };

  const handleUndo = () => {
    if (undoEntry) {
      removeWaterEntry(undoEntry.id);
      setUndoEntry(null);
    }
  };

  // Weekly chart data — last 7 days
  const weekData = (() => {
    const days: { label: string; ml: number; met: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const ml = waterHistory[dateStr] ?? 0;
      const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      days.push({ label: labels[d.getDay()], ml, met: ml >= goalMl });
    }
    return days;
  })();

  // Today's entries
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = waterEntries.filter((e) => e.date === today);

  const timeLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Hero water drop */}
      <div className={`bg-surface rounded-3xl border p-6 flex flex-col items-center transition-all ${goalHit ? 'border-primary/40 shadow-[0_0_30px_rgba(0,255,148,0.12)]' : 'border-[#1E1E2A]'}`}>
        {/* Large SVG water drop */}
        <div className="relative w-36 h-36 mb-4">
          <svg viewBox="0 0 144 144" className="w-full h-full" aria-hidden>
            <defs>
              <clipPath id="drop-clip">
                <path d="M72 8 C72 8 20 68 20 96 C20 124 44 136 72 136 C100 136 124 124 124 96 C124 68 72 8 72 8 Z" />
              </clipPath>
              <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={goalHit ? '#00FF94' : '#60a5fa'} stopOpacity="0.9" />
                <stop offset="100%" stopColor={goalHit ? '#00cc76' : '#3b82f6'} stopOpacity="0.7" />
              </linearGradient>
            </defs>
            {/* Drop outline */}
            <path
              d="M72 8 C72 8 20 68 20 96 C20 124 44 136 72 136 C100 136 124 124 124 96 C124 68 72 8 72 8 Z"
              fill="none"
              stroke={goalHit ? '#00FF94' : '#1E3A5F'}
              strokeWidth="2"
            />
            {/* Fill background */}
            <path
              d="M72 8 C72 8 20 68 20 96 C20 124 44 136 72 136 C100 136 124 124 124 96 C124 68 72 8 72 8 Z"
              fill="#0a0a14"
            />
            {/* Animated fill */}
            <g clipPath="url(#drop-clip)">
              <rect
                x="0"
                y={144 - (144 * pct) / 100}
                width="144"
                height="144"
                fill="url(#water-grad)"
                className="transition-all duration-700 ease-out"
              />
              {/* Wave effect */}
              {pct > 0 && pct < 100 && (
                <path
                  d={`M-20 ${144 - (144 * pct) / 100} Q16 ${144 - (144 * pct) / 100 - 6} 52 ${144 - (144 * pct) / 100} T124 ${144 - (144 * pct) / 100} T196 ${144 - (144 * pct) / 100} V144 H-20 Z`}
                  fill="url(#water-grad)"
                  className="transition-all duration-700"
                />
              )}
            </g>
          </svg>
          {/* Percentage text inside drop */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold leading-none ${goalHit ? 'text-black' : 'text-white'}`}>
              {Math.round(pct)}%
            </span>
            {goalHit && <span className="text-black text-lg mt-1">✓</span>}
          </div>
        </div>

        {/* Numbers */}
        <p className="text-3xl font-bold text-white leading-none mb-1">{fmt(waterToday)}</p>
        <div className="flex items-center gap-2">
          <p className="text-[#A1A1AA] text-sm">de {fmt(goalMl)}</p>
          <button
            onClick={() => setShowGoalEditor(true)}
            className="p-1 text-[#52525B] hover:text-primary transition-colors"
            aria-label="Editar meta"
          >
            <Pencil size={12} />
          </button>
        </div>

        {goalHit && (
          <div className="mt-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
            <p className="text-primary text-sm font-semibold text-center">🎉 Meta diária atingida! +{XP_VALUES.WATER_GOAL_HIT} XP</p>
          </div>
        )}

        {/* Quick add buttons */}
        <div className="grid grid-cols-4 gap-2 mt-5 w-full">
          {[
            { label: '+250ml', ml: 250 },
            { label: '+500ml', ml: 500 },
            { label: '+1L',    ml: 1000 },
          ].map(({ label, ml }) => (
            <button
              key={label}
              onClick={() => handleAdd(ml)}
              className="flex-1 py-3 text-sm font-semibold rounded-2xl bg-[#1a1a28] border border-[#1E1E2A] text-[#A1A1AA] hover:border-primary/40 hover:text-primary transition-colors"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            className="flex-1 py-3 text-sm font-semibold rounded-2xl bg-[#1a1a28] border border-[#1E1E2A] text-[#A1A1AA] hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center"
            aria-label="Outro"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="bg-surface rounded-2xl border border-[#1E1E2A] p-4">
        <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wide mb-3">Últimos 7 dias</p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={weekData} barCategoryGap="30%">
            <XAxis dataKey="label" tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, Math.max(goalMl * 1.1, 1000)]} />
            <Tooltip
              contentStyle={{ background: '#12121a', border: '1px solid #1E1E2A', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#A1A1AA' }}
              formatter={(v: number) => [v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}ml`, 'Água']}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="ml" radius={[4, 4, 0, 0]}>
              {weekData.map((entry, i) => (
                <Cell key={i} fill={entry.met ? '#00FF94' : '#1E3A5F'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <div className="bg-surface rounded-2xl border border-[#1E1E2A] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E1E2A]">
            <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wide">Hoje</p>
          </div>
          <div className="divide-y divide-[#1E1E2A]">
            {todayEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Droplets size={14} className="text-blue-400 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">{fmt(entry.ml)}</p>
                    <p className="text-[#52525B] text-xs">{timeLabel(entry.time)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeWaterEntry(entry.id)}
                  className="p-1.5 text-[#52525B] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showGoalEditor && (
        <GoalEditorModal
          current={goalMl}
          onSave={(ml) => setGoals({ water: ml })}
          onClose={() => setShowGoalEditor(false)}
        />
      )}
      {showCustom && (
        <CustomAmountModal
          onAdd={handleAdd}
          onClose={() => setShowCustom(false)}
        />
      )}
      {undoEntry && (
        <UndoToast
          ml={undoEntry.ml}
          onUndo={handleUndo}
          onDismiss={() => setUndoEntry(null)}
        />
      )}
    </div>
  );
}

// ─── Nutri Tab ────────────────────────────────────────────────────────────────

function NutriTab({
  dietHistory,
  onUpdateDietDay,
}: {
  dietHistory: WeeklyDietPlan[];
  onUpdateDietDay: (id: 'current' | 'last', day: DailyDiet) => void;
}) {
  const { goals } = useNutritionStore();
  const userId = useUserStore((s) => s.user?.uid) ?? '';

  const MIN_OFFSET = -13; // 14 days including today
  const [dateOffset, setDateOffset] = useState(0);
  const [showAddFood, setShowAddFood] = useState(false);

  const targetDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split('T')[0];
  })();

  const { data: dailyNutrition } = useDailyNutrition(targetDate);
  const manualTotals = dailyNutrition?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };

  const dateLabel = (() => {
    const d = new Date(targetDate + 'T12:00');
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  })();

  // Find AI plan day that matches the selected date
  const aiPlanEntry = dietHistory
    .flatMap((p) => p.days.map((day) => ({ planId: p.id as 'current' | 'last', day })))
    .find((e) => e.day.date === targetDate);
  const aiDay = aiPlanEntry?.day ?? null;
  const aiPlanId = aiPlanEntry?.planId ?? 'current';

  // Consumed from checked AI plan items (updates in real-time as user checks/unchecks)
  const aiConsumed = useMemo(() => {
    if (!aiDay) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const checked = aiDay.meals.flatMap((m) => m.items).filter((i) => i.isConsumed);
    return {
      calories: checked.reduce((s, i) => s + (Number(i.calories) || 0), 0),
      protein:  checked.reduce((s, i) => s + (Number(i.protein)  || 0), 0),
      carbs:    checked.reduce((s, i) => s + (Number(i.carbs)    || 0), 0),
      fat:      checked.reduce((s, i) => s + (Number(i.fat)      || 0), 0),
    };
  }, [aiDay]);

  // Goals from AI plan totals (all items, regardless of isConsumed), fallback to store defaults
  const aiGoals = useMemo(() => {
    if (!aiDay) return null;
    const all = aiDay.meals.flatMap((m) => m.items);
    if (!all.length) return null;
    return {
      calories: Math.round(all.reduce((s, i) => s + (Number(i.calories) || 0), 0)),
      protein:  Math.round(all.reduce((s, i) => s + (Number(i.protein)  || 0), 0)),
      carbs:    Math.round(all.reduce((s, i) => s + (Number(i.carbs)    || 0), 0)),
      fat:      Math.round(all.reduce((s, i) => s + (Number(i.fat)      || 0), 0)),
    };
  }, [aiDay]);

  const ringGoals = aiGoals ?? goals;

  // Combined: AI checked items + manually logged meals
  const consumedTotals = {
    calories: aiConsumed.calories + manualTotals.calories,
    protein:  aiConsumed.protein  + manualTotals.protein,
    carbs:    aiConsumed.carbs    + manualTotals.carbs,
    fat:      aiConsumed.fat      + manualTotals.fat,
  };

  const toggleAiItem = (mealId: string, itemIdx: number) => {
    if (!aiDay) return;
    const newMeals = aiDay.meals.map((m) => {
      if (m.id !== mealId) return m;
      return {
        ...m,
        items: m.items.map((item, j) =>
          j === itemIdx ? { ...item, isConsumed: !item.isConsumed } : item
        ),
      };
    });
    onUpdateDietDay(aiPlanId, { ...aiDay, meals: newMeals });
  };

  // All manual entries regardless of type
  const allManualEntries = dailyNutrition?.meals ?? [];

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="flex items-center justify-between bg-surface rounded-2xl px-4 py-3 border border-[#1E1E2A]">
        <button
          onClick={() => setDateOffset((o) => Math.max(o - 1, MIN_OFFSET))}
          disabled={dateOffset <= MIN_OFFSET}
          className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-white font-semibold text-sm">{dateLabel}</p>
        <button
          onClick={() => setDateOffset((o) => Math.min(o + 1, 0))}
          disabled={dateOffset >= 0}
          className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>

      {/* Macro rings */}
      <div className="bg-surface rounded-2xl border border-[#1E1E2A] p-4">
        <div className="grid grid-cols-4 gap-2">
          <MacroRing label="Calorias" consumed={consumedTotals.calories} goal={ringGoals.calories} unit="kcal" />
          <MacroRing label="Proteína" consumed={consumedTotals.protein}  goal={ringGoals.protein}  unit="g"    />
          <MacroRing label="Carbos"   consumed={consumedTotals.carbs}    goal={ringGoals.carbs}    unit="g"    />
          <MacroRing label="Gordura"  consumed={consumedTotals.fat}      goal={ringGoals.fat}      unit="g"    />
        </div>
      </div>

      {/* AI plan meals — rendered dynamically as the TitanAI defined them */}
      {aiDay ? (
        aiDay.meals.map((meal) => {
          const mealCals = meal.items.reduce((s, i) => s + (i.calories ?? 0), 0);
          return (
            <div key={meal.id} className="bg-surface rounded-2xl border border-[#1E1E2A] overflow-hidden">
              {/* Meal header: name + time defined by TitanAI */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2A]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1">
                    <Clock size={10} className="text-primary" />
                    <span className="text-primary text-[11px] font-bold">{meal.time}</span>
                  </div>
                  <p className="text-white font-semibold text-sm">{meal.name}</p>
                </div>
                {mealCals > 0 && <p className="text-primary text-xs font-bold shrink-0">{mealCals} kcal</p>}
              </div>

              {/* Items */}
              <div className="divide-y divide-[#1E1E2A]">
                {meal.items.map((item, iIdx) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-opacity ${item.isConsumed ? 'opacity-40' : ''}`}
                  >
                    <button
                      onClick={() => toggleAiItem(meal.id, iIdx)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        item.isConsumed ? 'bg-primary border-primary text-black' : 'border-[#52525B] hover:border-primary'
                      }`}
                    >
                      {item.isConsumed && <Check size={10} strokeWidth={3} />}
                    </button>
                    <span className={`flex-1 text-sm ${item.isConsumed ? 'line-through text-[#52525B]' : 'text-white'}`}>
                      {item.name}
                    </span>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#52525B]">{item.quantity}</p>
                      {(item.protein != null || item.carbs != null || item.fat != null) && (
                        <p className="text-[10px] text-[#3f3f46]">
                          {item.protein != null ? `P:${item.protein}g ` : ''}
                          {item.carbs != null ? `C:${item.carbs}g ` : ''}
                          {item.fat != null ? `G:${item.fat}g` : ''}
                        </p>
                      )}
                    </div>
                    {item.calories != null && (
                      <span className={`text-xs font-semibold shrink-0 ${item.isConsumed ? 'text-[#3f3f46]' : 'text-primary/70'}`}>
                        {item.calories} kcal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        /* No AI plan for this day */
        <div className="bg-surface rounded-2xl border border-[#1E1E2A] flex flex-col items-center py-10 px-6 text-center gap-2">
          <Utensils size={28} className="text-[#3f3f46]" />
          <p className="text-[#A1A1AA] text-sm font-medium">Nenhum plano gerado para este dia</p>
          <p className="text-[#52525B] text-xs">Peça ao TitanAI para montar sua dieta personalizada no chat.</p>
        </div>
      )}

      {/* Manual food entries (always shown, if any) */}
      {allManualEntries.length > 0 && (
        <div className="bg-surface rounded-2xl border border-[#1E1E2A] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E1E2A]">
            <p className="text-white font-semibold text-sm">Registros manuais</p>
          </div>
          <div className="divide-y divide-[#1E1E2A]">
            {allManualEntries.map((meal) =>
              meal.entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-white text-sm">{entry.foodName}</p>
                    <p className="text-[#52525B] text-xs">{entry.quantity}{entry.servingUnit} · P:{Math.round(entry.protein)}g</p>
                  </div>
                  <p className="text-[#A1A1AA] text-sm font-medium shrink-0 ml-3">{Math.round(entry.calories)} kcal</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add food button */}
      {userId && (
        <button
          onClick={() => setShowAddFood(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface border border-[#1E1E2A] text-sm text-[#A1A1AA] hover:text-primary hover:border-primary/30 transition-colors"
        >
          <Plus size={15} /> Registrar alimento
        </button>
      )}

      {showAddFood && userId && (
        <AddFoodModal
          mealType="snack"
          userId={userId}
          date={targetDate}
          onClose={() => setShowAddFood(false)}
        />
      )}
    </div>
  );
}

// ─── Main DietScreen ──────────────────────────────────────────────────────────

export const DietScreen: React.FC<DietScreenProps> = ({ dietHistory, onUpdateDietDay }) => {
  const [activeTab, setActiveTab] = useState<'hidra' | 'nutri'>('hidra');

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="p-4 bg-surface border-b border-white/5 pb-0">
        <div className="flex items-center gap-3 border-l-4 border-primary pl-4 mb-4">
          <Utensils className="text-primary" />
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-wide">Nutrição</h2>
            <p className="text-gray-400 text-xs">Acompanhamento nutricional</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('hidra')}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'hidra' ? 'border-primary text-white' : 'border-transparent text-gray-500'}`}
          >
            <Droplets size={14} />
            Hidra
          </button>
          <button
            onClick={() => setActiveTab('nutri')}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'nutri' ? 'border-primary text-white' : 'border-transparent text-gray-500'}`}
          >
            <Utensils size={14} />
            Nutri
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'hidra' ? (
          <HidraTab />
        ) : (
          <NutriTab dietHistory={dietHistory} onUpdateDietDay={onUpdateDietDay} />
        )}
      </div>
    </div>
  );
};
