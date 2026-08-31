import type { SaveContextDto } from "./saveContext";
import type { ReengagementType } from "./reengagementTypes";

export type WishlistStatus = "active" | "purchased" | "removed";
export type ReengagementEventStatus =
  | "suppressed"
  | "sent"
  | "clicked"
  | "converted";
export type StockSignalType = "back_in_stock" | "size_available";

export type CatalogSnapshot = {
  brand: string;
  title: string;
  image_label: string;
  price: { amount: number; currency: "INR" };
};

export type ActiveSignal = {
  type: StockSignalType | "occasion_approaching";
  label: string;
  expires_at: string;
};

export type WishlistItem = {
  id: string;
  user_id: string;
  product_id: string;
  sku_id: string | null;
  preferred_size: string | null;
  status: WishlistStatus;
  saved_at: string;
  last_viewed_at: string | null;
  last_resurfaced_at: string | null;
  sellable: boolean;
  active_signal: ActiveSignal | null;
  catalog: CatalogSnapshot;
};

export type ReengagementEvent = {
  id: string;
  user_id: string;
  wishlist_item_id: string;
  type: ReengagementType;
  channel: "in_app";
  status: ReengagementEventStatus;
  suppressed_reason: string | null;
  payload: {
    size?: string;
    sku_id?: string;
    product_id?: string;
    inventory_event_id?: string;
    days_until?: number;
    label?: string;
    offset_days?: number;
  };
  idempotency_key: string;
  created_at: string;
  clicked_at: string | null;
  converted_at: string | null;
};

export type NotificationInboxItem = {
  id: string;
  user_id: string;
  reengagement_event_id: string;
  wishlist_item_id: string;
  type: ReengagementType;
  title: string;
  body: string;
  deep_link: string;
  read_at: string | null;
  expires_at: string;
  created_at: string;
};

export type InventoryAvailabilityChanged = {
  event_id: string;
  sku_id: string;
  product_id: string;
  size: string;
  previous: "oos" | "sellable";
  current: "oos" | "sellable";
  occurred_at: string;
};

export type WishlistItemDto = {
  id: string;
  product_id: string;
  sku_id: string | null;
  preferred_size: string | null;
  status: WishlistStatus;
  catalog: {
    brand: string;
    title: string;
    image_url: string;
    price: { amount: number; currency: "INR" };
  };
  sellable: boolean;
  active_signal: ActiveSignal | null;
  occasion: {
    label: string;
    target_date: string | null;
    window_start: string | null;
    window_end: string | null;
    days_until: number | null;
    status: "active" | "dismissed" | "completed" | "expired";
  } | null;
  occasion_signal: { label: string } | null;
  save_context: SaveContextDto | null;
};

export const STOCK_INBOX_TTL_HOURS = 72;
export const DEMO_USER_ID = "user-demo";
export const OTHER_USER_ID = "user-b";
export const ITEM_A_ID = "wish-linen-shirt";
export const ITEM_B_ID = "wish-travel-jacket";
export const ITEM_C_ID = "wish-jeans";
