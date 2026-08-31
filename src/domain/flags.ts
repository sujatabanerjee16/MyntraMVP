/**
 * Feature flags — architecture §14.
 * `reeng.price_drop` is permanently off / deleted. Do not turn it on.
 */
export const FEATURE_FLAGS = {
  "reeng.stock_alerts": true,
  "reeng.occasion": true,
  "reeng.save_context": true,
  "reeng.similar_nudge": false,
  "reeng.price_drop": false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export type FeatureFlagState = {
  [K in FeatureFlag]: boolean;
};

export function createFeatureFlags(
  overrides: Partial<FeatureFlagState> = {},
): {
  isOn: (flag: FeatureFlag) => boolean;
  set: (flag: FeatureFlag, value: boolean) => void;
  snapshot: () => FeatureFlagState;
} {
  const state: FeatureFlagState = { ...FEATURE_FLAGS, ...overrides };
  state["reeng.price_drop"] = false;

  return {
    isOn: (flag) => state[flag] === true,
    set: (flag, value) => {
      if (flag === "reeng.price_drop") return;
      state[flag] = value;
    },
    snapshot: () => ({ ...state }),
  };
}

export function isFlagOn(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}

export function isPriceDropEnabled(): boolean {
  return false;
}
