import type { StockStatus } from "./models";

export type StockSortable = {
  id: string;
  savedAt: string;
  stockStatus: StockStatus;
  sizeWatch: { size: string; active: boolean } | null;
  selectedSize: string | null;
};

/** Saved size is sellable now — not OOS and not waiting on a size watch. */
export function isSizeAvailable(item: StockSortable): boolean {
  if (item.stockStatus !== "in_stock") return false;
  if (item.sizeWatch?.active) return false;
  return true;
}

/** OOS styles that may return — not discontinued. */
export function isRestockingSoon(item: StockSortable): boolean {
  return item.stockStatus === "oos";
}

function byNewestSave(a: StockSortable, b: StockSortable): number {
  return Date.parse(b.savedAt) - Date.parse(a.savedAt);
}

export function partitionWishlist<T extends StockSortable>(rows: T[]): {
  available: T[];
  restocking: T[];
  buried: T[];
} {
  const available = rows.filter(isSizeAvailable).sort(byNewestSave);
  const restocking = rows.filter(isRestockingSoon).sort(byNewestSave);
  const buried = rows
    .filter((row) => !isSizeAvailable(row) && !isRestockingSoon(row))
    .sort(byNewestSave);
  return { available, restocking, buried };
}
