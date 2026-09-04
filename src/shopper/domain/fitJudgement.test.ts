import { describe, expect, it } from "vitest";
import { fitFromPastBuys } from "./fitJudgement";
import type { PurchaseRecord, ProductReview, SizingReturn } from "./stylist";

const dressM: PurchaseRecord = {
  id: "p1",
  userId: "user-demo",
  productId: "prod-libas",
  purchasedAt: "2026-07-15T00:00:00.000Z",
  price: 3299,
  size: "M",
  brand: "Libas",
  title: "Floral Printed Wrap Midi Dress",
  articleType: "dress",
  category: "WOMEN",
};

describe("fit from past buys", () => {
  it("says a smaller saved size will not fit", () => {
    const judge = fitFromPastBuys(
      { productId: "prod-biba", selectedSize: "S", catalog: { title: "Ethnic A-Line Anarkali Kurta" } },
      [
        {
          ...dressM,
          productId: "prod-anouk-live",
          title: "Embroidered Kurta Set",
          articleType: "kurta",
          brand: "Anouk",
        },
      ],
      [],
      [],
    );
    expect(judge.verdict).toBe("may_not_fit");
    expect(judge.headline).toMatch(/may not fit/i);
    expect(judge.reason).toMatch(/M/);
    expect(judge.reason).toMatch(/S/);
    expect(judge.reason).not.toMatch(/availab|watch|restock|out of stock/i);
  });

  it("says the same size as a past buy should fit", () => {
    const judge = fitFromPastBuys(
      { productId: "prod-occasion", selectedSize: "M", catalog: { title: "Flared Ethnic Maxi" } },
      [dressM],
      [],
      [],
    );
    expect(judge.verdict).toBe("will_fit");
    expect(judge.headline).toMatch(/should fit/i);
    expect(judge.reason).toMatch(/Libas/);
  });

  it("flags a same-size save that runs small after a tight return", () => {
    const returns: SizingReturn[] = [
      { id: "r1", userId: "user-demo", productId: "prod-linen", returnedAt: "2026-08-01T00:00:00.000Z", reason: "too_small" },
    ];
    const reviews: ProductReview[] = [
      { id: "rv1", productId: "prod-linen", createdAt: "2026-08-01T00:00:00.000Z", rating: 3, fit: "runs_small" },
    ];
    const judge = fitFromPastBuys(
      { productId: "prod-linen", selectedSize: "M", catalog: { title: "Regular Fit Linen Shirt" } },
      [{ ...dressM, size: "M", articleType: "shirt", title: "Oxford Casual Shirt", brand: "HERE&NOW" }],
      returns,
      reviews,
    );
    expect(judge.verdict).toBe("may_not_fit");
    expect(judge.reason).toMatch(/runs small/i);
  });
});
