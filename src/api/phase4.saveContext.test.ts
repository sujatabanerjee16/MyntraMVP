import { describe, expect, it } from "vitest";
import { countMonetaryLeak, countNotePiiLeak } from "../domain/analytics";
import {
  DEMO_USER_ID,
  ITEM_A_ID,
  OTHER_USER_ID,
} from "../domain/models";
import { createRuntime } from "../runtime";
import {
  PDP_DEMO_PRODUCT_ID,
  SEARCH_DEMO_PRODUCT_ID,
} from "../store/catalog";

function itemById(runtime: ReturnType<typeof createRuntime>, id: string) {
  const list = runtime.api.getWishlist(DEMO_USER_ID);
  return list.ok ? list.body.items.find((row) => row.id === id) : undefined;
}

function itemByProduct(
  runtime: ReturnType<typeof createRuntime>,
  productId: string,
) {
  const list = runtime.api.getWishlist(DEMO_USER_ID);
  return list.ok
    ? list.body.items.find((row) => row.product_id === productId)
    : undefined;
}

describe("Phase 4 save context", () => {
  it("fixture revisit shows why the linen shirt was saved", () => {
    const runtime = createRuntime();
    const itemA = itemById(runtime, ITEM_A_ID);
    expect(itemA?.save_context?.source).toBe("search");
    expect(itemA?.save_context?.summary).toBe(
      "Saved from search “linen shirt” · 12 days ago",
    );
    expect(itemA?.save_context?.note).toBeNull();
    const jacket = itemById(runtime, "wish-travel-jacket");
    expect(jacket?.save_context?.summary).toBe(
      "Saved from the product page · 19 days ago",
    );
  });

  it("EC-CTX-001 save from PDP and search produce different summaries", () => {
    const runtime = createRuntime();
    const search = runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: SEARCH_DEMO_PRODUCT_ID,
      source: "search",
      referring_query: "linen shirt",
    });
    const pdp = runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: PDP_DEMO_PRODUCT_ID,
      source: "pdp",
    });
    expect(search.ok && search.body.item.save_context?.summary).toBe(
      "Saved from search “linen shirt” · today",
    );
    expect(pdp.ok && pdp.body.item.save_context?.summary).toBe(
      "Saved from the product page · today",
    );
    expect(search.ok && pdp.ok && search.body.item.save_context?.summary).not.toBe(
      pdp.ok ? pdp.body.item.save_context?.summary : "",
    );
  });

  it("EC-CTX-002 / EC-CTX-003 empty note still shows source and relative time", () => {
    const runtime = createRuntime();
    const saved = runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: SEARCH_DEMO_PRODUCT_ID,
      source: "search",
      referring_query: "",
    });
    expect(saved.ok && saved.body.item.save_context?.summary).toBe(
      "Saved from search · today",
    );
    expect(saved.ok && saved.body.item.save_context?.note).toBeNull();
    expect(saved.ok && saved.body.item.save_context?.summary).not.toMatch(/“”/);
  });

  it("EC-CTX-004 / EC-CTX-005 note 280 accepted, 281 rejected", () => {
    const runtime = createRuntime();
    runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: SEARCH_DEMO_PRODUCT_ID,
      source: "pdp",
    });
    const item = itemByProduct(runtime, SEARCH_DEMO_PRODUCT_ID);
    const ok = runtime.api.patchNote(DEMO_USER_ID, item?.id ?? "", {
      note: "n".repeat(280),
    });
    expect(ok.ok).toBe(true);
    const tooLong = runtime.api.patchNote(DEMO_USER_ID, item?.id ?? "", {
      note: "n".repeat(281),
    });
    expect(tooLong.status).toBe(400);
  });

  it("EC-CTX-006 note preferred on card DTO and Add to Bag still works", () => {
    const runtime = createRuntime();
    const saved = runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: SEARCH_DEMO_PRODUCT_ID,
      source: "search",
      referring_query: "linen shirt",
      note: "For the Goa trip",
    });
    expect(saved.ok && saved.body.item.save_context?.note).toBe("For the Goa trip");
    expect(saved.ok && saved.body.item.sellable).toBe(true);
    const bag = runtime.api.addToBag(DEMO_USER_ID, saved.ok ? saved.body.item.id : "");
    expect(bag.ok).toBe(true);
  });

  it("EC-CTX-007 wishlist_item_saved has has_note only — no note PII", () => {
    const runtime = createRuntime();
    runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: SEARCH_DEMO_PRODUCT_ID,
      source: "search",
      referring_query: "linen shirt",
      note: "secret diary reason",
    });
    const saved = runtime.analytics.events.find(
      (event) => event.name === "wishlist_item_saved",
    );
    expect(saved).toMatchObject({
      product_id: SEARCH_DEMO_PRODUCT_ID,
      source: "search",
      has_note: true,
      has_size: true,
    });
    expect(countNotePiiLeak(runtime.analytics.events)).toBe(0);
    expect(countMonetaryLeak(runtime.analytics.events)).toBe(0);
    expect(JSON.stringify(runtime.analytics.events)).not.toContain(
      "secret diary reason",
    );
    expect(JSON.stringify(runtime.analytics.events)).not.toContain("linen shirt");
  });

  it("EC-CTX-008 re-add after remove creates a new item and context", () => {
    const runtime = createRuntime();
    runtime.api.removeItem(DEMO_USER_ID, ITEM_A_ID);
    const again = runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: "prod-linen",
      source: "pdp",
      note: "fresh note",
    });
    expect(again.ok && again.body.item.id).not.toBe(ITEM_A_ID);
    expect(again.ok && again.body.item.save_context?.source).toBe("pdp");
    expect(again.ok && again.body.item.save_context?.note).toBe("fresh note");
    const old = runtime.store.saveContexts.find(
      (row) => row.wishlist_item_id === ITEM_A_ID,
    );
    expect(old?.note).toBeNull();
  });

  it("EC-CTX-009 missing source persists as other", () => {
    const runtime = createRuntime();
    const saved = runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: SEARCH_DEMO_PRODUCT_ID,
    });
    expect(saved.ok && saved.body.item.save_context?.source).toBe("other");
    expect(saved.ok && saved.body.item.save_context?.summary).toBe("Saved · today");
  });

  it("EC-CTX-011 flag off hides the line; save still succeeds", () => {
    const runtime = createRuntime();
    runtime.flags.set("reeng.save_context", false);
    const saved = runtime.api.addWishlistItem(DEMO_USER_ID, {
      product_id: SEARCH_DEMO_PRODUCT_ID,
      source: "search",
      referring_query: "linen shirt",
    });
    expect(saved.ok).toBe(true);
    expect(saved.ok && saved.body.item.save_context).toBeNull();
    expect(itemById(runtime, ITEM_A_ID)?.save_context).toBeNull();
    expect(
      runtime.store.saveContexts.some(
        (row) => row.wishlist_item_id === (saved.ok ? saved.body.item.id : ""),
      ),
    ).toBe(true);
  });

  it("EC-CTX-012 TouchViewed debounce does not flood impressions", () => {
    const runtime = createRuntime();
    runtime.api.touchViewed(DEMO_USER_ID, ITEM_A_ID);
    runtime.api.touchViewed(DEMO_USER_ID, ITEM_A_ID);
    runtime.api.touchViewed(DEMO_USER_ID, ITEM_A_ID);
    const impressions = runtime.analytics.events.filter(
      (event) => event.name === "wishlist_card_impressed",
    );
    expect(impressions).toHaveLength(1);
    expect(impressions[0]).toMatchObject({
      wishlist_item_id: ITEM_A_ID,
      has_active_signal: false,
    });
    expect(runtime.store.getItem(ITEM_A_ID)?.last_viewed_at).toBeTruthy();
  });

  it("owner-only note patch", () => {
    const runtime = createRuntime();
    expect(
      runtime.api.patchNote(OTHER_USER_ID, ITEM_A_ID, { note: "nope" }).status,
    ).toBe(404);
    expect(
      runtime.api.addWishlistItem(OTHER_USER_ID, {
        product_id: SEARCH_DEMO_PRODUCT_ID,
        source: "pdp",
      }).ok,
    ).toBe(true);
  });
});
