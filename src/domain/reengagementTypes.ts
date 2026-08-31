/**
 * Phase 0 guardrail: the only legal re-engagement types.
 * Monetary types (price_drop, coupons, % off) are never members of this union.
 */
export const REENGAGEMENT_TYPES = [
  "back_in_stock",
  "size_available",
  "occasion_approaching",
  "similar_search",
] as const;

export type ReengagementType = (typeof REENGAGEMENT_TYPES)[number];

/** Types that must never appear in APIs, fixtures, copy keys, or analytics. */
export const FORBIDDEN_REENGAGEMENT_TYPES = [
  "price_drop",
  "discount",
  "coupon",
  "percent_off",
  "sale_countdown",
] as const;

export type ForbiddenReengagementType =
  (typeof FORBIDDEN_REENGAGEMENT_TYPES)[number];

export const MONETARY_COPY_PATTERNS: RegExp[] = [
  /price\s*drop/i,
  /\d+\s*%\s*off/i,
  /\bcoupon\b/i,
  /\bsale\s*countdown\b/i,
];

export function isReengagementType(value: unknown): value is ReengagementType {
  return (
    typeof value === "string" &&
    (REENGAGEMENT_TYPES as readonly string[]).includes(value)
  );
}

export function isForbiddenReengagementType(
  value: unknown,
): value is ForbiddenReengagementType {
  return (
    typeof value === "string" &&
    (FORBIDDEN_REENGAGEMENT_TYPES as readonly string[]).includes(value)
  );
}

export function copyLooksMonetary(text: string): boolean {
  return MONETARY_COPY_PATTERNS.some((pattern) => pattern.test(text));
}
