import { describe, expect, it } from "vitest";
import { compareCards, compareClusters, recommendFromHistory } from "./compare";
import { SEED_ITEMS } from "../store";
import { DEMO_USER_ID, type WishlistItem } from "./models";
import type { PurchaseRecord } from "./stylist";

function kurta(id: string, title: string, savedAt: string): WishlistItem {
  return {
    ...SEED_ITEMS[1],
    id,
    user_id: DEMO_USER_ID,
    productId: `prod-${id}`,
    sku: `sku-${id}`,
    tag: "occasion",
    occasionDate: null,
    savedAt,
    stockStatus: "in_stock",
    sizeWatch: null,
    catalog: { brand: "Anouk", title, image_url: "/shopper/women-kurta.jpg" },
  };
}

describe("wishlist compare clusters", () => {
  it("groups two or more of the same article in a category", () => {
    const rows = [
      kurta("k1", "Cotton Straight Kurta", "2026-08-20T10:00:00.000Z"),
      kurta("k2", "Embroidered Festive Kurta", "2026-08-21T10:00:00.000Z"),
      SEED_ITEMS[4],
    ];
    const clusters = compareClusters(rows);
    expect(clusters.some((row) => row.article === "kurta" && row.count === 2)).toBe(true);
    expect(clusters.every((row) => row.count >= 2)).toBe(true);
  });

  it("does not cluster a discontinued kurta with live kurtas", () => {
    const live = kurta("k1", "Cotton Straight Kurta", "2026-08-20T10:00:00.000Z");
    const clusters = compareClusters([live, SEED_ITEMS.find((row) => row.stockStatus === "discontinued")!]);
    expect(clusters.some((row) => row.article === "kurta")).toBe(false);
  });

  it("marks the cheapest live card", () => {
    const a = kurta("k1", "Cotton Straight Kurta", "2026-08-20T10:00:00.000Z");
    const b = { ...kurta("k2", "Embroidered Festive Kurta", "2026-08-21T10:00:00.000Z"), currentPrice: 999 };
    const cluster = compareClusters([a, b])[0]!;
    const cards = compareCards([a, b], cluster);
    expect(cards.find((row) => row.cheapest)?.itemId).toBe("k2");
    expect(cards.every((row) => row.rating > 0 && row.ratingCount > 0)).toBe(true);
    expect(cards.every((row) => row.description.length > 8)).toBe(true);
  });

  it("does not mix Women dresses with Kids frocks", () => {
    const frock: WishlistItem = {
      ...SEED_ITEMS[0],
      id: "frock-1",
      productId: "prod-kids-frock",
      sku: "sku-kids-frock",
      catalog: { brand: "Babyhug", title: "Girls Party Frock", image_url: "/shopper/kids-frock.jpg" },
    };
    const clusters = compareClusters([SEED_ITEMS[0], SEED_ITEMS[3], frock]);
    expect(clusters.some((row) => row.key === "WOMEN:dress" && row.count === 2)).toBe(true);
    expect(clusters.every((row) => row.category !== "KIDS")).toBe(true);
    expect(clusters.every((row) => row.article !== "frock")).toBe(true);
  });

  it("hides out-of-stock cards when inStockOnly is on", () => {
    const live = kurta("k1", "Cotton Straight Kurta", "2026-08-20T10:00:00.000Z");
    const oos = { ...kurta("k2", "Embroidered Festive Kurta", "2026-08-21T10:00:00.000Z"), stockStatus: "oos" as const };
    const cluster = compareClusters([live, oos])[0]!;
    expect(compareCards([live, oos], cluster, true)).toHaveLength(1);
    expect(compareCards([live, oos], cluster, true)[0]?.itemId).toBe("k1");
  });

  it("recommends from purchase history and skips a SKU already bought", () => {
    const libas = { ...SEED_ITEMS[0], currentPrice: 3299 };
    const maxi = { ...SEED_ITEMS[2], currentPrice: 2799 };
    const cluster = compareClusters([libas, maxi])[0]!;
    const cards = compareCards([libas, maxi], cluster);
    const purchases: PurchaseRecord[] = [
      {
        id: "po-1",
        userId: DEMO_USER_ID,
        productId: "prod-libas",
        purchasedAt: "2026-07-01T00:00:00.000Z",
        price: 3299,
        size: "M",
        brand: "Libas",
        title: "Floral Printed Wrap Midi Dress",
        articleType: "dress",
        category: "WOMEN",
      },
      {
        id: "po-2",
        userId: DEMO_USER_ID,
        productId: "prod-anouk-live",
        purchasedAt: "2026-08-16T00:00:00.000Z",
        price: 2499,
        size: "M",
        brand: "Anouk",
        title: "Embroidered Kurta Set",
        articleType: "kurta",
        category: "WOMEN",
      },
    ];
    const pick = recommendFromHistory(cards, purchases);
    expect(pick?.itemId).toBe(maxi.id);
    expect(pick?.why).toMatch(/Anouk|ethnic/i);
  });
});
