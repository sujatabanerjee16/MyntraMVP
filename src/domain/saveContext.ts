import { ENGAGEMENT_CONFIG } from "./engagementConfig";
import { localDateKey } from "./localTime";

/**
 * Save-context summary — i18n contract (en-IN default).
 *
 * Pattern:
 *   Saved from {sourcePhrase}{queryPhrase} · {relativeTime}
 *   Saved · {relativeTime}                         // source = other
 *
 * sourcePhrase:
 *   pdp        → "the product page"
 *   search     → "search"
 *   similar    → "similar items"
 *   collection → "a collection"
 *   other      → (omit; use the short pattern)
 *
 * queryPhrase:
 *   if referring_query is non-empty after trim → ` “{query}”`
 *   otherwise omit (never emit empty “”)
 *
 * relativeTime (calendar days in the user's IANA timezone):
 *   0 → "today"
 *   1 → "1 day ago"
 *   n → "{n} days ago"
 *
 * Clients must render `save_context.summary` as returned. Do not rebuild copy.
 */
export const SAVE_SOURCES = [
  "pdp",
  "search",
  "similar",
  "collection",
  "other",
] as const;

export type SaveSource = (typeof SAVE_SOURCES)[number];

export const NOTE_MAX_LENGTH = 280;
export const REFERRING_QUERY_MAX_LENGTH = 200;
export const NOTE_CARD_TRUNCATE = 72;
export const VIEW_DEBOUNCE_MS = 30_000;

export const SOURCE_PHRASE: Record<SaveSource, string | null> = {
  pdp: "the product page",
  search: "search",
  similar: "similar items",
  collection: "a collection",
  other: null,
};

export type SaveContext = {
  wishlist_item_id: string;
  source: SaveSource;
  note: string | null;
  referring_query: string | null;
  metadata: { collection_id?: string } | null;
  created_at: string;
};

export type SaveContextDto = {
  source: SaveSource;
  summary: string;
  note: string | null;
};

export type AddWishlistBody = {
  product_id: string;
  sku_id?: string | null;
  preferred_size?: string | null;
  source?: string | null;
  referring_query?: string | null;
  note?: string | null;
};

export function isSaveSource(value: unknown): value is SaveSource {
  return (
    typeof value === "string" &&
    (SAVE_SOURCES as readonly string[]).includes(value)
  );
}

/** Missing or unknown source persists as `other` — do not fail the save. */
export function normalizeSource(value: unknown): SaveSource {
  return isSaveSource(value) ? value : "other";
}

export function sanitizeReferringQuery(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, REFERRING_QUERY_MAX_LENGTH);
}

export function sanitizeNote(
  raw: string | null | undefined,
): { ok: true; note: string | null } | { ok: false; error: string } {
  if (raw == null) return { ok: true, note: null };
  const cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const trimmed = cleaned.trim();
  if (!trimmed) return { ok: true, note: null };
  if (trimmed.length > NOTE_MAX_LENGTH) {
    return { ok: false, error: "note must be 280 characters or fewer" };
  }
  return { ok: true, note: trimmed };
}

function ymdToUtc(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function calendarDaysSinceSave(
  savedAt: string,
  now: Date,
  timeZone = ENGAGEMENT_CONFIG.timezone,
): number {
  const from = localDateKey(new Date(savedAt), timeZone);
  const to = localDateKey(now, timeZone);
  return Math.max(0, Math.round((ymdToUtc(to) - ymdToUtc(from)) / 86_400_000));
}

export function formatRelativeDaysAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function buildSaveContextSummary(
  ctx: Pick<SaveContext, "source" | "referring_query">,
  savedAt: string,
  now: Date,
  timeZone = ENGAGEMENT_CONFIG.timezone,
): string {
  const age = formatRelativeDaysAgo(calendarDaysSinceSave(savedAt, now, timeZone));
  const query = ctx.referring_query?.trim();
  const queryPhrase = query ? ` “${query}”` : "";
  const sourcePhrase = SOURCE_PHRASE[ctx.source];
  if (!sourcePhrase) return `Saved · ${age}`;
  return `Saved from ${sourcePhrase}${queryPhrase} · ${age}`;
}

export function truncateNote(
  note: string,
  max = NOTE_CARD_TRUNCATE,
): { text: string; truncated: boolean } {
  if (note.length <= max) return { text: note, truncated: false };
  return { text: `${note.slice(0, max).trimEnd()}…`, truncated: true };
}

export function toSaveContextDto(
  ctx: SaveContext,
  savedAt: string,
  now: Date,
  timeZone = ENGAGEMENT_CONFIG.timezone,
): SaveContextDto {
  return {
    source: ctx.source,
    summary: buildSaveContextSummary(ctx, savedAt, now, timeZone),
    note: ctx.note,
  };
}
