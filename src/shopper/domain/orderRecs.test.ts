import { describe, expect, it } from "vitest";
import { allCatalog } from "../store";
import { recommendForOrder } from "./orderRecs";

describe("order recs", () => {
  it("pairs a dress checkout with an accessory, not the same product", () => {
    const offer = recommendForOrder(
      {
        productId: "prod-libas",
        catalog: { brand: "Libas", title: "Floral Printed Wrap Midi Dress" },
        tag: "price_drop",
        occasionDate: null,
      },
      allCatalog(),
      "2026-08-30T10:00:00.000Z",
    );
    expect(offer.picks.length).toBeGreaterThan(0);
    expect(offer.picks.every((row) => row.product.productId !== "prod-libas")).toBe(true);
    expect(offer.picks[0]?.product.title).toMatch(/earring|lip|jewel|sneaker/i);
    expect(offer.cartRead).toMatch(/price-drop/i);
  });

  it("mentions occasion timing when a date is tagged", () => {
    const offer = recommendForOrder(
      {
        productId: "prod-occasion",
        catalog: { brand: "Sassafras", title: "Flared Ethnic Maxi" },
        tag: "occasion",
        occasionDate: "2026-09-05T00:00:00.000Z",
      },
      allCatalog(),
      "2026-08-30T00:00:00.000Z",
    );
    expect(offer.cartRead).toMatch(/6 day/);
    expect(offer.picks[0]?.why).toMatch(/occasion/i);
  });
});
