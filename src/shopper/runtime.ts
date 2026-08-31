import { createShopperApi } from "./api";
import { BIBA_SKU, LIBAS_SKU } from "./domain/models";
import { createHttpShopperApi, getSession, postDemo } from "./httpClient";
import { PERSONAS, armBibaSizeWatch, ensureSeedItem, ShopperStore } from "./store";

export function createShopperRuntime() {
  const store = new ShopperStore();
  let clock = new Date("2026-08-30T10:00:00+05:30");
  const now = () => new Date(clock);
  const api = createShopperApi(store, now);
  return {
    kind: "local" as const,
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
    hydrate: () => Promise.resolve(),
  };
}

export function createHttpShopperRuntime(baseUrl: string) {
  let personaId = "sujata";
  const api = createHttpShopperApi(baseUrl, () => personaId);
  const store = {
    get personaId() {
      return personaId;
    },
    persona() {
      return PERSONAS.find((row) => row.id === personaId) ?? PERSONAS[0];
    },
  };

  return {
    kind: "http" as const,
    store,
    api,
    now: () => new Date("2026-08-30T10:00:00+05:30"),
    reset: () =>
      postDemo(baseUrl, "/demo/reset", personaId).then(() => {
        personaId = "sujata";
      }),
    switchPersona: (id: string) =>
      postDemo(baseUrl, `/demo/persona/${encodeURIComponent(id)}`, personaId).then(() => {
        personaId = id;
      }),
    dropLibas: () => postDemo(baseUrl, "/demo/price-drop", personaId),
    restockBiba: () => postDemo(baseUrl, "/demo/restock", personaId),
    restockBibaWrongSize: () => postDemo(baseUrl, "/demo/restock-wrong", personaId),
    runOccasion: () => postDemo(baseUrl, "/demo/occasion", personaId),
    hydrate: async () => {
      const next = await getSession(baseUrl, personaId);
      if (next) personaId = next;
    },
  };
}

export function createAppRuntime() {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (base) return createHttpShopperRuntime(base);
  return createShopperRuntime();
}

export type ShopperRuntime = ReturnType<typeof createShopperRuntime> | ReturnType<typeof createHttpShopperRuntime>;
