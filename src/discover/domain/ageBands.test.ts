import { describe, expect, it } from "vitest";
import { mapAgeBand } from "./ageBands";

describe("Phase 0 age band mapping", () => {
  it("maps both survey bands", () => {
    expect(mapAgeBand("18-24")).toBe("age_18_24");
    expect(mapAgeBand("18–24")).toBe("age_18_24");
    expect(mapAgeBand("18 to 24")).toBe("age_18_24");
    expect(mapAgeBand("age_18_24")).toBe("age_18_24");
    expect(mapAgeBand("25-35")).toBe("age_25_35");
    expect(mapAgeBand("25–35")).toBe("age_25_35");
    expect(mapAgeBand("25 to 35")).toBe("age_25_35");
    expect(mapAgeBand("age_25_35")).toBe("age_25_35");
  });

  it("does not invent a segment", () => {
    expect(mapAgeBand(null)).toBe("unknown");
    expect(mapAgeBand("gen z")).toBe("unknown");
  });
});
