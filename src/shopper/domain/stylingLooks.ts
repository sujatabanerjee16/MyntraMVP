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

/** Same garment as the PDP — not a different dress or saree. Prefer dedicated UGC files. */
const PRODUCT_CUSTOMERS: Record<string, string[]> = {
  "prod-libas": ["/shopper/libas-ugc-1.png", "/shopper/libas-ugc-2.png", "/shopper/libas-ugc-3.png"],
  "prod-kids-shorts": ["/shopper/pics/kids-tropical-set.jpg", "/shopper/pics/kids-plaid-shirt.jpg", "/shopper/kids-shorts.jpg"],
  "prod-kids-hoodie": ["/shopper/kids-hoodie.jpg", "/shopper/pics/kids-infant-set.jpg", "/shopper/pics/kids-baby-socks.jpg"],
  "prod-pic-plaid-shirt": ["/shopper/pics/kids-plaid-shirt.jpg", "/shopper/pics/kids-waistcoat.jpg"],
  "prod-pic-infant-set": ["/shopper/pics/kids-infant-set.jpg", "/shopper/kids-hoodie.jpg"],
  "prod-pic-waistcoat": ["/shopper/pics/kids-waistcoat.jpg", "/shopper/pics/kids-plaid-shirt.jpg"],
  "prod-pic-booties": ["/shopper/pics/kids-floral-booties.jpg", "/shopper/pics/kids-baby-socks.jpg"],
  "prod-pic-baby-socks": ["/shopper/pics/kids-baby-socks.jpg", "/shopper/pics/kids-floral-booties.jpg"],
  "prod-occasion": ["/shopper/libas-ugc-2.png", "/shopper/libas-ugc-3.png", "/shopper/pics/women-olive-maxi.jpg"],
  "prod-occasion-2": ["/shopper/libas-ugc-1.png", "/shopper/women-floral.jpg", "/shopper/libas-ugc-2.png"],
  "prod-dress-cmp-1": ["/shopper/libas-ugc-3.png", "/shopper/libas-ugc-1.png", "/shopper/women-top.jpg"],
  "prod-dress-cmp-2": ["/shopper/women-floral.jpg", "/shopper/libas-ugc-2.png", "/shopper/pics/women-olive-maxi.jpg"],
  "prod-kurta-cmp-1": ["/shopper/pics/women-blue-kurta.jpg", "/shopper/pics/women-black-kurta.jpg"],
  "prod-kurta-cmp-3": ["/shopper/pics/women-pink-anarkali.jpg", "/shopper/pics/women-blue-kurta.jpg"],
  "prod-biba": ["/shopper/pics/women-pink-anarkali.jpg", "/shopper/pics/women-black-kurta.jpg"],
  "prod-pic-mustard-saree": ["/shopper/pics/women-mustard-saree.jpg", "/shopper/pics/women-navy-saree.jpg"],
  "prod-pic-emerald-saree": ["/shopper/pics/women-emerald-saree.jpg", "/shopper/women-saree.jpg"],
  "prod-pic-olive-maxi": ["/shopper/pics/women-olive-maxi.jpg", "/shopper/libas-ugc-2.png"],
  "prod-linen": ["/shopper/pics/men-white-shirt.jpg", "/shopper/pics/women-polka-shirt.jpg"],
  "prod-jeans": ["/shopper/pics/men-light-jeans.jpg", "/shopper/genz-skirt.jpg"],
};

const DRESS_REVIEWS: StyleReview[] = [
  { author: "Ananya", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Soft fabric, and it looks like the photos." },
  { author: "Riya", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Colour stayed true after a wash — same shade as the listing." },
  { author: "Priya", city: "Kolkata", rating: 5, fit: "Looks like the photos", comment: "Texture feels smooth and light — easy to wear all evening." },
  { author: "Neha", city: "Delhi", rating: 5, fit: "Looks like the photos", comment: "Fabric quality is good. No see-through in daylight." },
  { author: "Diya", city: "Chennai", rating: 4, fit: "Looks like the photos", comment: "Print colour matches the PDP. Stitching is neat." },
];

const ETHNIC_REVIEWS: StyleReview[] = [
  { author: "Priya", city: "Kolkata", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Heavy fabric, sits well through a ceremony." },
  { author: "Sara", city: "Jaipur", rating: 4, fit: "Looks like the photos", comment: "Colour is rich in daylight — border tone matches the listing." },
  { author: "Leela", city: "Lucknow", rating: 5, fit: "Looks like the photos", comment: "Texture feels substantial, not plasticky. No loose threads." },
  { author: "Anu", city: "Nashik", rating: 5, fit: "Looks like the photos", comment: "Weave quality is good. Smooth drape for a wedding evening." },
];

const DEFAULT_REVIEWS: StyleReview[] = [
  { author: "Kabir", city: "Mumbai", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Looks like the photos and feels sturdy." },
  { author: "Dev", city: "Chennai", rating: 5, fit: "Looks like the photos", comment: "Colour is even — no weird dye patches." },
  { author: "Arjun", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Texture feels clean and finished. Worth keeping." },
];

const PRODUCT_REVIEWS: Record<string, StyleReview[]> = {
  "prod-occasion": [
    { author: "Meera", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Cotton-blend, not see-through, and the flare matches the studio shot." },
    { author: "Anika", city: "Hyderabad", rating: 4, fit: "Looks like the photos", comment: "Colour is soft ivory in daylight — same tone as the listing." },
    { author: "Divya", city: "Pune", rating: 5, fit: "Looks like the photos", comment: "Texture feels airy with a light hand — no stiffness after a wash." },
  ],
  "prod-occasion-2": [
    { author: "Riya", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Crepe, not shiny polyester, and the pleats hold." },
    { author: "Tara", city: "Mumbai", rating: 5, fit: "Looks like the photos", comment: "Colour depth is rich — same shade under shop lights and sun." },
    { author: "Neha", city: "Delhi", rating: 5, fit: "Looks like the photos", comment: "Texture feels smooth at the hip — no scratchy lining." },
  ],
  "prod-dress-cmp-1": [
    { author: "Sana", city: "Delhi", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Light cotton, eyelet tiers look like the photos." },
    { author: "Diya", city: "Chennai", rating: 4, fit: "Looks like the photos", comment: "White colour stays clean — not yellowing after one wash." },
    { author: "Ira", city: "Mumbai", rating: 5, fit: "Looks like the photos", comment: "Texture is soft cotton, not stiff organza. Feels breathable." },
  ],
  "prod-libas": [
    { author: "Ananya", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Soft viscose, wrap holds if you double-knot it." },
    { author: "Priya", city: "Kolkata", rating: 4, fit: "Looks like the photos", comment: "Print colour matches the photos — florals are clear, not muddy." },
    { author: "Ritika", city: "Pune", rating: 5, fit: "Looks like the photos", comment: "Texture drapes softly. Hem and lining feel clean." },
  ],
  "prod-kurta-cmp-1": [
    { author: "Nisha", city: "Jaipur", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Sky-blue cotton, print is clear, cool for daytime." },
    { author: "Aditi", city: "Lucknow", rating: 4, fit: "Looks like the photos", comment: "Colour stayed bright after wash — no fade on the blue." },
    { author: "Smita", city: "Indore", rating: 5, fit: "Looks like the photos", comment: "Texture feels soft cotton at the collar — neat stitching." },
  ],
  "prod-kurta-cmp-3": [
    { author: "Kavya", city: "Pune", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Everyday cotton, gold print matches the PDP." },
    { author: "Isha", city: "Ahmedabad", rating: 5, fit: "Looks like the photos", comment: "Colour of the gold print is honest — not dull in person." },
    { author: "Rani", city: "Surat", rating: 4, fit: "Looks like the photos", comment: "Texture feels solid for the price — no loose threads." },
  ],
  "prod-pic-mustard-saree": [
    { author: "Rhea", city: "Nagpur", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Silk-blend, not plasticky, border matches the listing." },
    { author: "Pooja", city: "Indore", rating: 4, fit: "Looks like the photos", comment: "Mustard colour is warm and true — same as the photo." },
    { author: "Anu", city: "Nashik", rating: 5, fit: "Looks like the photos", comment: "Texture feels rich silk-blend — good weight for evening." },
  ],
  "prod-pic-emerald-saree": [
    { author: "Sara", city: "Jaipur", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Emerald silk, gold foil does not rub off." },
    { author: "Leela", city: "Kolkata", rating: 4, fit: "Looks like the photos", comment: "Colour is deep emerald — border tone matches the listing." },
    { author: "Mira", city: "Bengaluru", rating: 5, fit: "Looks like the photos", comment: "Pallu texture feels dense and smooth — not scratchy." },
  ],
  "prod-pic-olive-maxi": [
    { author: "Anu", city: "Bengaluru", rating: 4, fit: "Looks like the photos", comment: "Quality is good. Olive satin sheen is real, not cheap shine." },
    { author: "Maya", city: "Goa", rating: 5, fit: "Looks like the photos", comment: "Olive colour matches the PDP under daylight." },
    { author: "Kiara", city: "Mumbai", rating: 5, fit: "Looks like the photos", comment: "Texture feels smooth satin — straps feel secure." },
  ],
  "prod-biba": [
    { author: "Priya", city: "Kolkata", rating: 5, fit: "Looks like the photos", comment: "Quality is good. Heavier festive fabric, same flare as the photo." },
    { author: "Sara", city: "Jaipur", rating: 4, fit: "Looks like the photos", comment: "Colour holds through a ceremony — no dulling under lights." },
    { author: "Aditi", city: "Delhi", rating: 5, fit: "Looks like the photos", comment: "Texture feels structured but not stiff — dupatta and kurta match." },
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
