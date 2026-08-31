import {
  MOTIVES,
  PLATFORMS,
  REASON_CATEGORIES,
  TAXONOMY_VERSION,
} from "./models";

export const TAXONOMY_V1 = {
  version: TAXONOMY_VERSION,
  reasons: [...REASON_CATEGORIES],
  motives: [...MOTIVES],
  platforms: [...PLATFORMS],
  labels: {
    fit_sizing: "Fit & sizing uncertainty",
    price_waiting: "Price sensitivity / waiting",
    quality_trust: "Quality & trust doubt",
    styling_decision: "Styling / decision uncertainty",
    review_trust: "Review trust",
    timing_occasion: "Timing / occasion",
    external_comparison: "External comparison",
    passive_bookmarking: "Passive bookmarking",
    logistics_friction: "Logistics / friction",
    competitive_preference: "Competitive / platform preference",
    uncategorized: "Uncategorized",
    assortment_discovery: "Assortment / discovery",
    price_sale_waiting: "Price / sale waiting",
    brand_exclusive: "Brand / exclusive",
    category_strength: "Category strength",
    trust_quality: "Trust / quality",
    ux_convenience: "UX / convenience",
    social_inspiration: "Social / inspiration",
  } as Record<string, string>,
};

export function reasonLabel(id: string): string {
  return TAXONOMY_V1.labels[id] ?? id;
}
