import { createDiscoverApi, type DiscoverApi } from "./api/v1";
import { createDiscoverFlags } from "./domain/flags";
import { runClassifier } from "./services/classifier";
import { loadCorpus } from "./services/ingest";
import { CorpusStore } from "./store/corpusStore";

export type DiscoverRuntime = {
  api: DiscoverApi;
  store: CorpusStore;
  flags: ReturnType<typeof createDiscoverFlags>;
};

export function createDiscoverRuntime(): DiscoverRuntime {
  const store = new CorpusStore();
  const flags = createDiscoverFlags();
  loadCorpus(store);
  runClassifier(store);
  const api = createDiscoverApi({ store, flags });
  return { api, store, flags };
}
