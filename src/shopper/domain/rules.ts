import type { InboxRow, NotificationPrefs, WishlistItem } from "./models";
import { daysBetween } from "./models";

export function meetsPriceThreshold(priceAtSave: number, currentPrice: number): boolean {
  if (currentPrice >= priceAtSave) return false;
  const drop = priceAtSave - currentPrice;
  const needed = Math.min(50, priceAtSave * 0.05);
  return drop >= needed;
}

export function withinPriceCooldown(lastPriceDropAt: string | null, nowIso: string): boolean {
  if (!lastPriceDropAt) return false;
  return Date.parse(nowIso) - Date.parse(lastPriceDropAt) < 48 * 60 * 60 * 1000;
}

export function canSendPriceDrop(
  item: WishlistItem,
  prefs: NotificationPrefs,
  nowIso: string,
): { ok: true } | { ok: false; reason: string } {
  return { ok: false, reason: "disabled" };
}

export function canSendRestock(
  item: WishlistItem,
  sizeBack: string,
  prefs: NotificationPrefs,
): { ok: true } | { ok: false; reason: string } {
  if (item.status !== "active") return { ok: false, reason: "inactive" };
  if (!prefs.sizeRestockAlerts) return { ok: false, reason: "pref_off" };
  if (!item.sizeWatch?.active) return { ok: false, reason: "no_watch" };
  if (item.sizeWatch.size !== sizeBack) return { ok: false, reason: "wrong_size" };
  return { ok: true };
}

export function occasionDue(item: WishlistItem, nowIso: string): boolean {
  if (item.status !== "active") return false;
  if (item.tag !== "occasion" || !item.occasionDate) return false;
  const days = daysBetween(nowIso, item.occasionDate);
  return days >= 0 && days <= 7;
}

export function isDead(item: WishlistItem, nowIso: string): boolean {
  if (item.status !== "active") return false;
  if (item.stockStatus === "discontinued") return true;
  if (item.stockStatus === "oos" && item.oosSince && daysBetween(item.oosSince, nowIso) >= 60) {
    return true;
  }
  return false;
}

export function clearPassedOccasion(item: WishlistItem, nowIso: string): void {
  if (item.tag !== "occasion" || !item.occasionDate) return;
  if (daysBetween(nowIso, item.occasionDate) < 0) {
    item.tag = null;
    item.occasionDate = null;
  }
}

export function alreadySent(
  inbox: InboxRow[],
  type: InboxRow["type"],
  itemId: string,
): boolean {
  return inbox.some((row) => row.type === type && row.itemIds.includes(itemId));
}
