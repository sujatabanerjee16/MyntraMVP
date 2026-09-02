import { formatInr, type WishlistItem } from "./models";
import { inferArticleType, type ProductReview, type PurchaseRecord } from "./stylist";
import { similarVariationLabel } from "./similarItems";
import { reviewAverage, stylingReviews } from "./stylingLooks";
import type { SiteCat } from "../store";
import { allCatalog } from "../store";

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 5;

export type CompareCluster = {
  key: string;
  category: SiteCat;
  article: string;
  label: string;
  count: number;
  itemIds: string[];
};

export type CompareCard = {
  itemId: string;
  productId: string;
  brand: string;
  title: string;
  image_url: string;
  price: number;
  priceLabel: string;
  cheapest: boolean;
  rating: number;
  ratingCount: number;
  description: string;
  inStock: boolean;
};

export type ComparePick = {
  itemId: string;
  why: string;
};

const PLURAL: Record<string, [string, string]> = {
  kurta: ["kurta", "kurtas"],
  dress: ["dress", "dresses"],
  saree: ["saree", "sarees"],
  top: ["top", "tops"],
  shirt: ["shirt", "shirts"],
  polo: ["polo", "polos"],
  jeans: ["jeans", "jeans"],
  tee: ["t-shirt", "t-shirts"],
  cargo: ["cargo", "cargos"],
  hoodie: ["hoodie", "hoodies"],
  frock: ["frock", "frocks"],
  ethnic_set: ["ethnic set", "ethnic sets"],
  earrings: ["earring", "earrings"],
  bag: ["bag", "bags"],
  sneakers: ["sneaker", "sneakers"],
  jacket: ["jacket", "jackets"],
  lipstick: ["lipstick", "lipsticks"],
  blazer: ["blazer", "blazers"],
};

const DESCRIPTIONS: Record<string, string> = {
  "prod-libas": "Floral wrap midi in printed viscose. Soft drape; the wrap holds if you double-knot it.",
  "prod-occasion": "Flared ethnic maxi with a gathered waist. Airy cotton-blend, easy for a ceremony.",
  "prod-occasion-2": "Pleated party dress in a crepe finish. Sharp folds, sits close without feeling stiff.",
  "prod-dress-cmp-1": "White off-shoulder mini with a ruffled bust. Light cotton, easy with sneakers.",
  "prod-dress-cmp-2": "Dark indigo slim jeans. Clean five-pocket denim, mid-weight, no heavy fade.",
  "prod-kurta-cmp-1": "Straight cotton kurta with a light floral print. Cool for daytime wear.",
  "prod-kurta-cmp-2": "Flared festive Anarkali with a contrasting dupatta. Structured fall.",
  "prod-kurta-cmp-3": "Printed short kurta in cotton. Everyday print, easy with jeans.",
  "prod-biba": "Anarkali kurta with a flared skirt. Heavier festive fabric.",
  "prod-linen": "Regular-fit linen shirt. Breathable, creases as linen should.",
  "prod-shirt-cmp-1": "Oxford casual shirt. Crisp cotton, holds a collar.",
  "prod-shirt-cmp-2": "Pique casual shirt. Textured knit, slightly stretchy.",
};

function categoryOf(item: WishlistItem): SiteCat {
  return allCatalog().find((row) => row.productId === item.productId)?.category ?? "WOMEN";
}

function articleOf(item: WishlistItem): string {
  const title = item.catalog.title;
  if (/hoodie/i.test(title)) return "hoodie";
  if (/blazer/i.test(title)) return "blazer";
  if (/jacket|bomber/i.test(title)) return "jacket";
  if (/dress|maxi|midi/i.test(title)) return "dress";
  return inferArticleType(title);
}

export function clusterKey(category: SiteCat, article: string): string {
  return `${category}:${article}`;
}

export function parseClusterKey(key: string): { category: SiteCat; article: string } | null {
  const split = key.split(":");
  if (split.length < 2) return null;
  return { category: split[0] as SiteCat, article: split.slice(1).join(":") };
}

function noun(article: string, count: number): string {
  const pair = PLURAL[article] ?? [similarVariationLabel(article).toLowerCase(), `${similarVariationLabel(article).toLowerCase()}s`];
  return count === 1 ? pair[0] : pair[1];
}

function catLabel(category: SiteCat): string {
  return category[0] + category.slice(1).toLowerCase();
}

export function inferQuality(title: string): string {
  if (/silk|satin/i.test(title)) return "Silk / satin drape";
  if (/linen/i.test(title)) return "Linen — breathable";
  if (/cotton/i.test(title)) return "Cotton";
  if (/denim|jean/i.test(title)) return "Denim";
  if (/knit|hoodie|jersey|ruched/i.test(title)) return "Knit";
  if (/crepe|pleat/i.test(title)) return "Crepe";
  if (/viscose|wrap|floral/i.test(title)) return "Viscose drape";
  const review = stylingReviews(title)[0]?.comment;
  if (review) {
    const short = review.split(".")[0] ?? review;
    return short.length > 48 ? `${short.slice(0, 46)}…` : short;
  }
  return "See the product description";
}

function descriptionFor(item: WishlistItem): string {
  return DESCRIPTIONS[item.productId] ?? `${item.catalog.title}. ${inferQuality(item.catalog.title)}.`;
}

function ratingFor(productId: string, title: string, reviews: ProductReview[]): { average: number; count: number } {
  const mine = reviews.filter((row) => row.productId === productId);
  if (mine.length) {
    const average = mine.reduce((sum, row) => sum + row.rating, 0) / mine.length;
    return { average: Math.round(average * 10) / 10, count: mine.length };
  }
  const style = stylingReviews(title);
  return { average: Math.round(reviewAverage(style) * 10) / 10, count: style.length };
}

function inStockOf(item: WishlistItem): boolean {
  return item.stockStatus === "in_stock";
}

/** Live saves only — discontinued rows stay on the dead nudge, not in compare. */
export function compareClusters(items: WishlistItem[]): CompareCluster[] {
  const live = items.filter((row) => row.status === "active" && row.stockStatus !== "discontinued");
  const buckets = new Map<string, WishlistItem[]>();
  for (const item of live) {
    const category = categoryOf(item);
    const article = articleOf(item);
    if (article === "other") continue;
    const key = clusterKey(category, article);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  const clusters: CompareCluster[] = [];
  for (const [key, list] of buckets) {
    if (list.length < COMPARE_MIN) continue;
    const parsed = parseClusterKey(key)!;
    const sliced = [...list]
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
      .slice(0, COMPARE_MAX);
    clusters.push({
      key,
      category: parsed.category,
      article: parsed.article,
      label: `${sliced.length} ${noun(parsed.article, sliced.length)} in ${catLabel(parsed.category)}`,
      count: sliced.length,
      itemIds: sliced.map((row) => row.id),
    });
  }
  return clusters.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function compareCards(
  items: WishlistItem[],
  cluster: CompareCluster,
  inStockOnly = false,
  reviews: ProductReview[] = [],
): CompareCard[] {
  const byId = new Map(items.map((row) => [row.id, row]));
  const picked = cluster.itemIds
    .map((id) => byId.get(id))
    .filter((row): row is WishlistItem => Boolean(row));
  const cards = picked.map((item) => {
    const stars = ratingFor(item.productId, item.catalog.title, reviews);
    return {
      itemId: item.id,
      productId: item.productId,
      brand: item.catalog.brand,
      title: item.catalog.title,
      image_url: item.catalog.image_url,
      price: item.currentPrice,
      priceLabel: formatInr(item.currentPrice),
      cheapest: false,
      rating: stars.average,
      ratingCount: stars.count,
      description: descriptionFor(item),
      inStock: inStockOf(item),
    };
  });
  const visible = inStockOnly ? cards.filter((row) => row.inStock) : cards;
  const min = Math.min(...visible.map((row) => row.price));
  return visible.map((row) => ({ ...row, cheapest: row.price === min && visible.length > 1 }));
}

/** Pick among compare cards using this shopper's past orders — skip SKUs already bought. */
export function recommendFromHistory(cards: CompareCard[], purchases: PurchaseRecord[]): ComparePick | null {
  const inStock = cards.filter((row) => row.inStock);
  if (!inStock.length) return null;
  const bought = new Set(purchases.map((row) => row.productId));
  const pool = inStock.filter((row) => !bought.has(row.productId));
  const candidates = pool.length ? pool : inStock;
  const last = [...purchases].sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt))[0];
  const avgPrice = purchases.length ? purchases.reduce((sum, row) => sum + row.price, 0) / purchases.length : candidates[0]!.price;

  let best = candidates[0]!;
  let bestScore = -1;
  for (const card of candidates) {
    let score = card.rating;
    if (last?.articleType === "kurta" && /ethnic|maxi|flared|anarkali/i.test(`${card.title} ${card.description}`)) score += 3;
    if (last?.articleType === "dress" && /dress|midi|wrap/i.test(card.title)) score += 2;
    if (last?.articleType === "shirt" && /shirt|linen|oxford/i.test(card.title)) score += 3;
    if (last?.brand && last.brand === card.brand) score += 0.5;
    const delta = Math.abs(card.price - avgPrice) / Math.max(avgPrice, 1);
    score += Math.max(0, 2 - delta * 5);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }

  const why = last
    ? last.articleType === "kurta"
      ? `You bought ${last.brand} ${last.title.toLowerCase()} recently. ${best.brand} is the closest ethnic / occasion match in this set.`
      : `Your last order was ${last.brand}. ${best.brand} is the closest in price and rating from this set.`
    : `${best.brand} is the strongest in-stock pick on rating and price.`;
  return { itemId: best.itemId, why };
}
