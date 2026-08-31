import { MIN_EVIDENCE, TAXONOMY_VERSION, type InsightQuery } from "../domain/models";
import { confidenceBucket } from "../domain/confidence";
import { sourceMixOf } from "../domain/query";
import { reasonLabel } from "../domain/taxonomy";
import { matchedRows } from "./insights";
import type { CorpusStore } from "../store/corpusStore";

export function opportunityAreas(store: CorpusStore, query: InsightQuery) {
  const rows = matchedRows(store, query);
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.classification.primary_reason;
    if (key === "uncategorized") continue;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const items = [...groups.entries()]
    .filter(([, list]) => list.length >= MIN_EVIDENCE)
    .map(([reason, list]) => {
      const mix = sourceMixOf(list.map((row) => row.document));
      const platforms = [
        ...new Set(
          list.flatMap((row) => row.classification.platforms.map((tag) => tag.platform)),
        ),
      ];
      return {
        id: `opp-${reason}`,
        title: reasonLabel(reason),
        reason_ids: [reason],
        why_it_matters:
          "Directional cluster that may explain why wishlisted items sit past 30 days. Not a measured conversion lift.",
        evidence_n: list.length,
        confidence_bucket: confidenceBucket(list.length, mix),
        platforms,
        excerpt_ids: list.slice(0, 5).map((row) => row.excerpt.id),
      };
    })
    .sort((a, b) => b.evidence_n - a.evidence_n);

  const mix = sourceMixOf(rows.map((row) => row.document));
  return {
    items,
    taxonomy_version: TAXONOMY_VERSION,
    evidence_n: rows.length,
    confidence_bucket: confidenceBucket(rows.length, mix),
    source_mix: mix,
    query,
  };
}
