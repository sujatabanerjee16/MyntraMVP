import { describe, expect, it } from "vitest";
import { SEED_ITEMS } from "../store";
import { LIBAS_ID, BIBA_ID } from "./models";
import { canSendPriceDrop, canSendRestock, isDead, meetsPriceThreshold, occasionDue } from "./rules";

const libas = SEED_ITEMS.find((row) => row.id === LIBAS_ID)!;
const biba = SEED_ITEMS.find((row) => row.id === BIBA_ID)!;
const on = { priceDropAlerts: true, sizeRestockAlerts: true, occasionReminders: true };

describe("price threshold", () => {
  it("needs ₹50 or 5%, whichever is smaller", () => {
    expect(meetsPriceThreshold(2000, 1960)).toBe(false);
    expect(meetsPriceThreshold(700, 660)).toBe(true);
    expect(meetsPriceThreshold(5000, 4940)).toBe(true);
  });

  it("does not send a price-drop alert", () => {
    const dropped = { ...libas, currentPrice: 2639 };
    expect(canSendPriceDrop(dropped, on, "2026-08-30T10:00:00.000Z")).toEqual({ ok: false, reason: "disabled" });
    expect(
      canSendPriceDrop(dropped, { ...on, priceDropAlerts: false }, "2026-08-30T10:00:00.000Z"),
    ).toEqual({ ok: false, reason: "disabled" });
  });
});

describe("restock", () => {
  it("fires only for the watched size", () => {
    expect(canSendRestock(biba, "S", on).ok).toBe(true);
    expect(canSendRestock(biba, "L", on)).toEqual({ ok: false, reason: "wrong_size" });
  });
});

describe("occasion and dead", () => {
  it("is due within 7 days when a date is set", () => {
    const item = {
      ...libas,
      tag: "occasion" as const,
      occasionDate: "2026-09-05T00:00:00.000Z",
    };
    expect(occasionDue(item, "2026-08-30T00:00:00.000Z")).toBe(true);
    expect(occasionDue({ ...item, occasionDate: null }, "2026-08-30T00:00:00.000Z")).toBe(false);
  });

  it("flags discontinued or 60-day OOS", () => {
    expect(isDead({ ...libas, stockStatus: "discontinued" }, "2026-08-30T00:00:00.000Z")).toBe(true);
    expect(
      isDead(
        { ...libas, stockStatus: "oos", oosSince: "2026-06-30T00:00:00.000Z" },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toBe(true);
    expect(
      isDead(
        { ...libas, stockStatus: "oos", oosSince: "2026-08-20T00:00:00.000Z" },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toBe(false);
  });
});
