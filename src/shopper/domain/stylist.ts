/** Rule-based stylist (no LLM). Three signals → one score. */

export const DEFAULT_STYLIST_WEIGHTS = { purchase: 0.4, price: 0.3, fit: 0.3 } as const;

export const PRICE_WINDOW_DAYS = 60;
export const NEAR_DUP_DAYS = 90;
export const GENUINE_DROP_PCT = 0.05;
export const FAKE_HIKE_PCT = 0.12;
export const HIKE_LOOKBACK_DAYS = 14;

export type FitLabel = "runs_small" | "true_to_size" | "runs_large";

export type StylistWeights = { purchase: number; price: number; fit: number };

export type StylistProduct = {
  productId: string;
  sku: string;
  brand: string;
  title: string;
  price: number;
  size: string;
  sizeOos: boolean;
  image_url: string;
  category: string;
};

export type PurchaseRecord = {
  id: string;
  userId: string;
  productId: string;
  purchasedAt: string;
  price: number;
  size: string | null;
  brand: string;
  title: string;
  articleType: string;
  category: string;
};

export type PricePoint = {
  productId: string;
  observedAt: string;
  price: number;
};

export type ProductReview = {
  id: string;
  productId: string;
  createdAt: string;
  rating: number;
  fit: FitLabel | null;
};

export type SizingReturn = {
  id: string;
  userId: string;
  productId: string;
  returnedAt: string;
  reason: "too_small" | "too_large" | "other";
};

export type PriceFlags = {
  score: number;
  genuineDiscount: boolean;
  fakeSale: boolean;
  rising: boolean;
  dropPct: number | null;
  missing: boolean;
};

export type StylistRec = {
  product: StylistProduct;
  score: number;
  parts: { purchase: number; price: number; fit: number };
  reason: string;
  flags: {
    genuineDiscount: boolean;
    fakeSale: boolean;
    rising: boolean;
    complementary: boolean;
    fit: FitLabel | "unknown";
  };
};

const COMPLEMENT: Record<string, string[]> = {
  dress: ["earrings", "lipstick", "serum"],
  kurta: ["earrings", "lipstick", "serum"],
  shirt: ["jeans", "sneakers", "polo"],
  polo: ["jeans", "sneakers"],
  jeans: ["shirt", "polo", "sneakers"],
  tee: ["jeans", "sneakers", "cargo"],
  cargo: ["sneakers", "top", "tee"],
  top: ["jeans", "earrings", "sneakers"],
  sneakers: ["jeans", "cargo", "tee"],
  frock: ["earrings"],
  ethnic_set: ["earrings"],
};

export function inferArticleType(title: string): string {
  const t = title.toLowerCase();
  if (/earring|jewel/.test(t)) return "earrings";
  if (/lip/.test(t)) return "lipstick";
  if (/serum/.test(t)) return "serum";
  if (/makeup|kit/.test(t) && /make|kit/.test(t)) return "makeup";
  if (/sneaker|shoe/.test(t)) return "sneakers";
  if (/jean|denim/.test(t)) return "jeans";
  if (/cargo/.test(t)) return "cargo";
  if (/kurta|anarkali/.test(t)) return "kurta";
  if (/saree|sari/.test(t)) return "saree";
  if (/\bbag\b/.test(t) && !/cargo/.test(t)) return "bag";
  if (/\bpolo\b/.test(t)) return "polo";
  if (/shirt/.test(t)) return "shirt";
  if (/t-?shirt|\btee\b/.test(t)) return "tee";
  if (/dress|maxi|midi/.test(t)) return "dress";
  if (/\btop\b/.test(t)) return "top";
  if (/frock/.test(t)) return "frock";
  if (/ethnic set/.test(t)) return "ethnic_set";
  if (/cushion/.test(t)) return "cushion";
  if (/lamp/.test(t)) return "lamp";
  if (/sheet/.test(t)) return "bedsheet";
  return "other";
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

function clip01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function titleTokens(title: string): Set<string> {
  return new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function normalizeWeights(weights?: Partial<StylistWeights>): StylistWeights {
  const w = {
    purchase: weights?.purchase ?? DEFAULT_STYLIST_WEIGHTS.purchase,
    price: weights?.price ?? DEFAULT_STYLIST_WEIGHTS.price,
    fit: weights?.fit ?? DEFAULT_STYLIST_WEIGHTS.fit,
  };
  const sum = w.purchase + w.price + w.fit;
  if (sum <= 0) return { ...DEFAULT_STYLIST_WEIGHTS };
  return { purchase: w.purchase / sum, price: w.price / sum, fit: w.fit / sum };
}

export function isNearDuplicate(
  candidate: StylistProduct,
  purchases: PurchaseRecord[],
  nowIso: string,
): boolean {
  const article = inferArticleType(candidate.title);
  const candTokens = titleTokens(candidate.title);
  for (const buy of purchases) {
    if (buy.productId === candidate.productId) return true;
    if (daysBetween(buy.purchasedAt, nowIso) > NEAR_DUP_DAYS) continue;
    const sameArticle = buy.articleType === article;
    const sameBrand = buy.brand.toLowerCase() === candidate.brand.toLowerCase();
    const similarTitle = jaccard(titleTokens(buy.title), candTokens) >= 0.45;
    if (sameArticle && (sameBrand || similarTitle)) return true;
  }
  return false;
}

export function windowPoints(history: PricePoint[], productId: string, nowIso: string): PricePoint[] {
  return history
    .filter((row) => row.productId === productId && daysBetween(row.observedAt, nowIso) <= PRICE_WINDOW_DAYS)
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}

export function analyzePrice(history: PricePoint[], product: StylistProduct, nowIso: string): PriceFlags {
  const points = windowPoints(history, product.productId, nowIso);
  if (points.length === 0) {
    return { score: 0.5, genuineDiscount: false, fakeSale: false, rising: false, dropPct: null, missing: true };
  }
  const prices = points.map((row) => row.price);
  const avg = mean(prices);
  const current = points[points.length - 1]!.price;
  const older = points.filter((row) => daysBetween(row.observedAt, nowIso) > HIKE_LOOKBACK_DAYS);
  const recent = points.filter((row) => daysBetween(row.observedAt, nowIso) <= HIKE_LOOKBACK_DAYS);
  const olderAvg = older.length ? mean(older.map((row) => row.price)) : avg;
  const recentMax = recent.length ? Math.max(...recent.map((row) => row.price)) : current;
  const mid = Math.floor(points.length / 2);
  const firstHalf = mean(prices.slice(0, Math.max(1, mid)));
  const secondHalf = mean(prices.slice(Math.max(1, mid)));
  const rising = secondHalf > firstHalf * 1.05 && current >= avg * 0.98;
  const fakeSale =
    older.length > 0 &&
    recentMax >= olderAvg * (1 + FAKE_HIKE_PCT) &&
    current >= olderAvg * 0.97 &&
    current < recentMax;
  const dropPct = avg > 0 ? (avg - current) / avg : 0;
  const genuineDiscount = !fakeSale && current <= avg * (1 - GENUINE_DROP_PCT) && current <= olderAvg * 0.97;

  let score = 0.5;
  if (fakeSale) score = 0.22;
  else if (genuineDiscount) score = clip01(0.55 + Math.min(0.45, dropPct * 2.2));
  else if (rising) score = 0.2;
  else score = 0.45;

  return { score, genuineDiscount, fakeSale, rising, dropPct, missing: false };
}

export function aggregateFit(reviews: ProductReview[], productId: string): FitLabel | "unknown" {
  const votes = reviews.filter((row) => row.productId === productId && row.fit);
  if (votes.length === 0) return "unknown";
  const counts: Record<FitLabel, number> = { runs_small: 0, true_to_size: 0, runs_large: 0 };
  for (const row of votes) counts[row.fit!] += 1;
  return (Object.entries(counts) as [FitLabel, number][]).sort((a, b) => b[1] - a[1])[0]![0];
}

export function fitScore(
  label: FitLabel | "unknown",
  returns: SizingReturn[],
): { score: number; label: FitLabel | "unknown" } {
  const tooSmall = returns.filter((row) => row.reason === "too_small").length;
  const tooLarge = returns.filter((row) => row.reason === "too_large").length;
  if (label === "unknown") return { score: 0.5, label };
  if (label === "true_to_size") return { score: tooSmall || tooLarge ? 0.78 : 0.7, label };
  if (label === "runs_small") {
    if (tooSmall) return { score: 0.18, label };
    if (tooLarge) return { score: 0.72, label };
    return { score: 0.42, label };
  }
  if (tooLarge) return { score: 0.18, label };
  if (tooSmall) return { score: 0.8, label };
  return { score: 0.42, label };
}

function preferredCategories(purchases: PurchaseRecord[]): Set<string> {
  const counts = new Map<string, number>();
  for (const buy of purchases) counts.set(buy.category, (counts.get(buy.category) ?? 0) + 1);
  const max = Math.max(0, ...counts.values());
  return new Set([...counts.entries()].filter(([, n]) => n === max && n > 0).map(([cat]) => cat));
}

function purchaseScore(
  product: StylistProduct,
  purchases: PurchaseRecord[],
): { score: number; complementary: boolean } {
  if (purchases.length === 0) return { score: 0.5, complementary: false };
  const article = inferArticleType(product.title);
  const preferredArticles = new Set(purchases.map((row) => row.articleType));
  const complements = new Set(
    [...preferredArticles].flatMap((type) => COMPLEMENT[type] ?? []),
  );
  const complementary = complements.has(article);
  const brands = new Set(purchases.map((row) => row.brand.toLowerCase()));
  const brandHit = brands.has(product.brand.toLowerCase());
  const median = [...purchases].sort((a, b) => a.price - b.price)[Math.floor(purchases.length / 2)]!.price;
  const tierHit = Math.abs(product.price - median) / Math.max(median, 1) <= 0.4;
  const cats = preferredCategories(purchases);
  const catHit = cats.has(product.category) || (cats.has("WOMEN") && (product.category === "BEAUTY" || product.category === "STUDIO"));
  const sameArticle = preferredArticles.has(article);

  let score = 0.28;
  if (complementary) score += 0.42;
  if (brandHit && complementary) score += 0.08;
  else if (brandHit && !sameArticle) score += 0.06;
  if (tierHit) score += 0.12;
  if (catHit) score += 0.1;
  if (sameArticle && !complementary) score -= 0.2;
  if (!catHit && !complementary) score -= 0.12;
  return { score: clip01(score), complementary };
}

function reasonFor(
  product: StylistProduct,
  purchases: PurchaseRecord[],
  purchase: { complementary: boolean },
  price: PriceFlags,
  fit: FitLabel | "unknown",
  returns: SizingReturn[],
): string {
  const bits: string[] = [];
  if (purchase.complementary && purchases.length) {
    const types = [...new Set(purchases.map((row) => row.articleType))].slice(0, 2);
    bits.push(`Pairs with your recent ${types.join(" / ")}`);
  }
  if (price.genuineDiscount && price.dropPct != null) {
    bits.push(`Priced lower than it has been lately`);
  } else if (price.fakeSale) {
    bits.push("On sale, but not cheaper than it has been lately");
  } else if (price.rising) {
    bits.push("Price has been climbing lately");
  }
  if (fit === "runs_large" && returns.some((row) => row.reason === "too_small")) {
    bits.push("Runs large — safer after a too-small return");
  } else if (fit === "runs_small" && returns.some((row) => row.reason === "too_small")) {
    bits.push("Runs small — similar to a piece you returned");
  } else if (fit === "runs_small") bits.push("Reviews say it runs small");
  else if (fit === "runs_large") bits.push("Reviews say it runs large");
  if (bits.length === 0) {
    if (purchases.length === 0 && price.missing && fit === "unknown") {
      return "A fresh pick while we learn your taste.";
    }
    return `A ${product.brand} pick based on what you already wear.`;
  }
  return bits.join(" · ");
}

export function recommendStylist(input: {
  userId: string;
  nowIso: string;
  catalog: StylistProduct[];
  purchases: PurchaseRecord[];
  priceHistory: PricePoint[];
  reviews: ProductReview[];
  sizingReturns: SizingReturn[];
  limit?: number;
  weights?: Partial<StylistWeights>;
}): StylistRec[] {
  const weights = normalizeWeights(input.weights);
  const mine = input.purchases.filter((row) => row.userId === input.userId);
  const myReturns = input.sizingReturns.filter((row) => row.userId === input.userId);
  const bought = new Set(mine.map((row) => row.productId));
  const ranked: StylistRec[] = [];

  for (const product of input.catalog) {
    if (product.sizeOos) continue;
    if (bought.has(product.productId)) continue;
    if (isNearDuplicate(product, mine, input.nowIso)) continue;
    const purchase = purchaseScore(product, mine);
    const price = analyzePrice(input.priceHistory, product, input.nowIso);
    const fitLabel = aggregateFit(input.reviews, product.productId);
    const fit = fitScore(fitLabel, myReturns);
    const score =
      weights.purchase * purchase.score + weights.price * price.score + weights.fit * fit.score;
    ranked.push({
      product,
      score,
      parts: { purchase: purchase.score, price: price.score, fit: fit.score },
      reason: reasonFor(product, mine, purchase, price, fit.label, myReturns),
      flags: {
        genuineDiscount: price.genuineDiscount,
        fakeSale: price.fakeSale,
        rising: price.rising,
        complementary: purchase.complementary,
        fit: fit.label,
      },
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title));
  return ranked.slice(0, input.limit ?? 5);
}
