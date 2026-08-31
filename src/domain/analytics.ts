import {
  FORBIDDEN_REENGAGEMENT_TYPES,
  isForbiddenReengagementType,
} from "./reengagementTypes";

export type AnalyticsEvent = {
  name: string;
  type?: string;
  copy_key?: string;
  wishlist_item_id?: string;
  product_id?: string;
  channel?: string;
  had_active_signal?: boolean;
  signal_type?: string;
  days_since_save?: number;
  nudged_in_last_7d?: boolean;
  nudge_type?: string;
  reason?: string;
  label?: string;
  has_date?: boolean;
  source?: string;
  has_note?: boolean;
  has_size?: boolean;
  has_active_signal?: boolean;
  exp_id?: string;
  variant?: string;
  user_id?: string;
};

const MONETARY_EVENT_NAMES = new Set([
  "price_drop",
  "price_drop_sent",
  "price_drop_clicked",
]);

/** G1 — must stay 0. Counts forbidden types, copy keys, and event names. */
export function countMonetaryLeak(events: AnalyticsEvent[]): number {
  return events.filter((event) => {
    if (MONETARY_EVENT_NAMES.has(event.name)) return true;
    if (event.type && isForbiddenReengagementType(event.type)) return true;
    if (
      event.copy_key &&
      FORBIDDEN_REENGAGEMENT_TYPES.some((t) => event.copy_key?.includes(t))
    ) {
      return true;
    }
    return false;
  }).length;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(toIso) - Date.parse(fromIso);
  return Math.max(0, Math.floor(ms / 86_400_000));
}

const PII_KEYS = new Set(["note", "referring_query", "note_body", "query"]);

/** G1 / EC-CTX-007 — notes and raw queries must never appear on events. */
export function countNotePiiLeak(events: AnalyticsEvent[]): number {
  return events.filter((event) => {
    const record = event as Record<string, unknown>;
    return [...PII_KEYS].some((key) => typeof record[key] === "string");
  }).length;
}
