import {
  DEMO_USER_ID,
  ITEM_A_ID,
  OTHER_USER_ID,
  type WishlistItem,
} from "../domain/models";
import type { SaveContext } from "../domain/saveContext";

export const SEED_WISHLIST_ITEMS: WishlistItem[] = [
  {
    id: ITEM_A_ID,
    user_id: DEMO_USER_ID,
    product_id: "prod-linen",
    sku_id: "sku-linen-m",
    preferred_size: "M",
    status: "active",
    saved_at: "2026-08-17T10:00:00.000Z",
    last_viewed_at: null,
    last_resurfaced_at: null,
    sellable: false,
    active_signal: null,
    catalog: {
      brand: "H&M",
      title: "Regular Fit Linen Shirt",
      image_label: "Shirt",
      price: { amount: 1999, currency: "INR" },
    },
  },
  {
    id: "wish-travel-jacket",
    user_id: DEMO_USER_ID,
    product_id: "prod-jacket",
    sku_id: "sku-jacket-m",
    preferred_size: "M",
    status: "active",
    saved_at: "2026-08-10T10:00:00.000Z",
    last_viewed_at: null,
    last_resurfaced_at: null,
    sellable: false,
    active_signal: null,
    catalog: {
      brand: "Puma",
      title: "Lightweight Travel Jacket",
      image_label: "Jacket",
      price: { amount: 3499, currency: "INR" },
    },
  },
  {
    id: "wish-jeans",
    user_id: DEMO_USER_ID,
    product_id: "prod-jeans",
    sku_id: "sku-jeans-m",
    preferred_size: "M",
    status: "active",
    saved_at: "2026-08-20T10:00:00.000Z",
    last_viewed_at: null,
    last_resurfaced_at: null,
    sellable: false,
    active_signal: null,
    catalog: {
      brand: "Levis",
      title: "511 Slim Jeans",
      image_label: "Jeans",
      price: { amount: 2999, currency: "INR" },
    },
  },
  {
    id: "wish-user-b-tee",
    user_id: OTHER_USER_ID,
    product_id: "prod-tee",
    sku_id: "sku-tee-s",
    preferred_size: "S",
    status: "active",
    saved_at: "2026-08-17T10:00:00.000Z",
    last_viewed_at: null,
    last_resurfaced_at: null,
    sellable: true,
    active_signal: null,
    catalog: {
      brand: "Roadster",
      title: "Cotton Tee",
      image_label: "Tee",
      price: { amount: 599, currency: "INR" },
    },
  },
];

export const SEED_SAVE_CONTEXTS: SaveContext[] = [
  {
    wishlist_item_id: ITEM_A_ID,
    source: "search",
    note: null,
    referring_query: "linen shirt",
    metadata: null,
    created_at: "2026-08-17T10:00:00.000Z",
  },
  {
    wishlist_item_id: "wish-travel-jacket",
    source: "pdp",
    note: null,
    referring_query: null,
    metadata: null,
    created_at: "2026-08-10T10:00:00.000Z",
  },
  {
    wishlist_item_id: "wish-jeans",
    source: "collection",
    note: null,
    referring_query: null,
    metadata: { collection_id: "col-denim" },
    created_at: "2026-08-20T10:00:00.000Z",
  },
  {
    wishlist_item_id: "wish-user-b-tee",
    source: "other",
    note: null,
    referring_query: null,
    metadata: null,
    created_at: "2026-08-17T10:00:00.000Z",
  },
];

export function formatDisplayPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
