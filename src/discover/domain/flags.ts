export const DISCOVER_FLAGS = {
  "discover.ask_ai": true,
  "discover.competitive": true,
  "discover.dashboard_v1": true,
  "discover.internal_events": false,
} as const;

export type DiscoverFlag = keyof typeof DISCOVER_FLAGS;

export function createDiscoverFlags(
  overrides: Partial<Record<DiscoverFlag, boolean>> = {},
) {
  const state: Record<DiscoverFlag, boolean> = {
    ...DISCOVER_FLAGS,
    ...overrides,
  };
  state["discover.internal_events"] =
    overrides["discover.internal_events"] ?? false;

  return {
    isOn: (flag: DiscoverFlag) => state[flag] === true,
    set: (flag: DiscoverFlag, value: boolean) => {
      state[flag] = value;
    },
    snapshot: () => ({ ...state }),
  };
}
