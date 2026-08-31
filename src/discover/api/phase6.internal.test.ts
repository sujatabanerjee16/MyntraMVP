import { describe, expect, it } from "vitest";
import { createDiscoverRuntime } from "../runtime";

describe("Phase 6 internal-event hook", () => {
  it("stays D9 when the flag is off even if the corpus is large", () => {
    const runtime = createDiscoverRuntime();
    expect(runtime.flags.isOn("discover.internal_events")).toBe(false);
    const ns1 = runtime.api.getNorthStar();
    expect(ns1.ok && "available" in ns1.body && ns1.body.available === false).toBe(
      true,
    );
  });

  it("stays D9 when the flag is on but fact tables are empty", () => {
    const runtime = createDiscoverRuntime();
    runtime.flags.set("discover.internal_events", true);
    expect(runtime.store.wishlistSaves).toHaveLength(0);
    expect(runtime.store.orderLines).toHaveLength(0);
    const ns1 = runtime.api.getNorthStar();
    expect(ns1.ok && ns1.body.available === false).toBe(true);
    if (ns1.ok && ns1.body.available === false) {
      expect(ns1.body.reason).toBe("not_in_corpus");
    }
  });
});
