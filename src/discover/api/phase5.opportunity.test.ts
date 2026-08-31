import { describe, expect, it } from "vitest";
import { MIN_EVIDENCE } from "../domain/models";
import { createDiscoverRuntime } from "../runtime";

describe("Phase 5 confidence and opportunities", () => {
  it("never marks a thin cluster as high (EC-CNF-001)", () => {
    const runtime = createDiscoverRuntime();
    const areas = runtime.api.getOpportunities();
    expect(areas.ok).toBe(true);
    if (!areas.ok) return;
    expect(areas.body.items.every((item) => item.evidence_n >= MIN_EVIDENCE)).toBe(
      true,
    );
    expect(
      areas.body.items.every(
        (item) => item.confidence_bucket !== "high" || item.evidence_n >= MIN_EVIDENCE,
      ),
    ).toBe(true);
  });

  it("ties copy to conceptual conversion, not a fake rate", () => {
    const runtime = createDiscoverRuntime();
    const areas = runtime.api.getOpportunities();
    if (!areas.ok) return;
    const blob = JSON.stringify(areas.body);
    expect(blob).not.toMatch(/lift NS1/i);
    expect(blob).toMatch(/30 days/);
  });
});
