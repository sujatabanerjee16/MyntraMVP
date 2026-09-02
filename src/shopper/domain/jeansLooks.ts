import { inferArticleType } from "./stylist";

export type LookKind = "top" | "shoes" | "earrings" | "beauty" | "bag" | "jeans" | "home";
export type LookSource = "wishlist" | "same_brand" | "catalog";

export type LookCandidate = {
  productId: string;
  sku: string;
  brand: string;
  title: string;
  image_url: string;
  price: number;
  category?: string;
};

export type WishlistLookItem = {
  id: string;
  productId: string;
  status: string;
  stockStatus?: string;
  catalog: { brand: string; title: string; image_url: string };
  currentPrice?: number;
  sku?: string;
  category?: string;
};

export type JeansLook = LookCandidate & {
  kind: LookKind;
  source: LookSource;
  wishlistItemId: string | null;
};

const TOPS = new Set(["shirt", "polo", "tee", "top"]);
const SHOES = new Set(["sneakers"]);
const BEAUTY = new Set(["lipstick", "serum", "makeup"]);

export function isKidsLook(title: string, brand = "", category?: string): boolean {
  if (category === "KIDS") return true;
  return /infant|baby|\bboys\b|\bgirls\b|kids|h&m kids|hopscotch|babyhug|mothercare/i.test(`${title} ${brand}`);
}

export function lookKindOf(title: string, category?: string): LookKind | null {
  if (isKidsLook(title, "", category)) {
    if (/sock|bootie|sneaker|shoe/i.test(title)) return "shoes";
    if (/earring|jewel/i.test(title)) return null;
    return "top";
  }
  const article = inferArticleType(title);
  if (TOPS.has(article)) return "top";
  if (SHOES.has(article)) return "shoes";
  if (article === "jeans") return "jeans";
  if (article === "earrings") return "earrings";
  if (BEAUTY.has(article)) return "beauty";
  if (article === "bag") return "bag";
  if (article === "cushion" || article === "lamp" || article === "bedsheet") return "home";
  if (/curtain|dinner|cushion|chair|lounge|bedding|quilt/i.test(title)) return "home";
  return null;
}

export function lookKindLabel(kind: LookKind): string {
  if (kind === "shoes") return "Shoes";
  if (kind === "jeans") return "Jeans";
  if (kind === "earrings") return "Earrings";
  if (kind === "beauty") return "Beauty";
  if (kind === "bag") return "Bag";
  if (kind === "home") return "Home";
  return "Top";
}

export function lookSourceLabel(source: LookSource): string {
  if (source === "wishlist") return "In your wishlist";
  if (source === "catalog") return "Pairs well";
  return "Same brand";
}

export function isJeansItem(title: string): boolean {
  return inferArticleType(title) === "jeans";
}

function complementsFor(title: string, brand = "", category?: string): LookKind[] {
  if (isKidsLook(title, brand, category)) return ["top", "shoes"];
  const article = inferArticleType(title);
  if (article === "jeans") return ["top", "shoes"];
  if (article === "shirt" || article === "polo" || article === "tee") return ["jeans", "shoes"];
  if (article === "kurta" || article === "dress" || article === "saree" || /ethnic|anarkali|maxi/i.test(title)) {
    return ["earrings", "beauty"];
  }
  return [];
}

const KIND_CAP: Record<LookKind, number> = {
  top: 3,
  shoes: 1,
  jeans: 2,
  earrings: 1,
  beauty: 1,
  bag: 1,
  home: 1,
};

function catalogCat(row: LookCandidate, catalog: LookCandidate[]): string | undefined {
  return row.category ?? catalog.find((item) => item.productId === row.productId)?.category;
}

/** Same shop section, plus jewellery/beauty extras for women's ethnic looks. */
export function pairingAllowed(bagCat: string | undefined, rowCat: string | undefined, title = ""): boolean {
  if (!bagCat) return rowCat !== "KIDS";
  if (rowCat === bagCat) return true;
  if (bagCat === "KIDS" || rowCat === "KIDS") return false;
  if (bagCat === "WOMEN" && (rowCat === "STUDIO" || rowCat === "BEAUTY") && /earring|jewel|lip|serum|palette|cream|kit/i.test(title)) {
    return true;
  }
  if (bagCat === "MEN" && rowCat === "GENZ" && /sneaker|jean/i.test(title)) return true;
  return false;
}

function toLook(row: LookCandidate, kind: LookKind, source: LookSource, wishlistItemId: string | null): JeansLook {
  return { ...row, kind, source, wishlistItemId };
}

/** Complements for the saved piece — jeans get tops/shoes; ethnic/dresses get jewellery; kids stay in kids. */
export function lookPairs(
  anchor: { productId: string; brand: string; title: string; category?: string },
  wishlist: WishlistLookItem[],
  catalog: LookCandidate[],
  limit = 6,
): JeansLook[] {
  const bagCat = anchor.category ?? catalog.find((row) => row.productId === anchor.productId)?.category;
  const wanted = new Set(complementsFor(anchor.title, anchor.brand, bagCat));
  if (wanted.size === 0) return [];

  const seen = new Set<string>([anchor.productId]);
  const picks: JeansLook[] = [];

  function take(row: LookCandidate, source: LookSource, wishlistItemId: string | null) {
    if (seen.has(row.productId) || picks.length >= limit) return;
    if (picks.some((pick) => pick.image_url === row.image_url)) return;
    const rowCat = catalogCat(row, catalog);
    if (!pairingAllowed(bagCat, rowCat, row.title)) return;
    const kind = lookKindOf(row.title, rowCat);
    if (!kind || !wanted.has(kind)) return;
    if (picks.filter((pick) => pick.kind === kind).length >= KIND_CAP[kind]) return;
    seen.add(row.productId);
    picks.push(toLook({ ...row, category: rowCat }, kind, source, wishlistItemId));
  }

  for (const item of wishlist) {
    if (item.status !== "active") continue;
    if (item.stockStatus === "discontinued") continue;
    take(
      {
        productId: item.productId,
        sku: item.sku ?? item.productId,
        brand: item.catalog.brand,
        title: item.catalog.title,
        image_url: item.catalog.image_url,
        price: item.currentPrice ?? 0,
        category: item.category,
      },
      "wishlist",
      item.id,
    );
  }

  if (isJeansItem(anchor.title) && !isKidsLook(anchor.title, anchor.brand, bagCat)) {
    const brand = anchor.brand.toLowerCase();
    for (const row of catalog) {
      if (row.brand.toLowerCase() !== brand) continue;
      take(row, "same_brand", null);
    }
  } else {
    for (const row of catalog) {
      take(row, "catalog", null);
    }
  }

  return picks;
}

/** Tops and shoes to pair with a wishlisted jean — wishlist first, then same brand. */
export function jeansLookPairs(
  jeans: { productId: string; brand: string; title: string; category?: string },
  wishlist: WishlistLookItem[],
  catalog: LookCandidate[],
  limit = 6,
): JeansLook[] {
  return lookPairs(jeans, wishlist, catalog, limit);
}
