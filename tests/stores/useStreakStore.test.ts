import { describe, it, expect, beforeEach } from 'vitest';
import { useStreakStore } from '../../stores/useStreakStore';

describe('useStreakStore', () => {
  beforeEach(() => {
    useStreakStore.setState({
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      streakShieldsRemaining: 2,
      totalWorkouts: 0,
      xp: 0,
      level: 1,
    });
  });

  it('inicia streak no primeiro treino', () => {
    useStreakStore.getState().recordStreak('2026-03-14');
    expect(useStreakStore.getState().currentStreak).toBe(1);
    expect(useStreakStore.getState().totalWorkouts).toBe(1);
  });

  it('incrementa streak em dias consecutivos', () => {
    useStreakStore.getState().recordStreak('2026-03-14');
    useStreakStore.getState().recordStreak('2026-03-15');
    useStreakStore.getState().recordStreak('2026-03-16');
    expect(useStreakStore.getState().currentStreak).toBe(3);
  });

  it('reseta streak ao pular um dia', () => {
    useStreakStore.getState().recordStreak('2026-03-14');
    useStreakStore.getState().recordStreak('2026-03-15');
    useStreakStore.getState().recordStreak('2026-03-17');
    expect(useStreakStore.getState().currentStreak).toBe(1);
  });

  it('preserva longestStreak apos reset', () => {
    useStreakStore.getState().recordStreak('2026-03-14');
    useStreakStore.getState().recordStreak('2026-03-15');
    useStreakStore.getState().recordStreak('2026-03-16');
    useStreakStore.getState().recordStreak('2026-03-18');
    expect(useStreakStore.getState().longestStreak).toBe(3);
    expect(useStreakStore.getState().currentStreak).toBe(1);
  });

  it('nao incrementa ao treinar duas vezes no mesmo dia', () => {
    useStreakStore.getState().recordStreak('2026-03-14');
    useStreakStore.getState().recordStreak('2026-03-14');
    expect(useStreakStore.getState().currentStreak).toBe(1);
    expect(useStreakStore.getState().totalWorkouts).toBe(2);
  });

  it('calcula nivel ao acumular XP', () => {
    useStreakStore.getState().addXP(450);
    expect(useStreakStore.getState().level).toBe(1);
    useStreakStore.getState().addXP(100);
    expect(useStreakStore.getState().level).toBe(2);
  });

  it('usa shield com sucesso', () => {
    expect(useStreakStore.getState().useShield()).toBe(true);
    expect(useStreakStore.getState().streakShieldsRemaining).toBe(1);
  });

  it('falha ao usar shield quando nao tem mais', () => {
    useStreakStore.getState().useShield();
    useStreakStore.getState().useShield();
    expect(useStreakStore.getState().useShield()).toBe(false);
  });
});
