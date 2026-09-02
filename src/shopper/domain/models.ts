export type ContextTag = "occasion" | "price_drop" | "size_wait" | "compare" | "bookmarking";

export type StockStatus = "in_stock" | "oos" | "discontinued";

export type WishlistStatus = "active" | "purchased" | "removed";

export type PushType = "price_drop" | "restock" | "occasion";

export type WishlistBucketId = "office" | "wedding" | "summer";

export const WISHLIST_BUCKETS: { id: WishlistBucketId; label: string }[] = [
  { id: "office", label: "Office Wear" },
  { id: "wedding", label: "Friend's Wedding" },
  { id: "summer", label: "Summer Casuals" },
];

export type WishlistItem = {
  id: string;
  user_id: string;
  productId: string;
  sku: string;
  priceAtSave: number;
  currentPrice: number;
  selectedSize: string | null;
  tag: ContextTag | null;
  bucketId: WishlistBucketId | null;
  occasionDate: string | null;
  savedAt: string;
  status: WishlistStatus;
  stockStatus: StockStatus;
  oosSince: string | null;
  sizeWatch: { size: string; active: boolean } | null;
  lastPriceDropAt: string | null;
  deadNudgeShown: boolean;
  catalog: {
    brand: string;
    title: string;
    image_url: string;
  };
};

export type NotificationPrefs = {
  priceDropAlerts: boolean;
  sizeRestockAlerts: boolean;
  occasionReminders: boolean;
};

export type InboxRow = {
  id: string;
  type: PushType;
  title: string;
  body: string;
  itemIds: string[];
  sentAt: string;
  openedAt: string | null;
};

export const DEMO_USER_ID = "user-demo";
export const LIBAS_ID = "wish-libas";
export const BIBA_ID = "wish-biba";
export const LINEN_ID = "wish-linen";
export const JEANS_ID = "wish-jeans";
export const OCCASION_ID = "wish-occasion";
export const OCCASION_2_ID = "wish-occasion-2";
export const DEAD_ID = "wish-dead";
export const LIBAS_SKU = "sku-libas-m";
export const BIBA_SKU = "sku-biba-s";

export const TAG_LABEL: Record<ContextTag, string> = {
  occasion: "Occasion",
  price_drop: "Price drop",
  size_wait: "My size",
  compare: "Compare",
  bookmarking: "Bookmark",
};

export const TAG_EMOJI: Record<ContextTag, string> = {
  occasion: "🎉",
  price_drop: "💸",
  size_wait: "📦",
  compare: "🆚",
  bookmarking: "🤔",
};

export function isLiveTag(tag: ContextTag | null | undefined): tag is "occasion" | "size_wait" | "compare" {
  return tag === "occasion" || tag === "size_wait" || tag === "compare";
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  return Math.floor((to - from) / 86_400_000);
}
