import { MIN_EVIDENCE } from "./models";

export type ConfidenceBucket = "low" | "medium" | "high";

const SOURCE_RELIABILITY: Record<string, number> = {
  research: 0.9,
  play_store: 0.7,
  reddit: 0.6,
  product_review: 0.6,
  youtube: 0.45,
  social: 0.45,
  other: 0.4,
};

function clip01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function sourceReliability(sourceMix: Record<string, number>): number {
  const entries = Object.entries(sourceMix);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (!total) return 0;
  return (
    entries.reduce(
      (sum, [source, n]) => sum + (SOURCE_RELIABILITY[source] ?? 0.4) * n,
      0,
    ) / total
  );
}

export function confidenceScore(
  evidenceN: number,
  sourceMix: Record<string, number>,
  labelAgreement = 0.7,
): number {
  const volume = Math.log10(evidenceN + 1) / Math.log10(21);
  return clip01(
    0.4 * Math.min(1, volume) +
      0.3 * sourceReliability(sourceMix) +
      0.3 * labelAgreement,
  );
}

export function confidenceBucket(
  evidenceN: number,
  sourceMix: Record<string, number>,
  labelAgreement = 0.7,
): ConfidenceBucket {
  if (evidenceN < MIN_EVIDENCE) return "low"; // EC-CNF-001: never high below threshold
  const score = confidenceScore(evidenceN, sourceMix, labelAgreement);
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}
