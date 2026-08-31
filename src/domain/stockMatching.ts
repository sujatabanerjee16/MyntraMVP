import type { InventoryAvailabilityChanged, WishlistItem } from "./models";

export function normalizeSize(size: string): string {
  return size.trim().toUpperCase();
}

/** Architecture §5.1 — preferred size set + different size only → do not notify. */
export function itemMatchesAvailability(
  item: WishlistItem,
  event: InventoryAvailabilityChanged,
): boolean {
  if (item.status !== "active") return false;

  if (item.sku_id && item.sku_id === event.sku_id) return true;
  if (item.product_id !== event.product_id) return false;
  if (!item.preferred_size) return true;
  return normalizeSize(item.preferred_size) === normalizeSize(event.size);
}

export function stockSignalLabel(size: string): string {
  return `Size ${normalizeSize(size)} back in stock`;
}

export function stockInboxCopy(size: string): { title: string; body: string } {
  const s = normalizeSize(size);
  return {
    title: `Back in Stock, Size ${s} available`,
    body: `Size ${s} is back in stock on an item you saved.`,
  };
}

export function stockDeepLink(wishlistItemId: string, size: string): string {
  return `myntra://wishlist/items/${wishlistItemId}?signal=size_available&size=${encodeURIComponent(normalizeSize(size))}`;
}

export function pdpFallbackLink(productId: string, size?: string): string {
  const sizeQ = size ? `?size=${encodeURIComponent(normalizeSize(size))}` : "";
  return `myntra://pdp/${productId}${sizeQ}`;
}

export function stockIdempotencyKey(
  userId: string,
  itemId: string,
  type: string,
  inventoryEventId: string,
): string {
  return `${userId}:${itemId}:${type}:${inventoryEventId}`;
}
