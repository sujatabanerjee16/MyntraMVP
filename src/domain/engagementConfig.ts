/** Architecture §14 — FrequencyGuard and send-window defaults. */
export const ENGAGEMENT_CONFIG = {
  maxInterruptivePerDay: 1,
  maxPerItemPer7d: 1,
  sendWindowLocalStart: "09:00",
  sendWindowLocalEnd: "21:00",
  timezone: "Asia/Kolkata",
  inboxPick: "highest_priority_one" as const,
  occasionOffsetsDays: [7, 3] as number[],
};

export type EngagementConfig = typeof ENGAGEMENT_CONFIG;

export function createEngagementConfig(
  overrides: Partial<EngagementConfig> = {},
): EngagementConfig {
  return { ...ENGAGEMENT_CONFIG, ...overrides };
}
