import type { AnalyticsEvent } from "../domain/analytics";
import { ENGAGEMENT_CONFIG } from "../domain/engagementConfig";
import { evaluateFrequencyGuard } from "../domain/frequencyGuard";
import { localDateKey } from "../domain/localTime";
import type { WishlistItem } from "../domain/models";
import {
  SIMILAR_DISMISS_DAYS,
  SIMILAR_LATENCY_MS_BUDGET,
  embeddingsForQuery,
  pickSimilarMatch,
  toSimilarHint,
  type SimilarWishlistEntry,
  type SimilarWishlistHint,
} from "../domain/similar";
import { catalogById, searchCatalog, toSimilarFields } from "../store/catalog";
import type { MemoryStore } from "../store/memoryStore";

export type SearchOptions = {
  forceTimeout?: boolean;
  elapsedMs?: number;
};

function toEntry(item: WishlistItem): SimilarWishlistEntry | null {
  const catalog = catalogById(item.product_id);
  if (!catalog) return null;
  return {
    ...toSimilarFields(catalog),
    wishlist_item_id: item.id,
    saved_at: item.saved_at,
  };
}

export function cachedActiveWishlist(
  store: MemoryStore,
  userId: string,
): WishlistItem[] {
  const hit = store.wishlistIdCache.get(userId);
  if (hit) return hit;
  const items = store.listByUser(userId, "active");
  store.wishlistIdCache.set(userId, items);
  return items;
}

export function invalidateWishlistCache(store: MemoryStore, userId: string): void {
  store.wishlistIdCache.delete(userId);
}

export function shownKey(userId: string, itemId: string, localDate: string): string {
  return `${userId}:${itemId}:${localDate}`;
}

export function dismissUntilIso(now: Date, days = SIMILAR_DISMISS_DAYS): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

export function matchSimilarHint(
  store: MemoryStore,
  userId: string,
  query: string,
  now: Date,
  options: SearchOptions,
  emit: (event: AnalyticsEvent) => void,
): { hint: SimilarWishlistHint | null; matcher_ran: boolean } {
  store.similarMatcherCalls += 1;
  if (options.forceTimeout || (options.elapsedMs ?? 0) > SIMILAR_LATENCY_MS_BUDGET) {
    emit({
      name: "reengagement_suppressed",
      type: "similar_search",
      reason: "latency_budget",
    });
    return { hint: null, matcher_ran: true };
  }

  const results = searchCatalog(query);
  const wishlist = cachedActiveWishlist(store, userId)
    .map(toEntry)
    .filter((row): row is SimilarWishlistEntry => Boolean(row));

  const match = pickSimilarMatch({
    query,
    results: results.map(toSimilarFields),
    wishlist,
    embeddings: embeddingsForQuery(query),
  });
  if (!match) return { hint: null, matcher_ran: true };

  const guard = evaluateFrequencyGuard({
    userId,
    itemId: match.wishlist_item_id,
    type: "similar_search",
    channel: "in_app",
    decisionAt: now,
    policy: store.policyFor(userId),
    config: store.config,
    events: store.events,
    dismissals: store.dismissals,
  });
  if (!guard.allow) {
    emit({
      name: "reengagement_suppressed",
      type: "similar_search",
      reason: guard.reason,
      wishlist_item_id: match.wishlist_item_id,
    });
    return { hint: null, matcher_ran: true };
  }

  const sessionItem = store.similarHintByUser.get(userId);
  if (sessionItem && sessionItem !== match.wishlist_item_id) {
    return { hint: null, matcher_ran: true };
  }

  const hint = toSimilarHint(match);
  store.similarHintByUser.set(userId, match.wishlist_item_id);
  const day = localDateKey(now, ENGAGEMENT_CONFIG.timezone);
  const key = shownKey(userId, match.wishlist_item_id, day);
  if (!store.similarShownKeys.has(key)) {
    store.similarShownKeys.add(key);
    emit({
      name: "similar_nudge_shown",
      wishlist_item_id: match.wishlist_item_id,
      reason: match.reason,
    });
  }
  return { hint, matcher_ran: true };
}
