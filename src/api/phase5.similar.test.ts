import { describe, expect, it } from "vitest";
import { countMonetaryLeak } from "../domain/analytics";
import {
  DEMO_USER_ID,
  ITEM_B_ID,
  OTHER_USER_ID,
} from "../domain/models";
import { createRuntime } from "../runtime";

function enableSimilar(runtime: ReturnType<typeof createRuntime>) {
  runtime.flags.set("reeng.similar_nudge", true);
}

describe("Phase 5 similar nudge", () => {
  it("EC-SIM-010 flag off: search unchanged, matcher does not run", () => {
    const runtime = createRuntime();
    const result = runtime.api.search(DEMO_USER_ID, "jacket");
    expect(result.ok && result.body.results.length).toBeGreaterThan(0);
    expect(result.ok && result.body.similar_wishlist_hint).toBeNull();
    expect(result.ok && result.body.matcher_ran).toBe(false);
    expect(runtime.store.similarMatcherCalls).toBe(0);
  });

  it("EC-SIM-001 timeout fail-open: results render, no hint", () => {
    const runtime = createRuntime();
    enableSimilar(runtime);
    const result = runtime.api.search(DEMO_USER_ID, "jacket", {
      forceTimeout: true,
    });
    expect(result.ok && result.body.results.length).toBeGreaterThan(0);
    expect(result.ok && result.body.similar_wishlist_hint).toBeNull();
    expect(
      runtime.analytics.events.some(
        (event) =>
          event.name === "reengagement_suppressed" &&
          event.reason === "latency_budget",
      ),
    ).toBe(true);
  });

  it("EC-SIM-003 jacket query hints the fixture jacket", () => {
    const runtime = createRuntime();
    enableSimilar(runtime);
    const result = runtime.api.search(DEMO_USER_ID, "jacket");
    expect(result.ok && result.body.similar_wishlist_hint).toMatchObject({
      wishlist_item_id: ITEM_B_ID,
      product_id: "prod-jacket",
      reason: "same_product",
      copy_key: "similar_nudge_default",
    });
    expect(runtime.analytics.names()).toContain("similar_nudge_shown");
  });

  it("EC-SIM-002 score 0.87 does not hint", () => {
    const runtime = createRuntime();
    enableSimilar(runtime);
    const result = runtime.api.search(DEMO_USER_ID, "random dress");
    expect(result.ok && result.body.similar_wishlist_hint).toBeNull();
  });

  it("EC-SIM-005 / EC-SIM-006 dismiss hides for 14 days then may return", () => {
    const runtime = createRuntime();
    enableSimilar(runtime);
    expect(runtime.api.search(DEMO_USER_ID, "jacket").ok).toBe(true);
    expect(runtime.api.dismissSimilarNudge(DEMO_USER_ID, ITEM_B_ID).ok).toBe(true);
    const blocked = runtime.api.search(DEMO_USER_ID, "jacket");
    expect(blocked.ok && blocked.body.similar_wishlist_hint).toBeNull();
    expect(runtime.analytics.names()).toContain("similar_nudge_dismissed");

    runtime.setClock("2026-09-13T10:00:00+05:30");
    const again = runtime.api.search(DEMO_USER_ID, "jacket");
    expect(again.ok && again.body.similar_wishlist_hint?.wishlist_item_id).toBe(
      ITEM_B_ID,
    );
  });

  it("EC-SIM-007 max one banner per session for a different item", () => {
    const runtime = createRuntime();
    enableSimilar(runtime);
    const first = runtime.api.search(DEMO_USER_ID, "jacket");
    expect(first.ok && first.body.similar_wishlist_hint?.product_id).toBe(
      "prod-jacket",
    );
    const second = runtime.api.search(DEMO_USER_ID, "linen shirt");
    expect(second.ok && second.body.similar_wishlist_hint).toBeNull();
  });

  it("EC-SIM-011 / EC-SIM-016 empty wishlist or guest → no hint", () => {
    const runtime = createRuntime({ userId: "user-empty" });
    enableSimilar(runtime);
    const empty = runtime.api.search("user-empty", "jacket");
    expect(empty.ok && empty.body.similar_wishlist_hint).toBeNull();
    const guest = runtime.api.search("", "jacket");
    expect(guest.ok && guest.body.results.length).toBeGreaterThan(0);
    expect(guest.ok && guest.body.similar_wishlist_hint).toBeNull();
    expect(guest.ok && guest.body.matcher_ran).toBe(false);
  });

  it("EC-SIM-009 tap after remove falls back to PDP", () => {
    const runtime = createRuntime();
    enableSimilar(runtime);
    runtime.api.removeItem(DEMO_USER_ID, ITEM_B_ID);
    const tap = runtime.api.tapSimilarNudge(DEMO_USER_ID, ITEM_B_ID);
    expect(tap.ok && tap.body.deep_link.startsWith("myntra://pdp/prod-jacket")).toBe(
      true,
    );
  });

  it("does not consume the Phase 2 inbox cap", () => {
    const runtime = createRuntime();
    runtime.triggerBothRestocks();
    enableSimilar(runtime);
    runtime.api.search(DEMO_USER_ID, "jacket");
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    const active = inbox.ok
      ? inbox.body.items.filter((row) => !row.expired)
      : [];
    expect(active).toHaveLength(1);
    expect(active[0]?.type).not.toBe("similar_search");
    expect(
      runtime.store.events.filter(
        (event) => event.type === "similar_search" && event.status === "sent",
      ),
    ).toHaveLength(0);
  });

  it("owner-only dismiss and tap", () => {
    const runtime = createRuntime();
    enableSimilar(runtime);
    expect(runtime.api.dismissSimilarNudge(OTHER_USER_ID, ITEM_B_ID).status).toBe(
      404,
    );
    expect(runtime.api.tapSimilarNudge(OTHER_USER_ID, ITEM_B_ID).status).toBe(404);
  });

  it("EC-SIM-015 shown analytics are once per item per local day", () => {
    const runtime = createRuntime();
    enableSimilar(runtime);
    runtime.api.search(DEMO_USER_ID, "jacket");
    runtime.api.search(DEMO_USER_ID, "jacket");
    expect(
      runtime.analytics.events.filter((event) => event.name === "similar_nudge_shown"),
    ).toHaveLength(1);
    expect(countMonetaryLeak(runtime.analytics.events)).toBe(0);
  });
});
