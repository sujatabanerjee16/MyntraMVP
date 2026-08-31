import type { ReengagementType } from "./reengagementTypes";
import type { WishlistItem } from "./models";
import { normalizeSize } from "./stockMatching";

function typePriority(type: ReengagementType, item: WishlistItem, eventSize?: string): number {
  if (type === "size_available") {
    if (
      item.preferred_size &&
      eventSize &&
      normalizeSize(item.preferred_size) === normalizeSize(eventSize)
    ) {
      return 0;
    }
    return 1;
  }
  if (type === "back_in_stock") return 2;
  if (type === "occasion_approaching") return 3;
  return 4;
}

/** Preferred size match, then generic restock, then most recently saved. */
export function compareInboxPriority(
  a: { item: WishlistItem; type: ReengagementType; eventSize?: string },
  b: { item: WishlistItem; type: ReengagementType; eventSize?: string },
): number {
  const typeDelta =
    typePriority(a.type, a.item, a.eventSize) - typePriority(b.type, b.item, b.eventSize);
  if (typeDelta !== 0) return typeDelta;
  return Date.parse(b.item.saved_at) - Date.parse(a.item.saved_at);
}

export function sortWishlistItems(
  items: WishlistItem[],
  approachingOccasionIds: Set<string> = new Set(),
): WishlistItem[] {
  function rank(item: WishlistItem): number {
    if (item.active_signal && item.active_signal.type !== "occasion_approaching") {
      return 0;
    }
    if (approachingOccasionIds.has(item.id) || item.active_signal?.type === "occasion_approaching") {
      return 1;
    }
    return 2;
  }
  return [...items].sort((left, right) => {
    const delta = rank(left) - rank(right);
    if (delta !== 0) return delta;
    return Date.parse(right.saved_at) - Date.parse(left.saved_at);
  });
}
