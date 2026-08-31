import type { AnalyticsEvent } from "../domain/analytics";
import type { FeatureFlagState } from "../domain/flags";
import type {
  ActiveSignal,
  WishlistItem,
  WishlistItemDto,
} from "../domain/models";
import {
  occasionBadgeLabel,
  occasionDaysUntil,
  type OccasionDto,
} from "../domain/occasion";
import { sortWishlistItems } from "../domain/ranker";
import type { AddWishlistBody } from "../domain/saveContext";
import { toSaveContextDto } from "../domain/saveContext";
import type { MemoryStore } from "../store/memoryStore";
import { completeOccasion, getActiveOccasion } from "./occasionService";
import {
  buildNewWishlistItem,
  getSaveContext,
  writeSaveContext,
} from "./saveContextService";
import { invalidateWishlistCache } from "./similarityMatcher";

export function composeWishlistDto(
  store: MemoryStore,
  item: WishlistItem,
  flags: { isOn: (flag: keyof FeatureFlagState) => boolean },
  now: Date,
): WishlistItemDto {
  const stockOn = flags.isOn("reeng.stock_alerts");
  const occasionOn = flags.isOn("reeng.occasion");
  const tag = getActiveOccasion(store, item.id);
  const days = tag ? occasionDaysUntil(tag, now, tag.timezone) : null;
  const occasion: OccasionDto | null =
    tag && occasionOn
      ? {
          label: tag.label,
          target_date: tag.target_date,
          window_start: tag.window_start,
          window_end: tag.window_end,
          days_until: days,
          status: tag.status,
        }
      : null;

  const stockSignal = stockOn ? item.active_signal : null;
  const occasionSignal =
    occasionOn && tag && days !== null && days >= 0
      ? {
          type: "occasion_approaching" as const,
          label: occasionBadgeLabel(tag.label, days),
          expires_at: tag.target_date ?? tag.window_start ?? "",
        }
      : null;

  let active_signal: ActiveSignal | null = stockSignal;
  let occasion_signal: { label: string } | null = null;
  if (stockSignal && occasionSignal) {
    occasion_signal = { label: occasionSignal.label };
  } else if (!stockSignal && occasionSignal) {
    active_signal = occasionSignal;
  }

  const saved = getSaveContext(store, item.id);
  const save_context = flags.isOn("reeng.save_context")
    ? toSaveContextDto(
        saved ?? {
          wishlist_item_id: item.id,
          source: "other",
          note: null,
          referring_query: null,
          metadata: null,
          created_at: item.saved_at,
        },
        item.saved_at,
        now,
      )
    : null;

  return {
    id: item.id,
    product_id: item.product_id,
    sku_id: item.sku_id,
    preferred_size: item.preferred_size,
    status: item.status,
    catalog: {
      brand: item.catalog.brand,
      title: item.catalog.title,
      image_url: "",
      price: item.catalog.price,
    },
    sellable: item.sellable,
    active_signal,
    occasion,
    occasion_signal,
    save_context,
  };
}

export function addItem(
  store: MemoryStore,
  userId: string,
  body: AddWishlistBody,
  nowIso: string,
  flags: { isOn: (flag: keyof FeatureFlagState) => boolean },
  now: Date,
  emit: (event: AnalyticsEvent) => void,
):
  | { ok: true; item: WishlistItemDto }
  | { ok: false; status: 400; error: string } {
  if (store.activeByProduct(userId, body.product_id ?? "")) {
    return { ok: false, status: 400, error: "Already on wishlist" };
  }
  const built = buildNewWishlistItem(userId, body, nowIso);
  if (!built.ok) return built;
  const written = writeSaveContext(store, built.item.id, body, nowIso);
  if (!written.ok) return { ok: false, status: 400, error: written.error };
  store.wishlistItems.push(built.item);
  invalidateWishlistCache(store, userId);
  emit({
    name: "wishlist_item_saved",
    product_id: built.item.product_id,
    wishlist_item_id: built.item.id,
    source: written.context.source,
    has_note: Boolean(written.context.note),
    has_size: Boolean(built.item.preferred_size),
  });
  return {
    ok: true,
    item: composeWishlistDto(store, built.item, flags, now),
  };
}

export function listActive(
  store: MemoryStore,
  userId: string,
  flags: { isOn: (flag: keyof FeatureFlagState) => boolean },
  page: { cursor?: string; limit?: number } = {},
  now = new Date(),
): { items: WishlistItemDto[]; next_cursor: string | null } {
  const approaching = new Set(
    store.listByUser(userId, "active")
      .filter((item) => {
        const tag = getActiveOccasion(store, item.id);
        if (!tag) return false;
        const days = occasionDaysUntil(tag, now, tag.timezone);
        return days !== null && days >= 0 && days <= 14;
      })
      .map((item) => item.id),
  );
  const sorted = sortWishlistItems(store.listByUser(userId, "active"), approaching);
  const limit = page.limit ?? 50;
  const offset = page.cursor ? Number(page.cursor) || 0 : 0;
  const slice = sorted.slice(offset, offset + limit);
  const next = offset + limit < sorted.length ? String(offset + limit) : null;
  return {
    items: slice.map((item) => composeWishlistDto(store, item, flags, now)),
    next_cursor: next,
  };
}

export function getItem(
  store: MemoryStore,
  userId: string,
  itemId: string,
  flags: { isOn: (flag: keyof FeatureFlagState) => boolean },
  now = new Date(),
): WishlistItemDto | null {
  const item = store.getItem(itemId);
  if (!item || item.user_id !== userId) return null;
  return composeWishlistDto(store, item, flags, now);
}

export function markPurchased(
  store: MemoryStore,
  userId: string,
  itemId: string,
  nowIso: string,
): WishlistItem | null {
  const item = store.getItem(itemId);
  if (!item || item.user_id !== userId || item.status !== "active") return null;
  item.status = "purchased";
  item.active_signal = null;
  item.sellable = false;
  completeOccasion(store, itemId, nowIso);
  for (const row of store.inbox) {
    if (row.wishlist_item_id === itemId) {
      row.expires_at = nowIso;
    }
  }
  for (const event of store.events) {
    if (
      event.wishlist_item_id === itemId &&
      (event.status === "sent" || event.status === "clicked")
    ) {
      event.status = "converted";
      event.converted_at = nowIso;
    }
  }
  return item;
}

export function removeItem(
  store: MemoryStore,
  userId: string,
  itemId: string,
  nowIso = new Date().toISOString(),
): boolean {
  const item = store.getItem(itemId);
  if (!item || item.user_id !== userId || item.status !== "active") return false;
  item.status = "removed";
  item.active_signal = null;
  completeOccasion(store, itemId, nowIso);
  invalidateWishlistCache(store, userId);
  return true;
}
