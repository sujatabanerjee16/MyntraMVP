import { lookKindOf, pairingAllowed, isKidsLook } from "./jeansLooks";
import { daysBetween, type ContextTag } from "./models";
import type { CatalogProduct, SiteCat } from "../store";

export type OrderRec = {
  product: CatalogProduct;
  categoryLabel: string;
  blurb: string;
  why: string;
  match: string;
};

export type OrderRecOffer = {
  cartRead: string;
  picks: OrderRec[];
};

const CAT_LABEL: Record<string, string> = {
  WOMEN: "Women",
  MEN: "Men",
  KIDS: "Kids",
  HOME: "Home",
  BEAUTY: "Beauty",
  GENZ: "GenZ",
  STUDIO: "Studio",
};

function isJewelry(row: CatalogProduct): boolean {
  return /earring|jewel/i.test(`${row.title} ${row.brand}`);
}

function bagCategory(
  productId: string,
  title: string,
  brand: string,
  catalog: CatalogProduct[],
): SiteCat {
  const row = catalog.find((item) => item.productId === productId);
  if (row) return row.category;
  if (isKidsLook(title, brand)) return "KIDS";
  return "WOMEN";
}

function pairScore(bagTitle: string, bagCat: string, tag: ContextTag | null, row: CatalogProduct): number {
  if (!pairingAllowed(bagCat, row.category, row.title)) return 0;
  const text = `${row.title} ${row.brand}`.toLowerCase();
  const shirtBag = /shirt|polo|tee|linen/i.test(bagTitle);
  const ethnicBag = bagCat === "WOMEN" && /dress|kurta|anarkali|maxi|wrap|saree|sari/i.test(bagTitle);
  const kidsBag = bagCat === "KIDS" || isKidsLook(bagTitle);
  let score = 0;
  if (row.category === bagCat) score += 2;
  if (kidsBag && row.category === "KIDS") score += 6;
  if (kidsBag && (isJewelry(row) || row.category === "WOMEN" || row.category === "STUDIO")) return 0;
  if (shirtBag && isJewelry(row)) return 0;
  if ((bagCat === "MEN" || bagCat === "KIDS") && isJewelry(row)) return 0;
  if (tag === "occasion" && ethnicBag && /earring|jewel|dress|ethnic|maxi/i.test(text)) score += 4;
  if (ethnicBag && isJewelry(row)) score += 6;
  if (ethnicBag && /lip/i.test(text)) score += 4;
  if (shirtBag && /jean/i.test(text)) score += 5;
  if (shirtBag && /sneaker|short/i.test(text)) score += 5;
  if (/jean/i.test(bagTitle) && /shirt|polo|tee/i.test(text)) score += 4;
  if (kidsBag && /sock|bootie|short|tee|hoodie|frock/i.test(text)) score += 3;
  return score;
}

function whyFor(bagTitle: string, bagCat: string, tag: ContextTag | null, recTitle: string): string {
  if (bagCat === "KIDS" || isKidsLook(bagTitle)) {
    return `You're checking out ${bagTitle}. ${recTitle} is another kids piece for the same order.`;
  }
  if (tag === "occasion") {
    return `You saved ${bagTitle} for an occasion. ${recTitle} finishes the look so you are not placing a second order later.`;
  }
  if (tag === "compare") {
    return `You saved ${bagTitle} to compare. ${recTitle} is a real pair so you can pick with more confidence.`;
  }
  if (tag === "size_wait") {
    return `Your size is back on ${bagTitle}. ${recTitle} pairs with it without another wait.`;
  }
  return `You're checking out ${bagTitle}. ${recTitle} is a frequent pair for this look.`;
}

function cartRead(bagTitle: string, brand: string, tag: ContextTag | null, occasionDate: string | null, nowIso: string): string {
  if (tag === "occasion" && occasionDate) {
    const days = daysBetween(nowIso, occasionDate);
    const when = days >= 0 ? ` in ${days} day${days === 1 ? "" : "s"}` : "";
    return `This bag — ${brand} ${bagTitle} — is tagged for an occasion${when}. One extra piece now keeps the look in a single order.`;
  }
  return `This bag — ${brand} ${bagTitle} — reads as one look. A matching extra saves a second checkout.`;
}

export function recommendForOrder(
  bag: {
    productId: string;
    catalog: { brand: string; title: string };
    tag: ContextTag | null;
    occasionDate: string | null;
  },
  catalog: CatalogProduct[],
  nowIso: string,
): OrderRecOffer {
  const bagCat = bagCategory(bag.productId, bag.catalog.title, bag.catalog.brand, catalog);
  const bagImage = catalog.find((row) => row.productId === bag.productId)?.image_url;
  const ranked = catalog
    .filter((row) => row.productId !== bag.productId && !row.sizeOos && row.image_url !== bagImage)
    .map((row) => ({
      row,
      score: pairScore(bag.catalog.title, bagCat, bag.tag, row),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const seenKind = new Set<string>();
  const picks: OrderRec[] = [];
  for (const { row } of ranked) {
    const kind = lookKindOf(row.title, row.category) ?? row.category;
    if (seenKind.has(kind)) continue;
    seenKind.add(kind);
    picks.push({
      product: row,
      categoryLabel: CAT_LABEL[row.category] ?? row.category,
      blurb: row.title,
      why: whyFor(bag.catalog.title, bagCat, bag.tag, row.title),
      match: "Strong match for today's order",
    });
    if (picks.length >= 3) break;
  }

  return {
    cartRead: cartRead(bag.catalog.title, bag.catalog.brand, bag.tag, bag.occasionDate, nowIso),
    picks,
  };
}
