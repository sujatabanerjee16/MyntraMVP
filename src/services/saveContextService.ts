import type { AnalyticsEvent } from "../domain/analytics";
import type { WishlistItem } from "../domain/models";
import {
  NOTE_MAX_LENGTH,
  VIEW_DEBOUNCE_MS,
  normalizeSource,
  sanitizeNote,
  sanitizeReferringQuery,
  type AddWishlistBody,
  type SaveContext,
} from "../domain/saveContext";
import type { MemoryStore } from "../store/memoryStore";
import { catalogById } from "../store/catalog";

export function getSaveContext(
  store: MemoryStore,
  itemId: string,
): SaveContext | undefined {
  return store.saveContexts.find((row) => row.wishlist_item_id === itemId);
}

export function writeSaveContext(
  store: MemoryStore,
  itemId: string,
  body: AddWishlistBody,
  nowIso: string,
): { ok: true; context: SaveContext } | { ok: false; error: string } {
  const noteResult = sanitizeNote(body.note);
  if (!noteResult.ok) return noteResult;
  const context: SaveContext = {
    wishlist_item_id: itemId,
    source: normalizeSource(body.source),
    note: noteResult.note,
    referring_query: sanitizeReferringQuery(body.referring_query),
    metadata: null,
    created_at: nowIso,
  };
  store.saveContexts.push(context);
  return { ok: true, context };
}

export function setNote(
  store: MemoryStore,
  userId: string,
  itemId: string,
  note: string | null,
  nowIso: string,
): { ok: true; context: SaveContext } | { ok: false; status: 400 | 404; error: string } {
  const item = store.getItem(itemId);
  if (!item || item.user_id !== userId) {
    return { ok: false, status: 404, error: "Not found" };
  }
  const noteResult = sanitizeNote(note);
  if (!noteResult.ok) {
    return { ok: false, status: 400, error: noteResult.error };
  }
  let context = getSaveContext(store, itemId);
  if (!context) {
    context = {
      wishlist_item_id: itemId,
      source: "other",
      note: noteResult.note,
      referring_query: null,
      metadata: null,
      created_at: nowIso,
    };
    store.saveContexts.push(context);
  } else {
    context.note = noteResult.note;
  }
  return { ok: true, context };
}

export function touchViewed(
  store: MemoryStore,
  userId: string,
  itemId: string,
  nowIso: string,
  emit: (event: AnalyticsEvent) => void,
  hasActiveSignal: boolean,
): boolean {
  const item = store.getItem(itemId);
  if (!item || item.user_id !== userId || item.status !== "active") return false;
  const previous = item.last_viewed_at ? Date.parse(item.last_viewed_at) : 0;
  const nowMs = Date.parse(nowIso);
  item.last_viewed_at = nowIso;
  if (previous && nowMs - previous < VIEW_DEBOUNCE_MS) return true;
  emit({
    name: "wishlist_card_impressed",
    wishlist_item_id: itemId,
    has_active_signal: hasActiveSignal,
  });
  return true;
}

export function buildNewWishlistItem(
  userId: string,
  body: AddWishlistBody,
  nowIso: string,
): { ok: true; item: WishlistItem } | { ok: false; status: 400; error: string } {
  if (!body.product_id?.trim()) {
    return { ok: false, status: 400, error: "product_id is required" };
  }
  const product = catalogById(body.product_id);
  if (!product) {
    return { ok: false, status: 400, error: "Unknown product" };
  }
  const noteResult = sanitizeNote(body.note);
  if (!noteResult.ok) {
    return { ok: false, status: 400, error: noteResult.error };
  }
  const item: WishlistItem = {
    id: `wish-${crypto.randomUUID()}`,
    user_id: userId,
    product_id: product.product_id,
    sku_id: body.sku_id ?? product.sku_id,
    preferred_size: body.preferred_size ?? product.preferred_size,
    status: "active",
    saved_at: nowIso,
    last_viewed_at: null,
    last_resurfaced_at: null,
    sellable: product.sellable,
    active_signal: null,
    catalog: product.catalog,
  };
  return { ok: true, item };
}

export { NOTE_MAX_LENGTH };
