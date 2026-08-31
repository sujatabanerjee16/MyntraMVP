import { describe, expect, it } from "vitest";
import type { InventoryAvailabilityChanged, WishlistItem } from "./models";
import { itemMatchesAvailability } from "./stockMatching";

function item(partial: Partial<WishlistItem>): WishlistItem {
  return {
    id: "wish-1",
    user_id: "user-demo",
    product_id: "prod-linen",
    sku_id: "sku-linen-m",
    preferred_size: "M",
    status: "active",
    saved_at: "2026-08-01T00:00:00.000Z",
    last_viewed_at: null,
    last_resurfaced_at: null,
    sellable: false,
    active_signal: null,
    catalog: {
      brand: "H&M",
      title: "Shirt",
      image_label: "Shirt",
      price: { amount: 1999, currency: "INR" },
    },
    ...partial,
  };
}

function event(
  partial: Partial<InventoryAvailabilityChanged>,
): InventoryAvailabilityChanged {
  return {
    event_id: "inv-1",
    sku_id: "sku-linen-m",
    product_id: "prod-linen",
    size: "M",
    previous: "oos",
    current: "sellable",
    occurred_at: "2026-08-29T10:00:00.000Z",
    ...partial,
  };
}

describe("EC-STK-001 / EC-STK-002 matching", () => {
  it("notifies when preferred size M matches event M", () => {
    expect(itemMatchesAvailability(item({}), event({ size: "M" }))).toBe(true);
  });

  it("does not notify when preferred size M and event is L only", () => {
    expect(
      itemMatchesAvailability(
        item({}),
        event({ size: "L", sku_id: "sku-linen-l" }),
      ),
    ).toBe(false);
  });

  it("notifies when preferred size is null", () => {
    expect(
      itemMatchesAvailability(
        item({ preferred_size: null, sku_id: null }),
        event({ size: "L", sku_id: "sku-linen-l" }),
      ),
    ).toBe(true);
  });

  it("does not match purchased or removed items", () => {
    expect(
      itemMatchesAvailability(item({ status: "purchased" }), event({})),
    ).toBe(false);
    expect(
      itemMatchesAvailability(item({ status: "removed" }), event({})),
    ).toBe(false);
  });
});
