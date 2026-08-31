import { describe, expect, it } from "vitest";
import { FEATURE_FLAGS } from "../domain/flags";
import { acceptReengagementWrite } from "./reengagementWrite";

describe("EC-MON-003 re-engagement write guardrail", () => {
  it("accepts a legal type", () => {
    const result = acceptReengagementWrite({ type: "size_available" });
    expect(result).toEqual({
      ok: true,
      status: 200,
      type: "size_available",
    });
  });

  it("rejects price_drop with 400", () => {
    const result = acceptReengagementWrite({ type: "price_drop" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it("rejects discount-shaped fields with 400", () => {
    expect(
      acceptReengagementWrite({
        type: "size_available",
        percent_off: 20,
      }).status,
    ).toBe(400);
    expect(
      acceptReengagementWrite({
        type: "back_in_stock",
        coupon_code: "SAVE20",
      }).status,
    ).toBe(400);
  });
});

describe("EC-FLG-006 / architecture §14", () => {
  it("reeng.price_drop is permanently off", () => {
    expect(FEATURE_FLAGS["reeng.price_drop"]).toBe(false);
  });
});
