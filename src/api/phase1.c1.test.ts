import { describe, expect, it } from "vitest";
import { countMonetaryLeak } from "../domain/analytics";
import {
  DEMO_USER_ID,
  ITEM_A_ID,
  OTHER_USER_ID,
} from "../domain/models";
import { createRuntime } from "../runtime";

function linenRestock(eventId = "inv-linen-1") {
  return {
    event_id: eventId,
    sku_id: "sku-linen-m",
    product_id: "prod-linen",
    size: "M",
    previous: "oos" as const,
    current: "sellable" as const,
    occurred_at: "2026-08-29T10:00:00.000Z",
  };
}

describe("Phase 1 C1", () => {
  it("sends inbox + badge for preferred size M", () => {
    const runtime = createRuntime();
    const result = runtime.api.postInternalCandidate(linenRestock(), true);
    expect(result.ok && result.body.sent).toBe(1);
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    expect(inbox.ok && inbox.body.items).toHaveLength(1);
    expect(inbox.ok && inbox.body.items[0]?.title).toMatch(/Size M/i);
    const list = runtime.api.getWishlist(DEMO_USER_ID);
    const itemA = list.ok
      ? list.body.items.find((row) => row.id === ITEM_A_ID)
      : undefined;
    expect(itemA?.active_signal?.label).toBe("Size M back in stock");
    expect(itemA?.sellable).toBe(true);
  });

  it("EC-STK-001 preferred M / event L does not notify", () => {
    const runtime = createRuntime();
    runtime.triggerRestock("L", "sku-linen-l");
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    expect(inbox.ok && inbox.body.items).toHaveLength(0);
    const itemA = runtime.store.getItem(ITEM_A_ID);
    expect(itemA?.active_signal).toBeNull();
  });

  it("EC-STK / duplicate inventory event creates one inbox item", () => {
    const runtime = createRuntime();
    const event = linenRestock("inv-dup");
    runtime.api.postInternalCandidate(event, true);
    runtime.api.postInternalCandidate(event, true);
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    expect(inbox.ok && inbox.body.items).toHaveLength(1);
  });

  it("EC-STK-010 / EC-STK-011 OOS expires inbox and clears badge", () => {
    const runtime = createRuntime();
    runtime.api.postInternalCandidate(linenRestock(), true);
    runtime.markOos();
    const itemA = runtime.store.getItem(ITEM_A_ID);
    expect(itemA?.active_signal).toBeNull();
    expect(itemA?.sellable).toBe(false);
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    expect(inbox.ok && inbox.body.items[0]?.expired).toBe(true);
    expect(inbox.ok && inbox.body.items[0]?.title).toBe("No longer available.");
  });

  it("EC-DL-002 deep link after remove falls back to PDP", () => {
    const runtime = createRuntime();
    runtime.api.postInternalCandidate(linenRestock(), true);
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    const notifId = inbox.ok ? inbox.body.items[0]?.id : undefined;
    runtime.api.removeItem(DEMO_USER_ID, ITEM_A_ID);
    const click = runtime.api.clickNotification(DEMO_USER_ID, notifId ?? "");
    expect(click.ok && click.body.deep_link.startsWith("myntra://pdp/")).toBe(
      true,
    );
  });

  it("EC-SEC-001 / EC-SEC-002 owner-only wishlist and inbox", () => {
    const runtime = createRuntime();
    runtime.api.postInternalCandidate(linenRestock(), true);
    expect(runtime.api.getWishlistItem(DEMO_USER_ID, "wish-user-b-tee").status).toBe(
      404,
    );
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    const notifId = inbox.ok ? inbox.body.items[0]?.id : "";
    expect(runtime.api.clickNotification(OTHER_USER_ID, notifId ?? "").status).toBe(
      404,
    );
    expect(runtime.api.getNotifications(OTHER_USER_ID).ok).toBe(true);
    expect(
      runtime.api.getNotifications(OTHER_USER_ID).ok &&
        runtime.api.getNotifications(OTHER_USER_ID).body.items,
    ).toHaveLength(0);
  });

  it("EC-SEC-003 internal candidate requires service auth", () => {
    const runtime = createRuntime();
    const result = runtime.api.postInternalCandidate(linenRestock(), false);
    expect(result.status).toBe(403);
  });

  it("EC-AN-002 happy path emits conversion analytics", () => {
    const runtime = createRuntime();
    runtime.api.postInternalCandidate(linenRestock(), true);
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    const notifId = inbox.ok ? inbox.body.items[0]?.id : "";
    runtime.api.clickNotification(DEMO_USER_ID, notifId ?? "");
    runtime.api.addToBag(DEMO_USER_ID, ITEM_A_ID);
    const order = runtime.api.checkoutSuccess(DEMO_USER_ID, ITEM_A_ID);
    expect(order.ok).toBe(true);
    expect(runtime.analytics.names()).toEqual([
      "reengagement_sent",
      "reengagement_clicked",
      "wishlist_opened_from_nudge",
      "add_to_bag_from_wishlist",
      "wishlist_item_purchased",
    ]);
    const purchased = runtime.analytics.events.find(
      (event) => event.name === "wishlist_item_purchased",
    );
    expect(purchased?.nudged_in_last_7d).toBe(true);
    expect(countMonetaryLeak(runtime.analytics.events)).toBe(0);
    expect(
      runtime.api.getWishlist(DEMO_USER_ID).ok &&
        runtime.api
          .getWishlist(DEMO_USER_ID)
          .body.items.some((row) => row.id === ITEM_A_ID),
    ).toBe(false);
  });

  it("EC-ST-004 buying another item does not convert item A", () => {
    const runtime = createRuntime();
    runtime.api.postInternalCandidate(linenRestock(), true);
    const jacket = runtime.store.getItem("wish-travel-jacket");
    if (jacket) jacket.sellable = true;
    runtime.api.checkoutSuccess(DEMO_USER_ID, "wish-travel-jacket");
    const linenEvent = runtime.store.events.find(
      (event) => event.wishlist_item_id === ITEM_A_ID,
    );
    expect(linenEvent?.status).toBe("sent");
  });

  it("EC-FLG-001 stock alerts off sends nothing new", () => {
    const runtime = createRuntime();
    runtime.flags.set("reeng.stock_alerts", false);
    const result = runtime.triggerRestock("M");
    expect(result.ok && result.body.sent).toBe(0);
    expect(runtime.api.getNotifications(DEMO_USER_ID).ok).toBe(true);
    expect(
      runtime.api.getNotifications(DEMO_USER_ID).ok &&
        runtime.api.getNotifications(DEMO_USER_ID).body.items,
    ).toHaveLength(0);
    const dto = runtime.api.getWishlistItem(DEMO_USER_ID, ITEM_A_ID);
    expect(dto.ok && dto.body.item.active_signal).toBeNull();
  });

  it("does not restock after purchase", () => {
    const runtime = createRuntime();
    runtime.api.postInternalCandidate(linenRestock("inv-1"), true);
    runtime.api.checkoutSuccess(DEMO_USER_ID, ITEM_A_ID);
    runtime.api.postInternalCandidate(linenRestock("inv-2"), true);
    const activeInbox = runtime.api
      .getNotifications(DEMO_USER_ID)
      .ok
      ? runtime.api
          .getNotifications(DEMO_USER_ID)
          .body.items.filter((row) => !row.expired)
      : [];
    expect(activeInbox).toHaveLength(0);
  });
});
