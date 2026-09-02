import { inferArticleType } from "./stylist";

export type StyleShot = {
  id: string;
  image_url: string;
  wearer: string;
  city: string;
  occasion: string;
  crop?: "top" | "side" | "close";
};

export type StyleReview = {
  author: string;
  city: string;
  rating: number;
  fit: string;
  comment: string;
};

const WEARERS: Array<Pick<StyleShot, "id" | "wearer" | "city" | "occasion">> = [
  { id: "ananya", wearer: "Ananya", city: "Bengaluru", occasion: "Weekend" },
  { id: "riya", wearer: "Riya", city: "Pune", occasion: "Evening" },
  { id: "priya", wearer: "Priya", city: "Kolkata", occasion: "Wedding lunch" },
];

const CROPS: Array<StyleShot["crop"]> = ["top", "close", "side"];

/** Same garment as the PDP — not a different dress or saree. */
const PRODUCT_CUSTOMERS: Record<string, string[]> = {
  "prod-libas": ["/shopper/libas-ugc-1.png", "/shopper/libas-ugc-2.png", "/shopper/libas-ugc-3.png"],
};

const DRESS_REVIEWS: StyleReview[] = [
  { author: "Ananya", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Wore it to brunch. The wrap holds if you double-knot it." },
  { author: "Riya", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Soft fabric, moves well. I kept my usual size." },
  { author: "Priya", city: "Kolkata", rating: 5, fit: "Looks like the photos", comment: "Got compliments at a wedding lunch. Modest and easy to wear." },
];

const ETHNIC_REVIEWS: StyleReview[] = [
  { author: "Priya", city: "Kolkata", rating: 5, fit: "Looks like the photos", comment: "Heavy but sits well. I wore it through a full ceremony." },
  { author: "Sara", city: "Jaipur", rating: 4, fit: "Looks like the photos", comment: "Beautiful drape. I took a hook at the waist for a neater fall." },
];

const DEFAULT_REVIEWS: StyleReview[] = [
  { author: "Kabir", city: "Mumbai", rating: 4, fit: "Looks like the photos", comment: "Looks like the photos. Pairing was obvious once I saw other customers wear it." },
  { author: "Dev", city: "Chennai", rating: 5, fit: "Looks like the photos", comment: "Comfortable all day. Would buy the colour again." },
];

function shotsFromUrls(urls: string[], limit: number): StyleShot[] {
  return WEARERS.slice(0, limit).map((row, index) => ({
    ...row,
    image_url: urls[index] ?? urls[0]!,
    crop: CROPS[index],
  }));
}

export function stylingConfidenceLooks(
  item: {
    id: string;
    productId: string;
    catalog: { brand: string; title: string; image_url: string };
  },
  limit = 3,
): StyleShot[] {
  const dedicated = PRODUCT_CUSTOMERS[item.productId];
  if (dedicated?.length) {
    return shotsFromUrls(dedicated, Math.min(limit, dedicated.length));
  }
  const photo = item.catalog.image_url;
  if (!photo) return [];
  return shotsFromUrls(
    WEARERS.slice(0, limit).map((_, index) => `${photo}?styled=${index + 1}`),
    limit,
  );
}

export function stylingReviews(title: string): StyleReview[] {
  const article = inferArticleType(title);
  if (article === "dress" || article === "top") return DRESS_REVIEWS;
  if (article === "kurta" || article === "saree" || article === "ethnic_set") return ETHNIC_REVIEWS;
  return DEFAULT_REVIEWS;
}

export function reviewAverage(reviews: StyleReview[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length;
}
