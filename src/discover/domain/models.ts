export const SOURCE_TYPES = [
  "play_store",
  "reddit",
  "youtube",
  "product_review",
  "social",
  "research",
  "other",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const PLATFORMS = ["myntra", "nykaa", "ajio", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const SEGMENTS = ["age_18_24", "age_25_35", "unknown"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const INTENT_TYPES = [
  "active_shortlist",
  "passive_bookmark",
  "unknown",
] as const;
export type IntentType = (typeof INTENT_TYPES)[number];

export type Source = {
  id: string;
  source_type: SourceType;
  label: string;
};

export type Document = {
  id: string;
  source_type: SourceType;
  source_ref: string;
  content_hash: string;
  captured_at: string;
  published_at: string | null;
  platform_of_source: Platform | null;
  raw_text: string;
  pii_redacted: boolean;
  segment: Segment;
  category: string | null;
  price_band: string | null;
};

export type Excerpt = {
  id: string;
  document_id: string;
  char_start: number;
  char_end: number;
  text: string;
};

export type InsightQuery = {
  segment?: Segment | "all";
  category?: string | "all";
  price_band?: string | "all";
  intent_type?: IntentType | "all";
  platform?: Platform | "all";
  source_type?: SourceType | "all";
};

export type NorthStarResponse = {
  available: false;
  reason: "not_in_corpus";
  needs: "checkout_events";
  formula: string;
};

export const NS1_UNAVAILABLE: NorthStarResponse = {
  available: false,
  reason: "not_in_corpus",
  needs: "checkout_events",
  formula:
    "Users with ≥1 wishlisted-item purchase in 30d / users in cohort. Requires checkout join — not scrape or review text.",
};

export const CORPUS_AS_OF = "2026-08-29";
export const TAXONOMY_VERSION = "v1";
export const MIN_EVIDENCE = 5;

export const REASON_CATEGORIES = [
  "fit_sizing",
  "price_waiting",
  "quality_trust",
  "styling_decision",
  "review_trust",
  "timing_occasion",
  "external_comparison",
  "passive_bookmarking",
  "logistics_friction",
  "competitive_preference",
  "uncategorized",
] as const;
export type ReasonCategory = (typeof REASON_CATEGORIES)[number];

export const MOTIVES = [
  "assortment_discovery",
  "price_sale_waiting",
  "brand_exclusive",
  "category_strength",
  "trust_quality",
  "ux_convenience",
  "social_inspiration",
] as const;
export type Motive = (typeof MOTIVES)[number];

export const JOURNEY_STAGES = [
  "discover",
  "shortlist",
  "hesitate",
  "compare_external",
  "postpone",
  "abandon",
  "convert_mention",
] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export type ReasonLabel = {
  category: ReasonCategory;
  confidence: number;
};

export type PlatformTag = {
  platform: Platform;
  attribution_confidence: "high" | "low";
};

export type Classification = {
  excerpt_id: string;
  taxonomy_version: string;
  reasons: ReasonLabel[];
  primary_reason: ReasonCategory;
  intent_type: IntentType;
  journey_stage: JourneyStage;
  platforms: PlatformTag[];
  motives: Motive[];
  model_confidence: number;
  review_status: "auto" | "accepted" | "corrected";
};
