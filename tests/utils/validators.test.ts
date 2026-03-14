import { describe, it, expect } from 'vitest';
import { chatMessageSchema, workoutLogSchema, userProfileSchema } from '../../utils/validators';

describe('chatMessageSchema', () => {
  it('aceita mensagem valida', () => {
    expect(chatMessageSchema.safeParse({ message: 'Ola TitanAI!' }).success).toBe(true);
  });
  it('rejeita mensagem vazia', () => {
    expect(chatMessageSchema.safeParse({ message: '' }).success).toBe(false);
  });
  it('rejeita mensagem muito longa', () => {
    expect(chatMessageSchema.safeParse({ message: 'a'.repeat(2001) }).success).toBe(false);
  });
  it('aceita conversationId opcional', () => {
    expect(chatMessageSchema.safeParse({ message: 'ola', conversationId: 'abc123' }).success).toBe(true);
  });
});

describe('workoutLogSchema', () => {
  const validWorkout = {
    date: '2026-03-14T10:00:00.000Z',
    exercises: [{ exerciseId: 'bench-press', sets: [{ reps: 10, weight: 80, unit: 'kg' }] }],
  };

  it('aceita treino valido', () => {
    expect(workoutLogSchema.safeParse(validWorkout).success).toBe(true);
  });
  it('rejeita treino sem exercicios', () => {
    expect(workoutLogSchema.safeParse({ ...validWorkout, exercises: [] }).success).toBe(false);
  });
  it('rejeita peso negativo', () => {
    const bad = { ...validWorkout, exercises: [{ exerciseId: 'x', sets: [{ reps: 10, weight: -5, unit: 'kg' }] }] };
    expect(workoutLogSchema.safeParse(bad).success).toBe(false);
  });
  it('rejeita reps zero', () => {
    const bad = { ...validWorkout, exercises: [{ exerciseId: 'x', sets: [{ reps: 0, weight: 0, unit: 'kg' }] }] };
    expect(workoutLogSchema.safeParse(bad).success).toBe(false);
  });
  it('aceita duracao opcional', () => {
    expect(workoutLogSchema.safeParse({ ...validWorkout, durationMinutes: 60 }).success).toBe(true);
  });
});

describe('userProfileSchema', () => {
  it('aceita perfil valido', () => {
    expect(userProfileSchema.safeParse({ displayName: 'Joao', age: 25, goal: 'bulking', experienceLevel: 'intermediate' }).success).toBe(true);
  });
  it('aceita perfil minimo', () => {
    expect(userProfileSchema.safeParse({ displayName: 'Jo' }).success).toBe(true);
  });
  it('rejeita nome vazio', () => {
    expect(userProfileSchema.safeParse({ displayName: '' }).success).toBe(false);
  });
  it('rejeita idade menor que 13', () => {
    expect(userProfileSchema.safeParse({ displayName: 'Crianca', age: 12 }).success).toBe(false);
  });
  it('rejeita goal invalido', () => {
    expect(userProfileSchema.safeParse({ displayName: 'X', goal: 'ganhar_dinheiro' }).success).toBe(false);
  });
});
