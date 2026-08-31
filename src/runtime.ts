import { createV1Api, type V1Api } from "./api/v1";
import type { InventoryAvailabilityChanged } from "./domain/models";
import { addDaysYmd } from "./domain/occasion";
import { localDateKey } from "./domain/localTime";
import { ENGAGEMENT_CONFIG } from "./domain/engagementConfig";
import { DEMO_USER_ID, ITEM_A_ID } from "./domain/models";
import { createFeatureFlags } from "./domain/flags";
import { AnalyticsSink } from "./services/analyticsSink";
import { MemoryStore } from "./store/memoryStore";

export const DEMO_IN_WINDOW = "2026-08-29T10:00:00+05:30";
export const DEMO_OVERNIGHT = "2026-08-29T02:00:00+05:30";
export const DEMO_NEXT_DAY = "2026-08-30T10:00:00+05:30";

export type AppRuntime = {
  api: V1Api;
  store: MemoryStore;
  analytics: AnalyticsSink;
  flags: ReturnType<typeof createFeatureFlags>;
  sessionUserId: string;
  now: () => Date;
  setClock: (iso: string) => void;
  reset: () => void;
  triggerRestock: (
    size: string,
    skuId?: string,
    productId?: string,
  ) => ReturnType<V1Api["postInternalCandidate"]>;
  triggerBothRestocks: () => void;
  markOos: () => ReturnType<V1Api["postInternalCandidate"]>;
  flushPending: () => ReturnType<V1Api["flushPending"]>;
  resetFrequency: () => ReturnType<V1Api["resetFrequency"]>;
  pretendTripIn3Days: (itemId?: string) => void;
};

export function createRuntime(
  options: { userId?: string; now?: () => Date } = {},
): AppRuntime {
  const store = new MemoryStore();
  const analytics = new AnalyticsSink();
  const flags = createFeatureFlags();
  let clock = new Date(DEMO_IN_WINDOW);
  const now = options.now ?? (() => new Date(clock));
  const api = createV1Api({ store, analytics, flags, now });
  const sessionUserId = options.userId ?? DEMO_USER_ID;

  function inventoryEvent(
    size: string,
    current: "sellable" | "oos",
    skuId = "sku-linen-m",
    productId = "prod-linen",
  ): InventoryAvailabilityChanged {
    return {
      event_id: crypto.randomUUID(),
      sku_id: skuId,
      product_id: productId,
      size,
      previous: current === "sellable" ? "oos" : "sellable",
      current,
      occurred_at: now().toISOString(),
    };
  }

  return {
    api,
    store,
    analytics,
    flags,
    sessionUserId,
    now,
    setClock: (iso) => {
      clock = new Date(iso);
    },
    reset: () => {
      store.reset();
      analytics.reset();
      clock = new Date(DEMO_IN_WINDOW);
    },
    triggerRestock: (size, skuId, productId) =>
      api.postInternalCandidate(
        inventoryEvent(size, "sellable", skuId, productId),
        true,
      ),
    triggerBothRestocks: () => {
      api.postInternalCandidate(
        inventoryEvent("M", "sellable", "sku-linen-m", "prod-linen"),
        true,
      );
      api.postInternalCandidate(
        inventoryEvent("M", "sellable", "sku-jacket-m", "prod-jacket"),
        true,
      );
    },
    markOos: () => api.postInternalCandidate(inventoryEvent("M", "oos"), true),
    flushPending: () => api.flushPending(),
    resetFrequency: () => api.resetFrequency(sessionUserId),
    pretendTripIn3Days: (itemId = ITEM_A_ID) => {
      const today = localDateKey(now(), ENGAGEMENT_CONFIG.timezone);
      api.markSellable(sessionUserId, itemId);
      api.putOccasion(sessionUserId, itemId, {
        label: "Vacation",
        target_date: addDaysYmd(today, 3),
        timezone: ENGAGEMENT_CONFIG.timezone,
      });
      api.runOccasionScheduler();
    },
  };
}

export { DEMO_USER_ID, ITEM_A_ID };
