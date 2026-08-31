import type { EngagementConfig } from "./engagementConfig";
import { isInLocalWindow, localDateKey } from "./localTime";
import type { ReengagementEvent } from "./models";
import type { SimilarNudgeDismissal, UserEngagementPolicy } from "./policy";
import type { ReengagementType } from "./reengagementTypes";

export type SuppressionReason =
  | "not_active"
  | "signal_invalid"
  | "daily_cap"
  | "item_cooldown"
  | "quiet_hours"
  | "user_muted"
  | "channel_off"
  | "user_dismissed_similar"
  | "preempted_by_higher_priority"
  | "feature_flag_off"
  | "duplicate_idempotency"
  | "latency_budget"
  | "item_unavailable_for_occasion";

export type FrequencyDecision =
  | { allow: true }
  | { allow: false; reason: SuppressionReason };

const INTERRUPTIVE: ReengagementType[] = [
  "back_in_stock",
  "size_available",
  "occasion_approaching",
];

export function isInterruptiveType(type: ReengagementType): boolean {
  return INTERRUPTIVE.includes(type);
}

function countsTowardCap(event: ReengagementEvent, resetAt: string | null): boolean {
  if (event.status === "suppressed") return false;
  if (!isInterruptiveType(event.type)) return false;
  if (resetAt && event.created_at <= resetAt) return false;
  return event.status === "sent" || event.status === "clicked" || event.status === "converted";
}

export function evaluateFrequencyGuard(input: {
  userId: string;
  itemId: string;
  type: ReengagementType;
  channel: "in_app" | "push" | "sms";
  decisionAt: Date;
  policy: UserEngagementPolicy;
  config: EngagementConfig;
  events: ReengagementEvent[];
  dismissals?: SimilarNudgeDismissal[];
}): FrequencyDecision {
  const { policy, config, events, userId, itemId, type, channel, decisionAt } = input;

  if (policy.muted_until && decisionAt.toISOString() < policy.muted_until) {
    return { allow: false, reason: "user_muted" };
  }

  if (type === "similar_search") {
    const dismissal = (input.dismissals ?? []).find(
      (row) =>
        row.user_id === userId &&
        row.wishlist_item_id === itemId &&
        row.dismissed_until > decisionAt.toISOString(),
    );
    if (dismissal) return { allow: false, reason: "user_dismissed_similar" };
    return { allow: true };
  }

  if (channel === "push" && !policy.push_enabled) {
    return { allow: false, reason: "channel_off" };
  }
  if (channel === "sms") {
    return { allow: false, reason: "channel_off" };
  }

  const inWindow = isInLocalWindow(
    decisionAt,
    config.sendWindowLocalStart,
    config.sendWindowLocalEnd,
    policy.timezone,
  );
  const inExtraQuiet =
    policy.quiet_hours_start &&
    policy.quiet_hours_end &&
    isInLocalWindow(
      decisionAt,
      policy.quiet_hours_start,
      policy.quiet_hours_end,
      policy.timezone,
    );
  if (!inWindow || inExtraQuiet) {
    return { allow: false, reason: "quiet_hours" };
  }

  const day = localDateKey(decisionAt, policy.timezone);
  const sentToday = events.filter(
    (event) =>
      event.user_id === userId &&
      countsTowardCap(event, policy.frequency_reset_at) &&
      localDateKey(new Date(event.created_at), policy.timezone) === day,
  ).length;
  if (sentToday >= policy.max_nudge_per_day) {
    return { allow: false, reason: "daily_cap" };
  }

  // Occasion offsets (T−7 then T−3) are allowed across days; FG1 still caps same-day spam.
  if (type !== "occasion_approaching") {
    const weekAgo = new Date(decisionAt.getTime() - 7 * 86_400_000).toISOString();
    const sentForItem = events.filter(
      (event) =>
        event.user_id === userId &&
        event.wishlist_item_id === itemId &&
        countsTowardCap(event, policy.frequency_reset_at) &&
        event.created_at >= weekAgo,
    ).length;
    if (sentForItem >= policy.max_per_item_per_7d) {
      return { allow: false, reason: "item_cooldown" };
    }
  }

  return { allow: true };
}

export function frequencyCounters(events: ReengagementEvent[]): {
  sent: number;
  suppressed: Partial<Record<SuppressionReason, number>>;
} {
  const suppressed: Partial<Record<SuppressionReason, number>> = {};
  let sent = 0;
  for (const event of events) {
    if (event.status === "suppressed" && event.suppressed_reason) {
      const reason = event.suppressed_reason as SuppressionReason;
      suppressed[reason] = (suppressed[reason] ?? 0) + 1;
    }
    if (event.status === "sent" || event.status === "clicked" || event.status === "converted") {
      sent += 1;
    }
  }
  return { sent, suppressed };
}

/** Prod hook: spike in daily_cap or an illegal type slipped through. */
export function frequencyAlertHook(
  events: ReengagementEvent[],
  illegalTypes: string[] = ["price_drop"],
): string[] {
  const alerts: string[] = [];
  const { suppressed } = frequencyCounters(events);
  if ((suppressed.daily_cap ?? 0) >= 10) {
    alerts.push("daily_cap_spike");
  }
  if (events.some((event) => illegalTypes.includes(event.type))) {
    alerts.push("illegal_reengagement_type");
  }
  return alerts;
}
