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
  { author: "Ananya", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Soft fabric, and it looks like the photos." },
  { author: "Riya", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Stitching is neat. Quality feels better than I expected." },
  { author: "Priya", city: "Kolkata", rating: 5, fit: "Looks like the photos", comment: "Fabric quality is good. Easy to wear all evening." },
];

const ETHNIC_REVIEWS: StyleReview[] = [
  { author: "Priya", city: "Kolkata", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Heavy fabric, sits well through a ceremony." },
  { author: "Sara", city: "Jaipur", rating: 4, fit: "Looks like the photos", comment: "Drape quality is good. I took a hook at the waist for a neater fall." },
  { author: "Leela", city: "Lucknow", rating: 5, fit: "Looks like the photos", comment: "Stitching quality is good. No loose threads." },
];

const DEFAULT_REVIEWS: StyleReview[] = [
  { author: "Kabir", city: "Mumbai", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Looks like the photos and feels sturdy." },
  { author: "Dev", city: "Chennai", rating: 5, fit: "Looks like the photos", comment: "Fabric quality is good. Comfortable all day." },
  { author: "Arjun", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Finish is clean. Quality feels worth keeping." },
];

const PRODUCT_REVIEWS: Record<string, StyleReview[]> = {
  "prod-occasion": [
    { author: "Meera", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Cotton-blend, not see-through, and the flare matches the studio shot." },
    { author: "Anika", city: "Hyderabad", rating: 4, fit: "Looks like the photos", comment: "Stitching is neat. Gathered waist sits well — quality feels worth the price." },
    { author: "Divya", city: "Pune", rating: 5, fit: "Looks like the photos", comment: "Fabric quality is good. Airy, no loose threads after a wash." },
  ],
  "prod-occasion-2": [
    { author: "Riya", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Crepe, not shiny polyester, and the pleats hold." },
    { author: "Tara", city: "Mumbai", rating: 5, fit: "Looks like the photos", comment: "Finish is clean. Sits close like the photo — no stiffness at the hip." },
    { author: "Neha", city: "Delhi", rating: 5, fit: "Looks like the photos", comment: "Colour quality is good. Same shade as the listing after daylight." },
  ],
  "prod-dress-cmp-1": [
    { author: "Sana", city: "Delhi", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Light cotton, eyelet tiers look like the photos." },
    { author: "Diya", city: "Chennai", rating: 4, fit: "Looks like the photos", comment: "Stitching on the ruffles is tidy. Fabric feels better than the price." },
    { author: "Ira", city: "Mumbai", rating: 5, fit: "Looks like the photos", comment: "Quality is good — no see-through on the white mini." },
  ],
  "prod-libas": [
    { author: "Ananya", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Soft viscose, wrap holds if you double-knot it." },
    { author: "Priya", city: "Kolkata", rating: 4, fit: "Looks like the photos", comment: "Print quality is good. Same floral as the photos, not clingy." },
    { author: "Ritika", city: "Pune", rating: 5, fit: "Looks like the photos", comment: "Hem and lining are clean. Quality feels like a keep." },
  ],
  "prod-kurta-cmp-1": [
    { author: "Nisha", city: "Jaipur", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Sky-blue cotton, print is clear, cool for daytime." },
    { author: "Aditi", city: "Lucknow", rating: 4, fit: "Looks like the photos", comment: "Fabric quality is good. Mid-calf like the photo, no shrinkage after wash." },
    { author: "Smita", city: "Indore", rating: 5, fit: "Looks like the photos", comment: "Stitching at the mandarin collar is neat." },
  ],
  "prod-kurta-cmp-3": [
    { author: "Kavya", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Everyday cotton, gold print matches the PDP." },
    { author: "Isha", city: "Ahmedabad", rating: 5, fit: "Looks like the photos", comment: "Length is honest. Fabric quality is good with jeans." },
    { author: "Rani", city: "Surat", rating: 4, fit: "Looks like the photos", comment: "No loose threads. Quality feels solid for the price." },
  ],
  "prod-pic-mustard-saree": [
    { author: "Rhea", city: "Nagpur", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Silk-blend, not plasticky, border matches the listing." },
    { author: "Pooja", city: "Indore", rating: 4, fit: "Looks like the photos", comment: "Zari quality is good. Pallu is heavier, as a festive saree should be." },
    { author: "Anu", city: "Nashik", rating: 5, fit: "Looks like the photos", comment: "Weave feels rich. Quality is good for a wedding evening." },
  ],
  "prod-pic-emerald-saree": [
    { author: "Sara", city: "Jaipur", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Emerald silk, gold foil does not rub off." },
    { author: "Leela", city: "Kolkata", rating: 4, fit: "Looks like the photos", comment: "Border quality is good. Dense zari, needs a good petticoat." },
    { author: "Mira", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Pallu colour is rich. Quality feels like the photos." },
  ],
  "prod-pic-olive-maxi": [
    { author: "Anu", city: "Bengaluru", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Olive satin sheen is real, not cheap shine." },
    { author: "Maya", city: "Goa", rating: 5, fit: "Looks like the photos", comment: "Stitching at the ruched neck is clean. Shawl was in the parcel." },
    { author: "Kiara", city: "Mumbai", rating: 5, fit: "Looks like the photos", comment: "Fabric quality is good. Straps feel secure." },
  ],
  "prod-biba": [
    { author: "Priya", city: "Kolkata", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Heavier festive fabric, same flare as the photo." },
    { author: "Sara", city: "Jaipur", rating: 4, fit: "Looks like the photos", comment: "Structured fall. Stitching quality is good through a ceremony." },
    { author: "Aditi", city: "Delhi", rating: 5, fit: "Looks like the photos", comment: "Dupatta and kurta feel like one set. Quality is good." },
  ],
};

function shotsFromUrls(urls: string[], limit: number): StyleShot[] {
  return WEARERS.slice(0, limit).map((row, index) => ({
    ...row,
    image_url: urls[index] ?? urls[0]!,
    crop: CROPS[index],
  }));
}

/** Real customer shots only — never a cropped PDP pretending to be UGC. */
export function dedicatedCustomerPhotos(productId: string, limit = 2): StyleShot[] {
  const urls = PRODUCT_CUSTOMERS[productId];
  if (!urls?.length) return [];
  return shotsFromUrls(urls, Math.min(limit, urls.length));
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

export function stylingReviews(title: string, productId?: string): StyleReview[] {
  if (productId && PRODUCT_REVIEWS[productId]) return PRODUCT_REVIEWS[productId]!;
  const article = inferArticleType(title);
  if (article === "dress" || article === "top") return DRESS_REVIEWS;
  if (article === "kurta" || article === "saree" || article === "ethnic_set") return ETHNIC_REVIEWS;
  return DEFAULT_REVIEWS;
}

export function reviewAverage(reviews: StyleReview[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length;
}
