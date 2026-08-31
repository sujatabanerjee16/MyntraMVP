import { describe, expect, it } from "vitest";
import {
  occasionBadgeLabel,
  thisMonthWindow,
  thisWeekWindow,
  validateOccasionWrite,
} from "./occasion";

describe("occasion copy and windows", () => {
  it("uses Trip for Vacation badges", () => {
    expect(occasionBadgeLabel("Vacation", 3)).toBe("Trip in 3 days");
    expect(occasionBadgeLabel("Wedding", 7)).toBe("Wedding in 7 days");
    expect(occasionBadgeLabel("Vacation", 0)).toBe("Trip today");
  });

  it("builds this-week and this-month windows from today", () => {
    expect(thisWeekWindow("2026-08-29")).toEqual({
      window_start: "2026-08-29",
      window_end: "2026-09-04",
    });
    expect(thisMonthWindow("2026-08-29")).toEqual({
      window_start: "2026-08-29",
      window_end: "2026-08-31",
    });
  });

  it("requires a date or a window", () => {
    expect(validateOccasionWrite({ label: "Vacation" })).toBe(
      "target_date or window_start is required",
    );
    expect(
      validateOccasionWrite({ label: "Vacation", target_date: "2026-09-01" }),
    ).toBeNull();
  });
});
