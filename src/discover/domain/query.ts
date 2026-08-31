import type {
  Classification,
  Document,
  InsightQuery,
  Platform,
} from "./models";

export function priceMatches(docBand: string | null, queryBand?: string): boolean {
  if (!queryBand || queryBand === "all") return true;
  if (!docBand) return false;
  if (queryBand === "500-4700") {
    return docBand === "500-2000" || docBand === "2000-4700" || docBand === "500-4700";
  }
  return docBand === queryBand;
}

export function matchesInsightQuery(
  document: Document,
  classification: Classification | undefined,
  query: InsightQuery,
): boolean {
  if (query.segment && query.segment !== "all" && document.segment !== query.segment) {
    return false;
  }
  if (query.category && query.category !== "all" && document.category !== query.category) {
    return false;
  }
  if (!priceMatches(document.price_band, query.price_band)) return false;
  if (query.source_type && query.source_type !== "all" && document.source_type !== query.source_type) {
    return false;
  }
  if (query.intent_type && query.intent_type !== "all") {
    if (!classification || classification.intent_type !== query.intent_type) {
      return false;
    }
  }
  if (query.platform && query.platform !== "all") {
    const want = query.platform as Platform;
    const tagged = classification?.platforms.some((tag) => tag.platform === want);
    const sourced = document.platform_of_source === want;
    if (!tagged && !sourced) return false;
  }
  return true;
}

export function sourceMixOf(
  documents: Document[],
): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const doc of documents) {
    mix[doc.source_type] = (mix[doc.source_type] ?? 0) + 1;
  }
  return mix;
}
