import type { AnalyticsEvent } from "./analytics";

/** Architecture §12.2 — required properties per event. */
export const EVENT_CONTRACT: Record<string, readonly string[]> = {
  wishlist_item_saved: ["product_id", "source", "has_note", "has_size"],
  occasion_tagged: ["wishlist_item_id", "has_date", "label"],
  occasion_dismissed: ["wishlist_item_id"],
  reengagement_sent: ["type", "channel", "wishlist_item_id"],
  reengagement_suppressed: ["type", "reason"],
  reengagement_clicked: ["type", "wishlist_item_id"],
  wishlist_opened_from_nudge: ["type"],
  wishlist_card_impressed: ["wishlist_item_id", "has_active_signal"],
  add_to_bag_from_wishlist: ["wishlist_item_id", "had_active_signal"],
  wishlist_item_purchased: [
    "wishlist_item_id",
    "days_since_save",
    "nudged_in_last_7d",
  ],
  similar_nudge_shown: ["wishlist_item_id", "reason"],
  similar_nudge_tapped: ["wishlist_item_id", "reason"],
  similar_nudge_dismissed: ["wishlist_item_id", "reason"],
};

export const CONTRACT_EVENT_NAMES = Object.keys(EVENT_CONTRACT);

export function missingContractFields(event: AnalyticsEvent): string[] {
  const required = EVENT_CONTRACT[event.name];
  if (!required) return [];
  const record = event as Record<string, unknown>;
  return required.filter((field) => record[field] === undefined);
}

export function validateEventContract(events: AnalyticsEvent[]): {
  ok: boolean;
  violations: { name: string; missing: string[] }[];
} {
  const violations = events
    .map((event) => ({
      name: event.name,
      missing: missingContractFields(event),
    }))
    .filter((row) => row.missing.length > 0);
  return { ok: violations.length === 0, violations };
}

/** Happy-path stock funnel used by the Phase 1 / Phase 6 demo. */
export const STOCK_FUNNEL_EVENTS = [
  "reengagement_sent",
  "reengagement_clicked",
  "wishlist_opened_from_nudge",
  "add_to_bag_from_wishlist",
  "wishlist_item_purchased",
] as const;

export function hasStockFunnel(events: AnalyticsEvent[]): boolean {
  const names = new Set(events.map((event) => event.name));
  return STOCK_FUNNEL_EVENTS.every((name) => names.has(name));
}
