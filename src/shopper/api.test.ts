import { describe, expect, it } from "vitest";
import { BIBA_SKU, LIBAS_SKU } from "./domain/models";
import { createShopperRuntime } from "./runtime";
import { SITE_HEROES, UNSAVED_CATALOG, searchCatalog } from "./store";

describe("shopper wishlist api", () => {
  it("gives every category its own product photos", () => {
    const used = new Set<string>();
    for (const row of UNSAVED_CATALOG) {
      expect(used.has(row.image_url), `${row.category} ${row.title}`).toBe(false);
      used.add(row.image_url);
    }
    for (const [cat, slides] of Object.entries(SITE_HEROES)) {
      const urls = slides.map((slide) => slide.image_url);
      expect(new Set(urls).size, cat).toBe(urls.length);
    }
  });

  it("saves a skipped tag as null and watches OOS size at save", () => {
    const runtime = createShopperRuntime();
    const roadster = UNSAVED_CATALOG.find((row) => row.sku === "sku-roadster-m")!;
    const oos = UNSAVED_CATALOG.find((row) => row.sizeOos)!;
    const skipped = runtime.api.addItem(roadster, null, null);
    expect(skipped.ok && skipped.body.item.tag).toBeNull();
    const watched = runtime.api.addItem(oos, "size_wait", null);
    expect(watched.ok && watched.body.item.sizeWatch).toEqual({ size: "S", active: true });
  });

  it("sends one price-drop past threshold, then respects 48h and the toggle", () => {
    const runtime = createShopperRuntime();
    expect(runtime.api.dropPrice(LIBAS_SKU, 3250).body.sent).toBe(0);
    const first = runtime.dropLibas();
    expect(first.body.sent).toBe(1);
    expect(runtime.api.getInbox().body.items[0]?.title).toMatch(/Price Drop on your Wishlist/);
    expect(runtime.dropLibas().body.sent).toBe(0);
    expect(runtime.dropLibas().body.suppressed).toContain("cooldown");

    const off = createShopperRuntime();
    off.api.setPreferences({ priceDropAlerts: false });
    expect(off.dropLibas().body.sent).toBe(0);
    expect(off.dropLibas().body.suppressed).toContain("pref_off");
  });

  it("restocks the exact saved size only", () => {
    const runtime = createShopperRuntime();
    expect(runtime.restockBibaWrongSize().body.sent).toBe(0);
    expect(runtime.restockBibaWrongSize().body.reason).toBe("wrong_size");
    expect(runtime.restockBiba().body.sent).toBe(1);
    expect(runtime.api.getInbox().body.items[0]?.title).toMatch(/Your size is back/);
    expect(runtime.restockBiba().body.sent).toBe(1);
    expect(runtime.api.getInbox().body.items.filter((row) => row.type === "restock")).toHaveLength(1);
  });

  it("batches occasion items and requires a date", () => {
    const runtime = createShopperRuntime();
    const first = runtime.runOccasion();
    expect(first.body.sent).toBe(1);
    const ping = runtime.api.getInbox().body.items[0];
    expect(ping?.body).toMatch(/2 items/);
    expect(runtime.runOccasion().body.sent).toBe(0);

    const noDate = createShopperRuntime();
    for (const item of noDate.store.items) {
      if (item.tag === "occasion") item.occasionDate = null;
    }
    expect(noDate.runOccasion().body.sent).toBe(0);

    const muted = createShopperRuntime();
    muted.api.setPreferences({ occasionReminders: false });
    expect(muted.runOccasion().body).toEqual({ sent: 0, reason: "pref_off" });
  });

  it("flags dead items in-app only", () => {
    const runtime = createShopperRuntime();
    const list = runtime.api.getWishlist().body;
    expect(list.dead).toHaveLength(1);
    expect(list.dead[0]?.catalog.brand).toBe("Anouk");
    expect(list.items.some((row) => row.catalog.brand === "Anouk")).toBe(false);
    expect(list.restocking.some((row) => row.catalog.brand === "Anouk")).toBe(false);
    runtime.api.dismissDead(list.dead[0]!.id);
    const again = runtime.api.getWishlist().body;
    expect(again.dead).toHaveLength(0);
    expect(runtime.api.getInbox().body.items).toHaveLength(0);
  });

  it("pages in-stock size-available items first and parks OOS on restocking", () => {
    const runtime = createShopperRuntime();
    const list = runtime.api.getWishlist().body;
    expect(list.items.every((row) => row.stockStatus === "in_stock")).toBe(true);
    expect(list.items.every((row) => !row.sizeWatch?.active)).toBe(true);
    expect(list.restocking.map((row) => row.catalog.brand)).toEqual(["Biba"]);
    expect(list.restocking[0]?.sizeWatch).toEqual({ size: "S", active: true });
    const savedAt = list.items.map((row) => Date.parse(row.savedAt));
    expect(savedAt).toEqual([...savedAt].sort((a, b) => b - a));

    runtime.restockBiba();
    const after = runtime.api.getWishlist().body;
    expect(after.restocking).toHaveLength(0);
    expect(after.items.some((row) => row.catalog.brand === "Biba")).toBe(true);
  });

  it("suggests wishlist tops/shoes then same-brand pieces under jeans", () => {
    const runtime = createShopperRuntime();
    const jeans = runtime.store.items.find((row) => /jeans/i.test(row.catalog.title))!;
    const looks = runtime.api.getLookPairs(jeans.id).body.items;
    expect(looks[0]?.source).toBe("wishlist");
    expect(looks[0]?.kind).toBe("top");
    expect(looks[0]?.brand).toBe("H&M");
    expect(looks.some((row) => row.source === "same_brand" && row.kind === "top")).toBe(true);
    expect(looks.some((row) => row.source === "same_brand" && row.kind === "shoes")).toBe(true);
    expect(runtime.api.getLookPairs("wish-linen").body.items).toEqual([]);
  });

  it("recommends an add-on from the bag and can attach it", () => {
    const runtime = createShopperRuntime();
    runtime.api.addToBag("wish-libas");
    const recs = runtime.api.getOrderRecs();
    expect(recs.ok && recs.body.picks.length).toBeGreaterThan(0);
    const sku = recs.ok ? recs.body.picks[0].product.sku : "";
    expect(runtime.api.addOrderAddon(sku).ok).toBe(true);
    const done = runtime.api.checkoutSuccess();
    expect(done.ok && done.body.extras.length).toBe(1);
  });

  it("does not expose a live conversion rate", () => {
    const runtime = createShopperRuntime();
    runtime.api.addToBag(runtime.store.items[0].id);
    runtime.api.checkoutSuccess();
    const measure = runtime.api.getMeasurement().body;
    expect(measure.available).toBe(false);
    expect(JSON.stringify(measure)).not.toMatch(/%/);
  });

  it("returns stylist picks with reasons and skips a recent near-duplicate buy", () => {
    const runtime = createShopperRuntime();
    const recs = runtime.api.getStylistRecs(5).body.items;
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((row) => row.reason.length > 0)).toBe(true);
    expect(recs.every((row) => row.product.productId !== "prod-libas")).toBe(true);
    expect(recs.every((row) => row.product.productId !== "prod-anouk-live")).toBe(true);
    expect(recs.every((row) => row.product.productId !== "prod-dead")).toBe(true);
    expect(recs[0]?.score).toBeGreaterThanOrEqual(recs[recs.length - 1]?.score ?? 0);
  });

  it("does not re-fire restock after purchase", () => {
    const runtime = createShopperRuntime();
    const item = runtime.store.items.find((row) => row.sku === BIBA_SKU)!;
    runtime.api.addToBag(item.id);
    runtime.api.checkoutSuccess();
    expect(runtime.api.restockSize(BIBA_SKU, "S").ok).toBe(false);
  });

  it("searches the full catalog including already-saved brands", () => {
    const runtime = createShopperRuntime();
    const jeans = searchCatalog("jeans");
    expect(jeans.some((row) => row.title === "511 Slim Jeans")).toBe(true);
    const libas = runtime.api.searchCatalog("libas").body.products;
    expect(libas.some((row) => row.brand === "Libas")).toBe(true);
    const lipstick = searchCatalog("lipstick");
    expect(lipstick.some((row) => row.brand === "Maybelline")).toBe(true);
    expect(searchCatalog("xyznope")).toHaveLength(0);
    const sarees = searchCatalog("SAREE");
    expect(sarees.length).toBeGreaterThan(0);
    expect(sarees.every((row) => row.category === "WOMEN")).toBe(true);
    expect(sarees.some((row) => /kurta|ethnic|anarkali/i.test(row.title))).toBe(true);
  });

  it("switches shopper identity and wishlist", () => {
    const runtime = createShopperRuntime();
    expect(runtime.store.persona().first).toBe("Sujata");
    runtime.switchPersona("kabir");
    expect(runtime.store.persona().first).toBe("Kabir");
    expect(runtime.store.prefs.priceDropAlerts).toBe(false);
    const list = runtime.api.getWishlist().body;
    expect(list.items.some((row) => row.catalog.brand === "Puma")).toBe(true);
    expect(list.items.some((row) => row.catalog.brand === "Libas")).toBe(false);
  });

  it("restocks Biba size S for any shopper", () => {
    const runtime = createShopperRuntime();
    runtime.switchPersona("kabir");
    expect(runtime.store.items.some((row) => row.sku === BIBA_SKU)).toBe(false);
    expect(runtime.restockBiba().body.sent).toBe(1);
    expect(runtime.api.getInbox().body.items[0]?.title).toMatch(/Your size is back/);
  });
});
