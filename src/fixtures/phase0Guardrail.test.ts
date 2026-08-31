import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countMonetaryLeak } from "../domain/analytics";
import {
  copyLooksMonetary,
  isForbiddenReengagementType,
} from "../domain/reengagementTypes";
import { INBOX_NOTIFICATIONS } from "./notifications";
import { WISHLIST_ITEMS } from "./wishlist";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("EC-MON-001 / EC-MON-002 fixtures and UI copy", () => {
  it("inbox does not inject a price-drop item", () => {
    for (const item of INBOX_NOTIFICATIONS) {
      expect(isForbiddenReengagementType(item.type)).toBe(false);
      expect(copyLooksMonetary(item.title)).toBe(false);
      expect(copyLooksMonetary(item.body)).toBe(false);
    }
  });

  it("wishlist keeps catalog price as display, not as an alert", () => {
    for (const item of WISHLIST_ITEMS) {
      expect(item.price.amount).toBeGreaterThan(0);
    }
  });

  it("source fixtures and UI do not contain Price Drop Alert copy", () => {
    const files = [
      "fixtures/notifications.ts",
      "fixtures/wishlist.ts",
      "ui/App.tsx",
    ];
    for (const relative of files) {
      const text = readFileSync(join(srcRoot, relative), "utf8");
      expect(text).not.toMatch(/Price Drop Alert/i);
      expect(text).not.toMatch(/20%\s*off/i);
      expect(text).not.toMatch(/type:\s*["']price_drop["']/);
    }
  });
});

describe("EC-MON-004 monetary_leak", () => {
  it("analytics sink count is 0 for the Phase 0 baseline stream", () => {
    const baseline = INBOX_NOTIFICATIONS.map((item) => ({
      name: "reengagement_sent",
      type: item.type,
    }));
    expect(countMonetaryLeak(baseline)).toBe(0);
  });

  it("counts a leaked price_drop event if one appears", () => {
    expect(
      countMonetaryLeak([{ name: "reengagement_sent", type: "price_drop" }]),
    ).toBe(1);
  });
});
