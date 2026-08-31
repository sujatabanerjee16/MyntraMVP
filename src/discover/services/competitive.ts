import { MIN_EVIDENCE, PLATFORMS, type InsightQuery, type Motive } from "../domain/models";
import { reasonLabel } from "../domain/taxonomy";
import { matchedRows } from "./insights";
import { confidenceBucket } from "../domain/confidence";
import { sourceMixOf } from "../domain/query";
import { TAXONOMY_VERSION } from "../domain/models";
import type { CorpusStore } from "../store/corpusStore";

function wrap<T>(
  query: InsightQuery,
  rows: ReturnType<typeof matchedRows>,
  body: T,
) {
  const mix = sourceMixOf(rows.map((row) => row.document));
  return {
    ...body,
    taxonomy_version: TAXONOMY_VERSION,
    evidence_n: rows.length,
    confidence_bucket: confidenceBucket(rows.length, mix),
    source_mix: mix,
    query,
    caption: "Public mentions — not private competitor analytics or conversion rates.",
  };
}

export function competitiveMotives(store: CorpusStore, query: InsightQuery) {
  const rows = matchedRows(store, query);
  const byPlatform: Record<string, Record<string, number>> = {};
  const coverage: Record<string, number> = {};
  for (const platform of PLATFORMS) {
    byPlatform[platform] = {};
    coverage[platform] = 0;
  }
  for (const row of rows) {
    const platforms = row.classification.platforms.map((tag) => tag.platform);
    const targets = platforms.length ? platforms : [];
    for (const platform of targets) {
      coverage[platform] = (coverage[platform] ?? 0) + 1;
      for (const motive of row.classification.motives) {
        byPlatform[platform][motive] = (byPlatform[platform][motive] ?? 0) + 1;
      }
    }
  }
  const items = PLATFORMS.map((platform) => ({
    platform,
    evidence_n: coverage[platform] ?? 0,
    insufficient: (coverage[platform] ?? 0) < MIN_EVIDENCE,
    motives: Object.entries(byPlatform[platform] ?? {}).map(([motive, n]) => ({
      motive: motive as Motive,
      n,
    })),
  }));
  return wrap(query, rows, { items });
}

export function competitiveBarriers(store: CorpusStore, query: InsightQuery) {
  const rows = matchedRows(store, query);
  const byPlatform: Record<string, Record<string, number>> = {};
  const coverage: Record<string, number> = {};
  for (const platform of PLATFORMS) {
    byPlatform[platform] = {};
    coverage[platform] = 0;
  }
  for (const row of rows) {
    for (const tag of row.classification.platforms) {
      coverage[tag.platform] = (coverage[tag.platform] ?? 0) + 1;
      const reason = row.classification.primary_reason;
      if (reason === "uncategorized") continue;
      byPlatform[tag.platform][reason] =
        (byPlatform[tag.platform][reason] ?? 0) + 1;
    }
  }
  const items = PLATFORMS.map((platform) => ({
    platform,
    evidence_n: coverage[platform] ?? 0,
    insufficient: (coverage[platform] ?? 0) < MIN_EVIDENCE,
    barriers: Object.entries(byPlatform[platform] ?? {}).map(([reason, n]) => ({
      reason,
      label: reasonLabel(reason),
      n,
    })),
  }));
  return wrap(query, rows, { items });
}

export function sharedThemes(store: CorpusStore, query: InsightQuery) {
  const rows = matchedRows(store, query);
  const reasonPlatforms = new Map<string, Set<string>>();
  const reasonN = new Map<string, number>();
  for (const row of rows) {
    const reason = row.classification.primary_reason;
    if (reason === "uncategorized") continue;
    reasonN.set(reason, (reasonN.get(reason) ?? 0) + 1);
    const set = reasonPlatforms.get(reason) ?? new Set<string>();
    for (const tag of row.classification.platforms) set.add(tag.platform);
    reasonPlatforms.set(reason, set);
  }
  const themes = [...reasonN.entries()].map(([reason, n]) => {
    const platforms = [...(reasonPlatforms.get(reason) ?? [])];
    const shared = platforms.length >= 2 && n >= MIN_EVIDENCE;
    const unique =
      platforms.length === 1 &&
      n >= MIN_EVIDENCE &&
      n / (reasonN.get(reason) ?? 1) >= 0.7;
    return {
      reason,
      label: reasonLabel(reason),
      n,
      platforms,
      kind: shared ? "shared" : unique ? "unique" : "thin",
    };
  });
  return wrap(query, rows, {
    themes,
    shared: themes.filter((row) => row.kind === "shared"),
    unique: themes.filter((row) => row.kind === "unique"),
  });
}
