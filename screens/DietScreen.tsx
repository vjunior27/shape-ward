import React, { useState } from 'react';
import { WeeklyDietPlan, DailyDiet, DietMeal, NutritionMeal } from '../types';
import { Check, Plus, Trash2, Utensils, BrainCircuit, History, ChevronDown, ChevronRight, Calendar, Clock, Edit2, Flame, X, Search } from 'lucide-react';
import WaterTracker from '../components/WaterTracker';
import { useNutritionStore } from '../stores/useNutritionStore';
import { useDailyNutrition, useSearchFoods, useSaveMeal } from '../hooks/useNutritionQueries';
import { useUserStore } from '../stores/useUserStore';

interface DietScreenProps {
  dietHistory: WeeklyDietPlan[];
  onUpdateDietDay: (id: 'current' | 'last', day: DailyDiet) => void;
}

// ─── Macro ring ───────────────────────────────────────────────────────────────

function MacroRing({
  label,
  consumed,
  goal,
  unit,
}: {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
}) {
  const pct = Math.min((consumed / Math.max(goal, 1)) * 100, 100);
  const R = 28;
  const circ = 2 * Math.PI * R;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={R} fill="none" stroke="#1E1E2A" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            stroke="#00FF94"
            strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-xs leading-none">{Math.round(consumed)}</span>
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
  mealType,
  userId,
  date,
  onClose,
}: {
  mealType: NutritionMeal['type'];
  userId: string;
  date: string;
  onClose: () => void;
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
      entries: [
        {
          id: crypto.randomUUID(),
          foodItemId: food.id,
          foodName: food.name,
          quantity: food.servingSize,
          servingUnit: food.servingUnit,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        },
      ],
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
          <button onClick={onClose} className="p-1 text-[#A1A1AA] hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alimento..."
            autoFocus
            className="w-full bg-[#1a1a28] border border-[#1E1E2A] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isFetching && (
            <p className="text-[#A1A1AA] text-sm text-center py-4">Buscando...</p>
          )}
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
                <p className="text-[#52525B] text-xs">
                  {food.servingSize}{food.servingUnit} · P:{food.protein}g · C:{food.carbs}g · G:{food.fat}g
                </p>
              </div>
              <p className="text-primary font-bold text-sm shrink-0 ml-3">{food.calories} kcal</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Hoje Tab ─────────────────────────────────────────────────────────────────

function HojeTab() {
  const { goals, waterToday, addWater } = useNutritionStore();
  const userId = useUserStore((s) => s.user?.uid) ?? '';

  const [dateOffset, setDateOffset] = useState(0);
  const [addingMealType, setAddingMealType] = useState<NutritionMeal['type'] | null>(null);

  const targetDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split('T')[0];
  })();

  const { data: dailyNutrition } = useDailyNutrition(targetDate);

  const totals = dailyNutrition?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };

  const dateLabel = (() => {
    const d = new Date(targetDate + 'T12:00');
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  })();

  const MEAL_SECTIONS: { type: NutritionMeal['type']; label: string }[] = [
    { type: 'breakfast', label: 'Café da Manhã' },
    { type: 'lunch', label: 'Almoço' },
    { type: 'dinner', label: 'Jantar' },
    { type: 'snack', label: 'Lanche' },
  ];

  const mealsOfType = (type: NutritionMeal['type']) =>
    (dailyNutrition?.meals ?? []).filter((m) => m.type === type);

  return (
    <div className="space-y-4">
      {/* Date header */}
      <div className="flex items-center justify-between bg-surface rounded-2xl px-4 py-3 border border-[#1E1E2A]">
        <button
          onClick={() => setDateOffset((o) => o - 1)}
          className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white transition-colors"
        >
          ‹
        </button>
        <p className="text-white font-semibold text-sm">{dateLabel}</p>
        <button
          onClick={() => setDateOffset((o) => Math.min(o + 1, 0))}
          disabled={dateOffset >= 0}
          className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white transition-colors disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* Macro rings */}
      <div className="bg-surface rounded-2xl border border-[#1E1E2A] p-4">
        <div className="grid grid-cols-4 gap-2">
          <MacroRing label="Calorias" consumed={totals.calories} goal={goals.calories} unit="kcal" />
          <MacroRing label="Proteína" consumed={totals.protein} goal={goals.protein} unit="g" />
          <MacroRing label="Carbos" consumed={totals.carbs} goal={goals.carbs} unit="g" />
          <MacroRing label="Gordura" consumed={totals.fat} goal={goals.fat} unit="g" />
        </div>
      </div>

      {/* Water tracker */}
      <WaterTracker current={waterToday} goal={goals.water} onAdd={addWater} />

      {/* Meals sections */}
      {MEAL_SECTIONS.map(({ type, label }) => {
        const meals = mealsOfType(type);
        const sectionCals = meals.reduce((s, m) => s + m.totalCalories, 0);

        return (
          <div key={type} className="bg-surface rounded-2xl border border-[#1E1E2A] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2A]">
              <p className="text-white font-semibold text-sm">{label}</p>
              {sectionCals > 0 && (
                <p className="text-primary text-xs font-bold">{sectionCals} kcal</p>
              )}
            </div>

            {meals.length > 0 ? (
              <div className="divide-y divide-[#1E1E2A]">
                {meals.map((meal) =>
                  meal.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-white text-sm">{entry.foodName}</p>
                        <p className="text-[#52525B] text-xs">
                          {entry.quantity}{entry.servingUnit} · P:{Math.round(entry.protein)}g
                        </p>
                      </div>
                      <p className="text-[#A1A1AA] text-sm font-medium shrink-0 ml-3">
                        {Math.round(entry.calories)} kcal
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            <button
              onClick={() => setAddingMealType(type)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[#A1A1AA] hover:text-primary transition-colors"
            >
              <Plus size={13} /> Adicionar
            </button>
          </div>
        );
      })}

      {/* Add food modal */}
      {addingMealType && userId && (
        <AddFoodModal
          mealType={addingMealType}
          userId={userId}
          date={targetDate}
          onClose={() => setAddingMealType(null)}
        />
      )}
    </div>
  );
}

// ─── AI Plan Tab (existing DietScreen content) ────────────────────────────────

function PlanoTab({
  dietHistory,
  onUpdateDietDay,
}: {
  dietHistory: WeeklyDietPlan[];
  onUpdateDietDay: (id: 'current' | 'last', day: DailyDiet) => void;
}) {
  const [activeTab, setActiveTab] = useState<'current' | 'last'>('current');
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(new Date().getDay());

  const activePlan = dietHistory.find((d) => d.id === activeTab);
  const days = activePlan?.days || [];

  const toggleDay = (index: number) => {
    setExpandedDayIndex(expandedDayIndex === index ? null : index);
  };

  const updateMealHeader = (dayIndex: number, mealIndex: number, field: 'name' | 'time', value: string) => {
    const day = days[dayIndex];
    const newMeals = [...day.meals];
    if (newMeals[mealIndex]) {
      (newMeals[mealIndex] as any)[field] = value;
      onUpdateDietDay(activeTab, { ...day, meals: newMeals });
    }
  };

  const toggleItem = (dayIndex: number, mealIndex: number, itemIndex: number) => {
    const day = days[dayIndex];
    const newMeals = [...day.meals];
    newMeals[mealIndex].items[itemIndex].isConsumed = !newMeals[mealIndex].items[itemIndex].isConsumed;
    onUpdateDietDay(activeTab, { ...day, meals: newMeals });
  };

  const updateItem = (dayIndex: number, mealIndex: number, itemIndex: number, field: 'name' | 'quantity' | 'calories', value: string) => {
    const day = days[dayIndex];
    const newMeals = [...day.meals];
    const item = newMeals[mealIndex].items[itemIndex];
    if (item) {
      if (field === 'calories') {
        item.calories = value === '' ? undefined : Number(value);
      } else {
        (item as any)[field] = value;
      }
      onUpdateDietDay(activeTab, { ...day, meals: newMeals });
    }
  };

  const calculateMealCalories = (meal: DietMeal): number =>
    meal.items.reduce((sum, item) => sum + (item.calories ?? 0), 0);

  const calculateDayCalories = (meals: DietMeal[]): number =>
    meals.reduce((sum, meal) => sum + calculateMealCalories(meal), 0);

  const calculateWeeklyAvgCalories = (): number => {
    const daysWithData = days.filter((d) => calculateDayCalories(d.meals) > 0);
    if (daysWithData.length === 0) return 0;
    const total = daysWithData.reduce((s, d) => s + calculateDayCalories(d.meals), 0);
    return Math.round(total / daysWithData.length);
  };

  const removeItem = (dayIndex: number, mealIndex: number, itemIndex: number) => {
    const day = days[dayIndex];
    const newMeals = [...day.meals];
    newMeals[mealIndex].items.splice(itemIndex, 1);
    onUpdateDietDay(activeTab, { ...day, meals: newMeals });
  };

  const addItem = (dayIndex: number, mealIndex: number) => {
    const day = days[dayIndex];
    const newMeals = [...day.meals];
    newMeals[mealIndex].items.push({
      id: Date.now().toString(),
      name: '',
      quantity: '',
      isConsumed: false,
    });
    onUpdateDietDay(activeTab, { ...day, meals: newMeals });
  };

  const calculateProgress = (meals: DietMeal[]) => {
    let total = 0;
    let consumed = 0;
    meals.forEach((m) =>
      m.items.forEach((i) => {
        total++;
        if (i.isConsumed) consumed++;
      })
    );
    return total === 0 ? 0 : (consumed / total) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab: Esta Semana / Semana Passada */}
      <div className="flex gap-4 border-b border-white/5 pb-0">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'current' ? 'border-primary text-white' : 'border-transparent text-gray-500'}`}
        >
          Esta Semana
        </button>
        <button
          onClick={() => setActiveTab('last')}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'last' ? 'border-primary text-white' : 'border-transparent text-gray-500'}`}
        >
          Semana Passada
        </button>
      </div>

      {calculateWeeklyAvgCalories() > 0 && (
        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 w-fit ml-auto">
          <Flame size={14} className="text-primary" />
          <div className="text-right">
            <p className="text-primary font-bold text-sm leading-none">{calculateWeeklyAvgCalories().toLocaleString('pt-BR')}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wide">kcal/dia</p>
          </div>
        </div>
      )}

      {days.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="bg-white/5 p-6 rounded-full mb-4">
            {activeTab === 'current' ? <BrainCircuit size={32} className="text-gray-500" /> : <History size={32} className="text-gray-500" />}
          </div>
          <p className="text-gray-400 font-medium">Nenhum registro para {activeTab === 'current' ? 'esta semana' : 'a semana passada'}.</p>
          {activeTab === 'current' && <p className="text-xs text-primary mt-2">Peça ao Coach para gerar sua dieta.</p>}
        </div>
      ) : (
        days.map((day, dayIndex) => {
          const isExpanded = expandedDayIndex === dayIndex;
          const progress = calculateProgress(day.meals);
          const isToday = new Date().toISOString().split('T')[0] === day.date;

          return (
            <div key={day.date} className={`bg-surface rounded-xl border transition-all ${isExpanded ? 'border-primary/50' : 'border-white/5'}`}>
              <button onClick={() => toggleDay(dayIndex)} className="w-full flex flex-col p-4">
                <div className="w-full flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isToday ? 'bg-primary text-black' : 'bg-white/5 text-gray-400'}`}>
                      <Calendar size={18} />
                    </div>
                    <div className="text-left">
                      <h3 className={`font-bold ${isToday ? 'text-primary' : 'text-white'}`}>{day.dayName}</h3>
                      <span className="text-[10px] text-gray-500">{day.date.split('-').reverse().slice(0, 2).join('/')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {calculateDayCalories(day.meals) > 0 && (
                      <span className="text-xs font-bold text-primary">{calculateDayCalories(day.meals)} kcal</span>
                    )}
                    <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                    {isExpanded ? <ChevronDown size={18} className="text-primary" /> : <ChevronRight size={18} className="text-gray-500" />}
                  </div>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primaryDark transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="p-2 space-y-4 bg-[#121212] border-t border-white/5 animate-fadeIn">
                  {day.meals.map((meal, mIdx) => (
                    <div key={meal.id} className="bg-surface/50 rounded-lg p-3 group">
                      <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-wider bg-primary/10 px-2 py-1 rounded">
                            <Clock size={10} />
                            <input
                              disabled={activeTab === 'last'}
                              value={meal.time}
                              onChange={(e) => updateMealHeader(dayIndex, mIdx, 'time', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-primary/50 focus:outline-none w-10 text-center text-primary"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              disabled={activeTab === 'last'}
                              value={meal.name}
                              onChange={(e) => updateMealHeader(dayIndex, mIdx, 'name', e.target.value)}
                              className="bg-transparent text-sm font-bold text-white border-b border-transparent focus:border-white/20 focus:outline-none w-full px-1"
                              placeholder="Nome da Refeição"
                            />
                          </div>
                          {calculateMealCalories(meal) > 0 && (
                            <span className="text-[10px] font-bold text-primary/80 whitespace-nowrap">{calculateMealCalories(meal)} kcal</span>
                          )}
                          {activeTab === 'current' && <Edit2 size={12} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                      </div>

                      <div className="space-y-1">
                        {meal.items.map((item, iIdx) => (
                          <div key={item.id} className={`flex items-center gap-2 p-2 rounded transition-all ${item.isConsumed ? 'opacity-50' : ''}`}>
                            <button
                              onClick={() => toggleItem(dayIndex, mIdx, iIdx)}
                              disabled={activeTab === 'last'}
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${item.isConsumed ? 'bg-primary border-primary text-black' : 'border-gray-600 hover:border-primary'}`}
                            >
                              {item.isConsumed && <Check size={12} strokeWidth={3} />}
                            </button>

                            <div className="flex-1 grid grid-cols-4 gap-1">
                              <input
                                disabled={activeTab === 'last'}
                                className={`bg-transparent col-span-2 text-sm focus:outline-none border-b border-transparent focus:border-white/20 ${item.isConsumed ? 'line-through text-gray-500' : 'text-gray-200'}`}
                                value={item.name}
                                onChange={(e) => updateItem(dayIndex, mIdx, iIdx, 'name', e.target.value)}
                                placeholder="Alimento"
                              />
                              <input
                                disabled={activeTab === 'last'}
                                className={`bg-transparent text-center text-sm focus:outline-none border-b border-transparent focus:border-white/20 ${item.isConsumed ? 'text-gray-600' : 'text-gray-300'}`}
                                value={item.quantity}
                                onChange={(e) => updateItem(dayIndex, mIdx, iIdx, 'quantity', e.target.value)}
                                placeholder="Qtd"
                              />
                              <span className={`text-right text-xs self-center font-semibold ${item.calories ? (item.isConsumed ? 'text-gray-600' : 'text-primary/80') : 'text-gray-700'}`}>
                                {item.calories ? `${item.calories} kcal` : '—'}
                              </span>
                            </div>

                            {activeTab === 'current' && (
                              <button onClick={() => removeItem(dayIndex, mIdx, iIdx)} className="text-gray-600 hover:text-red-500 p-1">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}

                        {activeTab === 'current' && (
                          <button
                            onClick={() => addItem(dayIndex, mIdx)}
                            className="w-full mt-2 py-1 text-[10px] border border-dashed border-white/10 rounded text-gray-500 hover:text-primary hover:border-primary/30 flex items-center justify-center gap-1 transition-colors"
                          >
                            <Plus size={12} /> Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Main DietScreen ──────────────────────────────────────────────────────────

export const DietScreen: React.FC<DietScreenProps> = ({ dietHistory, onUpdateDietDay }) => {
  const [activeTab, setActiveTab] = useState<'hoje' | 'plano'>('hoje');

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
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
            onClick={() => setActiveTab('hoje')}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'hoje' ? 'border-primary text-white' : 'border-transparent text-gray-500'}`}
          >
            Hoje
          </button>
          <button
            onClick={() => setActiveTab('plano')}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'plano' ? 'border-primary text-white' : 'border-transparent text-gray-500'}`}
          >
            Plano da IA
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'hoje' ? (
          <HojeTab />
        ) : (
          <PlanoTab dietHistory={dietHistory} onUpdateDietDay={onUpdateDietDay} />
        )}
      </div>
    </div>
  );
};
