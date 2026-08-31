import { describe, expect, it } from "vitest";
import {
  buildSaveContextSummary,
  calendarDaysSinceSave,
  formatRelativeDaysAgo,
  normalizeSource,
  sanitizeNote,
  sanitizeReferringQuery,
  truncateNote,
} from "./saveContext";

const now = new Date("2026-08-29T10:00:00+05:30");

describe("save context summary (i18n contract)", () => {
  it("builds the architecture search example", () => {
    expect(
      buildSaveContextSummary(
        { source: "search", referring_query: "linen shirt" },
        "2026-08-17T10:00:00.000Z",
        now,
      ),
    ).toBe("Saved from search “linen shirt” · 12 days ago");
  });

  it("EC-CTX-001 PDP vs search summaries differ", () => {
    const search = buildSaveContextSummary(
      { source: "search", referring_query: "linen shirt" },
      "2026-08-17T10:00:00.000Z",
      now,
    );
    const pdp = buildSaveContextSummary(
      { source: "pdp", referring_query: null },
      "2026-08-17T10:00:00.000Z",
      now,
    );
    expect(search).not.toBe(pdp);
    expect(pdp).toBe("Saved from the product page · 12 days ago");
  });

  it("EC-CTX-002 search with empty query has no empty quotes", () => {
    const summary = buildSaveContextSummary(
      { source: "search", referring_query: "   " },
      "2026-08-17T10:00:00.000Z",
      now,
    );
    expect(summary).toBe("Saved from search · 12 days ago");
    expect(summary).not.toMatch(/“”/);
  });

  it("EC-CTX-010 uses calendar days, not raw UTC floor", () => {
    expect(calendarDaysSinceSave("2026-08-17T10:00:00.000Z", now)).toBe(12);
    expect(formatRelativeDaysAgo(0)).toBe("today");
    expect(formatRelativeDaysAgo(1)).toBe("1 day ago");
  });

  it("EC-CTX-009 missing source becomes other", () => {
    expect(normalizeSource(undefined)).toBe("other");
    expect(normalizeSource("pdp-typo")).toBe("other");
    expect(
      buildSaveContextSummary(
        { source: "other", referring_query: null },
        now.toISOString(),
        now,
      ),
    ).toBe("Saved · today");
  });
});

describe("note validation", () => {
  it("accepts 280 characters and rejects 281", () => {
    expect(sanitizeNote("x".repeat(280)).ok).toBe(true);
    expect(sanitizeNote("x".repeat(281))).toEqual({
      ok: false,
      error: "note must be 280 characters or fewer",
    });
  });

  it("strips control characters and treats blank as empty", () => {
    const result = sanitizeNote("hello\u0000 world  ");
    expect(result).toEqual({ ok: true, note: "hello world" });
    expect(sanitizeNote("   ")).toEqual({ ok: true, note: null });
  });

  it("truncates a long note for the card", () => {
    const long = "Need this linen shirt for the Goa trip next month and maybe the wedding after that";
    const shown = truncateNote(long, 24);
    expect(shown.truncated).toBe(true);
    expect(shown.text.endsWith("…")).toBe(true);
    expect(shown.text.length).toBeLessThan(long.length);
  });
});

describe("referring query", () => {
  it("trims and caps at 200 characters", () => {
    expect(sanitizeReferringQuery("  linen   shirt  ")).toBe("linen shirt");
    expect(sanitizeReferringQuery("q".repeat(250))?.length).toBe(200);
    expect(sanitizeReferringQuery("")).toBeNull();
  });
});
