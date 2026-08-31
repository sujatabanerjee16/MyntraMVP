import { ENGAGEMENT_CONFIG } from "./engagementConfig";

export type UserEngagementPolicy = {
  user_id: string;
  max_nudge_per_day: number;
  max_per_item_per_7d: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  similar_nudge_enabled: boolean;
  occasion_nudge_enabled: boolean;
  push_enabled: boolean;
  muted_until: string | null;
  timezone: string;
  frequency_reset_at: string | null;
};

export type SimilarNudgeDismissal = {
  user_id: string;
  wishlist_item_id: string;
  dismissed_until: string;
};

export function defaultPolicy(userId: string): UserEngagementPolicy {
  return {
    user_id: userId,
    max_nudge_per_day: ENGAGEMENT_CONFIG.maxInterruptivePerDay,
    max_per_item_per_7d: ENGAGEMENT_CONFIG.maxPerItemPer7d,
    quiet_hours_start: null,
    quiet_hours_end: null,
    similar_nudge_enabled: true,
    occasion_nudge_enabled: true,
    push_enabled: true,
    muted_until: null,
    timezone: ENGAGEMENT_CONFIG.timezone,
    frequency_reset_at: null,
  };
}
