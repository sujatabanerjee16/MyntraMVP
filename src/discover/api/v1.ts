import { CORPUS_AS_OF, NS1_UNAVAILABLE, type NorthStarResponse } from "../domain/models";
import { askChat, suggestions } from "../services/ask";
import {
  competitiveBarriers,
  competitiveMotives,
  sharedThemes,
} from "../services/competitive";
import { opportunityAreas } from "../services/opportunities";
import { runClassifier } from "../services/classifier";
import { ingestSnapshot, loadCorpus } from "../services/ingest";
import { SNAPSHOT_ROWS } from "../corpus/snapshot";
import type { InsightQuery } from "../domain/models";
import { TAXONOMY_V1 } from "../domain/taxonomy";
import {
  evidenceFor,
  getExcerpt,
  heatmapInsight,
  intentInsight,
  reasonsInsight,
} from "../services/insights";
import type { CorpusStore } from "../store/corpusStore";
import type { createDiscoverFlags } from "../domain/flags";

export type DiscoverApiResult<T> =
  | { ok: true; status: 200; body: T }
  | { ok: false; status: 400 | 404; error: string };

export function unwrap<T>(result: DiscoverApiResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.body;
}

export function createDiscoverApi(deps: {
  store: CorpusStore;
  flags: ReturnType<typeof createDiscoverFlags>;
}) {
  const { store, flags } = deps;

  return {
    getNorthStar(): DiscoverApiResult<
      NorthStarResponse | { available: true; rate: number; purchasers: number; users: number }
    > {
      const canJoin =
        flags.isOn("discover.internal_events") &&
        store.wishlistSaves.length > 0 &&
        store.orderLines.length > 0;
      if (!canJoin) {
        return { ok: true, status: 200, body: { ...NS1_UNAVAILABLE } };
      }
      const users = new Set(store.wishlistSaves.map((row) => row.user_id));
      const purchasers = new Set(
        store.orderLines
          .filter((line) =>
            store.wishlistSaves.some(
              (save) =>
                save.user_id === line.user_id &&
                save.wishlist_item_id === line.wishlist_item_id,
            ),
          )
          .map((line) => line.user_id),
      );
      return {
        ok: true,
        status: 200,
        body: {
          available: true,
          rate: users.size ? purchasers.size / users.size : 0,
          purchasers: purchasers.size,
          users: users.size,
        },
      };
    },

    getCorpusMeta(): DiscoverApiResult<{
      as_of: string;
      document_n: number;
      excerpt_n: number;
      source_mix: Record<string, number>;
    }> {
      return {
        ok: true,
        status: 200,
        body: {
          as_of: store.corpusAsOf || CORPUS_AS_OF,
          document_n: store.documents.length,
          excerpt_n: store.excerpts.length,
          source_mix: store.sourceMix(),
        },
      };
    },

    reloadCorpus(): DiscoverApiResult<{
      as_of: string;
      document_n: number;
      inserted: number;
      skipped: number;
    }> {
      const again = ingestSnapshot(store, SNAPSHOT_ROWS);
      runClassifier(store);
      return {
        ok: true,
        status: 200,
        body: {
          as_of: store.corpusAsOf,
          document_n: store.documents.length,
          inserted: again.inserted,
          skipped: again.skipped,
        },
      };
    },

    resetAndLoad(): DiscoverApiResult<{ document_n: number }> {
      const loaded = loadCorpus(store);
      runClassifier(store);
      return {
        ok: true,
        status: 200,
        body: { document_n: loaded.inserted },
      };
    },

    getTaxonomy(): DiscoverApiResult<typeof TAXONOMY_V1> {
      return { ok: true, status: 200, body: TAXONOMY_V1 };
    },

    runClassify(): DiscoverApiResult<{ classified: number; skipped: number }> {
      const result = runClassifier(store);
      return { ok: true, status: 200, body: result };
    },

    getReasons(query: InsightQuery = {}): DiscoverApiResult<
      ReturnType<typeof reasonsInsight>
    > {
      return { ok: true, status: 200, body: reasonsInsight(store, query) };
    },

    getHeatmap(
      query: InsightQuery = {},
      y: "segment" | "category" | "platform" = "segment",
    ): DiscoverApiResult<ReturnType<typeof heatmapInsight>> {
      return { ok: true, status: 200, body: heatmapInsight(store, query, "reason", y) };
    },

    getIntent(query: InsightQuery = {}): DiscoverApiResult<
      ReturnType<typeof intentInsight>
    > {
      return { ok: true, status: 200, body: intentInsight(store, query) };
    },

    getEvidence(
      query: InsightQuery = {},
      insightKey?: string,
    ): DiscoverApiResult<ReturnType<typeof evidenceFor>> {
      if (insightKey) {
        store.emit({ name: "chart_drilled", chart_id: "reasons", insight_key: insightKey });
      }
      return { ok: true, status: 200, body: evidenceFor(store, query, insightKey) };
    },

    getExcerpt(id: string): DiscoverApiResult<NonNullable<ReturnType<typeof getExcerpt>>> {
      const found = getExcerpt(store, id);
      if (!found) return { ok: false, status: 404, error: "Not found" };
      store.emit({ name: "excerpt_opened", excerpt_id: id });
      return { ok: true, status: 200, body: found };
    },

    getCompetitiveMotives(query: InsightQuery = {}) {
      return { ok: true as const, status: 200 as const, body: competitiveMotives(store, query) };
    },

    getCompetitiveBarriers(query: InsightQuery = {}) {
      return { ok: true as const, status: 200 as const, body: competitiveBarriers(store, query) };
    },

    getSharedThemes(query: InsightQuery = {}) {
      return { ok: true as const, status: 200 as const, body: sharedThemes(store, query) };
    },

    getSuggestions(query: InsightQuery = {}) {
      return { ok: true as const, status: 200 as const, body: { items: suggestions(store, query) } };
    },

    ask(question: string, query: InsightQuery = {}) {
      return { ok: true as const, status: 200 as const, body: askChat(store, question, query) };
    },

    getOpportunities(query: InsightQuery = {}) {
      return { ok: true as const, status: 200 as const, body: opportunityAreas(store, query) };
    },

    copyOpportunity(id: string) {
      store.emit({ name: "opportunity_copied", opportunity_id: id });
      return { ok: true as const, status: 200 as const, body: { copied: true } };
    },

    listClassifications(): DiscoverApiResult<{
      items: {
        excerpt_id: string;
        text: string;
        primary_reason: string;
        platforms: string[];
        intent_type: string;
        taxonomy_version: string;
      }[];
    }> {
      const items = store.classifications.map((row) => {
        const excerpt = store.excerpts.find((item) => item.id === row.excerpt_id);
        return {
          excerpt_id: row.excerpt_id,
          text: excerpt?.text ?? "",
          primary_reason: row.primary_reason,
          platforms: row.platforms.map((tag) => tag.platform),
          intent_type: row.intent_type,
          taxonomy_version: row.taxonomy_version,
        };
      });
      return { ok: true, status: 200, body: { items } };
    },
  };
}

export type DiscoverApi = ReturnType<typeof createDiscoverApi>;
