import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_REENGAGEMENT_TYPES,
  REENGAGEMENT_TYPES,
  copyLooksMonetary,
  isForbiddenReengagementType,
  isReengagementType,
} from "./reengagementTypes";

describe("EC-MON-003 / P0 enum guardrail", () => {
  it("allowed types are only the four non-monetary values", () => {
    expect([...REENGAGEMENT_TYPES]).toEqual([
      "back_in_stock",
      "size_available",
      "occasion_approaching",
      "similar_search",
    ]);
  });

  it("allowed types list does not include monetary types", () => {
    for (const forbidden of FORBIDDEN_REENGAGEMENT_TYPES) {
      expect(REENGAGEMENT_TYPES).not.toContain(forbidden);
    }
    expect(isReengagementType("price_drop")).toBe(false);
    expect(isForbiddenReengagementType("price_drop")).toBe(true);
  });

  it("detects monetary notification copy", () => {
    expect(copyLooksMonetary("Price Drop Alert — 20% off")).toBe(true);
    expect(copyLooksMonetary("Back in Stock, Size M available")).toBe(false);
  });
});
