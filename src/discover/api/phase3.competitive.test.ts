import { describe, expect, it } from "vitest";
import { createDiscoverRuntime } from "../runtime";

describe("Phase 3 competitive", () => {
  it("does not invent competitor conversion rates", () => {
    const runtime = createDiscoverRuntime();
    const motives = runtime.api.getCompetitiveMotives();
    const barriers = runtime.api.getCompetitiveBarriers();
    const themes = runtime.api.getSharedThemes();
    const blob = JSON.stringify({ motives, barriers, themes });
    expect(blob).not.toMatch(/conversion is \d/i);
    expect(blob).not.toMatch(/cvr/i);
    expect(motives.ok && motives.body.caption).toMatch(/not private/i);
  });

  it("marks thin platforms as insufficient coverage", () => {
    const runtime = createDiscoverRuntime();
    const barriers = runtime.api.getCompetitiveBarriers();
    expect(barriers.ok).toBe(true);
    if (!barriers.ok) return;
    const thin = barriers.body.items.filter((item) => item.insufficient);
    expect(thin.every((item) => item.evidence_n < 5)).toBe(true);
  });
});
