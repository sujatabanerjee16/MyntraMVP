import type { AnalyticsEvent } from "../domain/analytics";
import { ENGAGEMENT_CONFIG } from "../domain/engagementConfig";
import {
  occasionDaysUntil,
  validateOccasionWrite,
  type OccasionTag,
  type OccasionWrite,
} from "../domain/occasion";
import type { MemoryStore } from "../store/memoryStore";

export function getActiveOccasion(
  store: MemoryStore,
  itemId: string,
): OccasionTag | undefined {
  return store.occasionTags.find(
    (tag) => tag.wishlist_item_id === itemId && tag.status === "active",
  );
}

export function putOccasion(
  store: MemoryStore,
  userId: string,
  itemId: string,
  body: OccasionWrite,
  nowIso: string,
  emit: (event: AnalyticsEvent) => void,
): { ok: true; tag: OccasionTag } | { ok: false; status: 400 | 404; error: string } {
  const item = store.getItem(itemId);
  if (!item || item.user_id !== userId) {
    return { ok: false, status: 404, error: "Not found" };
  }
  if (item.status !== "active") {
    return { ok: false, status: 400, error: "Cannot tag a non-active item" };
  }
  const invalid = validateOccasionWrite(body);
  if (invalid) return { ok: false, status: 400, error: invalid };

  const existing = store.occasionTags.filter((tag) => tag.wishlist_item_id === itemId);
  for (const tag of existing) {
    if (tag.status === "active") tag.status = "dismissed";
  }

  const timezone = body.timezone ?? ENGAGEMENT_CONFIG.timezone;
  const tag: OccasionTag = {
    id: `occ-${crypto.randomUUID()}`,
    wishlist_item_id: itemId,
    label: body.label.trim(),
    target_date: body.target_date ?? null,
    window_start: body.window_start ?? null,
    window_end: body.window_end ?? null,
    timezone,
    remind_offsets_days: [...ENGAGEMENT_CONFIG.occasionOffsetsDays],
    status: "active",
    last_offset_fired: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const days = occasionDaysUntil(tag, new Date(nowIso), timezone);
  if (days !== null && days < 0) {
    tag.status = "expired";
  }

  store.occasionTags.push(tag);
  emit({
    name: "occasion_tagged",
    wishlist_item_id: itemId,
    label: tag.label,
    has_date: Boolean(tag.target_date || tag.window_start),
  });
  return { ok: true, tag };
}

export function deleteOccasion(
  store: MemoryStore,
  userId: string,
  itemId: string,
  nowIso: string,
): boolean {
  const item = store.getItem(itemId);
  if (!item || item.user_id !== userId) return false;
  const tag = getActiveOccasion(store, itemId);
  if (!tag) return false;
  tag.status = "dismissed";
  tag.updated_at = nowIso;
  expireOccasionInbox(store, itemId, nowIso);
  return true;
}

export function dismissOccasion(
  store: MemoryStore,
  userId: string,
  itemId: string,
  nowIso: string,
  emit: (event: AnalyticsEvent) => void,
): boolean {
  const deleted = deleteOccasion(store, userId, itemId, nowIso);
  if (deleted) {
    emit({ name: "occasion_dismissed", wishlist_item_id: itemId });
  }
  return deleted;
}

export function completeOccasion(
  store: MemoryStore,
  itemId: string,
  nowIso: string,
): void {
  const tag = getActiveOccasion(store, itemId);
  if (!tag) return;
  tag.status = "completed";
  tag.updated_at = nowIso;
  expireOccasionInbox(store, itemId, nowIso);
}

export function expireOccasionInbox(
  store: MemoryStore,
  itemId: string,
  nowIso: string,
): void {
  for (const row of store.inbox) {
    if (row.wishlist_item_id === itemId && row.type === "occasion_approaching") {
      row.expires_at = nowIso;
    }
  }
}
