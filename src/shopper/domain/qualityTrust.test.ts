import { describe, expect, it } from "vitest";
import { fabricFrom, qualityBrief } from "./qualityTrust";

describe("quality brief", () => {
  it("pulls fabric, ratings, review total, quality comments, and two photos", () => {
    const brief = qualityBrief(
      {
        productId: "prod-occasion",
        catalog: { title: "Flared Ethnic Maxi", image_url: "/shopper/studio-dress.png" },
      },
      "Flared ethnic maxi with a gathered waist. Airy cotton-blend, easy for a ceremony.",
      [
        { id: "r1", productId: "prod-occasion", createdAt: "2026-08-01T00:00:00.000Z", rating: 5, fit: null },
        { id: "r2", productId: "prod-occasion", createdAt: "2026-08-02T00:00:00.000Z", rating: 4, fit: null },
      ],
    );
    expect(brief.fabric).toBe("Cotton-blend");
    expect(brief.description).toMatch(/gathered waist/);
    expect(brief.quotes.length).toBe(3);
    expect(brief.quotes.every((row) => /quality is good|quality feels|fabric quality is good|stitching/i.test(row.comment))).toBe(true);
    expect(brief.rating).toEqual({ average: 4.5, count: 2 });
    expect(brief.photos).toHaveLength(2);
    expect(new Set(brief.photos.map((row) => row.image_url)).size).toBe(2);
    expect(JSON.stringify(brief)).not.toMatch(/\d+(\.\d+)?\s*\/\s*10/);
    expect(JSON.stringify(brief)).not.toMatch(/87%/);
  });

  it("uses two dedicated customer photos when we have them", () => {
    const libas = qualityBrief(
      { productId: "prod-libas", catalog: { title: "Floral Printed Wrap Midi Dress", image_url: "/shopper/libas-product.png" } },
      "Floral wrap midi in printed viscose.",
    );
    expect(libas.photos).toHaveLength(2);
    expect(libas.photos.every((row) => /libas-ugc/.test(row.image_url))).toBe(true);
    expect(libas.quotes.some((row) => /quality is good/i.test(row.comment))).toBe(true);
    expect(fabricFrom("Floral Printed Wrap Midi Dress", "Floral wrap midi in printed viscose.")).toBe("Viscose drape");
  });

  it("does not reuse the same review on two different pieces", () => {
    const maxi = qualityBrief({ productId: "prod-occasion", catalog: { title: "Flared Ethnic Maxi" } }, "Airy cotton-blend.");
    const mini = qualityBrief(
      { productId: "prod-dress-cmp-1", catalog: { title: "Ruffled Off-Shoulder Mini Dress" } },
      "White off-shoulder mini with a ruffled bust.",
    );
    expect(maxi.quotes[0]?.comment).not.toBe(mini.quotes[0]?.comment);
    expect(maxi.description).not.toBe(mini.description);
  });
});
