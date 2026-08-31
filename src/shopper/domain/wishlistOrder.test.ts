import { describe, expect, it } from "vitest";
import { isRestockingSoon, isSizeAvailable, partitionWishlist } from "./wishlistOrder";
import type { StockSortable } from "./wishlistOrder";

function row(patch: Partial<StockSortable> & Pick<StockSortable, "id">): StockSortable {
  return {
    savedAt: "2026-08-10T10:00:00.000Z",
    stockStatus: "in_stock",
    sizeWatch: null,
    selectedSize: "M",
    ...patch,
  };
}

describe("wishlist stock order", () => {
  it("treats in-stock with no active size watch as available", () => {
    expect(isSizeAvailable(row({ id: "a" }))).toBe(true);
    expect(isSizeAvailable(row({ id: "b", sizeWatch: { size: "S", active: false } }))).toBe(true);
    expect(isSizeAvailable(row({ id: "c", stockStatus: "oos" }))).toBe(false);
    expect(isSizeAvailable(row({ id: "d", sizeWatch: { size: "S", active: true } }))).toBe(false);
    expect(isRestockingSoon(row({ id: "e", stockStatus: "oos" }))).toBe(true);
    expect(isRestockingSoon(row({ id: "f", stockStatus: "discontinued" }))).toBe(false);
  });

  it("elevates size-available items and keeps OOS in restocking, not interleaved", () => {
    const oos = row({ id: "oos", stockStatus: "oos", savedAt: "2026-08-20T10:00:00.000Z" });
    const older = row({ id: "old", savedAt: "2026-08-01T10:00:00.000Z" });
    const newer = row({ id: "new", savedAt: "2026-08-18T10:00:00.000Z" });
    const dead = row({ id: "dead", stockStatus: "discontinued", savedAt: "2026-08-22T10:00:00.000Z" });
    const split = partitionWishlist([oos, older, newer, dead]);
    expect(split.available.map((item) => item.id)).toEqual(["new", "old"]);
    expect(split.restocking.map((item) => item.id)).toEqual(["oos"]);
    expect(split.buried.map((item) => item.id)).toEqual(["dead"]);
  });
});
