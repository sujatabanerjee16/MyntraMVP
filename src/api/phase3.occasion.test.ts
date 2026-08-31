import { describe, expect, it } from "vitest";
import { DEMO_USER_ID, ITEM_A_ID } from "../domain/models";
import { createRuntime } from "../runtime";

function activeInbox(runtime: ReturnType<typeof createRuntime>) {
  const inbox = runtime.api.getNotifications(DEMO_USER_ID);
  return inbox.ok ? inbox.body.items.filter((row) => !row.expired) : [];
}

function itemA(runtime: ReturnType<typeof createRuntime>) {
  const list = runtime.api.getWishlist(DEMO_USER_ID);
  return list.ok ? list.body.items.find((row) => row.id === ITEM_A_ID) : undefined;
}

describe("Phase 3 occasion", () => {
  it("saves a wishlist item without an occasion", () => {
    const runtime = createRuntime();
    const list = runtime.api.getWishlist(DEMO_USER_ID);
    expect(list.ok && list.body.items.length).toBeGreaterThan(0);
    expect(itemA(runtime)?.occasion).toBeNull();
  });

  it("fires T-7 then T-3 and does not send on other days", () => {
    const runtime = createRuntime();
    runtime.api.markSellable(DEMO_USER_ID, ITEM_A_ID);
    runtime.api.putOccasion(DEMO_USER_ID, ITEM_A_ID, {
      label: "Vacation",
      target_date: "2026-09-05",
    });
    const first = runtime.api.runOccasionScheduler();
    expect(first.ok && first.body.sent).toBe(1);
    runtime.api.runOccasionScheduler();
    expect(
      runtime.store.events.filter((event) => event.type === "occasion_approaching" && event.status === "sent"),
    ).toHaveLength(1);

    runtime.setClock("2026-09-01T10:00:00+05:30");
    const mid = runtime.api.runOccasionScheduler();
    expect(mid.ok && mid.body.sent).toBe(0);

    runtime.setClock("2026-09-02T10:00:00+05:30");
    const third = runtime.api.runOccasionScheduler();
    expect(third.ok && third.body.sent).toBe(1);
    expect(
      runtime.store.events.filter((event) => event.type === "occasion_approaching" && event.status === "sent"),
    ).toHaveLength(2);
  });

  it("stock wins inbox the same day; card can show both signals", () => {
    const runtime = createRuntime();
    runtime.triggerRestock("M");
    runtime.api.putOccasion(DEMO_USER_ID, ITEM_A_ID, {
      label: "Vacation",
      target_date: "2026-09-01",
    });
    runtime.api.runOccasionScheduler();
    const inbox = activeInbox(runtime);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.type).toBe("size_available");
    const card = itemA(runtime);
    expect(card?.active_signal?.label).toMatch(/Size M/i);
    expect(card?.occasion_signal?.label).toMatch(/Trip in 3 days/);
    expect(
      runtime.store.events.some(
        (event) =>
          event.type === "occasion_approaching" &&
          event.suppressed_reason === "daily_cap",
      ),
    ).toBe(true);
  });

  it("does not send an occasion inbox when the item is OOS", () => {
    const runtime = createRuntime();
    runtime.api.putOccasion(DEMO_USER_ID, ITEM_A_ID, {
      label: "Vacation",
      target_date: "2026-09-01",
    });
    const result = runtime.api.runOccasionScheduler();
    expect(result.ok && result.body.sent).toBe(0);
    expect(activeInbox(runtime)).toHaveLength(0);
    expect(itemA(runtime)?.active_signal?.label).toMatch(/Trip in 3 days/);
    expect(itemA(runtime)?.sellable).toBe(false);
    expect(
      runtime.store.events.some(
        (event) => event.suppressed_reason === "item_unavailable_for_occasion",
      ),
    ).toBe(true);
  });

  it("completes the occasion after purchase and does not send again", () => {
    const runtime = createRuntime();
    runtime.pretendTripIn3Days();
    runtime.api.checkoutSuccess(DEMO_USER_ID, ITEM_A_ID);
    const tag = runtime.store.occasionTags.find((row) => row.wishlist_item_id === ITEM_A_ID);
    expect(tag?.status).toBe("completed");
    const again = runtime.api.runOccasionScheduler();
    expect(again.ok && again.body.sent).toBe(0);
  });

  it("expires a past date and does not send", () => {
    const runtime = createRuntime();
    runtime.api.markSellable(DEMO_USER_ID, ITEM_A_ID);
    const put = runtime.api.putOccasion(DEMO_USER_ID, ITEM_A_ID, {
      label: "Wedding",
      target_date: "2026-08-01",
    });
    expect(put.ok && put.body.occasion.status).toBe("expired");
    const skipped = runtime.api.runOccasionScheduler();
    expect(skipped.ok && skipped.body.sent).toBe(0);
  });

  it("dismisses an occasion so it does not send again", () => {
    const runtime = createRuntime();
    runtime.pretendTripIn3Days();
    expect(activeInbox(runtime)).toHaveLength(1);
    const dismissed = runtime.api.dismissOccasion(DEMO_USER_ID, ITEM_A_ID);
    expect(dismissed.ok).toBe(true);
    expect(itemA(runtime)?.occasion).toBeNull();
    expect(activeInbox(runtime)).toHaveLength(0);
    expect(runtime.api.runOccasionScheduler().ok).toBe(true);
    expect(
      runtime.store.events.filter((event) => event.type === "occasion_approaching" && event.status === "sent"),
    ).toHaveLength(1);
  });

  it("ignores the scheduler when the occasion flag is off", () => {
    const runtime = createRuntime();
    runtime.flags.set("reeng.occasion", false);
    runtime.pretendTripIn3Days();
    expect(
      runtime.store.events.filter((event) => event.type === "occasion_approaching"),
    ).toHaveLength(0);
    expect(itemA(runtime)?.occasion).toBeNull();
  });
});
