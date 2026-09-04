import { describe, expect, it } from "vitest";
import { occasionBrief } from "./occasionBrief";

describe("occasion brief", () => {
  it("names the occasion and counts days from a past buy date", () => {
    const brief = occasionBrief(
      {
        catalog: { title: "Flared Ethnic Maxi" },
        bucketId: "wedding",
        occasionDate: "2026-09-15T00:00:00.000Z",
      },
      "2026-08-30T04:30:00.000Z",
    );
    expect(brief.label).toBe("Friend's Wedding");
    expect(brief.countdown).toMatch(/days away/);
    expect(brief.dateLabel).toMatch(/Sep/);
  });

  it("asks for a date when none is set", () => {
    const brief = occasionBrief(
      { catalog: { title: "Pleated Party Dress" }, bucketId: null, occasionDate: null },
      "2026-08-30T04:30:00.000Z",
    );
    expect(brief.label).toBe("A night out");
    expect(brief.countdown).toBeNull();
    expect(brief.dateLabel).toBeNull();
  });
});
