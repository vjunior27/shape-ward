import { analytics } from './firebase';
import { logEvent as fbLogEvent } from 'firebase/analytics';

// ─── Typed event catalog ───────────────────────────────────────────────────────

type AnalyticsEvent =
  | { name: 'onboarding_completed' }
  | { name: 'first_workout_logged' }
  | { name: 'first_titan_message' }
  | { name: 'ai_plan_generated'; plan_type: 'workout' | 'diet' }
  | { name: 'ai_plan_applied'; plan_type: 'workout' | 'diet' }
  | { name: 'workout_logged'; day_name: string; exercise_count: number }
  | { name: 'weekly_goal_reached'; week_number: number; trained_days: number }
  | { name: 'streak_extended'; streak_weeks: number }
  | { name: 'share_image_generated' }
  | { name: 'voice_input_used'; context: 'exercise' | 'debriefing' }
  | { name: 'report_generated' }
  | { name: 'exercise_gif_viewed'; exercise_name: string }
  | { name: 'titan_message_sent'; has_plan_request: boolean }
  | { name: 'diet_updated' }
  | { name: 'plateau_detected'; exercise_name: string }
  | { name: 'time_to_first_value'; seconds: number };

/**
 * Logs a typed analytics event to Firebase Analytics.
 * Silently ignores errors (demo mode, ad blockers, missing config).
 */
export function logEvent(event: AnalyticsEvent): void {
  try {
    const { name, ...params } = event;
    fbLogEvent(analytics, name, params as Record<string, unknown>);
  } catch {
    // Analytics not available in demo mode or blocked by ad blocker
  }
}
