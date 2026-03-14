import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Mensagem não pode ser vazia").max(2000, "Máximo de 2000 caracteres"),
  conversationId: z.string().optional(),
});

export const workoutLogSchema = z.object({
  date: z.string().datetime({ message: "Data inválida" }),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        sets: z
          .array(
            z.object({
              reps: z.number().int().min(1).max(999),
              weight: z.number().min(0).max(9999),
              unit: z.enum(["kg", "lbs"]),
            })
          )
          .min(1),
      })
    )
    .min(1, "O treino deve ter pelo menos 1 exercício"),
  notes: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(1).max(480).optional(),
});

export const nutritionLogSchema = z.object({
  date: z.string().datetime(),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"]),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        calories: z.number().min(0),
        protein: z.number().min(0),
        carbs: z.number().min(0),
        fat: z.number().min(0),
        quantity: z.number().min(0),
        unit: z.string().max(20),
      })
    )
    .min(1),
});

export const userProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  age: z.number().int().min(13, "Idade mínima: 13 anos").max(120).optional(),
  weight: z.number().min(20).max(500).optional(),
  height: z.number().min(50).max(300).optional(),
  goal: z.enum(["cutting", "bulking", "maintenance", "strength", "endurance"]).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type WorkoutLog = z.infer<typeof workoutLogSchema>;
export type NutritionLog = z.infer<typeof nutritionLogSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
