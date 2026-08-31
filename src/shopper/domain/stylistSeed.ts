import { DEMO_USER_ID } from "./models";
import type { PricePoint, ProductReview, PurchaseRecord, SizingReturn } from "./stylist";

/** Matches shopper runtime clock: 2026-08-30 10:00 IST. */
export const STYLIST_SEED_NOW = "2026-08-30T04:30:00.000Z";

function ago(days: number): string {
  return new Date(Date.parse(STYLIST_SEED_NOW) - days * 86_400_000).toISOString();
}

function series(productId: string, samples: Array<[daysAgo: number, price: number]>): PricePoint[] {
  return samples.map(([daysAgo, price]) => ({ productId, observedAt: ago(daysAgo), price }));
}

/** Planner (Sujata): ethnic + dresses, mid/premium INR. Complementary should be jewellery / beauty, not another kurta. */
export const SEED_PURCHASES: PurchaseRecord[] = [
  {
    id: "po-sujata-dress",
    userId: DEMO_USER_ID,
    productId: "prod-libas",
    purchasedAt: ago(46),
    price: 3299,
    size: "M",
    brand: "Libas",
    title: "Floral Printed Wrap Midi Dress",
    articleType: "dress",
    category: "WOMEN",
  },
  {
    id: "po-sujata-kurta",
    userId: DEMO_USER_ID,
    productId: "prod-anouk-live",
    purchasedAt: ago(14),
    price: 2499,
    size: "M",
    brand: "Anouk",
    title: "Embroidered Kurta Set",
    articleType: "kurta",
    category: "WOMEN",
  },
  {
    id: "po-priya-dress",
    userId: "user-priya",
    productId: "prod-occasion",
    purchasedAt: ago(20),
    price: 2799,
    size: "M",
    brand: "Sassafras",
    title: "Flared Ethnic Maxi",
    articleType: "dress",
    category: "WOMEN",
  },
  {
    id: "po-kabir-shirt",
    userId: "user-kabir",
    productId: "prod-linen",
    purchasedAt: ago(21),
    price: 1999,
    size: "M",
    brand: "H&M",
    title: "Regular Fit Linen Shirt",
    articleType: "shirt",
    category: "MEN",
  },
  {
    id: "po-kabir-cargo",
    userId: "user-kabir",
    productId: "prod-genz-cargo",
    purchasedAt: ago(10),
    price: 1599,
    size: "M",
    brand: "Sassafras",
    title: "Baggy Cargo Pants",
    articleType: "cargo",
    category: "GENZ",
  },
];

export const SEED_SIZING_RETURNS: SizingReturn[] = [
  {
    id: "ret-sujata-small",
    userId: DEMO_USER_ID,
    productId: "prod-w",
    returnedAt: ago(28),
    reason: "too_small",
  },
];

/**
 * 60-day paths:
 * - earrings: genuine drop vs own average
 * - floral dress: hike then "sale" (fake)
 * - lipstick: steadily rising
 * - serum: genuine drop
 * - studio dress: stable (no deal)
 * Several catalog SKUs intentionally have no series.
 */
export const SEED_PRICE_HISTORY: PricePoint[] = [
  ...series("prod-studio-jewel", [
    [56, 799],
    [49, 799],
    [42, 799],
    [35, 779],
    [28, 799],
    [21, 789],
    [14, 799],
    [7, 649],
    [0, 599],
  ]),
  ...series("prod-w", [
    [56, 1899],
    [49, 1899],
    [42, 1899],
    [35, 1899],
    [28, 1899],
    [21, 1899],
    [14, 2499],
    [10, 2499],
    [7, 2399],
    [0, 1999],
  ]),
  ...series("prod-beauty-lip", [
    [56, 399],
    [42, 429],
    [28, 449],
    [14, 479],
    [0, 499],
  ]),
  ...series("prod-beauty-serum", [
    [56, 899],
    [42, 899],
    [28, 879],
    [14, 849],
    [0, 699],
  ]),
  ...series("prod-studio-dress", [
    [56, 2299],
    [42, 2299],
    [28, 2299],
    [14, 2299],
    [0, 2299],
  ]),
  ...series("prod-levis", [
    [56, 2999],
    [42, 2899],
    [28, 2799],
    [14, 2699],
    [0, 2499],
  ]),
];

export const SEED_REVIEWS: ProductReview[] = [
  { id: "rv-w-1", productId: "prod-w", createdAt: ago(40), rating: 3, fit: "runs_small" },
  { id: "rv-w-2", productId: "prod-w", createdAt: ago(20), rating: 2, fit: "runs_small" },
  { id: "rv-w-3", productId: "prod-w", createdAt: ago(12), rating: 4, fit: "true_to_size" },
  { id: "rv-studio-dress-1", productId: "prod-studio-dress", createdAt: ago(18), rating: 5, fit: "true_to_size" },
  { id: "rv-studio-dress-2", productId: "prod-studio-dress", createdAt: ago(9), rating: 4, fit: "true_to_size" },
  { id: "rv-global-1", productId: "prod-global-desi", createdAt: ago(30), rating: 4, fit: "runs_large" },
  { id: "rv-linen-1", productId: "prod-linen", createdAt: ago(22), rating: 3, fit: "runs_small" },
  { id: "rv-vero-1", productId: "prod-occasion-2", createdAt: ago(15), rating: 5, fit: "true_to_size" },
  { id: "rv-jewel-rating-only", productId: "prod-studio-jewel", createdAt: ago(11), rating: 5, fit: null },
];

export function purchasesFor(userId: string): PurchaseRecord[] {
  return SEED_PURCHASES.filter((row) => row.userId === userId);
}

export function returnsFor(userId: string): SizingReturn[] {
  return SEED_SIZING_RETURNS.filter((row) => row.userId === userId);
}
