import React, { useState } from 'react';
import { WeeklyDietPlan, DailyDiet, DietMeal } from '../types';
import { Check, Plus, Trash2, Utensils, BrainCircuit, History, ChevronDown, ChevronRight, Calendar, Clock, Edit2, Flame } from 'lucide-react';

interface DietScreenProps {
  dietHistory: WeeklyDietPlan[];
  onUpdateDietDay: (id: 'current' | 'last', day: DailyDiet) => void;
}

export const DietScreen: React.FC<DietScreenProps> = ({ dietHistory, onUpdateDietDay }) => {
  const [activeTab, setActiveTab] = useState<'current' | 'last'>('current');
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(new Date().getDay()); // Default to today (0-6)

  const activePlan = dietHistory.find(d => d.id === activeTab);
  const days = activePlan?.days || [];

  const toggleDay = (index: number) => {
      setExpandedDayIndex(expandedDayIndex === index ? null : index);
  };
  
  // Atualiza nome ou horário da refeição
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

  /** Average kcal/day across days that have at least some calorie data */
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
          isConsumed: false
      });
      onUpdateDietDay(activeTab, { ...day, meals: newMeals });
  };

  // Helper para calcular progresso do dia
  const calculateProgress = (meals: DietMeal[]) => {
      let total = 0;
      let consumed = 0;
      meals.forEach(m => m.items.forEach(i => {
          total++;
          if (i.isConsumed) consumed++;
      }));
      return total === 0 ? 0 : (consumed / total) * 100;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Header and Tabs */}
        <div className="p-4 bg-surface border-b border-white/5 pb-0">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                    <Utensils className="text-primary" />
                    <div>
                        <h2 className="text-xl font-display font-bold text-white tracking-wide">Plano Alimentar</h2>
                        <p className="text-gray-400 text-xs">Diário Nutricional</p>
                    </div>
                </div>
                {calculateWeeklyAvgCalories() > 0 && (
                    <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                        <Flame size={14} className="text-primary" />
                        <div className="text-right">
                            <p className="text-primary font-bold text-sm leading-none">{calculateWeeklyAvgCalories().toLocaleString('pt-BR')}</p>
                            <p className="text-[9px] text-gray-500 uppercase tracking-wide">kcal/dia</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-4">
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
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
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
                            {/* DAY HEADER */}
                            <button 
                                onClick={() => toggleDay(dayIndex)}
                                className="w-full flex flex-col p-4"
                            >
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
                                {/* Mini Progress Bar */}
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary to-primaryDark transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </button>

                            {/* MEALS LIST */}
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
                                                            className={`
                                                                w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0
                                                                ${item.isConsumed ? 'bg-primary border-primary text-black' : 'border-gray-600 hover:border-primary'}
                                                            `}
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
    </div>
  );
};