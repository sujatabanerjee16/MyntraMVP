import type { ApiResult, ShopperApi } from "./api";
import type { ContextTag, NotificationPrefs } from "./domain/models";
import type { CatalogProduct } from "./store";

function demoHeaders(personaId?: string) {
  const headers = new Headers();
  const secret = import.meta.env.VITE_DEMO_SECRET;
  if (secret) headers.set("Authorization", `Bearer ${secret}`);
  if (personaId) headers.set("X-Persona-Id", personaId);
  return headers;
}

export function createHttpShopperApi(baseUrl: string, getPersonaId: () => string): ShopperApi {
  const root = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const secret = import.meta.env.VITE_DEMO_SECRET;
    if (secret && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${secret}`);
    const personaId = getPersonaId();
    if (personaId && !headers.has("X-Persona-Id")) headers.set("X-Persona-Id", personaId);
    const res = await fetch(`${root}${path}`, { ...init, headers });
    const json = (await res.json()) as ApiResult<T>;
    return json;
  }

  const json = (body: unknown) => JSON.stringify(body);

  return {
    getWishlist(filter?: "occasion") {
      const q = filter === "occasion" ? "?filter=occasion" : "";
      return request(`/wishlist${q}`);
    },
    getSimilar(itemId: string) {
      return request(`/catalog/similar/${encodeURIComponent(itemId)}`);
    },
    getCatalog() {
      return request("/catalog");
    },
    searchCatalog(query: string) {
      return request(`/catalog/search?q=${encodeURIComponent(query)}`);
    },
    addItem(product: CatalogProduct, tag: ContextTag | null, occasionDate: string | null) {
      return request("/wishlist", { method: "POST", body: json({ product, tag, occasionDate }) });
    },
    updateTag(itemId: string, tag: ContextTag | null, occasionDate: string | null) {
      return request(`/wishlist/${encodeURIComponent(itemId)}/tag`, {
        method: "PATCH",
        body: json({ tag, occasionDate }),
      });
    },
    removeItem(itemId: string) {
      return request(`/wishlist/${encodeURIComponent(itemId)}`, { method: "DELETE" });
    },
    dismissDead(itemId: string) {
      return request(`/wishlist/${encodeURIComponent(itemId)}/dismiss-dead`, { method: "POST" });
    },
    getPreferences() {
      return request("/prefs");
    },
    setPreferences(patch: Partial<NotificationPrefs>) {
      return request("/prefs", { method: "PATCH", body: json(patch) });
    },
    runPriceCheck() {
      return request("/jobs/price-check", { method: "POST" });
    },
    dropPrice() {
      return request("/demo/price-drop", { method: "POST" });
    },
    restockSize() {
      return request("/demo/restock", { method: "POST" });
    },
    runOccasionCheck() {
      return request("/demo/occasion", { method: "POST" });
    },
    getInbox() {
      return request("/inbox");
    },
    openNotification(id: string) {
      return request(`/inbox/${encodeURIComponent(id)}/open`, { method: "POST" });
    },
    addToBag(itemId: string) {
      return request("/bag", { method: "POST", body: json({ itemId }) });
    },
    getBag() {
      return request("/bag");
    },
    getOrderRecs() {
      return request("/bag/recs");
    },
    addOrderAddon(sku: string) {
      return request("/bag/addons", { method: "POST", body: json({ sku }) });
    },
    checkoutSuccess() {
      return request("/checkout", { method: "POST" });
    },
    getLookPairs(itemId: string) {
      return request(`/wishlist/${encodeURIComponent(itemId)}/looks`);
    },
    getMeasurement() {
      return request("/measurement");
    },
    getStylistRecs(limit = 5) {
      return request(`/stylist?limit=${limit}`);
    },
  } as unknown as ShopperApi;
}

export async function postDemo(baseUrl: string, path: string, personaId?: string) {
  const root = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${root}${path}`, { method: "POST", headers: demoHeaders(personaId) });
  return (await res.json()) as ApiResult<{ sent?: number; reason?: string; suppressed?: string[] }>;
}

export async function getSession(baseUrl: string, personaId?: string) {
  const root = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${root}/session`, { headers: demoHeaders(personaId) });
  const json = (await res.json()) as ApiResult<{ personaId: string }>;
  if (json.ok) return json.body.personaId;
  return undefined;
}
