import type { InsightQuery } from "../domain/models";
import { matchedRows } from "./insights";
import { confidenceBucket } from "../domain/confidence";
import { sourceMixOf } from "../domain/query";
import { reasonLabel } from "../domain/taxonomy";
import type { CorpusStore } from "../store/corpusStore";

export const SUGGESTED_QUESTIONS = [
  { id: "q-why-wishlist", text: "Why do users add fashion products to a wishlist?" },
  { id: "q-prevent", text: "What prevents wishlisted products from being purchased?" },
  { id: "q-postpone", text: "What causes users to postpone the purchase?" },
  { id: "q-intent", text: "When is the wishlist real intent vs casual bookmarking?" },
  { id: "q-age", text: "How do wishlist behaviors differ between Age 18–24 and Age 25–35?" },
  { id: "q-compete", text: "Why do users wishlist on Myntra vs Nykaa or Ajio?" },
  { id: "q-shared", text: "Which wishlist motives are shared across platforms?" },
];

const RATE_QUESTION =
  /\b(conversion rate|cvr|30[-\s]?day wishlist conversion|wishlist-to-purchase %|official wishlist conversion)\b/i;

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
}

function retrieve(store: CorpusStore, query: InsightQuery, question: string) {
  const rows = matchedRows(store, query);
  const qTokens = tokens(question);
  const scored = rows
    .map((row) => {
      const hay = row.excerpt.text.toLowerCase();
      const overlap = qTokens.filter((token) => hay.includes(token)).length;
      return { row, score: overlap };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  if (!scored.length) {
    return rows.slice(0, 8);
  }
  return scored.map((item) => item.row);
}

export function suggestions(store: CorpusStore, query: InsightQuery) {
  const rows = matchedRows(store, query);
  return SUGGESTED_QUESTIONS.map((item) => ({
    ...item,
    available: rows.length > 0,
  }));
}

export function askChat(
  store: CorpusStore,
  question: string,
  query: InsightQuery,
) {
  store.emit({ name: "ask_question_submitted", question, query });
  if (RATE_QUESTION.test(question)) {
    store.emit({ name: "ask_answer_refused", refusal_reason: "not_in_corpus" });
    return {
      answer_markdown:
        "Not in the corpus. 30-day wishlist-to-purchase needs real checkout events — we do not invent a rate from reviews.",
      citations: [] as string[],
      confidence_bucket: "low" as const,
      refused: true,
      refusal_reason: "not_in_corpus",
    };
  }

  const rows = retrieve(store, query, question);
  if (!rows.length) {
    store.emit({ name: "ask_answer_refused", refusal_reason: "empty_retrieve" });
    return {
      answer_markdown:
        "Not in the corpus for this filter. Widen Age, category, or source and try again.",
      citations: [] as string[],
      confidence_bucket: "low" as const,
      refused: true,
      refusal_reason: "empty_retrieve",
    };
  }

  const reasonCounts = new Map<string, number>();
  const platforms = new Set<string>();
  for (const row of rows) {
    const reason = row.classification.primary_reason;
    if (reason !== "uncategorized") {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
    for (const tag of row.classification.platforms) platforms.add(tag.platform);
  }
  const top = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const citations = rows.slice(0, 4).map((row) => row.excerpt.id);
  const mix = sourceMixOf(rows.map((row) => row.document));
  const lines = top.map(
    ([reason, n]) => `- ${reasonLabel(reason)} (${n} excerpts in the retrieved set)`,
  );
  const platformLine = platforms.size
    ? `Platforms mentioned in retrieved excerpts: ${[...platforms].join(", ")}. Attribution is from public text, not private analytics.`
    : "No named platform in the retrieved set.";
  const answer_markdown = [
    "From retrieved excerpts in the current filters (directional, not a conversion rate):",
    ...lines,
    platformLine,
  ].join("\n");

  return {
    answer_markdown,
    citations,
    confidence_bucket: confidenceBucket(rows.length, mix),
    refused: false,
    refusal_reason: undefined as string | undefined,
  };
}
