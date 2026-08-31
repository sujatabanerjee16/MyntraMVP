import { confidenceBucket, type ConfidenceBucket } from "../domain/confidence";
import { matchesInsightQuery, sourceMixOf } from "../domain/query";
import {
  TAXONOMY_VERSION,
  type Classification,
  type Document,
  type Excerpt,
  type InsightQuery,
  type ReasonCategory,
} from "../domain/models";
import { reasonLabel } from "../domain/taxonomy";
import type { CorpusStore } from "../store/corpusStore";

export type InsightEnvelope<T> = T & {
  taxonomy_version: string;
  evidence_n: number;
  confidence_bucket: ConfidenceBucket;
  source_mix: Record<string, number>;
  query: InsightQuery;
};

type Matched = {
  document: Document;
  excerpt: Excerpt;
  classification: Classification;
};

export function matchedRows(store: CorpusStore, query: InsightQuery): Matched[] {
  const rows: Matched[] = [];
  for (const excerpt of store.excerpts) {
    const document = store.documents.find((row) => row.id === excerpt.document_id);
    const classification = store.classifications.find(
      (row) => row.excerpt_id === excerpt.id,
    );
    if (!document || !classification) continue;
    if (!matchesInsightQuery(document, classification, query)) continue;
    rows.push({ document, excerpt, classification });
  }
  return rows;
}

function envelope<T>(
  query: InsightQuery,
  rows: Matched[],
  body: T,
): InsightEnvelope<T> {
  const docs = rows.map((row) => row.document);
  const mix = sourceMixOf(docs);
  return {
    ...body,
    taxonomy_version: TAXONOMY_VERSION,
    evidence_n: rows.length,
    confidence_bucket: confidenceBucket(rows.length, mix),
    source_mix: mix,
    query,
  };
}

export function reasonsInsight(store: CorpusStore, query: InsightQuery) {
  const rows = matchedRows(store, query);
  const classified = rows.filter(
    (row) => row.classification.primary_reason !== "uncategorized",
  );
  const counts = new Map<ReasonCategory, number>();
  for (const row of classified) {
    const key = row.classification.primary_reason;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const denominator = classified.length;
  const items = [...counts.entries()]
    .map(([reason, n]) => ({
      reason,
      label: reasonLabel(reason),
      n,
      share: denominator ? n / denominator : null,
    }))
    .sort((a, b) => b.n - a.n);
  return envelope(query, rows, {
    items,
    denominator,
    denominator_note: "Share of classified excerpts in the current query (uncategorized excluded).",
    empty: items.length === 0,
  });
}

export function intentInsight(store: CorpusStore, query: InsightQuery) {
  const rows = matchedRows(store, query);
  const counts = { active_shortlist: 0, passive_bookmark: 0, unknown: 0 };
  for (const row of rows) {
    counts[row.classification.intent_type] += 1;
  }
  return envelope(query, rows, {
    items: Object.entries(counts).map(([intent, n]) => ({ intent, n })),
    empty: rows.length === 0,
  });
}

export type HeatmapAxis = "segment" | "category" | "platform";

export function heatmapInsight(
  store: CorpusStore,
  query: InsightQuery,
  x: "reason" = "reason",
  y: HeatmapAxis = "segment",
) {
  void x;
  const rows = matchedRows(store, query).filter(
    (row) => row.classification.primary_reason !== "uncategorized",
  );
  const cells: { x: string; y: string; n: number }[] = [];
  const index = new Map<string, { x: string; y: string; n: number }>();

  function bump(xv: string, yv: string) {
    const key = `${xv}|${yv}`;
    const existing = index.get(key);
    if (existing) existing.n += 1;
    else {
      const cell = { x: xv, y: yv, n: 1 };
      index.set(key, cell);
      cells.push(cell);
    }
  }

  for (const row of rows) {
    const xv = row.classification.primary_reason;
    if (y === "platform") {
      for (const tag of row.classification.platforms) bump(xv, tag.platform);
      continue;
    }
    const yv =
      y === "category" ? (row.document.category ?? "unknown") : row.document.segment;
    bump(xv, yv);
  }
  return envelope(query, rows, { cells, empty: cells.length === 0 });
}

export function evidenceFor(
  store: CorpusStore,
  query: InsightQuery,
  insightKey?: string,
) {
  let rows = matchedRows(store, query);
  if (insightKey) {
    rows = rows.filter(
      (row) =>
        row.classification.primary_reason === insightKey ||
        row.classification.intent_type === insightKey ||
        row.classification.platforms.some((tag) => tag.platform === insightKey) ||
        row.classification.motives.includes(insightKey as never),
    );
  }
  return envelope(query, rows, {
    items: rows.map((row) => ({
      excerpt_id: row.excerpt.id,
      text: row.excerpt.text,
      source_type: row.document.source_type,
      source_ref: row.document.source_ref,
      platforms: row.classification.platforms,
      primary_reason: row.classification.primary_reason,
      intent_type: row.classification.intent_type,
      segment: row.document.segment,
    })),
    empty: rows.length === 0,
  });
}

export function getExcerpt(store: CorpusStore, id: string) {
  const excerpt = store.excerpts.find((row) => row.id === id);
  if (!excerpt) return null;
  const document = store.documents.find((row) => row.id === excerpt.document_id);
  const classification = store.classifications.find((row) => row.excerpt_id === id);
  return { excerpt, document, classification };
}
