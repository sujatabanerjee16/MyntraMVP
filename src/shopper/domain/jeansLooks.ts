import { inferArticleType } from "./stylist";

export type LookKind = "top" | "shoes";
export type LookSource = "wishlist" | "same_brand";

export type LookCandidate = {
  productId: string;
  sku: string;
  brand: string;
  title: string;
  image_url: string;
  price: number;
};

export type WishlistLookItem = {
  id: string;
  productId: string;
  status: string;
  catalog: { brand: string; title: string; image_url: string };
  currentPrice?: number;
  sku?: string;
};

export type JeansLook = LookCandidate & {
  kind: LookKind;
  source: LookSource;
  wishlistItemId: string | null;
};

const TOPS = new Set(["shirt", "polo", "tee", "top"]);
const SHOES = new Set(["sneakers"]);

export function lookKindOf(title: string): LookKind | null {
  const article = inferArticleType(title);
  if (TOPS.has(article)) return "top";
  if (SHOES.has(article)) return "shoes";
  return null;
}

export function isJeansItem(title: string): boolean {
  return inferArticleType(title) === "jeans";
}

function toLook(row: LookCandidate, kind: LookKind, source: LookSource, wishlistItemId: string | null): JeansLook {
  return { ...row, kind, source, wishlistItemId };
}

/** Tops and shoes to pair with a wishlisted jean — wishlist first, then same brand. */
export function jeansLookPairs(
  jeans: { productId: string; brand: string; title: string },
  wishlist: WishlistLookItem[],
  catalog: LookCandidate[],
  limit = 6,
): JeansLook[] {
  if (!isJeansItem(jeans.title)) return [];

  const seen = new Set<string>([jeans.productId]);
  const picks: JeansLook[] = [];

  function take(row: LookCandidate, source: LookSource, wishlistItemId: string | null) {
    if (seen.has(row.productId) || picks.length >= limit) return;
    const kind = lookKindOf(row.title);
    if (!kind) return;
    seen.add(row.productId);
    picks.push(toLook(row, kind, source, wishlistItemId));
  }

  for (const item of wishlist) {
    if (item.status !== "active") continue;
    take(
      {
        productId: item.productId,
        sku: item.sku ?? item.productId,
        brand: item.catalog.brand,
        title: item.catalog.title,
        image_url: item.catalog.image_url,
        price: item.currentPrice ?? 0,
      },
      "wishlist",
      item.id,
    );
  }

  const brand = jeans.brand.toLowerCase();
  for (const row of catalog) {
    if (row.brand.toLowerCase() !== brand) continue;
    take(row, "same_brand", null);
  }

  return picks;
}
