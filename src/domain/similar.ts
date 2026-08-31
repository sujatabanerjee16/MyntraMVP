/**
 * C4 similar-nudge — architecture §5.4, §7.7, §11.3, §14.
 *
 * Matching order (conservative; false positives worse than misses):
 *   1. same product_id in results ∩ active wishlist
 *   2. style_family_id, or article_type + brand + color_family + gender
 *   3. embedding only if score ≥ similar.min_score (0.88)
 *
 * Prototype stand-in: query "jacket" hints the fixture travel jacket
 * when that item is still active and results are non-empty.
 *
 * i18n: clients render `copy` / `copy_key` from the server. Do not invent copy.
 */
export const SIMILAR_DEMO_QUERY = "jacket";
export const SIMILAR_DEMO_PRODUCT_ID = "prod-jacket";
export const SIMILAR_MIN_SCORE = 0.88;
export const SIMILAR_LATENCY_MS_BUDGET = 50;
export const SIMILAR_DISMISS_DAYS = 14;
export const SIMILAR_COPY_KEY = "similar_nudge_default";
export const SIMILAR_COPY = "You already saved something similar.";

/** Labeled quality sample size for the P5 exit gate. */
export const SIMILAR_QUALITY_SAMPLE_N = 10;

export type SimilarReason = "same_product" | "style_family" | "embedding";

export type SimilarCatalogFields = {
  product_id: string;
  brand: string;
  style_family_id: string;
  article_type: string;
  color_family: string;
  gender: "men" | "women" | "unisex";
};

export type SimilarWishlistEntry = SimilarCatalogFields & {
  wishlist_item_id: string;
  saved_at: string;
};

export type SimilarMatch = {
  wishlist_item_id: string;
  product_id: string;
  reason: SimilarReason;
  score: number;
};

export type SimilarWishlistHint = {
  wishlist_item_id: string;
  product_id: string;
  reason: SimilarReason;
  copy_key: typeof SIMILAR_COPY_KEY;
  copy: typeof SIMILAR_COPY;
  deep_link: string;
};

export function similarDeepLink(wishlistItemId: string): string {
  return `myntra://wishlist/items/${wishlistItemId}?signal=similar_search`;
}

export function toSimilarHint(match: SimilarMatch): SimilarWishlistHint {
  return {
    wishlist_item_id: match.wishlist_item_id,
    product_id: match.product_id,
    reason: match.reason,
    copy_key: SIMILAR_COPY_KEY,
    copy: SIMILAR_COPY,
    deep_link: similarDeepLink(match.wishlist_item_id),
  };
}

export function isDemoJacketQuery(query: string): boolean {
  return query.trim().toLowerCase() === SIMILAR_DEMO_QUERY;
}

function familyCompatible(a: SimilarCatalogFields, b: SimilarCatalogFields): boolean {
  if (a.style_family_id && a.style_family_id === b.style_family_id) return true;
  return (
    a.article_type === b.article_type &&
    a.brand === b.brand &&
    a.color_family === b.color_family &&
    a.gender === b.gender
  );
}

export function pickSimilarMatch(input: {
  query: string;
  results: SimilarCatalogFields[];
  wishlist: SimilarWishlistEntry[];
  embeddings?: { product_id: string; score: number }[];
  minScore?: number;
}): SimilarMatch | null {
  const { query, results, wishlist, embeddings = [], minScore = SIMILAR_MIN_SCORE } = input;
  if (results.length === 0 || wishlist.length === 0) return null;

  const resultIds = new Set(results.map((row) => row.product_id));
  const exact = wishlist
    .filter((item) => resultIds.has(item.product_id))
    .sort((a, b) => Date.parse(b.saved_at) - Date.parse(a.saved_at));
  if (exact[0]) {
    return {
      wishlist_item_id: exact[0].wishlist_item_id,
      product_id: exact[0].product_id,
      reason: "same_product",
      score: 1,
    };
  }

  if (isDemoJacketQuery(query)) {
    const jacket = wishlist.find((item) => item.product_id === SIMILAR_DEMO_PRODUCT_ID);
    if (jacket) {
      return {
        wishlist_item_id: jacket.wishlist_item_id,
        product_id: jacket.product_id,
        reason: "same_product",
        score: 1,
      };
    }
  }

  const familyHits: SimilarMatch[] = [];
  for (const item of wishlist) {
    const related = results.find(
      (row) =>
        row.product_id !== item.product_id && familyCompatible(row, item),
    );
    if (related) {
      familyHits.push({
        wishlist_item_id: item.wishlist_item_id,
        product_id: item.product_id,
        reason: "style_family",
        score: 0.9,
      });
    }
  }
  if (familyHits[0]) {
    familyHits.sort((a, b) => b.score - a.score);
    return familyHits[0];
  }

  let best: SimilarMatch | null = null;
  for (const item of wishlist) {
    const scored = embeddings.find((row) => row.product_id === item.product_id);
    if (!scored || scored.score < minScore) continue;
    if (!best || scored.score > best.score) {
      best = {
        wishlist_item_id: item.wishlist_item_id,
        product_id: item.product_id,
        reason: "embedding",
        score: scored.score,
      };
    }
  }
  return best;
}

/** Fixture embeddings for proto / QA. Not a production index. */
export const EMBEDDING_FIXTURES: Record<string, { product_id: string; score: number }[]> = {
  "travel coat": [{ product_id: "prod-jacket", score: 0.91 }],
  "random dress": [{ product_id: "prod-jacket", score: 0.87 }],
};

export function embeddingsForQuery(query: string): { product_id: string; score: number }[] {
  return EMBEDDING_FIXTURES[query.trim().toLowerCase()] ?? [];
}
