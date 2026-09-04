import { daysBetween, type WishlistBucketId } from "./models";

export type OccasionBrief = {
  label: string;
  countdown: string | null;
  dateLabel: string | null;
};

export function occasionLabel(title: string, bucketId: WishlistBucketId | null): string {
  if (bucketId === "wedding") return "Friend's Wedding";
  if (bucketId === "office") return "Office";
  if (bucketId === "summer") return "A summer occasion";
  if (/wedding|bridal/i.test(title)) return "A wedding";
  if (/party|pleat|ruffle/i.test(title)) return "A night out";
  if (/ethnic|festive|saree|anarkali|maxi|kurta/i.test(title)) return "A festive occasion";
  return "An upcoming occasion";
}

export function formatOccasionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function occasionCountdown(occasionDate: string | null, nowIso: string): string | null {
  if (!occasionDate) return null;
  const days = daysBetween(nowIso, occasionDate);
  if (days < 0) return "Date has passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days away`;
}

export function occasionBrief(
  item: { catalog: { title: string }; bucketId: WishlistBucketId | null; occasionDate: string | null },
  nowIso: string,
): OccasionBrief {
  return {
    label: occasionLabel(item.catalog.title, item.bucketId),
    countdown: occasionCountdown(item.occasionDate, nowIso),
    dateLabel: item.occasionDate ? formatOccasionDate(item.occasionDate) : null,
  };
}
