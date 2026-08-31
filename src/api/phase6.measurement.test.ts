import { describe, expect, it } from "vitest";
import { countMonetaryLeak } from "../domain/analytics";
import { EXPERIMENT_ID, EXPERIMENT_SKETCH } from "../domain/experiment";
import { DEMO_USER_ID, ITEM_A_ID } from "../domain/models";
import { createRuntime } from "../runtime";

function linenRestock(eventId = "inv-m6") {
  return {
    event_id: eventId,
    sku_id: "sku-linen-m",
    product_id: "prod-linen",
    size: "M" as const,
    previous: "oos" as const,
    current: "sellable" as const,
    occurred_at: "2026-08-29T10:00:00.000Z",
  };
}

function walkStockPurchase(runtime: ReturnType<typeof createRuntime>) {
  runtime.api.postInternalCandidate(linenRestock(), true);
  const inbox = runtime.api.getNotifications(DEMO_USER_ID);
  const notifId = inbox.ok ? inbox.body.items[0]?.id ?? "" : "";
  runtime.api.clickNotification(DEMO_USER_ID, notifId);
  runtime.api.addToBag(DEMO_USER_ID, ITEM_A_ID);
  runtime.api.checkoutSuccess(DEMO_USER_ID, ITEM_A_ID);
  return notifId;
}

describe("Phase 6 measurement", () => {
  it("wires P1 on the stock path and keeps CTR diagnostic", () => {
    const runtime = createRuntime();
    walkStockPurchase(runtime);
    const snap = runtime.api.getMeasurement();
    expect(snap.ok && snap.body.primary_proxy.name).toBe("nudged_item_conversion");
    expect(snap.ok && snap.body.primary_proxy.role).toBe("primary");
    expect(snap.ok && snap.body.primary_proxy.rate).toBe(1);
    expect(snap.ok && snap.body.diagnostics.ctr.rate).toBe(1);
    expect(snap.ok && snap.body.funnel).toMatchObject({
      sent: 1,
      clicked: 1,
      opened: 1,
      add_to_bag: 1,
      purchased: 1,
      purchased_nudged: 1,
    });
    expect(snap.ok && snap.body.guardrails.monetary_leak).toBe(0);
    expect(snap.ok && snap.body.north_star.rate).toBe(1);
    expect(EXPERIMENT_SKETCH.primary_proxy).toBe("nudged_item_conversion");
    expect(EXPERIMENT_SKETCH.diagnostic).toBe("reengagement_ctr");
  });

  it("records a Phase 2 suppress on the double-restock path", () => {
    const runtime = createRuntime();
    runtime.triggerBothRestocks();
    const snap = runtime.api.getMeasurement();
    expect(snap.ok && snap.body.funnel.sent).toBe(1);
    expect(runtime.analytics.names()).toContain("reengagement_suppressed");
    expect(
      runtime.analytics.events.some(
        (event) =>
          event.name === "reengagement_suppressed" &&
          (event.reason === "daily_cap" ||
            event.reason === "preempted_by_higher_priority"),
      ),
    ).toBe(true);
  });

  it("dedups click and open-from-nudge per landing", () => {
    const runtime = createRuntime();
    runtime.api.postInternalCandidate(linenRestock(), true);
    const inbox = runtime.api.getNotifications(DEMO_USER_ID);
    const notifId = inbox.ok ? inbox.body.items[0]?.id ?? "" : "";
    runtime.api.clickNotification(DEMO_USER_ID, notifId);
    runtime.api.clickNotification(DEMO_USER_ID, notifId);
    expect(
      runtime.analytics.events.filter((event) => event.name === "reengagement_clicked"),
    ).toHaveLength(1);
    expect(
      runtime.analytics.events.filter(
        (event) => event.name === "wishlist_opened_from_nudge",
      ),
    ).toHaveLength(1);
  });

  it("assigns T1 at user grain and stamps exp_id/variant; control gets no inbox or price-drop", () => {
    const treated = createRuntime();
    treated.api.assignExperiment(DEMO_USER_ID, "t1");
    treated.api.postInternalCandidate(linenRestock("inv-t1"), true);
    expect(treated.analytics.events[0]).toMatchObject({
      name: "reengagement_sent",
      exp_id: EXPERIMENT_ID,
      variant: "t1",
    });
    expect(treated.flags.isOn("reeng.occasion")).toBe(false);

    const control = createRuntime();
    control.api.assignExperiment(DEMO_USER_ID, "control");
    const result = control.triggerRestock("M");
    expect(result.ok && result.body.sent).toBe(0);
    const inbox = control.api.getNotifications(DEMO_USER_ID);
    expect(inbox.ok && inbox.body.items).toHaveLength(0);
    expect(countMonetaryLeak(control.analytics.events)).toBe(0);
    expect(
      control.analytics.events.some((event) => event.type === "price_drop"),
    ).toBe(false);
  });

  it("exports a CSV warehouse stand-in", () => {
    const runtime = createRuntime();
    walkStockPurchase(runtime);
    const csv = runtime.api.exportEventsCsv();
    expect(csv.ok && csv.body.csv.startsWith("name,type,reason")).toBe(true);
    expect(csv.ok && csv.body.csv).toContain("wishlist_item_purchased");
    expect(csv.ok && csv.body.csv).toContain("nudged_in_last_7d");
  });
});
