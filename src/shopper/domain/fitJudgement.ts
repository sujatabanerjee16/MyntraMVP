import { inferArticleType, aggregateFit, type ProductReview, type PurchaseRecord, type SizingReturn } from "./stylist";

export type FitVerdict = "will_fit" | "may_not_fit" | "unsure";

export type FitJudgement = {
  verdict: FitVerdict;
  headline: string;
  reason: string;
  usualSize: string | null;
  savedSize: string | null;
};

const ALPHA = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

function sizeRank(size: string): number | null {
  const key = size.trim().toUpperCase();
  const alpha = ALPHA.indexOf(key);
  if (alpha >= 0) return alpha;
  const numeric = Number.parseInt(key, 10);
  return Number.isFinite(numeric) ? 100 + numeric : null;
}

function articleNoun(article: string): string {
  if (article === "jeans") return "jeans";
  if (article === "ethnic_set") return "ethnic sets";
  return `${article}s`;
}

function usualBuy(purchases: PurchaseRecord[], article: string): PurchaseRecord | null {
  const dated = [...purchases].sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt));
  const same = dated.find((row) => row.articleType === article && row.size);
  if (same) return same;
  return dated.find((row) => row.size) ?? null;
}

export function fitFromPastBuys(
  item: { productId: string; selectedSize: string | null; catalog: { title: string } },
  purchases: PurchaseRecord[],
  returns: SizingReturn[],
  reviews: ProductReview[],
): FitJudgement {
  const article = inferArticleType(item.catalog.title);
  const savedSize = item.selectedSize;
  const past = usualBuy(purchases, article);
  const usualSize = past?.size ?? null;
  const savedRank = savedSize ? sizeRank(savedSize) : null;
  const usualRank = usualSize ? sizeRank(usualSize) : null;
  const reviewFit = aggregateFit(reviews, item.productId);
  const returnedTight = returns.some((row) => row.productId === item.productId && row.reason === "too_small");
  const returnedLoose = returns.some((row) => row.productId === item.productId && row.reason === "too_large");
  const sameType = past?.articleType === article;
  const pastLine = past
    ? sameType
      ? `You bought ${past.size} in ${past.brand} ${past.title}`
      : `Your last buy was ${past.size} (${past.title})`
    : null;

  if (!past) {
    return {
      verdict: "unsure",
      headline: "Not enough past buys to judge",
      reason: "Save a size after one order in this type — then we can say if it should fit.",
      usualSize,
      savedSize,
    };
  }

  if (savedRank != null && usualRank != null && savedRank < usualRank) {
    return {
      verdict: "may_not_fit",
      headline: "This may not fit you",
      reason: `${pastLine}. This is saved in ${savedSize} — smaller than you usually buy, so it will likely feel tight.`,
      usualSize,
      savedSize,
    };
  }

  if (savedRank != null && usualRank != null && savedRank > usualRank) {
    return {
      verdict: "may_not_fit",
      headline: "This may not fit you",
      reason: `${pastLine}. This is saved in ${savedSize} — larger than you usually buy, so it will likely feel loose.`,
      usualSize,
      savedSize,
    };
  }

  if (savedSize && usualSize && savedSize.toUpperCase() === usualSize.toUpperCase()) {
    if (reviewFit === "runs_small" || returnedTight) {
      return {
        verdict: "may_not_fit",
        headline: "This may not fit you",
        reason: `${pastLine}. This ${article} runs small next to what you already wear.`,
        usualSize,
        savedSize,
      };
    }
    if (reviewFit === "runs_large" || returnedLoose) {
      return {
        verdict: "may_not_fit",
        headline: "This may not fit you",
        reason: `${pastLine}. This ${article} runs large next to what you already wear.`,
        usualSize,
        savedSize,
      };
    }
    return {
      verdict: "will_fit",
      headline: "This should fit you",
      reason: `${pastLine}. Same size in ${articleNoun(article)} — it should fit.`,
      usualSize,
      savedSize,
    };
  }

  return {
    verdict: "unsure",
    headline: "Fit is unclear",
    reason: `${pastLine}. We need a saved size on this piece to judge against that buy.`,
    usualSize,
    savedSize,
  };
}
