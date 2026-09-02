import {
  alreadySent,
  canSendRestock,
  clearPassedOccasion,
  isDead,
  occasionDue,
} from "./domain/rules";
import { partitionWishlist } from "./domain/wishlistOrder";
import {
  daysBetween,
  formatInr,
  type ContextTag,
  type InboxRow,
  type NotificationPrefs,
  type WishlistItem,
} from "./domain/models";
import { jeansLookPairs, type JeansLook } from "./domain/jeansLooks";
import { similarCatalogProducts } from "./domain/similarItems";
import { stylingConfidenceLooks, stylingReviews, type StyleReview, type StyleShot } from "./domain/stylingLooks";
import { recommendForOrder, type OrderRecOffer } from "./domain/orderRecs";
import { recommendStylist, type StylistRec, type StylistWeights } from "./domain/stylist";
import { compareCards, compareClusters, parseClusterKey, type CompareCard, type CompareCluster } from "./domain/compare";
import {
  UNSAVED_CATALOG,
  allCatalog,
  searchCatalog as matchCatalog,
  type CatalogProduct,
  type ShopperOrder,
  type ShopperStore,
} from "./store";

export type ApiResult<T> =
  | { ok: true; status: 200; body: T }
  | { ok: false; status: 400 | 404; error: string };

export function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.body;
}

export type WishlistView = WishlistItem & {
  dropped: boolean;
  dead: boolean;
};

export function createShopperApi(store: ShopperStore, now: () => Date) {
  function iso() {
    return now().toISOString();
  }

  function occasionIso(date: string | null): string | null {
    if (!date) return null;
    return date.includes("T") ? date : `${date}T00:00:00.000Z`;
  }

  function view(item: WishlistItem): WishlistView {
    return {
      ...item,
      dropped: item.currentPrice < item.priceAtSave,
      dead: isDead(item, iso()),
    };
  }

  function push(row: Omit<InboxRow, "id" | "sentAt" | "openedAt">) {
    store.inbox.push({
      ...row,
      id: `n-${store.inbox.length + 1}-${now().getTime()}`,
      sentAt: iso(),
      openedAt: null,
    });
  }

  return {
    getWishlist(filter?: "occasion"): ApiResult<{
      items: WishlistView[];
      restocking: WishlistView[];
      dead: WishlistView[];
    }> {
      const nowIso = iso();
      for (const item of store.items) clearPassedOccasion(item, nowIso);
      const active = store.items.filter((row) => row.user_id === store.userId && row.status === "active");
      const views = active.map(view);
      const dead = views.filter((row) => row.dead && !row.deadNudgeShown);
      let live = views.filter((row) => !row.dead || row.deadNudgeShown);
      if (filter === "occasion") {
        live = live.filter((row) => row.tag === "occasion" && row.occasionDate);
        const split = partitionWishlist(live);
        return { ok: true, status: 200, body: { items: [...split.available, ...split.buried], restocking: split.restocking, dead: [] } };
      }
      const split = partitionWishlist(live);
      return {
        ok: true,
        status: 200,
        body: { items: [...split.available, ...split.buried], restocking: split.restocking, dead },
      };
    },

    getSimilar(itemId: string): ApiResult<{ products: CatalogProduct[]; query: string }> {
      const item = store.items.find((row) => row.id === itemId);
      const saved = new Set(store.items.filter((row) => row.status === "active").map((row) => row.productId));
      const source = item
        ? {
            productId: item.productId,
            brand: item.catalog.brand,
            title: item.catalog.title,
            image_url: item.catalog.image_url,
            category: allCatalog().find((row) => row.productId === item.productId)?.category,
          }
        : null;
      return {
        ok: true,
        status: 200,
        body: {
          query: item ? `${item.catalog.title}` : "similar",
          products: source ? similarCatalogProducts(source, allCatalog(), saved) : [],
        },
      };
    },

    getCatalog(): ApiResult<{ products: CatalogProduct[] }> {
      const saved = new Set(store.items.filter((row) => row.status === "active").map((row) => row.productId));
      return {
        ok: true,
        status: 200,
        body: { products: UNSAVED_CATALOG.filter((row) => !saved.has(row.productId)) },
      };
    },

    searchCatalog(query: string): ApiResult<{ products: CatalogProduct[] }> {
      return { ok: true, status: 200, body: { products: matchCatalog(query) } };
    },

    addItem(
      product: CatalogProduct,
      tag: ContextTag | null,
      occasionDate: string | null,
    ): ApiResult<{ item: WishlistView }> {
      const item: WishlistItem = {
        id: `wish-${product.sku}-${now().getTime()}`,
        user_id: store.userId,
        productId: product.productId,
        sku: product.sku,
        priceAtSave: product.price,
        currentPrice: product.price,
        selectedSize: product.size,
        tag,
        bucketId: null,
        occasionDate: tag === "occasion" ? occasionIso(occasionDate) : null,
        savedAt: iso(),
        status: "active",
        stockStatus: product.sizeOos ? "oos" : "in_stock",
        oosSince: product.sizeOos ? iso() : null,
        sizeWatch: product.sizeOos ? { size: product.size, active: true } : null,
        lastPriceDropAt: null,
        deadNudgeShown: false,
        catalog: {
          brand: product.brand,
          title: product.title,
          image_url: product.image_url,
        },
      };
      store.items.push(item);
      return { ok: true, status: 200, body: { item: view(item) } };
    },

    updateTag(itemId: string, tag: ContextTag | null, occasionDate: string | null): ApiResult<{ item: WishlistView }> {
      const item = store.items.find((row) => row.id === itemId);
      if (!item) return { ok: false, status: 404, error: "Not found" };
      item.tag = tag;
      item.occasionDate = tag === "occasion" ? occasionIso(occasionDate) : null;
      return { ok: true, status: 200, body: { item: view(item) } };
    },

    removeItem(itemId: string): ApiResult<{ removed: true }> {
      const item = store.items.find((row) => row.id === itemId);
      if (!item) return { ok: false, status: 404, error: "Not found" };
      item.status = "removed";
      return { ok: true, status: 200, body: { removed: true } };
    },

    dismissDead(itemId: string): ApiResult<{ dismissed: true }> {
      const item = store.items.find((row) => row.id === itemId);
      if (!item) return { ok: false, status: 404, error: "Not found" };
      item.deadNudgeShown = true;
      return { ok: true, status: 200, body: { dismissed: true } };
    },

    getPreferences(): ApiResult<NotificationPrefs> {
      return { ok: true, status: 200, body: { ...store.prefs } };
    },

    setPreferences(patch: Partial<NotificationPrefs>): ApiResult<NotificationPrefs> {
      store.prefs = { ...store.prefs, ...patch };
      return { ok: true, status: 200, body: { ...store.prefs } };
    },

    runPriceCheck(): ApiResult<{ sent: number; suppressed: string[] }> {
      return { ok: true, status: 200, body: { sent: 0, suppressed: ["disabled"] } };
    },

    dropPrice(sku: string, newPrice: number): ApiResult<{ sent: number; suppressed: string[] }> {
      for (const item of store.items) {
        if (item.sku === sku && item.status === "active") item.currentPrice = newPrice;
      }
      return this.runPriceCheck();
    },

    restockSize(sku: string, size: string): ApiResult<{ sent: number; reason?: string }> {
      const item = store.items.find((row) => row.sku === sku && row.status === "active");
      if (!item) return { ok: false, status: 404, error: "Not found" };
      const gate = canSendRestock(item, size, store.prefs);
      if (!gate.ok) return { ok: true, status: 200, body: { sent: 0, reason: gate.reason } };
      if (alreadySent(store.inbox, "restock", item.id)) {
        return { ok: true, status: 200, body: { sent: 0, reason: "already_sent" } };
      }
      item.stockStatus = "in_stock";
      item.oosSince = null;
      item.sizeWatch = { size: item.sizeWatch!.size, active: false };
      push({
        type: "restock",
        title: "Your size is back! 📦",
        body: `${item.catalog.title} in size ${size} is back in stock. Don't miss it.`,
        itemIds: [item.id],
      });
      return { ok: true, status: 200, body: { sent: 1 } };
    },

    runOccasionCheck(): ApiResult<{ sent: number; reason?: string }> {
      if (!store.prefs.occasionReminders) return { ok: true, status: 200, body: { sent: 0, reason: "pref_off" } };
      const nowIso = iso();
      const due = store.items.filter((row) => occasionDue(row, nowIso));
      if (due.length === 0) return { ok: true, status: 200, body: { sent: 0, reason: "none_due" } };
      const byDate = new Map<string, WishlistItem[]>();
      for (const item of due) {
        const key = item.occasionDate!;
        const list = byDate.get(key) ?? [];
        list.push(item);
        byDate.set(key, list);
      }
      let sent = 0;
      for (const [date, items] of byDate) {
        if (items.every((row) => alreadySent(store.inbox, "occasion", row.id))) continue;
        const days = Math.max(0, daysBetween(nowIso, date));
        push({
          type: "occasion",
          title: `Occasion is in ${days} days! 🎉`,
          body: `You have ${items.length} item${items.length === 1 ? "" : "s"} saved for it. Order now to get them on time.`,
          itemIds: items.map((row) => row.id),
        });
        sent += 1;
      }
      return { ok: true, status: 200, body: { sent } };
    },

    getInbox(): ApiResult<{ items: InboxRow[] }> {
      return { ok: true, status: 200, body: { items: [...store.inbox].reverse() } };
    },

    openNotification(id: string): ApiResult<InboxRow> {
      const row = store.inbox.find((item) => item.id === id);
      if (!row) return { ok: false, status: 404, error: "Not found" };
      row.openedAt = iso();
      return { ok: true, status: 200, body: row };
    },

    addToBag(itemId: string): ApiResult<{ bag_item_id: string }> {
      const item = store.items.find((row) => row.id === itemId);
      if (!item) return { ok: false, status: 404, error: "Not found" };
      store.bagItemId = itemId;
      store.addToCarts += 1;
      return { ok: true, status: 200, body: { bag_item_id: itemId } };
    },

    getBag(): ApiResult<{ item: WishlistView | null; addons: CatalogProduct[] }> {
      const item = store.items.find((row) => row.id === store.bagItemId) ?? null;
      const addons = store.bagAddonSkus
        .map((sku) => allCatalog().find((row) => row.sku === sku))
        .filter((row): row is CatalogProduct => Boolean(row));
      return { ok: true, status: 200, body: { item: item ? view(item) : null, addons } };
    },

    getOrderRecs(): ApiResult<OrderRecOffer> {
      const item = store.items.find((row) => row.id === store.bagItemId);
      if (!item) return { ok: false, status: 400, error: "Empty bag" };
      return {
        ok: true,
        status: 200,
        body: recommendForOrder(item, allCatalog(), iso()),
      };
    },

    addOrderAddon(sku: string): ApiResult<{ addons: CatalogProduct[] }> {
      if (!store.bagItemId) return { ok: false, status: 400, error: "Empty bag" };
      if (!allCatalog().some((row) => row.sku === sku)) {
        return { ok: false, status: 404, error: "Not found" };
      }
      if (!store.bagAddonSkus.includes(sku)) store.bagAddonSkus.push(sku);
      return this.getBag();
    },

    checkoutSuccess(): ApiResult<{ order_id: string; extras: string[] }> {
      if (!store.bagItemId) return { ok: false, status: 400, error: "Empty bag" };
      const item = store.items.find((row) => row.id === store.bagItemId);
      if (item) item.status = "purchased";
      const extras = store.bagAddonSkus
        .map((sku) => allCatalog().find((row) => row.sku === sku))
        .filter((row): row is CatalogProduct => Boolean(row));
      const orderId = `MYN${now().getTime()}`;
      if (item) {
        store.orders.unshift({
          id: orderId,
          placedAt: iso(),
          items: [
            {
              brand: item.catalog.brand,
              title: item.catalog.title,
              price: item.currentPrice,
              image_url: item.catalog.image_url,
            },
            ...extras.map((row) => ({
              brand: row.brand,
              title: row.title,
              price: row.price,
              image_url: row.image_url,
            })),
          ],
        });
      }
      store.bagItemId = null;
      store.bagAddonSkus = [];
      return { ok: true, status: 200, body: { order_id: orderId, extras: extras.map((row) => row.title) } };
    },

    getOrders(): ApiResult<{ items: ShopperOrder[] }> {
      return { ok: true, status: 200, body: { items: store.orders } };
    },

    getLookPairs(itemId: string): ApiResult<{ items: JeansLook[] }> {
      const item = store.items.find((row) => row.id === itemId);
      if (!item) return { ok: false, status: 404, error: "Not found" };
      const active = store.items.filter((row) => row.user_id === store.userId && row.status === "active");
      return {
        ok: true,
        status: 200,
        body: {
          items: jeansLookPairs(
            {
              productId: item.productId,
              brand: item.catalog.brand,
              title: item.catalog.title,
              category: allCatalog().find((row) => row.productId === item.productId)?.category,
            },
            active.map((row) => ({
              id: row.id,
              productId: row.productId,
              status: row.status,
              stockStatus: row.stockStatus,
              sku: row.sku,
              currentPrice: row.currentPrice,
              catalog: row.catalog,
              category: allCatalog().find((itemRow) => itemRow.productId === row.productId)?.category,
            })),
            allCatalog(),
          ),
        },
      };
    },

    getStylingLooks(itemId: string): ApiResult<{ items: StyleShot[]; reviews: StyleReview[] }> {
      const item = store.items.find((row) => row.id === itemId);
      if (!item) return { ok: false, status: 404, error: "Not found" };
      return {
        ok: true,
        status: 200,
        body: { items: stylingConfidenceLooks(item), reviews: stylingReviews(item.catalog.title) },
      };
    },

    getCompareClusters(): ApiResult<{ clusters: CompareCluster[] }> {
      const active = store.items.filter((row) => row.user_id === store.userId && row.status === "active");
      return { ok: true, status: 200, body: { clusters: compareClusters(active) } };
    },

    getCompare(key: string, inStockOnly = false): ApiResult<{ cluster: CompareCluster; cards: CompareCard[] }> {
      const parsed = parseClusterKey(key);
      if (!parsed) return { ok: false, status: 400, error: "Bad compare key" };
      const active = store.items.filter((row) => row.user_id === store.userId && row.status === "active");
      const cluster = compareClusters(active).find((row) => row.key === key);
      if (!cluster) return { ok: false, status: 404, error: "No cluster" };
      return { ok: true, status: 200, body: { cluster, cards: compareCards(active, cluster, inStockOnly, store.reviews) } };
    },

    getMeasurement(): ApiResult<{ available: false; reason: "not_in_prototype" }> {
      return { ok: true, status: 200, body: { available: false, reason: "not_in_prototype" } };
    },

    getStylistRecs(limit = 5, weights?: Partial<StylistWeights>): ApiResult<{ items: StylistRec[] }> {
      return {
        ok: true,
        status: 200,
        body: {
          items: recommendStylist({
            userId: store.userId,
            nowIso: iso(),
            catalog: allCatalog(),
            purchases: store.purchases,
            priceHistory: store.priceHistory,
            reviews: store.reviews,
            sizingReturns: store.sizingReturns,
            limit,
            weights,
          }),
        },
      };
    },
  };
}

export type ShopperApi = ReturnType<typeof createShopperApi>;
