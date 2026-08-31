import { daysBetween, type ContextTag } from "./models";
import type { CatalogProduct } from "../store";

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

function isAccessory(row: CatalogProduct): boolean {
  return /earring|jewel|lip|serum|kit|sneaker|cushion|lamp/i.test(`${row.title} ${row.brand}`);
}

function pairScore(bagTitle: string, bagCat: string, tag: ContextTag | null, row: CatalogProduct): number {
  const text = `${row.title} ${row.brand}`.toLowerCase();
  let score = 0;
  if (row.category === bagCat) score += 1;
  if (tag === "occasion" && /earring|jewel|dress|ethnic|maxi/i.test(text)) score += 4;
  if (/dress|kurta|anarkali|maxi|wrap/i.test(bagTitle) && /earring|jewel|lip/i.test(text)) score += 5;
  if (/shirt|polo|linen/i.test(bagTitle) && /jean|sneaker/i.test(text)) score += 5;
  if (/jean/i.test(bagTitle) && /shirt|polo/i.test(text)) score += 4;
  if (isAccessory(row)) score += 2;
  return score;
}

function whyFor(bagTitle: string, tag: ContextTag | null, recTitle: string): string {
  if (tag === "occasion") {
    return `You saved ${bagTitle} for an occasion. ${recTitle} finishes the look so you are not placing a second order later.`;
  }
  if (tag === "price_drop") {
    return `You're buying ${bagTitle} on the drop. ${recTitle} is a small add-on people often take in the same checkout.`;
  }
  if (tag === "size_wait") {
    return `Your size is back on ${bagTitle}. ${recTitle} pairs with it without another wait.`;
  }
  return `You're checking out ${bagTitle}. ${recTitle} is a frequent pair for this kind of bag.`;
}

function cartRead(bagTitle: string, brand: string, tag: ContextTag | null, occasionDate: string | null, nowIso: string): string {
  if (tag === "occasion" && occasionDate) {
    const days = daysBetween(nowIso, occasionDate);
    const when = days >= 0 ? ` in ${days} day${days === 1 ? "" : "s"}` : "";
    return `This bag — ${brand} ${bagTitle} — is tagged for an occasion${when}. One extra piece now keeps the look in a single order.`;
  }
  if (tag === "price_drop") {
    return `This bag — ${brand} ${bagTitle} — is a price-drop buy. A small add-on here is cheaper than coming back later.`;
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
  const bagCat =
    catalog.find((row) => row.productId === bag.productId)?.category ?? "WOMEN";
  const ranked = catalog
    .filter((row) => row.productId !== bag.productId && !row.sizeOos)
    .map((row) => ({
      row,
      score: pairScore(bag.catalog.title, bagCat, bag.tag, row),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ row }) => ({
      product: row,
      categoryLabel: CAT_LABEL[row.category] ?? row.category,
      blurb: row.title,
      why: whyFor(bag.catalog.title, bag.tag, row.title),
      match: "Strong match for today's order",
    }));

  return {
    cartRead: cartRead(bag.catalog.title, bag.catalog.brand, bag.tag, bag.occasionDate, nowIso),
    picks: ranked,
  };
}
