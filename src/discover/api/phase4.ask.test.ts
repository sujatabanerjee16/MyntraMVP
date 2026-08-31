import { describe, expect, it } from "vitest";
import { createDiscoverRuntime } from "../runtime";

describe("Phase 4 Ask AI", () => {
  it("answers a grounded question with real excerpt ids", () => {
    const runtime = createDiscoverRuntime();
    const result = runtime.api.ask(
      "What causes users to postpone the purchase?",
      {},
    );
    expect(result.ok && result.body.refused).toBe(false);
    if (!result.ok) return;
    expect(result.body.citations.length).toBeGreaterThan(0);
    for (const id of result.body.citations) {
      expect(runtime.store.excerpts.some((row) => row.id === id)).toBe(true);
    }
  });

  it("refuses a conversion-rate question (EC-RAG-003)", () => {
    const runtime = createDiscoverRuntime();
    const result = runtime.api.ask("What is 30-day wishlist conversion?", {});
    expect(result.ok && result.body.refused).toBe(true);
    if (result.ok) {
      expect(result.body.citations).toHaveLength(0);
      expect(result.body.answer_markdown).toMatch(/Not in the corpus/i);
      expect(result.body.answer_markdown).not.toMatch(/\d+%/);
    }
  });

  it("refuses when the filter retrieves nothing (EC-RAG-002)", () => {
    const runtime = createDiscoverRuntime();
    const result = runtime.api.ask("What prevents purchase?", {
      segment: "age_25_35",
      category: "footwear",
      source_type: "youtube",
    });
    expect(result.ok && result.body.refused).toBe(true);
  });
});
