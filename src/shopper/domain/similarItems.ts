import { inferArticleType } from "./stylist";
import type { CatalogProduct, SiteCat } from "../store";

const ETHNIC = /kurta|anarkali|ethnic|saree|sari|lehenga|salwar/;
const APPAREL = new Set([
  "kurta",
  "dress",
  "saree",
  "top",
  "shirt",
  "polo",
  "jeans",
  "tee",
  "frock",
  "ethnic_set",
  "cargo",
]);

const VARIATION_LABEL: Record<string, string> = {
  kurta: "Kurta set",
  saree: "Saree",
  dress: "Dress",
  top: "Top",
  shirt: "Shirt",
  polo: "Polo",
  jeans: "Jeans",
  tee: "T-shirt",
  frock: "Frock",
  ethnic_set: "Ethnic set",
  earrings: "Earrings",
  lipstick: "Beauty",
};

export function isEthnicTitle(title: string): boolean {
  return ETHNIC.test(title.toLowerCase());
}

export function similarVariationLabel(title: string): string {
  return VARIATION_LABEL[inferArticleType(title)] ?? "Similar style";
}

/** Same studio shot saved under two filenames — treat as one visual. */
const IMAGE_ALIAS: Record<string, string> = {
  "/shopper/women-kurta.jpg": "purple-saree",
  "/shopper/women-saree.jpg": "purple-saree",
};

function imageKey(url: string): string {
  return IMAGE_ALIAS[url] ?? url;
}

export function similarCatalogProducts(
  source: { productId: string; brand: string; title: string; category?: SiteCat; image_url?: string },
  catalog: CatalogProduct[],
  savedIds: Set<string>,
  limit = 8,
): CatalogProduct[] {
  const article = inferArticleType(source.title);
  const ethnic = isEthnicTitle(source.title);
  const catalogSource = catalog.find((row) => row.productId === source.productId);
  const category = source.category ?? catalogSource?.category;
  const sourceImage = imageKey(source.image_url ?? catalogSource?.image_url ?? "");
  const ranked = catalog
    .map((row) => {
      if (row.productId === source.productId) return { row, score: 0 };
      if (savedIds.has(row.productId)) return { row, score: 0 };
      if (category && row.category !== category) return { row, score: 0 };
      const rowArticle = inferArticleType(row.title);
      let score = 0;
      if (article !== "other" && rowArticle === article) score += 6;
      if (ethnic && isEthnicTitle(row.title)) score += 4;
      if (row.brand.toLowerCase() === source.brand.toLowerCase()) score += 2;
      if (APPAREL.has(article) && APPAREL.has(rowArticle) && rowArticle !== article) score += 3;
      return { row, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const seenImages = new Set<string>(sourceImage ? [sourceImage] : []);
  const unique: CatalogProduct[] = [];
  for (const entry of ranked) {
    const key = imageKey(entry.row.image_url);
    if (seenImages.has(key)) continue;
    seenImages.add(key);
    unique.push(entry.row);
    if (unique.length >= limit) break;
  }
  return unique;
}
