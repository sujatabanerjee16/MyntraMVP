import type { OrderLine, WishlistSave } from "../domain/internalFacts";
import type {
  Classification,
  Document,
  Excerpt,
  SourceType,
} from "../domain/models";

export class CorpusStore {
  documents: Document[] = [];
  excerpts: Excerpt[] = [];
  classifications: Classification[] = [];
  events: { name: string; [key: string]: unknown }[] = [];
  wishlistSaves: WishlistSave[] = [];
  orderLines: OrderLine[] = [];
  corpusAsOf = "";

  reset(): void {
    this.documents = [];
    this.excerpts = [];
    this.classifications = [];
    this.events = [];
    this.wishlistSaves = [];
    this.orderLines = [];
    this.corpusAsOf = "";
  }

  findDocument(sourceRef: string, contentHash: string): Document | undefined {
    return this.documents.find(
      (row) => row.source_ref === sourceRef && row.content_hash === contentHash,
    );
  }

  sourceMix(): Record<string, number> {
    const mix: Record<string, number> = {};
    for (const doc of this.documents) {
      const key: SourceType = doc.source_type;
      mix[key] = (mix[key] ?? 0) + 1;
    }
    return mix;
  }

  emit(event: { name: string; [key: string]: unknown }): void {
    this.events.push(event);
  }
}
