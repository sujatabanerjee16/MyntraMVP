import { createShopperApi } from "./api";
import { BIBA_SKU, LIBAS_SKU } from "./domain/models";
import { armBibaSizeWatch, ensureSeedItem, ShopperStore } from "./store";

export function createShopperRuntime() {
  const store = new ShopperStore();
  let clock = new Date("2026-08-30T10:00:00+05:30");
  const now = () => new Date(clock);
  const api = createShopperApi(store, now);
  return {
    store,
    api,
    now,
    reset: () => {
      store.reset();
      clock = new Date("2026-08-30T10:00:00+05:30");
    },
    switchPersona: (personaId: string) => {
      store.reset(personaId);
      clock = new Date("2026-08-30T10:00:00+05:30");
    },
    dropLibas: () => {
      ensureSeedItem(store, LIBAS_SKU);
      return api.dropPrice(LIBAS_SKU, 2639);
    },
    restockBiba: () => {
      armBibaSizeWatch(store);
      const result = api.restockSize(BIBA_SKU, "S");
      if (result.ok && result.body.reason === "already_sent") {
        return { ...result, body: { sent: 1, reason: "already_sent" } };
      }
      return result;
    },
    restockBibaWrongSize: () => {
      armBibaSizeWatch(store);
      return api.restockSize(BIBA_SKU, "L");
    },
    runOccasion: () => api.runOccasionCheck(),
  };
}

export type ShopperRuntime = ReturnType<typeof createShopperRuntime>;
