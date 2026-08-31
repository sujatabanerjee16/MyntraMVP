import { SEED_WISHLIST_ITEMS, formatDisplayPrice } from "../store/seed";

export type WishlistItemFixture = {
  id: string;
  brand: string;
  title: string;
  size: string;
  price: { amount: number; currency: "INR" };
  imageLabel: string;
};

/**
 * Catalog price is display-only. Never used as a re-engagement signal.
 */
export const WISHLIST_ITEMS: WishlistItemFixture[] = SEED_WISHLIST_ITEMS.filter(
  (item) => item.user_id === "user-demo",
).map((item) => ({
  id: item.id,
  brand: item.catalog.brand,
  title: item.catalog.title,
  size: item.preferred_size ?? "",
  price: item.catalog.price,
  imageLabel: item.catalog.image_label,
}));

export { formatDisplayPrice };
