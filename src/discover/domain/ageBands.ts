import type { Segment } from "./models";

const AGE_18_24 = /^(age[_-]?18[_-]?24|18\s*[–\-to]{1,3}\s*24)$/i;
const AGE_25_35 = /^(age[_-]?25[_-]?35|25\s*[–\-to]{1,3}\s*35)$/i;

/** Map survey / explicit age labels. Does not infer age from slang. */
export function mapAgeBand(raw: string | null | undefined): Segment {
  const value = (raw ?? "").trim();
  if (!value) return "unknown";
  const compact = value.replace(/\s+/g, " ");
  if (AGE_18_24.test(compact) || compact === "age_18_24") return "age_18_24";
  if (AGE_25_35.test(compact) || compact === "age_25_35") return "age_25_35";
  return "unknown";
}

export function explicitAgeFromText(text: string): Segment {
  const lower = text.toLowerCase();
  if (/\b(i'?m|i am|age)\s*(18|19|20|21|22|23|24)\b/.test(lower)) {
    return "age_18_24";
  }
  if (/\b(i'?m|i am|age)\s*(25|26|27|28|29|30|31|32|33|34|35)\b/.test(lower)) {
    return "age_25_35";
  }
  return "unknown";
}
