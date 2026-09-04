import { inferQuality } from "./compare";
import { inferArticleType, type ProductReview } from "./stylist";
import { dedicatedCustomerPhotos, reviewAverage, stylingReviews, type StyleShot } from "./stylingLooks";

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

const PHOTO_POOL: Record<string, string[]> = {
  dress: ["/shopper/studio-dress.png", "/shopper/women-floral.jpg", "/shopper/pics/women-olive-maxi.jpg", "/shopper/women-top.jpg"],
  top: ["/shopper/women-top.jpg", "/shopper/women-floral.jpg", "/shopper/studio-dress.png"],
  saree: ["/shopper/women-saree.jpg", "/shopper/pics/women-mustard-saree.jpg", "/shopper/pics/women-emerald-saree.jpg", "/shopper/pics/women-navy-saree.jpg"],
  kurta: ["/shopper/pics/women-blue-kurta.jpg", "/shopper/pics/women-pink-anarkali.jpg", "/shopper/pics/women-black-kurta.jpg", "/shopper/biba-product.png"],
  ethnic_set: ["/shopper/biba-product.png", "/shopper/pics/women-pink-anarkali.jpg", "/shopper/pics/women-blue-kurta.jpg"],
  shirt: ["/shopper/linen-product.jpg", "/shopper/pics/women-polka-shirt.jpg", "/shopper/pics/men-white-shirt.jpg"],
  jeans: ["/shopper/men-jeans.jpg", "/shopper/pics/men-light-jeans.jpg", "/shopper/genz-skirt.jpg"],
  sneakers: ["/shopper/pics/shoes-red-canvas.jpg", "/shopper/pics/shoes-lining-white.jpg", "/shopper/pics/shoes-chunky.jpg"],
  makeup: ["/shopper/beauty-palette.jpg", "/shopper/beauty-cream.jpg"],
  lipstick: ["/shopper/beauty-cream.jpg", "/shopper/beauty-palette.jpg"],
  blazer: ["/shopper/studio-blazer.jpg", "/shopper/men-jacket.jpg"],
  other: ["/shopper/studio-blazer.jpg", "/shopper/men-chinos.jpg", "/shopper/kids-shorts.jpg"],
};

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

function ratingFor(productId: string, title: string, productReviews: ProductReview[]) {
  const mine = productReviews.filter((row) => row.productId === productId);
  if (mine.length) {
    const average = mine.reduce((sum, row) => sum + row.rating, 0) / mine.length;
    return { average: Math.round(average * 10) / 10, count: mine.length };
  }
  const style = stylingReviews(title, productId);
  return { average: Math.round(reviewAverage(style) * 10) / 10, count: style.length };
}

function twoUrls(first: string, pool: string[]): [string, string] {
  const second = pool.find((url) => url !== first) ?? pool[0] ?? first;
  return [first, second];
}

export function qualityPhotos(item: { productId: string; catalog: { title: string; image_url?: string } }): StyleShot[] {
  const dedicated = dedicatedCustomerPhotos(item.productId, 2);
  if (dedicated.length >= 2) return dedicated.slice(0, 2);
  const article = inferArticleType(item.catalog.title);
  const pool = PHOTO_POOL[article] ?? PHOTO_POOL.other;
  const [one, two] = twoUrls(item.catalog.image_url || pool[0]!, pool);
  return [
    { id: `${item.productId}-p1`, image_url: one, wearer: "", city: "", occasion: "Photo" },
    { id: `${item.productId}-p2`, image_url: two, wearer: "", city: "", occasion: "Photo" },
  ];
}

export function qualityBrief(
  item: { productId: string; catalog: { title: string; image_url?: string } },
  catalogDescription: string | undefined,
  productReviews: ProductReview[] = [],
): QualityBrief {
  const title = item.catalog.title;
  const reviews = stylingReviews(title, item.productId);
  return {
    fabric: fabricFrom(title, catalogDescription),
    description: catalogDescription?.trim() || reviews[0]?.comment || inferQuality(title),
    quotes: reviews.slice(0, 3).map((row) => ({
      author: row.author,
      city: row.city,
      rating: row.rating,
      comment: row.comment,
    })),
    rating: ratingFor(item.productId, title, productReviews),
    photos: qualityPhotos(item),
  };
}
