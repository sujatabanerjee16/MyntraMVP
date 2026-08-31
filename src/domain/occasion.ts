import { localDateKey } from "./localTime";

export const OCCASION_PRESETS = [
  "Vacation",
  "Wedding",
  "Work",
  "Festive",
  "Other",
] as const;

export type OccasionLabel = (typeof OCCASION_PRESETS)[number] | string;
export type OccasionStatus = "active" | "dismissed" | "completed" | "expired";

export type OccasionTag = {
  id: string;
  wishlist_item_id: string;
  label: string;
  target_date: string | null;
  window_start: string | null;
  window_end: string | null;
  timezone: string;
  remind_offsets_days: number[];
  status: OccasionStatus;
  last_offset_fired: number | null;
  created_at: string;
  updated_at: string;
};

export type OccasionWrite = {
  label: string;
  target_date?: string | null;
  window_start?: string | null;
  window_end?: string | null;
  timezone?: string;
};

export type OccasionDto = {
  label: string;
  target_date: string | null;
  window_start: string | null;
  window_end: string | null;
  days_until: number | null;
  status: OccasionStatus;
};

function ymdToUtc(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDaysYmd(ymd: string, days: number): string {
  const next = new Date(ymdToUtc(ymd) + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

export function daysUntilYmd(fromYmd: string, toYmd: string): number {
  return Math.round((ymdToUtc(toYmd) - ymdToUtc(fromYmd)) / 86_400_000);
}

export function occasionAnchorDate(tag: OccasionTag): string | null {
  return tag.target_date ?? tag.window_start;
}

export function occasionDaysUntil(
  tag: OccasionTag,
  now: Date,
  timeZone: string,
): number | null {
  const anchor = occasionAnchorDate(tag);
  if (!anchor) return null;
  return daysUntilYmd(localDateKey(now, timeZone), anchor);
}

export function occasionNoun(label: string): string {
  return label === "Vacation" ? "Trip" : label;
}

export function occasionBadgeLabel(label: string, daysUntil: number): string {
  const noun = occasionNoun(label);
  if (daysUntil <= 0) return `${noun} today`;
  if (daysUntil === 1) return `${noun} tomorrow`;
  return `${noun} in ${daysUntil} days`;
}

export function occasionInboxCopy(label: string, daysUntil: number): {
  title: string;
  body: string;
} {
  const badge = occasionBadgeLabel(label, daysUntil);
  return {
    title: `${badge} — still saved.`,
    body: `${occasionNoun(label)} is coming up. We will only remind you a few times — not every day.`,
  };
}

export function occasionDeepLink(wishlistItemId: string): string {
  return `myntra://wishlist/items/${wishlistItemId}?signal=occasion_approaching`;
}

export function validateOccasionWrite(body: OccasionWrite): string | null {
  if (!body.label?.trim()) return "label is required";
  if (body.label.trim().length > 80) return "label is too long";
  const hasDate = Boolean(body.target_date);
  const hasWindow = Boolean(body.window_start);
  if (!hasDate && !hasWindow) return "target_date or window_start is required";
  if (body.window_start && body.window_end && body.window_end < body.window_start) {
    return "window_end must be on or after window_start";
  }
  return null;
}

export function thisWeekWindow(todayYmd: string): {
  window_start: string;
  window_end: string;
} {
  return { window_start: todayYmd, window_end: addDaysYmd(todayYmd, 6) };
}

export function thisMonthWindow(todayYmd: string): {
  window_start: string;
  window_end: string;
} {
  const [year, month] = todayYmd.split("-").map(Number);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { window_start: todayYmd, window_end: end };
}

export function endOfLocalDayIso(now: Date, timeZone: string): string {
  const day = localDateKey(now, timeZone);
  return new Date(`${day}T23:59:59.000+05:30`).toISOString();
}
