import type { Document, Excerpt } from "../domain/models";
import type {
  Classification,
  IntentType,
  JourneyStage,
  Motive,
  PlatformTag,
  ReasonCategory,
  ReasonLabel,
} from "../domain/models";
import { TAXONOMY_VERSION } from "../domain/models";
import type { CorpusStore } from "../store/corpusStore";

const REASON_SEEDS: { category: ReasonCategory; pattern: RegExp }[] = [
  { category: "fit_sizing", pattern: /\b(size|sizing|fit|fits)\b/i },
  {
    category: "price_waiting",
    pattern: /\b(sale|discount|price|cheaper|payday|full price|deals)\b/i,
  },
  {
    category: "quality_trust",
    pattern: /\b(fabric|photos?|quality|thin|premium|trust)\b/i,
  },
  {
    category: "styling_decision",
    pattern: /\b(styling|style|friends wear|how to style|outfits?)\b/i,
  },
  { category: "review_trust", pattern: /\b(reviews?|fake)\b/i },
  {
    category: "timing_occasion",
    pattern: /\b(wedding|december|festival|festive|diwali|not needed yet|payday|postpone)\b/i,
  },
  {
    category: "external_comparison",
    pattern: /\b(compare|youtube|asked friends|switch)\b/i,
  },
  {
    category: "passive_bookmarking",
    pattern: /\b(moodboard|inspiration|no plan to buy|forget why|graveyard)\b/i,
  },
  {
    category: "logistics_friction",
    pattern: /\b(delivery|returns?|cancelled)\b/i,
  },
  {
    category: "competitive_preference",
    pattern: /\b(nykaa|ajio|two wishlists|other app|both wishlists)\b/i,
  },
];

function scoreReasons(text: string): ReasonLabel[] {
  const hits: ReasonLabel[] = [];
  for (const seed of REASON_SEEDS) {
    if (seed.pattern.test(text)) {
      hits.push({ category: seed.category, confidence: 0.72 });
    }
  }
  if (!hits.length) {
    return [{ category: "uncategorized", confidence: 0.2 }];
  }
  return hits.sort((a, b) => b.confidence - a.confidence);
}

function intentOf(text: string): IntentType {
  if (/\b(moodboard|inspiration|no plan to buy|graveyard|forget why)\b/i.test(text)) {
    return "passive_bookmark";
  }
  if (/\b(shortlist|workwear|need this|save now|compare)\b/i.test(text)) {
    return "active_shortlist";
  }
  return "unknown";
}

function journeyOf(text: string, reasons: ReasonLabel[]): JourneyStage {
  if (/\bbought\b/i.test(text)) return "convert_mention";
  if (reasons.some((row) => row.category === "timing_occasion")) return "postpone";
  if (reasons.some((row) => row.category === "external_comparison")) {
    return "compare_external";
  }
  if (reasons.some((row) => row.category === "passive_bookmarking")) return "discover";
  return "hesitate";
}

function platformsOf(text: string, document: Document): PlatformTag[] {
  const tags = new Map<string, PlatformTag>();
  const named: Array<[RegExp, PlatformTag["platform"]]> = [
    [/\bmyntra\b/i, "myntra"],
    [/\bnykaa\b/i, "nykaa"],
    [/\bajio\b/i, "ajio"],
  ];
  for (const [pattern, platform] of named) {
    if (pattern.test(text)) {
      tags.set(platform, { platform, attribution_confidence: "high" });
    }
  }
  if (/\bthe other app\b/i.test(text) && !tags.size) {
    tags.set("other", { platform: "other", attribution_confidence: "low" });
  }
  if (document.platform_of_source && !tags.has(document.platform_of_source)) {
    tags.set(document.platform_of_source, {
      platform: document.platform_of_source,
      attribution_confidence: "high",
    });
  }
  if (!tags.size && !document.platform_of_source) {
    // ATR5: generic Reddit without a name — do not default to Myntra
    return [];
  }
  return [...tags.values()];
}

function motivesOf(text: string, reasons: ReasonLabel[]): Motive[] {
  const motives: Motive[] = [];
  if (reasons.some((row) => row.category === "price_waiting")) {
    motives.push("price_sale_waiting");
  }
  if (/\bbeauty\b/i.test(text) && /\bapparel\b/i.test(text)) {
    motives.push("category_strength");
  }
  if (/\bdiscovery|browse|brands\b/i.test(text)) {
    motives.push("assortment_discovery");
  }
  if (reasons.some((row) => row.category === "passive_bookmarking")) {
    motives.push("social_inspiration");
  }
  if (reasons.some((row) => row.category === "quality_trust")) {
    motives.push("trust_quality");
  }
  return motives;
}

export function classifyExcerpt(
  excerpt: Excerpt,
  document: Document,
): Classification {
  const reasons = scoreReasons(excerpt.text);
  const primary = reasons[0]?.category ?? "uncategorized";
  return {
    excerpt_id: excerpt.id,
    taxonomy_version: TAXONOMY_VERSION,
    reasons,
    primary_reason: primary,
    intent_type: intentOf(excerpt.text),
    journey_stage: journeyOf(excerpt.text, reasons),
    platforms: platformsOf(excerpt.text, document),
    motives: motivesOf(excerpt.text, reasons),
    model_confidence: reasons[0]?.confidence ?? 0.2,
    review_status: "auto",
  };
}

export function runClassifier(store: CorpusStore): {
  classified: number;
  skipped: number;
} {
  let classified = 0;
  let skipped = 0;
  for (const excerpt of store.excerpts) {
    const existing = store.classifications.find(
      (row) =>
        row.excerpt_id === excerpt.id &&
        row.taxonomy_version === TAXONOMY_VERSION,
    );
    if (existing) {
      skipped += 1;
      continue;
    }
    const document = store.documents.find((row) => row.id === excerpt.document_id);
    if (!document) continue;
    store.classifications.push(classifyExcerpt(excerpt, document));
    classified += 1;
  }
  return { classified, skipped };
}
