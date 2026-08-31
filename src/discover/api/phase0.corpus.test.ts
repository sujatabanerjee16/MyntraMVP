import { describe, expect, it } from "vitest";
import { SNAPSHOT_ROWS } from "../corpus/snapshot";
import { createDiscoverRuntime } from "../runtime";
import { ingestSnapshot } from "../services/ingest";

describe("Phase 0 corpus and NS1", () => {
  it("loads documents and excerpts with provenance", () => {
    const runtime = createDiscoverRuntime();
    expect(runtime.store.documents.length).toBe(SNAPSHOT_ROWS.length);
    expect(runtime.store.excerpts.length).toBeGreaterThan(0);
    expect(runtime.store.documents.every((doc) => doc.source_ref && doc.content_hash)).toBe(
      true,
    );
    expect(runtime.store.corpusAsOf).toBe("2026-08-29");
  });

  it("does not double-count a duplicate ingest", () => {
    const runtime = createDiscoverRuntime();
    const before = runtime.store.documents.length;
    const again = ingestSnapshot(runtime.store);
    expect(again.inserted).toBe(0);
    expect(again.skipped).toBe(before);
    expect(runtime.store.documents.length).toBe(before);
  });

  it("redacts PII in research rows", () => {
    const runtime = createDiscoverRuntime();
    const email = runtime.store.documents.find((doc) =>
      doc.source_ref.includes("18-24:4"),
    );
    const phone = runtime.store.documents.find((doc) =>
      doc.source_ref.includes("25-35:3"),
    );
    expect(email?.raw_text).toContain("[redacted-email]");
    expect(email?.raw_text).not.toMatch(/@example.com/);
    expect(phone?.raw_text).toContain("[redacted-phone]");
    expect(email?.pii_redacted).toBe(true);
  });

  it("maps research age bands and leaves Play unaged", () => {
    const runtime = createDiscoverRuntime();
    const research1824 = runtime.store.documents.filter(
      (doc) => doc.source_type === "research" && doc.source_ref.includes("18-24"),
    );
    expect(research1824.every((doc) => doc.segment === "age_18_24")).toBe(true);
    const play = runtime.store.documents.find((doc) => doc.source_ref === "play:myntra:r1");
    expect(play?.segment).toBe("unknown");
  });

  it("returns D9 north star and never a 0 rate (EC-EMP-002)", () => {
    const runtime = createDiscoverRuntime();
    const ns1 = runtime.api.getNorthStar();
    expect(ns1.ok && ns1.body.available).toBe(false);
    if (ns1.ok) {
      expect(ns1.body.reason).toBe("not_in_corpus");
      expect(ns1.body.needs).toBe("checkout_events");
      expect(JSON.stringify(ns1.body)).not.toMatch(/"rate"\s*:/);
    }
    const reload = runtime.api.reloadCorpus();
    expect(reload.ok && reload.body.skipped).toBeGreaterThan(0);
    const again = runtime.api.getNorthStar();
    expect(again.ok && again.body.available).toBe(false);
  });
});
