import { SNAPSHOT_ROWS, type SnapshotRow } from "../corpus/snapshot";
import { mapAgeBand } from "../domain/ageBands";
import { contentHash } from "../domain/hash";
import { CORPUS_AS_OF, type Document, type Excerpt } from "../domain/models";
import { redactPii } from "../domain/pii";
import type { CorpusStore } from "../store/corpusStore";

function splitExcerpts(documentId: string, text: string): Excerpt[] {
  const parts = text.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  const blocks = parts.length ? parts : [text];
  let cursor = 0;
  return blocks.map((block, index) => {
    const start = text.indexOf(block, cursor);
    const char_start = start >= 0 ? start : cursor;
    const char_end = char_start + block.length;
    cursor = char_end;
    return {
      id: `ex-${documentId}-${index}`,
      document_id: documentId,
      char_start,
      char_end,
      text: block,
    };
  });
}

export function ingestRow(
  store: CorpusStore,
  row: SnapshotRow,
): { inserted: boolean; document: Document } {
  const redacted = redactPii(row.text);
  const hash = contentHash(redacted.text);
  const existing = store.findDocument(row.source_ref, hash);
  if (existing) {
    return { inserted: false, document: existing };
  }

  const id = `doc-${store.documents.length + 1}-${hash}`;
  const document: Document = {
    id,
    source_type: row.source_type,
    source_ref: row.source_ref,
    content_hash: hash,
    captured_at: row.captured_at,
    published_at: row.published_at ?? null,
    platform_of_source: row.platform_of_source,
    raw_text: redacted.text,
    pii_redacted: redacted.redacted,
    segment: mapAgeBand(row.age_band),
    category: row.category ?? null,
    price_band: row.price_band ?? null,
  };
  store.documents.push(document);
  store.excerpts.push(...splitExcerpts(id, redacted.text));
  return { inserted: true, document };
}

export function ingestSnapshot(
  store: CorpusStore,
  rows: SnapshotRow[] = SNAPSHOT_ROWS,
): { inserted: number; skipped: number } {
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const result = ingestRow(store, row);
    if (result.inserted) inserted += 1;
    else skipped += 1;
  }
  store.corpusAsOf = CORPUS_AS_OF;
  return { inserted, skipped };
}

export function loadCorpus(store: CorpusStore): {
  inserted: number;
  skipped: number;
} {
  store.reset();
  return ingestSnapshot(store);
}
