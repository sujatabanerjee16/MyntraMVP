import { describe, expect, it } from "vitest";
import { BIBA_SKU, LIBAS_SKU } from "./domain/models";
import { createShopperRuntime } from "./runtime";
import { SAVED_CATALOG, SITE_HEROES, UNSAVED_CATALOG, searchCatalog } from "./store";

describe("shopper wishlist api", () => {
  it("gives every category its own product photos", () => {
    const used = new Set<string>();
    for (const row of UNSAVED_CATALOG) {
      expect(used.has(row.image_url), `${row.category} ${row.title}`).toBe(false);
      used.add(row.image_url);
    }
    const chinos = UNSAVED_CATALOG.find((row) => row.sku === "sku-chinos-32")!;
    const linen = SAVED_CATALOG.find((row) => row.sku === "sku-linen-m")!;
    expect(chinos.image_url).not.toBe(linen.image_url);
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

  it("never sends a price-drop notification", () => {
    const runtime = createShopperRuntime();
    expect(runtime.api.dropPrice(LIBAS_SKU, 3250).body.sent).toBe(0);
    expect(runtime.dropLibas().body.sent).toBe(0);
    expect(runtime.dropLibas().body.suppressed).toContain("disabled");
    expect(runtime.api.getInbox().body.items.some((row) => /Price Drop/i.test(row.title))).toBe(false);
  });

  it("shows unique customer photos when a save needs styling confidence", () => {
    const runtime = createShopperRuntime();
    const shots = runtime.api.getStylingLooks("wish-libas").body.items;
    expect(shots.length).toBeGreaterThanOrEqual(3);
    expect(new Set(shots.map((row) => row.image_url)).size).toBe(shots.length);
    expect(shots.every((row) => row.image_url !== "/shopper/libas-product.png")).toBe(true);
    expect(shots.every((row) => /libas-ugc/.test(row.image_url))).toBe(true);
    expect(shots.every((row) => !/biba-ugc|women-dress|women-top|kids-|men-jeans|genz-/i.test(row.image_url))).toBe(true);
    expect(runtime.api.getStylingLooks("wish-libas").body.reviews.length).toBeGreaterThan(0);
    expect(runtime.api.getStylingLooks("wish-libas").body.reviews[0]?.comment).toBeTruthy();
    expect(shots[0]?.wearer).toBeTruthy();
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

  it("does not push occasion saves more than a week out", () => {
    const runtime = createShopperRuntime();
    expect(runtime.store.items.some((row) => row.tag === "occasion" && row.occasionDate)).toBe(true);
    expect(runtime.runOccasion().body.sent).toBe(0);
    expect(runtime.api.getInbox().body.items.filter((row) => row.type === "occasion")).toHaveLength(0);

    const muted = createShopperRuntime();
    muted.api.setPreferences({ occasionReminders: false });
    expect(muted.runOccasion().body).toEqual({ sent: 0, reason: "pref_off" });
  });

  it("flags dead items in-app only", () => {
    const runtime = createShopperRuntime();
    const list = runtime.api.getWishlist().body;
    expect(list.dead.length).toBeGreaterThanOrEqual(5);
    expect(list.dead.some((row) => row.catalog.brand === "Anouk")).toBe(true);
    expect(list.items.some((row) => row.catalog.brand === "Anouk")).toBe(false);
    expect(list.restocking.some((row) => row.catalog.brand === "Anouk")).toBe(false);
    for (const row of list.dead) runtime.api.dismissDead(row.id);
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
    expect(looks.some((row) => row.kind === "top" && row.brand === "Levi's")).toBe(true);
    expect(looks.every((row) => row.brand !== "Levi's" || row.kind !== "shoes")).toBe(true);
    const shirtLooks = runtime.api.getLookPairs("wish-linen").body.items;
    expect(shirtLooks.length).toBeGreaterThan(0);
    expect(shirtLooks.every((row) => row.kind === "jeans" || row.kind === "shoes")).toBe(true);
    expect(shirtLooks.every((row) => row.kind !== "earrings")).toBe(true);
  });

  it("keeps similar ethnic wear in the same category", () => {
    const runtime = createShopperRuntime();
    const similar = runtime.api.getSimilar("wish-dead").body.products;
    expect(similar.length).toBeGreaterThanOrEqual(3);
    expect(similar.every((row) => row.category === "WOMEN")).toBe(true);
    expect(new Set(similar.map((row) => row.image_url)).size).toBe(similar.length);
    expect(similar.some((row) => /saree/i.test(row.title))).toBe(true);
    expect(similar.every((row) => !/women-kurta/.test(row.image_url))).toBe(true);
    expect(similar.some((row) => /frock|boys/i.test(row.title))).toBe(false);
  });

  it("pairs jewellery with an ethnic wishlist dress", () => {
    const runtime = createShopperRuntime();
    const looks = runtime.api.getLookPairs("wish-libas").body.items;
    expect(looks.some((row) => row.kind === "earrings")).toBe(true);
    expect(looks.some((row) => row.title === "Styled Drop Earrings")).toBe(true);
    expect(looks.filter((row) => row.kind === "beauty").length).toBeLessThanOrEqual(1);
    expect(looks.every((row) => row.title !== "Structured Studio Bag")).toBe(true);
    expect(looks.every((row) => row.category !== "KIDS")).toBe(true);
  });

  it("keeps kids look pairs in kids", () => {
    const runtime = createShopperRuntime();
    const kids = runtime.store.items.find((row) => /infant|shorts|hoodie|frock/i.test(row.catalog.title));
    expect(kids).toBeTruthy();
    const looks = runtime.api.getLookPairs(kids!.id).body.items;
    expect(looks.length).toBeGreaterThan(0);
    expect(looks.every((row) => row.category === "KIDS")).toBe(true);
    expect(looks.every((row) => row.kind !== "earrings")).toBe(true);
    expect(looks.every((row) => !/earring|libas|dress/i.test(`${row.brand} ${row.title}`))).toBe(true);
  });

  it("keeps a bagged save on the wishlist until payment", () => {
    const runtime = createShopperRuntime();
    const count = (body: { items: unknown[]; restocking: unknown[]; dead: unknown[] }) =>
      body.items.length + body.restocking.length + body.dead.length;
    const before = count(runtime.api.getWishlist().body);
    expect(runtime.api.addToBag("wish-libas").ok).toBe(true);
    expect(count(runtime.api.getWishlist().body)).toBe(before);
    expect(runtime.api.checkoutSuccess().ok).toBe(true);
    expect(count(runtime.api.getWishlist().body)).toBe(before - 1);
    expect(count(runtime.api.getWishlist().body)).toBe(before - 1);
  });

  it("lists past purchases as orders", () => {
    const runtime = createShopperRuntime();
    const orders = runtime.api.getOrders().body.items;
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.some((row) => row.items.some((item) => /Dress|Kurta/i.test(item.title)))).toBe(true);
    runtime.api.addToBag("wish-libas");
    const done = runtime.api.checkoutSuccess();
    expect(done.ok).toBe(true);
    expect(runtime.api.getOrders().body.items[0]?.id).toBe(done.body.order_id);
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
    expect(sarees.every((row) => /saree|sari/i.test(row.title))).toBe(true);
    expect(sarees.every((row) => !/kurta|anarkali/i.test(row.title))).toBe(true);
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

  it("clusters same-type wishlist items for compare", () => {
    const runtime = createShopperRuntime();
    const clusters = runtime.api.getCompareClusters().body.clusters;
    expect(clusters.every((row) => row.count >= 2)).toBe(true);
    const kurtas = clusters.find((row) => row.key === "WOMEN:kurta");
    const dresses = clusters.find((row) => row.key === "WOMEN:dress");
    expect(kurtas?.count).toBeGreaterThanOrEqual(2);
    expect(dresses?.count).toBe(5);
    expect(new Set(runtime.api.getCompare("WOMEN:dress").body.cards.map((row) => row.brand)).size).toBeGreaterThanOrEqual(4);
    expect(clusters.some((row) => row.itemIds.includes("wish-dead"))).toBe(false);

    const cards = runtime.api.getCompare("WOMEN:kurta").body.cards;
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(new Set(cards.map((row) => row.image_url)).size).toBe(cards.length);
    expect(cards.some((row) => /women-blue-kurta/.test(row.image_url))).toBe(true);
    expect(cards.some((row) => /women-pink-anarkali/.test(row.image_url))).toBe(true);
    expect(cards.some((row) => /women-black-kurta/.test(row.image_url))).toBe(true);
    expect(cards.every((row) => !/women-(saree|top|dress)\.jpg/.test(row.image_url))).toBe(true);
    expect(cards.every((row) => row.rating > 0 && row.ratingCount > 0)).toBe(true);
    expect(cards.every((row) => row.description.length > 8)).toBe(true);
    expect(cards.every((row) => !/true to size/i.test(row.description))).toBe(true);

    const dressesCards = runtime.api.getCompare("WOMEN:dress").body.cards;
    expect(dressesCards).toHaveLength(5);
    expect(new Set(dressesCards.map((row) => row.image_url)).size).toBe(5);

    const inStock = runtime.api.getCompare("WOMEN:kurta", true).body.cards;
    expect(inStock.every((row) => row.inStock)).toBe(true);
    expect(inStock.length).toBeLessThan(cards.length);

    runtime.switchPersona("kabir");
    const shirts = runtime.api.getCompareClusters().body.clusters.find((row) => row.key === "MEN:shirt");
    expect(shirts?.count).toBeGreaterThanOrEqual(2);
  });

  it("restocks Biba size S for any shopper", () => {
    const runtime = createShopperRuntime();
    runtime.switchPersona("kabir");
    expect(runtime.store.items.some((row) => row.sku === BIBA_SKU)).toBe(false);
    expect(runtime.restockBiba().body.sent).toBe(1);
    expect(runtime.api.getInbox().body.items[0]?.title).toMatch(/Your size is back/);
  });
});
