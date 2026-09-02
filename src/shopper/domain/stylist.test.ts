import { describe, expect, it } from "vitest";
import {
  aggregateFit,
  analyzePrice,
  DEFAULT_STYLIST_WEIGHTS,
  fitScore,
  inferArticleType,
  isNearDuplicate,
  recommendStylist,
  type PricePoint,
  type ProductReview,
  type PurchaseRecord,
  type SizingReturn,
  type StylistProduct,
} from "./stylist";

const NOW = "2026-08-30T04:30:00.000Z";

function ago(days: number): string {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString();
}

function product(patch: Partial<StylistProduct> & Pick<StylistProduct, "productId" | "title">): StylistProduct {
  return {
    sku: `${patch.productId}-sku`,
    brand: "TestBrand",
    price: 1999,
    size: "M",
    sizeOos: false,
    image_url: "/shopper/women-dress.jpg",
    category: "WOMEN",
    ...patch,
  };
}

function buy(patch: Partial<PurchaseRecord> & Pick<PurchaseRecord, "productId" | "title" | "articleType">): PurchaseRecord {
  return {
    id: `po-${patch.productId}`,
    userId: "user-a",
    purchasedAt: ago(20),
    price: 2499,
    size: "M",
    brand: "Libas",
    category: "WOMEN",
    ...patch,
  };
}

function history(productId: string, samples: Array<[number, number]>): PricePoint[] {
  return samples.map(([daysAgo, price]) => ({ productId, observedAt: ago(daysAgo), price }));
}

const earrings = product({
  productId: "c-earrings",
  title: "Styled Drop Earrings",
  brand: "Myntra Studio",
  price: 599,
  category: "STUDIO",
});
const otherDress = product({
  productId: "c-dress",
  title: "Pleated Party Dress",
  brand: "Vero Moda",
  price: 2499,
});
const sameKurta = product({
  productId: "c-anouk-2",
  title: "Printed Straight Kurta",
  brand: "Anouk",
  price: 1899,
});
const risingLip = product({
  productId: "c-lip",
  title: "Superstay Lipstick",
  brand: "Maybelline",
  price: 499,
  category: "BEAUTY",
});
const genuineSerum = product({
  productId: "c-serum",
  title: "Vitamin C Serum",
  brand: "Lakme",
  price: 699,
  category: "BEAUTY",
});
const fakeSaleDress = product({
  productId: "c-fake",
  title: "Floral Summer Dress",
  brand: "W",
  price: 1999,
});
const noSignalLamp = product({
  productId: "c-lamp",
  title: "Table Lamp",
  brand: "Random",
  price: 1499,
  category: "HOME",
});
const oosDress = product({
  productId: "c-oos",
  title: "Printed Fit & Flare Dress",
  brand: "Global Desi",
  sizeOos: true,
});
const runsLargeTop = product({
  productId: "c-large",
  title: "Mesh Party Top",
  brand: "Urbanic",
  price: 1299,
  category: "GENZ",
});
const runsSmallDress = product({
  productId: "c-small",
  title: "Wrap Midi Dress",
  brand: "W",
  price: 1899,
});

const dressBuy = buy({
  productId: "bought-dress",
  title: "Floral Printed Wrap Midi Dress",
  articleType: "dress",
  brand: "Libas",
});
const kurtaBuy = buy({
  productId: "bought-kurta",
  title: "Embroidered Kurta Set",
  articleType: "kurta",
  brand: "Anouk",
  purchasedAt: ago(10),
});

describe("stylist article types", () => {
  it("infers garment vs accessory from the title", () => {
    expect(inferArticleType("Ethnic A-Line Anarkali Kurta")).toBe("kurta");
    expect(inferArticleType("Pique Polo T-Shirt")).toBe("polo");
    expect(inferArticleType("Styled Drop Earrings")).toBe("earrings");
    expect(inferArticleType("Flared Ethnic Maxi")).toBe("dress");
  });
});

describe("stylist purchase signal", () => {
  it("ranks complementary accessories above another dress", () => {
    const recs = recommendStylist({
      userId: "user-a",
      nowIso: NOW,
      catalog: [earrings, otherDress, genuineSerum],
      purchases: [dressBuy, kurtaBuy],
      priceHistory: [],
      reviews: [],
      sizingReturns: [],
      limit: 3,
    });
    expect(recs.map((row) => row.product.productId)).toContain("c-earrings");
    expect(recs[0]?.product.productId).not.toBe("c-dress");
    expect(recs.find((row) => row.product.productId === "c-earrings")?.flags.complementary).toBe(true);
    expect(recs.find((row) => row.product.productId === "c-earrings")?.parts.purchase).toBeGreaterThan(
      recs.find((row) => row.product.productId === "c-dress")?.parts.purchase ?? 0,
    );
  });

  it("skips the purchased SKU and a near-duplicate recent kurta", () => {
    const recs = recommendStylist({
      userId: "user-a",
      nowIso: NOW,
      catalog: [
        product({ productId: "bought-kurta", title: "Embroidered Kurta Set", brand: "Anouk" }),
        sameKurta,
        earrings,
      ],
      purchases: [kurtaBuy],
      priceHistory: [],
      reviews: [],
      sizingReturns: [],
      limit: 5,
    });
    expect(recs.every((row) => row.product.productId !== "bought-kurta")).toBe(true);
    expect(recs.every((row) => row.product.productId !== "c-anouk-2")).toBe(true);
    expect(isNearDuplicate(sameKurta, [kurtaBuy], NOW)).toBe(true);
  });

  it("does not skip a different brand's same article as a duplicate — only downranks it", () => {
    expect(isNearDuplicate(otherDress, [dressBuy], NOW)).toBe(false);
  });
});

describe("stylist price trend", () => {
  it("flags a genuine drop vs the 60-day average, not a post-hike sale", () => {
    const genuine = analyzePrice(
      history("c-serum", [
        [56, 899],
        [42, 899],
        [28, 879],
        [14, 849],
        [0, 699],
      ]),
      genuineSerum,
      NOW,
    );
    const fake = analyzePrice(
      history("c-fake", [
        [56, 1899],
        [42, 1899],
        [28, 1899],
        [14, 2499],
        [7, 2399],
        [0, 1999],
      ]),
      fakeSaleDress,
      NOW,
    );
    expect(genuine.genuineDiscount).toBe(true);
    expect(genuine.fakeSale).toBe(false);
    expect(fake.fakeSale).toBe(true);
    expect(fake.genuineDiscount).toBe(false);
    expect(genuine.score).toBeGreaterThan(fake.score);
  });

  it("deprioritizes a rising 60-day series", () => {
    const rising = analyzePrice(
      history("c-lip", [
        [56, 399],
        [42, 429],
        [28, 449],
        [14, 479],
        [0, 499],
      ]),
      risingLip,
      NOW,
    );
    expect(rising.rising).toBe(true);
    expect(rising.genuineDiscount).toBe(false);
    expect(rising.score).toBeLessThan(0.35);
  });

  it("treats missing price history as neutral, not a penalty", () => {
    const missing = analyzePrice([], noSignalLamp, NOW);
    expect(missing.missing).toBe(true);
    expect(missing.score).toBe(0.5);
  });
});

describe("stylist fit from reviews", () => {
  it("aggregates majority fit and stays neutral when there are no fit reviews", () => {
    const reviews: ProductReview[] = [
      { id: "1", productId: "c-small", createdAt: ago(10), rating: 3, fit: "runs_small" },
      { id: "2", productId: "c-small", createdAt: ago(8), rating: 2, fit: "runs_small" },
      { id: "3", productId: "c-small", createdAt: ago(4), rating: 5, fit: "true_to_size" },
      { id: "4", productId: "c-earrings", createdAt: ago(4), rating: 5, fit: null },
    ];
    expect(aggregateFit(reviews, "c-small")).toBe("runs_small");
    expect(aggregateFit(reviews, "c-earrings")).toBe("unknown");
    expect(aggregateFit([], "c-lamp")).toBe("unknown");
    expect(fitScore("unknown", []).score).toBe(0.5);
  });

  it("weights runs-small down after a too-small return, and runs-large up", () => {
    const tooSmall: SizingReturn[] = [
      { id: "r1", userId: "user-a", productId: "x", returnedAt: ago(5), reason: "too_small" },
    ];
    expect(fitScore("runs_small", tooSmall).score).toBeLessThan(fitScore("runs_small", []).score);
    expect(fitScore("runs_large", tooSmall).score).toBeGreaterThan(fitScore("true_to_size", []).score);
  });
});

describe("stylist combined ranking", () => {
  it("uses 40/30/30 by default", () => {
    expect(DEFAULT_STYLIST_WEIGHTS).toEqual({ purchase: 0.4, price: 0.3, fit: 0.3 });
  });

  it("returns top-N with a why string, skipping OOS", () => {
    const recs = recommendStylist({
      userId: "user-a",
      nowIso: NOW,
      catalog: [earrings, genuineSerum, oosDress, otherDress],
      purchases: [dressBuy],
      priceHistory: history("c-serum", [
        [56, 899],
        [28, 879],
        [0, 699],
      ]),
      reviews: [{ id: "t", productId: "c-dress", createdAt: ago(3), rating: 5, fit: "true_to_size" }],
      sizingReturns: [],
      limit: 2,
    });
    expect(recs).toHaveLength(2);
    expect(recs.every((row) => row.reason.length > 0)).toBe(true);
    expect(recs.every((row) => !row.product.sizeOos)).toBe(true);
    expect(recs[0]?.score).toBeGreaterThanOrEqual(recs[1]?.score ?? 0);
  });

  it("still ranks when the user has no purchase history (purchase = 0.5)", () => {
    const recs = recommendStylist({
      userId: "user-empty",
      nowIso: NOW,
      catalog: [genuineSerum, risingLip, earrings],
      purchases: [dressBuy],
      priceHistory: [
        ...history("c-serum", [
          [56, 899],
          [0, 699],
        ]),
        ...history("c-lip", [
          [56, 399],
          [0, 499],
        ]),
      ],
      reviews: [],
      sizingReturns: [],
      limit: 3,
    });
    expect(recs.every((row) => row.parts.purchase === 0.5)).toBe(true);
    expect(recs[0]?.product.productId).toBe("c-serum");
    expect(recs.find((row) => row.product.productId === "c-lip")?.flags.rising).toBe(true);
  });

  it("does not invent a discount when price data is missing", () => {
    const recs = recommendStylist({
      userId: "user-a",
      nowIso: NOW,
      catalog: [noSignalLamp, earrings],
      purchases: [],
      priceHistory: [],
      reviews: [],
      sizingReturns: [],
      limit: 2,
    });
    expect(recs.every((row) => row.parts.price === 0.5)).toBe(true);
    expect(recs.every((row) => row.flags.genuineDiscount === false)).toBe(true);
    expect(recs.some((row) => /fresh pick while we learn your taste/i.test(row.reason))).toBe(true);
  });

  it("lets weights retune the ranking", () => {
    const catalog = [runsLargeTop, runsSmallDress];
    const reviews: ProductReview[] = [
      { id: "a", productId: "c-large", createdAt: ago(2), rating: 4, fit: "runs_large" },
      { id: "b", productId: "c-small", createdAt: ago(2), rating: 2, fit: "runs_small" },
    ];
    const returns: SizingReturn[] = [
      { id: "r", userId: "user-a", productId: "z", returnedAt: ago(1), reason: "too_small" },
    ];
    const fitFirst = recommendStylist({
      userId: "user-a",
      nowIso: NOW,
      catalog,
      purchases: [],
      priceHistory: [],
      reviews,
      sizingReturns: returns,
      weights: { purchase: 0, price: 0, fit: 1 },
      limit: 2,
    });
    expect(fitFirst[0]?.product.productId).toBe("c-large");
    expect(fitFirst[0]?.reason).toMatch(/too-small return/i);
  });
});
