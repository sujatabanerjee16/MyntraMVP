import { describe, expect, it } from "vitest";
import { TAXONOMY_VERSION } from "../domain/models";
import { createDiscoverRuntime } from "../runtime";

describe("Phase 1 taxonomy and classify", () => {
  it("publishes taxonomy v1 and stamps every classification", () => {
    const runtime = createDiscoverRuntime();
    const tax = runtime.api.getTaxonomy();
    expect(tax.ok && tax.body.version).toBe("v1");
    expect(runtime.store.classifications.length).toBe(runtime.store.excerpts.length);
    expect(
      runtime.store.classifications.every((row) => row.taxonomy_version === TAXONOMY_VERSION),
    ).toBe(true);
  });

  it("is idempotent on re-run", () => {
    const runtime = createDiscoverRuntime();
    const first = runtime.store.classifications.length;
    const again = runtime.api.runClassify();
    expect(again.ok && again.body.classified).toBe(0);
    expect(again.ok && again.body.skipped).toBe(first);
    expect(runtime.store.classifications.length).toBe(first);
  });

  it("tags both platforms on a multi-app line (EC-ATR-002)", () => {
    const runtime = createDiscoverRuntime();
    const row = runtime.store.classifications.find((item) => {
      const excerpt = runtime.store.excerpts.find((ex) => ex.id === item.excerpt_id);
      return excerpt?.text.includes("Saved on Myntra but bought on Ajio");
    });
    const platforms = row?.platforms.map((tag) => tag.platform) ?? [];
    expect(platforms).toContain("myntra");
    expect(platforms).toContain("ajio");
  });

  it("does not default generic Reddit to Myntra", () => {
    const runtime = createDiscoverRuntime();
    const row = runtime.store.classifications.find((item) => {
      const excerpt = runtime.store.excerpts.find((ex) => ex.id === item.excerpt_id);
      return excerpt?.text.includes("The other app is cheaper");
    });
    const platforms = row?.platforms.map((tag) => tag.platform) ?? [];
    expect(platforms).toContain("other");
    expect(platforms).not.toContain("myntra");
  });

  it("allows price/sale waiting as a reason", () => {
    const runtime = createDiscoverRuntime();
    expect(
      runtime.store.classifications.some((row) =>
        row.reasons.some((reason) => reason.category === "price_waiting"),
      ),
    ).toBe(true);
  });

  it("gold set of 20 excerpts never invents a platform name", () => {
    const runtime = createDiscoverRuntime();
    const gold = runtime.store.excerpts.slice(0, 20);
    expect(gold.length).toBeGreaterThanOrEqual(20);
    for (const excerpt of gold) {
      const row = runtime.store.classifications.find((item) => item.excerpt_id === excerpt.id);
      const document = runtime.store.documents.find((doc) => doc.id === excerpt.document_id);
      expect(row).toBeTruthy();
      for (const tag of row?.platforms ?? []) {
        const named = new RegExp(`\\b${tag.platform}\\b`, "i").test(excerpt.text);
        const fromSource = document?.platform_of_source === tag.platform;
        const otherOk = tag.platform === "other" && /other app/i.test(excerpt.text);
        expect(named || fromSource || otherOk).toBe(true);
      }
    }
  });
});
