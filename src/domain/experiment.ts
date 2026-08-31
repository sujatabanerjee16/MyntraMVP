import type { FeatureFlagState } from "./flags";

/**
 * Architecture §17.3 — experiment sketch (T1 shippable; T2 after P∥).
 *
 * Unit = user.
 * Control must never receive price-drop (forbidden in every arm).
 * CTR is diagnostic. Nudged item conversion is the primary proxy.
 */
export const EXPERIMENT_ID = "reeng_wishlist_t1";

export const EXPERIMENT_VARIANTS = ["control", "t1", "t2"] as const;
export type ExperimentVariant = (typeof EXPERIMENT_VARIANTS)[number];

export type ExperimentAssignment = {
  exp_id: string;
  variant: ExperimentVariant;
  user_id: string;
};

export const EXPERIMENT_SKETCH = {
  exp_id: EXPERIMENT_ID,
  unit: "user" as const,
  primary_proxy: "nudged_item_conversion",
  diagnostic: "reengagement_ctr",
  north_star: "wishlist_purchaser_rate_30d",
  arms: {
    control:
      "Existing wishlist. No orchestrator inbox or badges. No price-drop.",
    t1: "C1 only — stock/size in-app inbox + card badges.",
    t2: "C1 + C2 (occasion). Assign only after P∥ go on tagging/cadence.",
  },
  holdout_rule: "Control must not receive price-drop or any monetary type.",
};

export function isExperimentVariant(
  value: unknown,
): value is ExperimentVariant {
  return (
    typeof value === "string" &&
    (EXPERIMENT_VARIANTS as readonly string[]).includes(value)
  );
}

/** Flag overlay for an assigned arm. `reeng.price_drop` stays off. */
export function flagsForVariant(
  variant: ExperimentVariant,
): Partial<FeatureFlagState> {
  if (variant === "control") {
    return {
      "reeng.stock_alerts": false,
      "reeng.occasion": false,
      "reeng.similar_nudge": false,
    };
  }
  if (variant === "t1") {
    return {
      "reeng.stock_alerts": true,
      "reeng.occasion": false,
      "reeng.similar_nudge": false,
    };
  }
  return {
    "reeng.stock_alerts": true,
    "reeng.occasion": true,
    "reeng.similar_nudge": false,
  };
}
