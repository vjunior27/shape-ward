import { UserProfile, WeeklyWorkoutPlan, WeeklyDietPlan } from '../types';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const LINE = '─'.repeat(52);

/**
 * Generates a plain-text health & performance report and triggers a .txt download.
 * Zero external dependencies — purely string manipulation + Blob API.
 */
export function generateMedicalReport(
  profile: UserProfile,
  workoutHistory: WeeklyWorkoutPlan[],
  dietHistory: WeeklyDietPlan[]
): void {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lastWeek = workoutHistory[0] ?? null;
  const activeDays = lastWeek?.days.filter((d) => d.exercises.length > 0) ?? [];
  const totalExercises = activeDays.reduce((s, d) => s + d.exercises.length, 0);

  const currentDiet = dietHistory.find((d) => d.id === 'current');

  let txt = `TRAINOVA — RELATÓRIO DE SAÚDE & PERFORMANCE
Gerado em: ${today}
${LINE}

DADOS DO ATLETA
Nome              : ${profile.name || 'Não informado'}
Sexo              : ${profile.sex === 'male' ? 'Masculino' : profile.sex === 'female' ? 'Feminino' : 'Não informado'}
Idade             : ${profile.age ? profile.age + ' anos' : 'Não informado'}
Peso              : ${profile.weight ? profile.weight + ' kg' : 'Não informado'}
Altura            : ${profile.height ? profile.height + ' cm' : 'Não informado'}
Gordura Corporal  : ${profile.fatPercentage ? profile.fatPercentage + '%' : 'Não informado'}
Profissão         : ${profile.profession || 'Não informado'}
App desde         : ${formatDate(profile.startDate)}

${LINE}
OBJETIVO & ROTINA
Objetivo Principal: ${profile.objective || 'Não informado'}
Treinos / Semana  : ${profile.workoutsPerWeek || 'Não informado'}
Observações       : ${profile.routine || 'Nenhuma'}

${LINE}
ATIVIDADE FÍSICA — ÚLTIMA SEMANA REGISTRADA
`;

  if (lastWeek) {
    txt += `Semana: ${lastWeek.weekNumber} / ${lastWeek.year}\n`;
    txt += `Dias ativos: ${activeDays.length} de 7\n`;
    txt += `Exercícios registrados: ${totalExercises}\n\n`;
    activeDays.forEach((day) => {
      txt += `  ${day.dayName}\n`;
      day.exercises.forEach((ex) => {
        txt += `    • ${ex.name}  —  ${ex.sets || '?'} séries × ${ex.reps || '?'} reps  @  ${ex.weight || '0'} kg\n`;
      });
      txt += '\n';
    });
  } else {
    txt += `Nenhum registro de treino encontrado.\n`;
  }

  txt += `${LINE}\nDIETA ATUAL\n`;

  if (currentDiet?.days.length) {
    // Representative day (today or first available)
    const todayStr = new Date().toISOString().split('T')[0];
    const repDay = currentDiet.days.find((d) => d.date === todayStr) ?? currentDiet.days[0];
    const totalKcal = repDay.meals.reduce(
      (s, m) => s + m.items.reduce((ms, i) => ms + (i.calories ?? 0), 0),
      0
    );

    txt += `Dia de referência: ${repDay.dayName}\n`;
    if (totalKcal > 0) txt += `Total calórico estimado: ${totalKcal} kcal\n`;
    txt += '\n';

    repDay.meals.forEach((meal) => {
      const mKcal = meal.items.reduce((s, i) => s + (i.calories ?? 0), 0);
      txt += `  ${meal.time} — ${meal.name}${mKcal > 0 ? `  (${mKcal} kcal)` : ''}\n`;
      meal.items.forEach((item) => {
        txt += `    • ${item.name}  ${item.quantity}${item.calories ? `  — ${item.calories} kcal` : ''}\n`;
      });
    });
  } else {
    txt += `Nenhuma dieta registrada.\n`;
  }

  txt += `\n${LINE}\nDISCLAIMER\nEste relatório foi gerado automaticamente pelo app Trainova com base em dados\nautorrelatados pelo usuário. As informações devem ser validadas por um profissional\nqualificado antes de qualquer intervenção clínica, nutricional ou de treinamento.\n${LINE}\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (profile.name || 'usuario').replace(/\s+/g, '-').toLowerCase();
  a.download = `trainova-relatorio-${safeName}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
