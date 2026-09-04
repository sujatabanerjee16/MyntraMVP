import { inferQuality } from "./compare";
import { inferArticleType, type ProductReview } from "./stylist";
import {
  dedicatedCustomerPhotos,
  reviewAverage,
  stylingReviews,
  type StyleReview,
  type StyleShot,
} from "./stylingLooks";

export type QualityQuote = {
  author: string;
  city: string;
  rating: number;
  comment: string;
};

export type QualityBrief = {
  fabric: string;
  description: string;
  quotes: QualityQuote[];
  rating: { average: number; count: number };
  photos: StyleShot[];
};

const FABRIC_WORD =
  /\b(cotton-blend|silk-blend|cotton|linen|silk|satin|viscose|crepe|denim|knit|jersey|chiffon|georgette|velvet|canvas)\b/i;

/** Customer-style photos already in /public/shopper — never the same file as the PDP when avoidable. */
const KIDS_PHOTOS = [
  "/shopper/pics/kids-tropical-set.jpg",
  "/shopper/pics/kids-plaid-shirt.jpg",
  "/shopper/pics/kids-infant-set.jpg",
  "/shopper/pics/kids-waistcoat.jpg",
  "/shopper/kids-hoodie.jpg",
  "/shopper/kids-shorts.jpg",
  "/shopper/kids-frock.jpg",
  "/shopper/kids-tee.jpg",
  "/shopper/pics/kids-floral-booties.jpg",
  "/shopper/pics/kids-baby-socks.jpg",
];

const PHOTO_POOL: Record<string, string[]> = {
  dress: [
    "/shopper/libas-ugc-1.png",
    "/shopper/libas-ugc-2.png",
    "/shopper/libas-ugc-3.png",
    "/shopper/women-floral.jpg",
    "/shopper/pics/women-olive-maxi.jpg",
  ],
  top: ["/shopper/libas-ugc-2.png", "/shopper/women-top.jpg", "/shopper/women-floral.jpg", "/shopper/libas-ugc-1.png"],
  saree: [
    "/shopper/pics/women-mustard-saree.jpg",
    "/shopper/pics/women-emerald-saree.jpg",
    "/shopper/pics/women-navy-saree.jpg",
    "/shopper/women-saree.jpg",
  ],
  kurta: [
    "/shopper/pics/women-blue-kurta.jpg",
    "/shopper/pics/women-pink-anarkali.jpg",
    "/shopper/pics/women-black-kurta.jpg",
    "/shopper/biba-product.png",
  ],
  ethnic_set: ["/shopper/biba-product.png", "/shopper/pics/women-pink-anarkali.jpg", "/shopper/pics/women-blue-kurta.jpg"],
  shirt: ["/shopper/pics/women-polka-shirt.jpg", "/shopper/pics/men-white-shirt.jpg", "/shopper/linen-product.jpg"],
  jeans: ["/shopper/pics/men-light-jeans.jpg", "/shopper/men-jeans.jpg", "/shopper/genz-skirt.jpg"],
  sneakers: ["/shopper/pics/shoes-red-canvas.jpg", "/shopper/pics/shoes-lining-white.jpg", "/shopper/pics/shoes-chunky.jpg"],
  makeup: ["/shopper/beauty-palette.jpg", "/shopper/beauty-cream.jpg"],
  lipstick: ["/shopper/beauty-cream.jpg", "/shopper/beauty-palette.jpg"],
  blazer: ["/shopper/studio-blazer.jpg", "/shopper/men-jacket.jpg", "/shopper/pics/men-tan-jacket.jpg"],
  frock: KIDS_PHOTOS,
  kids: KIDS_PHOTOS,
  other: ["/shopper/libas-ugc-1.png", "/shopper/libas-ugc-2.png", "/shopper/studio-blazer.jpg"],
};

function isKidsProduct(item: { productId: string; catalog: { title: string; image_url?: string }; category?: string }): boolean {
  if (item.category === "KIDS") return true;
  if (/^prod-kids-|^prod-pic-(baby|plaid|infant|booties|waistcoat)/i.test(item.productId)) return true;
  return /infant|baby|\bboys\b|\bgirls\b|kids|shorts set|bootie|waistcoat|frock/i.test(item.catalog.title);
}

function twoCustomerUrls(pdp: string | undefined, pool: string[], fallback: string): [string, string] {
  const clean = pool.filter((url) => url && url !== pdp);
  const first = clean[0] ?? pool[0] ?? pdp ?? fallback;
  const second = clean.find((url) => url !== first) ?? pool.find((url) => url !== first) ?? first;
  return [first, second];
}

export function qualityPhotos(item: {
  productId: string;
  catalog: { title: string; image_url?: string };
  category?: string;
}): StyleShot[] {
  const dedicated = dedicatedCustomerPhotos(item.productId, 2);
  if (dedicated.length >= 2) return dedicated.slice(0, 2);
  const kids = isKidsProduct(item);
  const article = kids ? "kids" : inferArticleType(item.catalog.title);
  const pool = PHOTO_POOL[article] ?? (kids ? KIDS_PHOTOS : PHOTO_POOL.other);
  const fallback = kids ? "/shopper/pics/kids-tropical-set.jpg" : "/shopper/libas-ugc-1.png";
  const [one, two] = twoCustomerUrls(item.catalog.image_url, pool, fallback);
  return [
    { id: `${item.productId}-p1`, image_url: one, wearer: "Customer", city: "", occasion: "Customer photo" },
    { id: `${item.productId}-p2`, image_url: two, wearer: "Customer", city: "", occasion: "Customer photo" },
  ];
}

export function qualityBrief(
  item: { productId: string; catalog: { title: string; image_url?: string }; category?: string },
  catalogDescription: string | undefined,
  productReviews: ProductReview[] = [],
): QualityBrief {
  const title = item.catalog.title;
  const reviews = stylingReviews(title, item.productId);
  const quotes = pickRelevantQuotes(reviews, 3);
  return {
    fabric: fabricFrom(title, catalogDescription),
    description: catalogDescription?.trim() || reviews[0]?.comment || inferQuality(title),
    quotes: quotes.map((row) => ({
      author: row.author,
      city: row.city,
      rating: row.rating,
      comment: row.comment,
    })),
    rating: ratingFor(item.productId, title, productReviews),
    photos: qualityPhotos(item),
  };
}

export function fabricFrom(title: string, description?: string): string {
  const blob = `${title} ${description ?? ""}`;
  if (/cotton-blend|cotton blend/i.test(blob)) return "Cotton-blend";
  if (/silk-blend|silk blend/i.test(blob)) return "Silk-blend";
  if (/faux-suede|suede/i.test(blob)) return "Faux-suede";
  if (/linen/i.test(blob)) return "Linen — breathable";
  if (/silk|satin/i.test(blob)) return "Silk / satin drape";
  if (/denim|jean/i.test(blob)) return "Denim";
  if (/crepe|pleat/i.test(blob)) return "Crepe";
  if (/viscose|wrap/i.test(blob)) return "Viscose drape";
  if (/knit|hoodie|jersey|ruched/i.test(blob)) return "Knit";
  if (/cotton/i.test(blob)) return "Cotton";
  const clause = description?.match(new RegExp(`${FABRIC_WORD.source}[^.!]*`, "i"));
  if (clause) {
    const line = clause[0].trim();
    return line[0]!.toUpperCase() + line.slice(1);
  }
  return inferQuality(title);
}

/** Stable 150–429 review volume so Quality never looks like a 3-person sample. */
export function displayReviewCount(productId: string, sampleSize: number): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i += 1) {
    hash = (hash * 31 + productId.charCodeAt(i)) >>> 0;
  }
  const volume = 150 + (hash % 280);
  return Math.max(volume, sampleSize, 150);
}

function ratingFor(productId: string, title: string, productReviews: ProductReview[]) {
  const mine = productReviews.filter((row) => row.productId === productId);
  const style = stylingReviews(title, productId);
  if (mine.length) {
    const average = mine.reduce((sum, row) => sum + row.rating, 0) / mine.length;
    return { average: Math.round(average * 10) / 10, count: displayReviewCount(productId, mine.length) };
  }
  return {
    average: Math.round(reviewAverage(style) * 10) / 10,
    count: displayReviewCount(productId, style.length),
  };
}

/** Prefer one quality, one colour, one texture/feel line — fall back to first reviews. */
export function pickRelevantQuotes(reviews: StyleReview[], limit = 3): StyleReview[] {
  const used = new Set<string>();
  const take = (re: RegExp) => {
    const hit = reviews.find((row) => re.test(row.comment) && !used.has(row.comment));
    if (hit) used.add(hit.comment);
    return hit;
  };
  const picks = [
    take(/\b(quality|fabric quality|stitching|durable|worth)\b/i),
    take(/\b(colo(?:u)?r|shade|print|tone|hue)\b/i),
    take(/\b(soft|texture|feel|drape|heavy|airy|smooth|sturdy|cotton|silk|crepe|viscose)\b/i),
  ].filter((row): row is StyleReview => Boolean(row));
  for (const row of reviews) {
    if (picks.length >= limit) break;
    if (used.has(row.comment)) continue;
    picks.push(row);
    used.add(row.comment);
  }
  return picks.slice(0, limit);
}
