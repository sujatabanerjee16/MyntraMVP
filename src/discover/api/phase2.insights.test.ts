import { describe, expect, it } from "vitest";
import { createDiscoverRuntime } from "../runtime";

describe("Phase 2 insights", () => {
  it("returns ranked reasons with envelope fields", () => {
    const runtime = createDiscoverRuntime();
    const reasons = runtime.api.getReasons({});
    expect(reasons.ok).toBe(true);
    if (!reasons.ok) return;
    expect(reasons.body.taxonomy_version).toBe("v1");
    expect(reasons.body.evidence_n).toBeGreaterThan(0);
    expect(reasons.body.items.length).toBeGreaterThan(0);
    expect(reasons.body.denominator_note).toMatch(/classified excerpts/i);
    expect(reasons.body.empty).toBe(false);
  });

  it("Age 18–24 excludes unaged Play reviews (EC-SEG-001)", () => {
    const runtime = createDiscoverRuntime();
    const reasons = runtime.api.getReasons({ segment: "age_18_24" });
    expect(reasons.ok).toBe(true);
    if (!reasons.ok) return;
    const evidence = runtime.api.getEvidence({ segment: "age_18_24" });
    expect(evidence.ok && evidence.body.items.every((row) => row.segment === "age_18_24")).toBe(
      true,
    );
    const all = runtime.api.getReasons({});
    expect(all.ok && reasons.body.evidence_n < all.body.evidence_n).toBe(true);
  });

  it("reason × platform heatmap uses excerpt counts, not rates", () => {
    const runtime = createDiscoverRuntime();
    const heat = runtime.api.getHeatmap({}, "platform");
    expect(heat.ok).toBe(true);
    if (!heat.ok) return;
    expect(heat.body.empty).toBe(false);
    expect(heat.body.cells.every((cell) => cell.n > 0)).toBe(true);
    expect(JSON.stringify(heat.body)).not.toMatch(/0%/);
  });

  it("empty filter slice is empty, not 0% (EC-EMP-001)", () => {
    const runtime = createDiscoverRuntime();
    const reasons = runtime.api.getReasons({
      segment: "age_25_35",
      category: "footwear",
      source_type: "youtube",
    });
    expect(reasons.ok && reasons.body.empty).toBe(true);
    if (reasons.ok) {
      expect(reasons.body.items).toHaveLength(0);
      expect(JSON.stringify(reasons.body)).not.toMatch(/0%/);
    }
  });
});
