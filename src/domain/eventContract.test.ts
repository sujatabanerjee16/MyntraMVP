import { describe, expect, it } from "vitest";
import { DEMO_USER_ID, ITEM_A_ID } from "./models";
import { createRuntime } from "../runtime";
import {
  EVENT_CONTRACT,
  hasStockFunnel,
  validateEventContract,
} from "./eventContract";

describe("Phase 6 event contract", () => {
  it("lists every architecture §12.2 event", () => {
    expect(Object.keys(EVENT_CONTRACT).sort()).toEqual(
      [
        "add_to_bag_from_wishlist",
        "occasion_dismissed",
        "occasion_tagged",
        "reengagement_clicked",
        "reengagement_sent",
        "reengagement_suppressed",
        "similar_nudge_dismissed",
        "similar_nudge_shown",
        "similar_nudge_tapped",
        "wishlist_card_impressed",
        "wishlist_item_purchased",
        "wishlist_item_saved",
        "wishlist_opened_from_nudge",
      ].sort(),
    );
  });

  it("Phase 1 happy path satisfies the contract and stock funnel", () => {
    const runtime = createRuntime();
    runtime.api.postInternalCandidate(
      {
        event_id: "inv-m6",
        sku_id: "sku-linen-m",
        product_id: "prod-linen",
        size: "M",
        previous: "oos",
        current: "sellable",
        occurred_at: "2026-08-29T10:00:00.000Z",
      },
      true,
    );
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    const notifId = inbox.ok ? inbox.body.items[0]?.id : "";
    runtime.api.clickNotification(DEMO_USER_ID, notifId ?? "");
    runtime.api.addToBag(DEMO_USER_ID, ITEM_A_ID);
    runtime.api.checkoutSuccess(DEMO_USER_ID, ITEM_A_ID);

    expect(validateEventContract(runtime.analytics.events).ok).toBe(true);
    expect(hasStockFunnel(runtime.analytics.events)).toBe(true);
    const purchased = runtime.analytics.events.find(
      (event) => event.name === "wishlist_item_purchased",
    );
    expect(purchased?.nudged_in_last_7d).toBe(true);
  });
});
