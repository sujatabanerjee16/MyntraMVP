import { describe, expect, it } from "vitest";
import {
  DEMO_USER_ID,
  ITEM_A_ID,
  ITEM_B_ID,
  ITEM_C_ID,
} from "../domain/models";
import {
  createRuntime,
  DEMO_NEXT_DAY,
  DEMO_OVERNIGHT,
} from "../runtime";

function inboxTitles(runtime: ReturnType<typeof createRuntime>) {
  const inbox = runtime.api.getNotifications(DEMO_USER_ID);
  return inbox.ok ? inbox.body.items.filter((row) => !row.expired) : [];
}

function wishlistIds(runtime: ReturnType<typeof createRuntime>) {
  const list = runtime.api.getWishlist(DEMO_USER_ID);
  return list.ok ? list.body.items.map((row) => row.id) : [];
}

function badges(runtime: ReturnType<typeof createRuntime>) {
  const list = runtime.api.getWishlist(DEMO_USER_ID);
  return list.ok
    ? list.body.items.filter((row) => row.active_signal).map((row) => row.id)
    : [];
}

describe("Phase 2 FrequencyGuard", () => {
  it("EC-FG-001 two restocks same day: one inbox, two badges", () => {
    const runtime = createRuntime();
    runtime.triggerBothRestocks();
    const active = inboxTitles(runtime);
    expect(active).toHaveLength(1);
    expect(active[0]?.title).toMatch(/Size M/i);
    expect(badges(runtime).sort()).toEqual([ITEM_A_ID, ITEM_B_ID].sort());
    const suppressed = runtime.store.events.filter((event) => event.status === "suppressed");
    expect(suppressed.some((event) => event.suppressed_reason === "preempted_by_higher_priority" || event.suppressed_reason === "daily_cap")).toBe(true);
    expect(runtime.analytics.names()).toContain("reengagement_suppressed");
  });

  it("second restock same day does not add another inbox", () => {
    const runtime = createRuntime();
    runtime.triggerBothRestocks();
    runtime.triggerBothRestocks();
    expect(inboxTitles(runtime)).toHaveLength(1);
  });

  it("EC-FG-002 same item twice in 7 days is item_cooldown", () => {
    const runtime = createRuntime();
    runtime.triggerRestock("M");
    runtime.markOos();
    runtime.setClock(DEMO_NEXT_DAY);
    runtime.triggerRestock("M");
    const cool = runtime.store.events.filter(
      (event) => event.suppressed_reason === "item_cooldown",
    );
    expect(cool.length).toBeGreaterThan(0);
    expect(inboxTitles(runtime)).toHaveLength(0);
    expect(badges(runtime)).toContain(ITEM_A_ID);
  });

  it("EC-FG-003 / EC-FG-004 overnight restock is pending then delivered in window", () => {
    const runtime = createRuntime();
    runtime.setClock(DEMO_OVERNIGHT);
    runtime.triggerRestock("M");
    expect(inboxTitles(runtime)).toHaveLength(0);
    expect(badges(runtime)).toContain(ITEM_A_ID);
    expect(runtime.store.pending).toHaveLength(1);
    runtime.setClock(DEMO_NEXT_DAY);
    const flushed = runtime.flushPending();
    expect(flushed.ok && flushed.body.sent).toBe(1);
    expect(inboxTitles(runtime)).toHaveLength(1);
    expect(runtime.store.pending).toHaveLength(0);
  });

  it("EC-FG-003 badge-only does not block tomorrow inbox for another item", () => {
    const runtime = createRuntime();
    runtime.triggerBothRestocks();
    expect(inboxTitles(runtime)[0]?.title).toBeTruthy();
    runtime.setClock(DEMO_NEXT_DAY);
    runtime.triggerRestock("M", "sku-jacket-m", "prod-jacket");
    const jacketInbox = inboxTitles(runtime).filter((row) =>
      row.title.includes("Size M"),
    );
    expect(jacketInbox.length).toBeGreaterThanOrEqual(2);
    const jacketEvent = runtime.store.events.find(
      (event) =>
        event.wishlist_item_id === ITEM_B_ID && event.status === "sent",
    );
    expect(jacketEvent).toBeTruthy();
  });

  it("sorts signaled items first, jeans stay last", () => {
    const runtime = createRuntime();
    runtime.triggerBothRestocks();
    expect(wishlistIds(runtime)).toEqual([ITEM_A_ID, ITEM_B_ID, ITEM_C_ID]);
  });

  it("pagination keeps signal-first order", () => {
    const runtime = createRuntime();
    runtime.triggerBothRestocks();
    const page1 = runtime.api.getWishlist(DEMO_USER_ID, { limit: 1 });
    expect(page1.ok && page1.body.items[0]?.id).toBe(ITEM_A_ID);
    expect(page1.ok && page1.body.next_cursor).toBe("1");
    const page2 = runtime.api.getWishlist(DEMO_USER_ID, {
      cursor: "1",
      limit: 1,
    });
    expect(page2.ok && page2.body.items[0]?.id).toBe(ITEM_B_ID);
  });

  it("reset frequency allows another inbox the same day", () => {
    const runtime = createRuntime();
    runtime.triggerRestock("M");
    runtime.resetFrequency();
    runtime.triggerRestock("M", "sku-jacket-m", "prod-jacket");
    expect(inboxTitles(runtime)).toHaveLength(2);
  });
});
