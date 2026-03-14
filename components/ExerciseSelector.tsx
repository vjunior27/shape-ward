import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Star } from 'lucide-react';
import type { ExerciseCatalog, MuscleGroup } from '../types';

// Load from the existing exercise-db.json via gifService pattern
async function loadExercises(): Promise<ExerciseCatalog[]> {
  try {
    const res = await fetch('/exercise-db.json');
    const raw: any[] = await res.json();
    return raw.map((item, i) => ({
      id: item.id ?? `ex_${i}`,
      name: item.name ?? item.exercise_name ?? item.exerciseName ?? 'Exercício',
      muscleGroup: mapMuscleGroup(item.bodyPart ?? item.muscle_group ?? ''),
      equipment: item.equipment ?? 'other',
      gifUrl: item.gifUrl ?? item.gif_url ?? undefined,
      instructions: Array.isArray(item.instructions) ? item.instructions.join(' ') : item.instructions,
      isCustom: false,
    }));
  } catch {
    return [];
  }
}

function mapMuscleGroup(raw: string): MuscleGroup {
  const map: Record<string, MuscleGroup> = {
    chest: 'chest', pectorals: 'chest',
    back: 'back', lats: 'back', 'upper back': 'back',
    shoulders: 'shoulders', delts: 'shoulders',
    biceps: 'biceps', triceps: 'triceps', forearms: 'forearms',
    'upper arms': 'biceps', 'lower arms': 'forearms',
    abs: 'core', waist: 'core', core: 'core',
    quads: 'quads', quadriceps: 'quads', 'upper legs': 'quads',
    hamstrings: 'hamstrings', glutes: 'glutes',
    calves: 'calves', 'lower legs': 'calves',
    cardio: 'cardio',
  };
  return map[raw.toLowerCase()] ?? 'full_body';
}

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peito', back: 'Costas', shoulders: 'Ombros',
  biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraço',
  core: 'Core', quads: 'Quadríceps', hamstrings: 'Posterior',
  glutes: 'Glúteos', calves: 'Panturrilha',
  full_body: 'Corpo todo', cardio: 'Cardio',
};

const MUSCLE_GROUPS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

interface Props {
  onSelect: (exercise: ExerciseCatalog) => void;
  onClose: () => void;
}

export default function ExerciseSelector({ onSelect, onClose }: Props) {
  const [exercises, setExercises] = useState<ExerciseCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<MuscleGroup | null>(null);
  const [recents, setRecents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sw_recent_exercises') ?? '[]'); } catch { return []; }
  });

  useEffect(() => {
    loadExercises().then((list) => { setExercises(list); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = exercises;
    if (filterGroup) list = list.filter((e) => e.muscleGroup === filterGroup);
    if (search.trim()) {
      const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      list = list.filter((e) =>
        e.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      );
    }
    return list.slice(0, 80); // cap for performance
  }, [exercises, search, filterGroup]);

  const recentExercises = useMemo(
    () => recents.map((id) => exercises.find((e) => e.id === id)).filter(Boolean) as ExerciseCatalog[],
    [recents, exercises]
  );

  const handleSelect = (ex: ExerciseCatalog) => {
    const updated = [ex.id, ...recents.filter((id) => id !== ex.id)].slice(0, 5);
    setRecents(updated);
    localStorage.setItem('sw_recent_exercises', JSON.stringify(updated));
    onSelect(ex);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <X size={20} />
        </button>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text" autoFocus
            placeholder="Buscar exercício..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Muscle group filter */}
      <div className="px-4 py-2 overflow-x-auto">
        <div className="flex gap-2 whitespace-nowrap">
          <button
            onClick={() => setFilterGroup(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !filterGroup ? 'bg-primary text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGroup(filterGroup === g ? null : g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterGroup === g ? 'bg-primary text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {MUSCLE_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Recents */}
            {!search && !filterGroup && recentExercises.length > 0 && (
              <div className="px-4 py-2">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-2">Recentes</p>
                {recentExercises.map((ex) => (
                  <ExerciseRow key={ex.id} exercise={ex} onSelect={handleSelect} showRecent />
                ))}
              </div>
            )}

            {/* Results */}
            <div className="px-4 py-2">
              {!search && !filterGroup && recentExercises.length > 0 && (
                <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-2">
                  Todos ({exercises.length})
                </p>
              )}
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">Nenhum exercício encontrado</p>
                </div>
              ) : (
                filtered.map((ex) => (
                  <ExerciseRow key={ex.id} exercise={ex} onSelect={handleSelect} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ExerciseRow({
  exercise, onSelect, showRecent = false,
}: {
  exercise: ExerciseCatalog;
  onSelect: (e: ExerciseCatalog) => void;
  showRecent?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(exercise)}
      className="w-full flex items-center gap-3 py-3 border-b border-gray-800/50 text-left hover:bg-gray-900 rounded-xl px-2 -mx-2 transition-colors"
    >
      {exercise.gifUrl ? (
        <img src={exercise.gifUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-800" loading="lazy" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg">
          💪
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate capitalize">{exercise.name}</p>
        <p className="text-gray-500 text-xs">{MUSCLE_LABELS[exercise.muscleGroup]}</p>
      </div>
      {showRecent && <Star size={12} className="text-yellow-500 shrink-0" />}
    </button>
  );
}
