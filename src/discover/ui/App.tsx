import { useEffect, useMemo, useState } from "react";
import { unwrap } from "../api/v1";
import type { InsightQuery, Platform } from "../domain/models";
import { PLATFORMS } from "../domain/models";
import { reasonLabel } from "../domain/taxonomy";
import { createDiscoverRuntime, type DiscoverRuntime } from "../runtime";
import { IconBell, IconClose, IconReset, IconSend, IconSettings } from "./icons";
import { DiscoverRuntimeProvider, useDiscoverRuntime } from "./runtimeContext";

type PageView = "dashboard" | "deep-dive" | "network" | "reports";
type HeatMode = "platform" | "segment";

const HEAT_SHORT: Record<string, string> = {
  fit_sizing: "Sizing uncertainty",
  price_waiting: "Price/Waiting",
  quality_trust: "Quality & trust",
  styling_decision: "Styling doubts",
  review_trust: "Review trust",
  timing_occasion: "Timing/Event",
  external_comparison: "External compare",
  passive_bookmarking: "Passive bookmark",
  logistics_friction: "Logistics",
  competitive_preference: "Platform pref",
};

const FILTER_LABELS: Record<string, string> = {
  segment: "Age",
  category: "Category",
  price_band: "Price",
  intent_type: "Intent",
  platform: "Platform",
  source_type: "Source",
};

const FILTER_VALUES: Record<string, Record<string, string>> = {
  segment: { age_18_24: "18–24", age_25_35: "25–35" },
  category: { apparel: "Apparel", beauty: "Beauty", footwear: "Footwear" },
  price_band: {
    "500-2000": "₹500–₹2000",
    "2000-4700": "₹2000–₹4700",
    "500-4700": "₹500–₹4700",
  },
  intent_type: {
    active_shortlist: "Active shortlist",
    passive_bookmark: "Passive bookmark",
  },
  platform: { myntra: "Myntra", nykaa: "Nykaa", ajio: "Ajio", other: "Other" },
  source_type: {
    play_store: "Play Store",
    reddit: "Reddit",
    research: "Research",
    youtube: "YouTube",
    social: "Social",
    product_review: "Product reviews",
  },
};

export function DiscoverApp({ runtime: injected }: { runtime?: DiscoverRuntime }) {
  const runtime = useMemo(() => injected ?? createDiscoverRuntime(), [injected]);
  return (
    <DiscoverRuntimeProvider runtime={runtime}>
      <DiscoverShell />
    </DiscoverRuntimeProvider>
  );
}

function DiscoverShell() {
  const runtime = useDiscoverRuntime();
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const [query, setQuery] = useState<InsightQuery>({});
  const [drawerKey, setDrawerKey] = useState<string | undefined>();
  const [view, setView] = useState<PageView>("deep-dive");
  const meta = unwrap(runtime.api.getCorpusMeta());
  const ns1 = unwrap(runtime.api.getNorthStar());
  const reasons = unwrap(runtime.api.getReasons(query));
  const intent = unwrap(runtime.api.getIntent(query));

  useEffect(() => {
    runtime.store.emit({
      name: "insight_page_viewed",
      corpus_as_of: meta.as_of,
      taxonomy_version: reasons.taxonomy_version,
    });
  }, [runtime, meta.as_of, reasons.taxonomy_version]);

  function applyQuery(next: InsightQuery) {
    runtime.store.emit({ name: "filter_applied", query: next });
    setQuery(next);
    setDrawerKey(undefined);
  }

  return (
    <div className="discover">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand">MYNTRA</div>
          <div>
            <h1>Wishlist conversion insights</h1>
            <nav className="tabs" aria-label="Workspace">
              {(
                [
                  ["dashboard", "Dashboard"],
                  ["deep-dive", "Deep Dive"],
                  ["network", "Network Analysis"],
                  ["reports", "Reports"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={view === id ? "tab is-active" : "tab"}
                  aria-current={view === id ? "page" : undefined}
                  onClick={() => setView(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="topbar-meta">
          <p className="corpus-as-of">
            Corpus as of {meta.as_of} · taxonomy {reasons.taxonomy_version} ·{" "}
            {meta.document_n} documents · {meta.excerpt_n} excerpts · directional
            public evidence
          </p>
          <div className="topbar-tools">
            <button type="button" className="icon-btn" aria-label="Settings" disabled>
              <IconSettings />
            </button>
            <button type="button" className="icon-btn" aria-label="Notifications" disabled>
              <IconBell />
            </button>
            <span className="avatar" aria-hidden="true">
              PM
            </span>
          </div>
        </div>
      </header>

      {view === "deep-dive" || view === "dashboard" ? (
        <>
          <FilterBar query={query} onChange={applyQuery} />
          {view === "deep-dive" ? (
            <div className="layout">
              <div className="col col-left">
                <NorthStarCard ns1={ns1} onReload={refresh} />
                <HeatmapCard query={query} onOpen={setDrawerKey} />
                {runtime.flags.isOn("discover.competitive") ? (
                  <CompetitiveBlock query={query} onOpen={setDrawerKey} />
                ) : null}
              </div>
              <div className="col col-center">
                <ReasonsCard reasons={reasons} onOpen={setDrawerKey} />
                <IntentCard intent={intent} onOpen={setDrawerKey} />
                <OpportunityBlock query={query} onOpen={setDrawerKey} />
              </div>
              <aside className="col col-right">
                {runtime.flags.isOn("discover.ask_ai") ? (
                  <AskDock
                    query={query}
                    onCite={(id) => {
                      runtime.api.getExcerpt(id);
                      setDrawerKey(id);
                    }}
                  />
                ) : null}
                <EvidenceDrawer
                  query={query}
                  insightKey={drawerKey}
                  onOpenExcerpt={(id) => runtime.api.getExcerpt(id)}
                />
              </aside>
            </div>
          ) : (
            <div className="layout layout-dashboard">
              <div className="col">
                <NorthStarCard ns1={ns1} onReload={refresh} />
                <ReasonsCard reasons={reasons} onOpen={setDrawerKey} />
                <IntentCard intent={intent} onOpen={setDrawerKey} />
                <OpportunityBlock query={query} onOpen={setDrawerKey} />
              </div>
              <aside className="col">
                {runtime.flags.isOn("discover.ask_ai") ? (
                  <AskDock
                    query={query}
                    onCite={(id) => {
                      runtime.api.getExcerpt(id);
                      setDrawerKey(id);
                    }}
                  />
                ) : null}
                <EvidenceDrawer
                  query={query}
                  insightKey={drawerKey}
                  onOpenExcerpt={(id) => runtime.api.getExcerpt(id)}
                />
              </aside>
            </div>
          )}
          <ClassificationTable />
        </>
      ) : (
        <section className="card parked" aria-label={view === "network" ? "Network Analysis" : "Reports"}>
          <h2>{view === "network" ? "Network Analysis" : "Reports"}</h2>
          <p className="empty">
            Not in the Phase 1 snapshot — this view needs a conversation graph or
            an export pack that is not in the public corpus.
          </p>
        </section>
      )}

    </div>
  );
}

function NorthStarCard({
  ns1,
  onReload,
}: {
  ns1: { available: false; reason: string; needs: string } | { available: true };
  onReload: () => void;
}) {
  const runtime = useDiscoverRuntime();
  return (
    <section className="card ns1-card" aria-label="Wishlist-to-Purchase">
      <div className="card-head">
        <div>
          <p className="kicker">North star</p>
          <h2>Wishlist-to-Purchase</h2>
        </div>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            runtime.api.reloadCorpus();
            onReload();
          }}
        >
          Reload
        </button>
      </div>
      <div className="ns1-value" aria-label="north star unavailable">
        —
      </div>
      <p className="ns1-note">Not in the scraped corpus — needs real checkout events</p>
      {"reason" in ns1 ? (
        <p className="meta">
          {ns1.reason.replaceAll("_", " ")} · {ns1.needs.replaceAll("_", " ")}
        </p>
      ) : null}
    </section>
  );
}

function ReasonsCard({
  reasons,
  onOpen,
}: {
  reasons: {
    items: { reason: string; label: string; n: number; share: number | null }[];
    evidence_n: number;
    confidence_bucket: string;
    denominator_note: string;
    empty: boolean;
  };
  onOpen: (key: string) => void;
}) {
  const max = Math.max(1, ...reasons.items.map((item) => item.n));
  return (
    <section className="card" aria-label="Ranked reasons">
      <div className="card-head">
        <div>
          <p className="kicker">Reasons</p>
          <h2>Ranked non-conversion reasons</h2>
        </div>
        <ConfidenceChip bucket={reasons.confidence_bucket} n={reasons.evidence_n} />
      </div>
      <p className="meta">
        n={reasons.evidence_n} · {reasons.denominator_note}
      </p>
      {reasons.empty ? (
        <p className="empty">No evidence for this filter — not 0% conversion.</p>
      ) : (
        <ul className="bars">
          {reasons.items.map((item, index) => {
            const pct = item.share !== null ? `${(item.share * 100).toFixed(0)}%` : "";
            return (
              <li key={item.reason}>
                <button type="button" onClick={() => onOpen(item.reason)}>
                  <span className="bar-label">{item.label}</span>
                  <span className="bar-track" aria-hidden="true">
                    <span
                      className={`bar-fill tone-${barTone(index)}`}
                      style={{ width: `${(item.n / max) * 100}%` }}
                    />
                  </span>
                  <span className="bar-n">
                    {pct ? `${pct} · ` : ""}
                    {item.n}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function IntentCard({
  intent,
  onOpen,
}: {
  intent: { items: { intent: string; n: number }[]; empty: boolean };
  onOpen: (key: string) => void;
}) {
  const visible = intent.items.filter((item) => item.n > 0);
  const max = Math.max(1, ...visible.map((item) => item.n));
  const total = visible.reduce((sum, item) => sum + item.n, 0);
  return (
    <section className="card" aria-label="Intent split">
      <p className="kicker">Intent</p>
      <h2>Intent type</h2>
      <p className="meta">Active shortlist vs passive bookmarking</p>
      {intent.empty ? (
        <p className="empty">No evidence for this filter.</p>
      ) : (
        <ul className="bars">
          {visible.map((item, index) => (
            <li key={item.intent}>
              <button type="button" onClick={() => onOpen(item.intent)}>
                <span className="bar-label">{item.intent.replaceAll("_", " ")}</span>
                <span className="bar-track" aria-hidden="true">
                  <span
                    className={`bar-fill tone-${barTone(index)}`}
                    style={{ width: `${(item.n / max) * 100}%` }}
                  />
                </span>
                <span className="bar-n">
                  {total ? `${Math.round((item.n / total) * 100)}% · ` : ""}
                  {item.n}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HeatmapCard({
  query,
  onOpen,
}: {
  query: InsightQuery;
  onOpen: (key: string) => void;
}) {
  const runtime = useDiscoverRuntime();
  const [mode, setMode] = useState<HeatMode>("platform");
  const heat = unwrap(runtime.api.getHeatmap(query, mode));
  const columns =
    mode === "platform" ? [...PLATFORMS] : uniqueYs(heat.cells, ["age_18_24", "age_25_35", "unknown"]);
  const rows = uniqueXs(heat.cells);
  const max = Math.max(1, ...heat.cells.map((cell) => cell.n));

  return (
    <section className="card" aria-label="Reason by segment heatmap">
      <div className="card-head">
        <div>
          <p className="kicker">Heatmap</p>
          <h2>{mode === "platform" ? "Reason distribution by platform" : "Reason × segment"}</h2>
        </div>
        <div className="seg">
          <button
            type="button"
            className={mode === "platform" ? "chip is-on" : "chip"}
            onClick={() => setMode("platform")}
          >
            Platform
          </button>
          <button
            type="button"
            className={mode === "segment" ? "chip is-on" : "chip"}
            onClick={() => setMode("segment")}
          >
            Segment
          </button>
        </div>
      </div>
      <p className="meta">Cell values are excerpt counts, not conversion rates.</p>
      {heat.empty ? (
        <p className="empty">No evidence for this filter.</p>
      ) : (
        <div className="heat-wrap">
          <table className="heat-table">
            <thead>
              <tr>
                <th>Reason</th>
                {columns.map((col) => (
                  <th key={col}>{formatAxis(col)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((reason) => (
                <tr key={reason}>
                  <th scope="row">{HEAT_SHORT[reason] ?? reasonLabel(reason)}</th>
                  {columns.map((col) => {
                    const n = heat.cells.find((cell) => cell.x === reason && cell.y === col)?.n ?? 0;
                    return (
                      <td key={col}>
                        <button
                          type="button"
                          className="heat-cell"
                          style={n ? { background: heatFill(n, max) } : undefined}
                          onClick={() => onOpen(reason)}
                        >
                          {n ? n : "—"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CompetitiveBlock({
  query,
  onOpen,
}: {
  query: InsightQuery;
  onOpen: (key: string) => void;
}) {
  const runtime = useDiscoverRuntime();
  const motives = unwrap(runtime.api.getCompetitiveMotives(query));
  const barriers = unwrap(runtime.api.getCompetitiveBarriers(query));
  const themes = unwrap(runtime.api.getSharedThemes(query));
  return (
    <section className="card" aria-label="Competitive comparison">
      <p className="kicker">Competitive</p>
      <h2>Myntra vs Nykaa vs Ajio</h2>
      <p className="meta">{motives.caption}</p>
      <div className="platform-grid">
        {barriers.items.map((item) => (
          <button
            key={item.platform}
            type="button"
            className="platform-tile"
            onClick={() => onOpen(item.platform)}
          >
            <strong>{item.platform.toUpperCase()}</strong>
            <span className="meta">n={item.evidence_n}</span>
            {item.insufficient ? (
              <p className="empty">Insufficient coverage — not a 0% bar.</p>
            ) : (
              <p className="meta">
                {item.barriers
                  .slice()
                  .sort((a, b) => b.n - a.n)
                  .slice(0, 2)
                  .map((row) => `${row.label} (${row.n})`)
                  .join(" · ") || "—"}
              </p>
            )}
          </button>
        ))}
      </div>
      <p className="meta">
        Shared themes:{" "}
        {themes.shared.map((row) => row.label).join(", ") || "none above threshold"}
      </p>
      <button type="button" className="ghost" onClick={() => onOpen("nykaa")}>
        Open Nykaa-tagged evidence
      </button>
    </section>
  );
}

function OpportunityBlock({
  query,
  onOpen,
}: {
  query: InsightQuery;
  onOpen: (key: string) => void;
}) {
  const runtime = useDiscoverRuntime();
  const areas = unwrap(runtime.api.getOpportunities(query));
  return (
    <section className="card" aria-label="Opportunity areas">
      <p className="kicker">Opportunities</p>
      <h2>Opportunity areas</h2>
      <p className="meta">Clusters with evidence ≥ 5. Not a conversion lift claim.</p>
      {areas.items.length === 0 ? (
        <p className="empty">No cluster meets the evidence threshold.</p>
      ) : (
        areas.items.map((item) => (
          <article key={item.id} className="opp">
            <strong>{item.title}</strong>
            <p className="meta">
              n={item.evidence_n} · {item.confidence_bucket} ·{" "}
              {item.platforms.join(", ") || "unspecified platform"}
            </p>
            <p className="meta">{item.why_it_matters}</p>
            <div className="inline-actions">
              <button type="button" className="ghost" onClick={() => onOpen(item.reason_ids[0])}>
                Open excerpts
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => runtime.api.copyOpportunity(item.id)}
              >
                Copy opportunity
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function AskDock({
  query,
  onCite,
}: {
  query: InsightQuery;
  onCite: (id: string) => void;
}) {
  const runtime = useDiscoverRuntime();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{
    answer_markdown: string;
    citations: string[];
    refused: boolean;
  } | null>(null);
  const suggestions = unwrap(runtime.api.getSuggestions(query));

  function submit(text: string) {
    runtime.store.emit({ name: "ask_suggestion_clicked", question: text });
    const result = unwrap(runtime.api.ask(text, query));
    setQuestion(text);
    setAnswer(result);
  }

  return (
    <section className="card ask" aria-label="Ask AI">
      <p className="kicker">Grounded assistant</p>
      <h2>Ask AI</h2>
      <p className="meta">Grounded in this page’s filters. Cite or refuse.</p>
      <div className="suggestions">
        {suggestions.items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            disabled={!item.available}
            onClick={() => submit(item.text)}
          >
            {shortSuggestion(item.text)}
          </button>
        ))}
      </div>
      {answer ? (
        <div className="ask-body">
          <p className={answer.refused ? "empty" : "answer"}>{answer.answer_markdown}</p>
          {answer.citations.map((id) => (
            <button
              key={id}
              type="button"
              className="cite"
              onClick={() => {
                runtime.store.emit({ name: "ask_citation_opened", excerpt_id: id });
                onCite(id);
              }}
            >
              Citation {id}
            </button>
          ))}
        </div>
      ) : (
        <p className="meta ask-placeholder">Ask a suggested question or query the corpus.</p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) submit(question.trim());
        }}
      >
        <input
          aria-label="Ask a question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Query the corpus…"
        />
        <button type="submit" className="primary">
          <IconSend />
          Ask
        </button>
      </form>
    </section>
  );
}

function EvidenceDrawer({
  query,
  insightKey,
  onOpenExcerpt,
}: {
  query: InsightQuery;
  insightKey?: string;
  onOpenExcerpt: (id: string) => void;
}) {
  const runtime = useDiscoverRuntime();
  if (!insightKey) {
    return (
      <section className="card" aria-label="Evidence">
        <p className="kicker">Verbatims</p>
        <h2>Evidence</h2>
        <p className="meta">Click a reason, cell, or citation.</p>
      </section>
    );
  }
  const evidence = unwrap(runtime.api.getEvidence(query, insightKey));
  return (
    <section className="card" aria-label="Evidence">
      <p className="kicker">Verbatims</p>
      <h2>Evidence</h2>
      <p className="meta">
        {insightKey} · n={evidence.evidence_n} · {evidence.confidence_bucket}
      </p>
      {evidence.empty ? (
        <p className="empty">No excerpts for this slice.</p>
      ) : (
        evidence.items.map((item) => (
          <button
            key={item.excerpt_id}
            type="button"
            className="excerpt"
            onClick={() => onOpenExcerpt(item.excerpt_id)}
          >
            <div className="excerpt-meta">
              <span className="plat-tag">
                {item.platforms.map((tag) => tag.platform).join(", ").toUpperCase() || "—"}
              </span>
              <span className="meta">
                {item.source_type.replaceAll("_", " ")} · {item.primary_reason.replaceAll("_", " ")}
              </span>
            </div>
            {item.text}
          </button>
        ))
      )}
    </section>
  );
}

function ClassificationTable() {
  const runtime = useDiscoverRuntime();
  const rows = unwrap(runtime.api.listClassifications()).items;
  const uncategorized = rows.filter((row) => row.primary_reason === "uncategorized");
  return (
    <section className="card table-card" aria-label="Classified excerpts">
      <p className="kicker">Corpus</p>
      <h2>Classified excerpts</h2>
      <p className="meta">
        Taxonomy {rows[0]?.taxonomy_version ?? "—"} · {rows.length} rows ·{" "}
        {uncategorized.length} uncategorized (kept visible)
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Excerpt</th>
              <th>Reason</th>
              <th>Platforms</th>
              <th>Intent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.excerpt_id}>
                <td>{row.text}</td>
                <td>{row.primary_reason.replaceAll("_", " ")}</td>
                <td>{row.platforms.join(", ") || "—"}</td>
                <td>{row.intent_type.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilterBar({
  query,
  onChange,
}: {
  query: InsightQuery;
  onChange: (query: InsightQuery) => void;
}) {
  const chips = activeChips(query);
  return (
    <div className="filter-bar" role="group" aria-label="Insight filters">
      <span className="kicker">Filters</span>
      {chips.length ? (
        <div className="chip-row">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="chip is-on"
              onClick={() => onChange({ ...query, [chip.key]: "all" })}
            >
              {chip.label}
              <IconClose />
            </button>
          ))}
        </div>
      ) : null}
      <div className="filter-selects">
        <label>
          Age
          <select
            value={query.segment ?? "all"}
            onChange={(event) =>
              onChange({
                ...query,
                segment: event.target.value as InsightQuery["segment"],
              })
            }
          >
            <option value="all">All ages</option>
            <option value="age_18_24">18–24</option>
            <option value="age_25_35">25–35</option>
          </select>
        </label>
        <label>
          Category
          <select
            value={query.category ?? "all"}
            onChange={(event) => onChange({ ...query, category: event.target.value })}
          >
            <option value="all">All categories</option>
            <option value="apparel">Apparel</option>
            <option value="beauty">Beauty</option>
            <option value="footwear">Footwear</option>
          </select>
        </label>
        <label>
          Price
          <select
            value={query.price_band ?? "all"}
            onChange={(event) => onChange({ ...query, price_band: event.target.value })}
          >
            <option value="all">All prices</option>
            <option value="500-2000">₹500–₹2000</option>
            <option value="2000-4700">₹2000–₹4700</option>
            <option value="500-4700">₹500–₹4700</option>
          </select>
        </label>
        <label>
          Intent
          <select
            value={query.intent_type ?? "all"}
            onChange={(event) =>
              onChange({
                ...query,
                intent_type: event.target.value as InsightQuery["intent_type"],
              })
            }
          >
            <option value="all">All intent</option>
            <option value="active_shortlist">Active shortlist</option>
            <option value="passive_bookmark">Passive bookmark</option>
          </select>
        </label>
        <label>
          Platform
          <select
            value={query.platform ?? "all"}
            onChange={(event) =>
              onChange({
                ...query,
                platform: event.target.value as InsightQuery["platform"],
              })
            }
          >
            <option value="all">All platforms</option>
            <option value="myntra">Myntra</option>
            <option value="nykaa">Nykaa</option>
            <option value="ajio">Ajio</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Source
          <select
            value={query.source_type ?? "all"}
            onChange={(event) =>
              onChange({
                ...query,
                source_type: event.target.value as InsightQuery["source_type"],
              })
            }
          >
            <option value="all">All sources</option>
            <option value="play_store">Play Store</option>
            <option value="reddit">Reddit</option>
            <option value="research">Research</option>
            <option value="youtube">YouTube</option>
            <option value="social">Social</option>
            <option value="product_review">Product reviews</option>
          </select>
        </label>
      </div>
      <button type="button" className="ghost reset" onClick={() => onChange({})}>
        <IconReset />
        Reset Filters
      </button>
    </div>
  );
}

function ConfidenceChip({ bucket, n }: { bucket: string; n: number }) {
  const label =
    bucket === "high"
      ? "High"
      : bucket === "medium"
        ? "Medium"
        : "Directional — thin evidence";
  return (
    <span className={`conf conf-${bucket}`}>
      {label} · n={n}
    </span>
  );
}

function activeChips(query: InsightQuery) {
  const chips: { key: keyof InsightQuery; label: string }[] = [];
  (Object.keys(FILTER_LABELS) as (keyof InsightQuery)[]).forEach((key) => {
    const value = query[key];
    if (!value || value === "all") return;
    const pretty = FILTER_VALUES[key]?.[String(value)] ?? String(value);
    chips.push({ key, label: `${FILTER_LABELS[key]}: ${pretty}` });
  });
  return chips;
}

function uniqueXs(cells: { x: string; y: string; n: number }[]) {
  return [...new Set(cells.map((cell) => cell.x))];
}

function uniqueYs(cells: { x: string; y: string; n: number }[], fallback: string[]) {
  const found = [...new Set(cells.map((cell) => cell.y))];
  return fallback.filter((id) => found.includes(id)).concat(found.filter((id) => !fallback.includes(id)));
}

function formatAxis(id: string) {
  if ((PLATFORMS as readonly string[]).includes(id)) return (id as Platform).toUpperCase();
  if (id === "age_18_24") return "18–24";
  if (id === "age_25_35") return "25–35";
  return id.replaceAll("_", " ");
}

function heatFill(n: number, max: number) {
  const t = 0.12 + (n / max) * 0.55;
  return `rgba(255, 63, 108, ${t.toFixed(2)})`;
}

function barTone(index: number) {
  if (index === 0) return "pink";
  if (index === 1) return "ink";
  return "muted";
}

function shortSuggestion(text: string) {
  if (/prevent/i.test(text)) return "What prevents purchase?";
  if (/postpone/i.test(text)) return "What causes postponement?";
  if (/18/i.test(text)) return "How do 18–24 vs 25–35 differ?";
  if (/intent|bookmark/i.test(text)) return "Intent vs bookmark?";
  if (/Nykaa|Ajio/i.test(text)) return "Myntra vs Nykaa / Ajio?";
  if (/shared/i.test(text)) return "Shared vs platform-specific?";
  if (/add fashion/i.test(text)) return "Why do they wishlist?";
  return text;
}
