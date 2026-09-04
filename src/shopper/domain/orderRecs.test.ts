import { describe, expect, it } from "vitest";
import { allCatalog } from "../store";
import { recommendForOrder } from "./orderRecs";

describe("order recs", () => {
  it("pairs a dress checkout with an accessory, not the same product", () => {
    const offer = recommendForOrder(
      {
        productId: "prod-libas",
        catalog: { brand: "Libas", title: "Floral Printed Wrap Midi Dress" },
        tag: "bookmarking",
        occasionDate: null,
      },
      allCatalog(),
      "2026-08-30T10:00:00.000Z",
    );
    expect(offer.picks.length).toBeGreaterThan(0);
    expect(offer.picks.every((row) => row.product.productId !== "prod-libas")).toBe(true);
    expect(offer.picks[0]?.product.title).toMatch(/earring|lip|jewel|sneaker/i);
    const kinds = offer.picks.map((row) => `${row.product.category}:${row.product.title}`);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(offer.picks.filter((row) => /lip|serum|kit|palette|cream/i.test(row.product.title)).length).toBeLessThanOrEqual(1);
    expect(offer.cartRead).not.toMatch(/price-drop|% off|discount/i);
  });

  it("does not recommend a look that reuses the bag photo", () => {
    const offer = recommendForOrder(
      {
        productId: "prod-chinos",
        catalog: { brand: "WROGN", title: "Slim Fit Chinos" },
        tag: "quality_trust",
        occasionDate: null,
      },
      allCatalog(),
      "2026-08-30T10:00:00.000Z",
    );
    const bag = allCatalog().find((row) => row.productId === "prod-chinos")!;
    const linen = allCatalog().find((row) => row.productId === "prod-linen")!;
    expect(bag.image_url).not.toBe(linen.image_url);
    expect(offer.picks.every((row) => row.product.image_url !== bag.image_url)).toBe(true);
  });

  it("pairs a shirt checkout with jeans or sneakers, not earrings", () => {
    const offer = recommendForOrder(
      {
        productId: "prod-linen",
        catalog: { brand: "H&M", title: "Regular Fit Linen Shirt" },
        tag: "compare",
        occasionDate: null,
      },
      allCatalog(),
      "2026-08-30T10:00:00.000Z",
    );
    expect(offer.picks.length).toBeGreaterThan(0);
    expect(offer.picks.every((row) => !/earring|jewel|cushion|curtain/i.test(row.product.title))).toBe(true);
    expect(offer.picks.some((row) => /jean|sneaker/i.test(row.product.title))).toBe(true);
  });

  it("keeps an infant checkout in kids, never earrings", () => {
    const offer = recommendForOrder(
      {
        productId: "prod-pic-infant-set",
        catalog: { brand: "Hopscotch", title: "Infant Floral Vest Set" },
        tag: "quality_trust",
        occasionDate: null,
      },
      allCatalog(),
      "2026-08-30T10:00:00.000Z",
    );
    expect(offer.picks.length).toBeGreaterThan(0);
    expect(offer.picks.every((row) => row.product.category === "KIDS")).toBe(true);
    expect(offer.picks.every((row) => !/earring|jewel|dress|saree/i.test(row.product.title))).toBe(true);
    expect(offer.picks[0]?.why).toMatch(/kids piece/i);
  });

  it("mentions quality when the bag was parked for trust", () => {
    const offer = recommendForOrder(
      {
        productId: "prod-occasion",
        catalog: { brand: "Sassafras", title: "Flared Ethnic Maxi" },
        tag: "quality_trust",
        occasionDate: null,
      },
      allCatalog(),
      "2026-08-30T00:00:00.000Z",
    );
    expect(offer.cartRead).toMatch(/quality/i);
    expect(offer.picks[0]?.why).toMatch(/quality/i);
  });
});
