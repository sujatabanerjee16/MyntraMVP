import {
  BIBA_ID,
  BIBA_SKU,
  DEAD_ID,
  DEMO_USER_ID,
  LIBAS_ID,
  LIBAS_SKU,
  LINEN_ID,
  JEANS_ID,
  OCCASION_2_ID,
  OCCASION_ID,
  type InboxRow,
  type NotificationPrefs,
  type WishlistItem,
} from "./domain/models";
import type { PricePoint, ProductReview, PurchaseRecord, SizingReturn } from "./domain/stylist";
import { purchasesFor, returnsFor, SEED_PRICE_HISTORY, SEED_REVIEWS } from "./domain/stylistSeed";

export type SiteCat = "MEN" | "WOMEN" | "KIDS" | "HOME" | "BEAUTY" | "GENZ" | "STUDIO";

export type CatalogProduct = {
  productId: string;
  sku: string;
  brand: string;
  title: string;
  price: number;
  size: string;
  sizeOos: boolean;
  image_url: string;
  category: SiteCat;
};

export type HeroSlide = {
  brand: string;
  title: string;
  offer: string;
  image_url: string;
};

const IMG = {
  menShirt: "/shopper/men-shirt.jpg",
  menPolo: "/shopper/men-polo.jpg",
  menJeans: "/shopper/men-jeans.jpg",
  womenDress: "/shopper/women-dress.jpg",
  womenKurta: "/shopper/women-kurta.jpg",
  womenFloral: "/shopper/women-floral.jpg",
  kidsTee: "/shopper/kids-tee.jpg",
  kidsEthnic: "/shopper/kids-ethnic.jpg",
  kidsFrock: "/shopper/kids-frock.jpg",
  homeSheet: "/shopper/home-sheet.jpg",
  homeCushion: "/shopper/home-cushion.jpg",
  homeLamp: "/shopper/home-lamp.jpg",
  beautyLip: "/shopper/beauty-lip.jpg",
  beautySerum: "/shopper/beauty-serum.jpg",
  beautyKit: "/shopper/beauty-kit.jpg",
  genzCargo: "/shopper/genz-cargo.jpg",
  genzTop: "/shopper/genz-top.jpg",
  genzSneaker: "/shopper/genz-sneaker.jpg",
  studioLook: "/shopper/studio-look.jpg",
  studioDress: "/shopper/studio-dress.jpg",
  studioJewel: "/shopper/studio-jewel.jpg",
};

export const SITE_HEROES: Record<SiteCat, HeroSlide[]> = {
  WOMEN: [
    { brand: "W", title: "Summer Dresses", offer: "Up To 50% Off", image_url: IMG.womenFloral },
    { brand: "LIBAS", title: "Festive Dresses", offer: "Min 40% Off", image_url: IMG.womenDress },
    { brand: "BIBA", title: "Ethnic Edit", offer: "From ₹999", image_url: IMG.womenKurta },
  ],
  MEN: [
    { brand: "ROADSTER", title: "Casual Shirts", offer: "Up To 50% Off", image_url: IMG.menShirt },
    { brand: "U.S. POLO ASSN.", title: "Polo Edit", offer: "Min 30% Off", image_url: IMG.menPolo },
    { brand: "LEVI'S", title: "Denim Edit", offer: "New Season", image_url: IMG.menJeans },
  ],
  KIDS: [
    { brand: "H&M KIDS", title: "Play All Day", offer: "Starting ₹499", image_url: IMG.kidsTee },
    { brand: "MAX", title: "Little Classics", offer: "Up To 40% Off", image_url: IMG.kidsEthnic },
    { brand: "BABYHUG", title: "Party Ready", offer: "Min 20% Off", image_url: IMG.kidsFrock },
  ],
  HOME: [
    { brand: "SPACES", title: "Bed & Bath", offer: "From ₹299", image_url: IMG.homeSheet },
    { brand: "HOME CENTRE", title: "Soft Furnishings", offer: "Up To 60% Off", image_url: IMG.homeCushion },
    { brand: "RANDOM", title: "Living Room", offer: "New In", image_url: IMG.homeLamp },
  ],
  BEAUTY: [
    { brand: "MAYBELLINE", title: "Glow Edit", offer: "Up To 30% Off", image_url: IMG.beautyLip },
    { brand: "LAKME", title: "Skin First", offer: "From ₹199", image_url: IMG.beautySerum },
    { brand: "NYKAA", title: "Makeup Minis", offer: "Bestsellers", image_url: IMG.beautyKit },
  ],
  GENZ: [
    { brand: "SASSAFRAS", title: "Campus Fits", offer: "Flat 40% Off", image_url: IMG.genzCargo },
    { brand: "URBANIC", title: "Night Out", offer: "New Drops", image_url: IMG.genzTop },
    { brand: "PUMA", title: "Street Layer", offer: "Min 25% Off", image_url: IMG.genzSneaker },
  ],
  STUDIO: [
    { brand: "MYNTRA STUDIO", title: "Style Cast", offer: "Watch & Shop", image_url: IMG.studioLook },
    { brand: "STUDIO", title: "Creator Picks", offer: "Just In", image_url: IMG.studioDress },
    { brand: "STUDIO", title: "Trend Talk", offer: "This Week", image_url: IMG.studioJewel },
  ],
};

export const UNSAVED_CATALOG: CatalogProduct[] = [
  { productId: "prod-roadster", sku: "sku-roadster-m", brand: "Roadster", title: "Cotton Casual Shirt", price: 1299, size: "M", sizeOos: false, image_url: IMG.menShirt, category: "MEN" },
  { productId: "prod-polo", sku: "sku-polo-m", brand: "U.S. Polo Assn.", title: "Pique Polo T-Shirt", price: 1799, size: "M", sizeOos: false, image_url: IMG.menPolo, category: "MEN" },
  { productId: "prod-levis", sku: "sku-levis-m", brand: "Levi's", title: "511 Slim Jeans", price: 2999, size: "32", sizeOos: false, image_url: IMG.menJeans, category: "MEN" },
  { productId: "prod-global-desi", sku: "sku-global-s", brand: "Global Desi", title: "Printed Fit & Flare Dress", price: 2199, size: "S", sizeOos: true, image_url: IMG.womenDress, category: "WOMEN" },
  { productId: "prod-anouk-live", sku: "sku-anouk-m", brand: "Anouk", title: "Embroidered Kurta Set", price: 2499, size: "M", sizeOos: false, image_url: IMG.womenKurta, category: "WOMEN" },
  { productId: "prod-w", sku: "sku-w-m", brand: "W", title: "Floral Summer Dress", price: 1899, size: "M", sizeOos: false, image_url: IMG.womenFloral, category: "WOMEN" },
  { productId: "prod-kids-tee", sku: "sku-kids-tee", brand: "H&M Kids", title: "Graphic Print T-Shirt", price: 599, size: "7-8Y", sizeOos: false, image_url: IMG.kidsTee, category: "KIDS" },
  { productId: "prod-kids-set", sku: "sku-kids-set", brand: "Max", title: "Boys Ethnic Set", price: 899, size: "5-6Y", sizeOos: false, image_url: IMG.kidsEthnic, category: "KIDS" },
  { productId: "prod-kids-frock", sku: "sku-kids-frock", brand: "Babyhug", title: "Girls Party Frock", price: 799, size: "3-4Y", sizeOos: false, image_url: IMG.kidsFrock, category: "KIDS" },
  { productId: "prod-home-sheet", sku: "sku-home-sheet", brand: "Spaces", title: "Cotton Bed Sheet Set", price: 1299, size: "Q", sizeOos: false, image_url: IMG.homeSheet, category: "HOME" },
  { productId: "prod-home-cushion", sku: "sku-home-cushion", brand: "Home Centre", title: "Printed Cushion Cover", price: 399, size: "16", sizeOos: false, image_url: IMG.homeCushion, category: "HOME" },
  { productId: "prod-home-lamp", sku: "sku-home-lamp", brand: "Random", title: "Table Lamp", price: 1499, size: "1", sizeOos: false, image_url: IMG.homeLamp, category: "HOME" },
  { productId: "prod-beauty-lip", sku: "sku-beauty-lip", brand: "Maybelline", title: "Superstay Lipstick", price: 499, size: "5g", sizeOos: false, image_url: IMG.beautyLip, category: "BEAUTY" },
  { productId: "prod-beauty-serum", sku: "sku-beauty-serum", brand: "Lakme", title: "Vitamin C Serum", price: 699, size: "30ml", sizeOos: false, image_url: IMG.beautySerum, category: "BEAUTY" },
  { productId: "prod-beauty-kit", sku: "sku-beauty-kit", brand: "Nykaa", title: "Everyday Makeup Kit", price: 999, size: "1", sizeOos: false, image_url: IMG.beautyKit, category: "BEAUTY" },
  { productId: "prod-genz-cargo", sku: "sku-genz-cargo", brand: "Sassafras", title: "Baggy Cargo Pants", price: 1599, size: "M", sizeOos: false, image_url: IMG.genzCargo, category: "GENZ" },
  { productId: "prod-genz-top", sku: "sku-genz-top", brand: "Urbanic", title: "Mesh Party Top", price: 1299, size: "S", sizeOos: false, image_url: IMG.genzTop, category: "GENZ" },
  { productId: "prod-genz-sneaker", sku: "sku-genz-sneaker", brand: "Puma", title: "Court Sneakers", price: 2499, size: "7", sizeOos: false, image_url: IMG.genzSneaker, category: "GENZ" },
  { productId: "prod-studio-look", sku: "sku-studio-look", brand: "Myntra Studio", title: "Creator Look Book Shirt", price: 1699, size: "M", sizeOos: false, image_url: IMG.studioLook, category: "STUDIO" },
  { productId: "prod-studio-dress", sku: "sku-studio-dress", brand: "Myntra Studio", title: "On-Set Maxi Dress", price: 2299, size: "M", sizeOos: false, image_url: IMG.studioDress, category: "STUDIO" },
  { productId: "prod-studio-jewel", sku: "sku-studio-jewel", brand: "Myntra Studio", title: "Styled Drop Earrings", price: 599, size: "OS", sizeOos: false, image_url: IMG.studioJewel, category: "STUDIO" },
];

export const SEED_PREFS: NotificationPrefs = {
  priceDropAlerts: true,
  sizeRestockAlerts: true,
  occasionReminders: true,
};

const SEARCH_WORDS: Record<SiteCat, string> = {
  MEN: "men mens male shirt shirts tshirt tee jeans jean denim polo trousers linen",
  WOMEN: "women womens dress dresses kurta kurtas ethnic festive midi wrap anarkali lehenga suit gown",
  KIDS: "kids kid boys girls child baby frock tee tshirt",
  HOME: "home living decor bed sheet cushion lamp",
  BEAUTY: "beauty makeup lipstick lip serum skincare cosmetics",
  GENZ: "genz gen-z street cargo sneakers sneaker party shoes",
  STUDIO: "studio creator look earrings jewellery jewelry watch shop",
};

/** A typed word also matches these tokens on a product. */
const SEARCH_ALIASES: Record<string, string[]> = {
  saree: ["saree", "sari"],
  sari: ["saree", "sari"],
  lehenga: ["lehenga", "festive"],
  suit: ["suit", "kurta", "ethnic"],
  tshirt: ["tshirt", "tee", "shirt"],
  "t-shirt": ["tshirt", "tee", "shirt"],
  jewellery: ["jewellery", "jewelry", "earrings"],
  jewelry: ["jewellery", "jewelry", "earrings"],
  shoes: ["shoes", "sneakers", "sneaker"],
  shoe: ["shoes", "sneakers", "sneaker"],
};

const PRODUCT_SEARCH: Record<string, string> = {
  "prod-biba": "saree sari ethnic",
  "prod-anouk-live": "saree sari ethnic",
  "prod-dead": "saree sari ethnic",
  "prod-occasion": "saree sari festive ethnic",
};

export const SAVED_CATALOG: CatalogProduct[] = [
  { productId: "prod-libas", sku: LIBAS_SKU, brand: "Libas", title: "Floral Printed Wrap Midi Dress", price: 3299, size: "M", sizeOos: false, image_url: "/shopper/libas-product.png", category: "WOMEN" },
  { productId: "prod-biba", sku: BIBA_SKU, brand: "Biba", title: "Ethnic A-Line Anarkali Kurta", price: 4499, size: "S", sizeOos: true, image_url: "/shopper/biba-product.png", category: "WOMEN" },
  { productId: "prod-occasion", sku: "sku-occasion-m", brand: "Sassafras", title: "Flared Ethnic Maxi", price: 2799, size: "M", sizeOos: false, image_url: "/shopper/women-dress.jpg", category: "WOMEN" },
  { productId: "prod-occasion-2", sku: "sku-occasion-2-m", brand: "Vero Moda", title: "Pleated Party Dress", price: 2499, size: "M", sizeOos: false, image_url: "/shopper/women-floral.jpg", category: "WOMEN" },
  { productId: "prod-linen", sku: "sku-linen-m", brand: "H&M", title: "Regular Fit Linen Shirt", price: 1999, size: "M", sizeOos: false, image_url: "/shopper/linen-product.jpg", category: "MEN" },
  { productId: "prod-dead", sku: "sku-dead-s", brand: "Anouk", title: "Printed Straight Kurta", price: 1899, size: "S", sizeOos: true, image_url: "/shopper/women-kurta.jpg", category: "WOMEN" },
  { productId: "prod-levis-wish", sku: "sku-levis-wish-32", brand: "Levi's", title: "512 Slim Tapered Jeans", price: 2999, size: "32", sizeOos: false, image_url: IMG.menJeans, category: "MEN" },
  { productId: "prod-levis-tee", sku: "sku-levis-tee-m", brand: "Levi's", title: "Relaxed Fit Graphic Tee", price: 1299, size: "M", sizeOos: false, image_url: IMG.menPolo, category: "MEN" },
  { productId: "prod-levis-sneaker", sku: "sku-levis-sneaker-8", brand: "Levi's", title: "Low-Top Canvas Sneakers", price: 2499, size: "8", sizeOos: false, image_url: IMG.genzSneaker, category: "MEN" },
];

export function allCatalog(): CatalogProduct[] {
  const seen = new Set<string>();
  const rows: CatalogProduct[] = [];
  for (const row of [...SAVED_CATALOG, ...UNSAVED_CATALOG]) {
    if (seen.has(row.productId)) continue;
    seen.add(row.productId);
    rows.push(row);
  }
  return rows;
}

function searchTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

export function searchCatalog(query: string): CatalogProduct[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return allCatalog().filter((row) => {
    const bag = searchTokens(
      `${row.brand} ${row.title} ${row.category} ${SEARCH_WORDS[row.category]} ${PRODUCT_SEARCH[row.productId] ?? ""}`,
    );
    return words.every((word) => {
      const aliases = SEARCH_ALIASES[word] ?? [word];
      return aliases.some((alias) => bag.has(alias));
    });
  });
}

export const SEED_ITEMS: WishlistItem[] = [
  {
    id: LIBAS_ID,
    user_id: DEMO_USER_ID,
    productId: "prod-libas",
    sku: LIBAS_SKU,
    priceAtSave: 3299,
    currentPrice: 3299,
    selectedSize: "M",
    tag: "price_drop",
    bucketId: "summer",
    occasionDate: null,
    savedAt: "2026-08-10T10:00:00.000Z",
    status: "active",
    stockStatus: "in_stock",
    oosSince: null,
    sizeWatch: null,
    lastPriceDropAt: null,
    deadNudgeShown: false,
    catalog: {
      brand: "Libas",
      title: "Floral Printed Wrap Midi Dress",
      image_url: "/shopper/libas-product.png",
    },
  },
  {
    id: BIBA_ID,
    user_id: DEMO_USER_ID,
    productId: "prod-biba",
    sku: BIBA_SKU,
    priceAtSave: 4499,
    currentPrice: 4499,
    selectedSize: "S",
    tag: "size_wait",
    bucketId: "wedding",
    occasionDate: null,
    savedAt: "2026-08-12T10:00:00.000Z",
    status: "active",
    stockStatus: "oos",
    oosSince: "2026-08-12T10:00:00.000Z",
    sizeWatch: { size: "S", active: true },
    lastPriceDropAt: null,
    deadNudgeShown: false,
    catalog: {
      brand: "Biba",
      title: "Ethnic A-Line Anarkali Kurta",
      image_url: "/shopper/biba-product.png",
    },
  },
  {
    id: OCCASION_ID,
    user_id: DEMO_USER_ID,
    productId: "prod-occasion",
    sku: "sku-occasion-m",
    priceAtSave: 2799,
    currentPrice: 2799,
    selectedSize: "M",
    tag: "occasion",
    bucketId: "wedding",
    occasionDate: "2026-09-05T00:00:00.000Z",
    savedAt: "2026-08-15T10:00:00.000Z",
    status: "active",
    stockStatus: "in_stock",
    oosSince: null,
    sizeWatch: null,
    lastPriceDropAt: null,
    deadNudgeShown: false,
    catalog: {
      brand: "Sassafras",
      title: "Flared Ethnic Maxi",
      image_url: "/shopper/women-dress.jpg",
    },
  },
  {
    id: OCCASION_2_ID,
    user_id: DEMO_USER_ID,
    productId: "prod-occasion-2",
    sku: "sku-occasion-2-m",
    priceAtSave: 2499,
    currentPrice: 2499,
    selectedSize: "M",
    tag: "occasion",
    bucketId: "wedding",
    occasionDate: "2026-09-05T00:00:00.000Z",
    savedAt: "2026-08-16T10:00:00.000Z",
    status: "active",
    stockStatus: "in_stock",
    oosSince: null,
    sizeWatch: null,
    lastPriceDropAt: null,
    deadNudgeShown: false,
    catalog: {
      brand: "Vero Moda",
      title: "Pleated Party Dress",
      image_url: "/shopper/women-floral.jpg",
    },
  },
  {
    id: LINEN_ID,
    user_id: DEMO_USER_ID,
    productId: "prod-linen",
    sku: "sku-linen-m",
    priceAtSave: 1999,
    currentPrice: 1999,
    selectedSize: "M",
    tag: "bookmarking",
    bucketId: "office",
    occasionDate: null,
    savedAt: "2026-08-17T10:00:00.000Z",
    status: "active",
    stockStatus: "in_stock",
    oosSince: null,
    sizeWatch: null,
    lastPriceDropAt: null,
    deadNudgeShown: false,
    catalog: {
      brand: "H&M",
      title: "Regular Fit Linen Shirt",
      image_url: "/shopper/linen-product.jpg",
    },
  },
  {
    id: JEANS_ID,
    user_id: DEMO_USER_ID,
    productId: "prod-levis-wish",
    sku: "sku-levis-wish-32",
    priceAtSave: 2999,
    currentPrice: 2999,
    selectedSize: "32",
    tag: "bookmarking",
    bucketId: "office",
    occasionDate: null,
    savedAt: "2026-08-22T10:00:00.000Z",
    status: "active",
    stockStatus: "in_stock",
    oosSince: null,
    sizeWatch: null,
    lastPriceDropAt: null,
    deadNudgeShown: false,
    catalog: {
      brand: "Levi's",
      title: "512 Slim Tapered Jeans",
      image_url: "/shopper/men-jeans.jpg",
    },
  },
  {
    id: DEAD_ID,
    user_id: DEMO_USER_ID,
    productId: "prod-dead",
    sku: "sku-dead-s",
    priceAtSave: 1899,
    currentPrice: 1899,
    selectedSize: "S",
    tag: "price_drop",
    bucketId: null,
    occasionDate: null,
    savedAt: "2026-05-01T10:00:00.000Z",
    status: "active",
    stockStatus: "discontinued",
    oosSince: "2026-05-20T10:00:00.000Z",
    sizeWatch: null,
    lastPriceDropAt: null,
    deadNudgeShown: false,
    catalog: {
      brand: "Anouk",
      title: "Printed Straight Kurta",
      image_url: "/shopper/women-kurta.jpg",
    },
  },
];

export type ShopperPersona = {
  id: string;
  userId: string;
  name: string;
  first: string;
  email: string;
  age: number;
  city: string;
  blurb: string;
  phoneLine: string;
  address: string;
  defaultCat: SiteCat;
  prefs: NotificationPrefs;
  items: WishlistItem[];
};

function asUser(userId: string, base: WishlistItem, id: string, patch: Partial<WishlistItem> = {}): WishlistItem {
  return { ...structuredClone(base), user_id: userId, id, ...patch };
}

export function ensureSeedItem(store: ShopperStore, sku: string): WishlistItem {
  const existing = store.items.find((row) => row.sku === sku && row.status === "active");
  if (existing) {
    return existing;
  }
  const seed = SEED_ITEMS.find((row) => row.sku === sku);
  if (!seed) {
    throw new Error(`Unknown seed sku ${sku}`);
  }
  const item = asUser(store.userId, seed, `wish-${sku}-${store.userId}`);
  store.items.push(item);
  return item;
}

export function armBibaSizeWatch(store: ShopperStore): WishlistItem {
  const item = ensureSeedItem(store, BIBA_SKU);
  item.stockStatus = "oos";
  item.sizeWatch = { size: "S", active: true };
  return item;
}

const PRIYA_ITEMS: WishlistItem[] = [
  asUser("user-priya", SEED_ITEMS[2], "wish-priya-occasion"),
  asUser("user-priya", SEED_ITEMS[3], "wish-priya-occasion-2"),
  asUser("user-priya", SEED_ITEMS[0], "wish-priya-libas"),
];

const KABIR_ITEMS: WishlistItem[] = [
  asUser("user-kabir", SEED_ITEMS[4], "wish-kabir-linen"),
  asUser("user-kabir", SEED_ITEMS[4], "wish-kabir-cargo", {
    productId: "prod-genz-cargo",
    sku: "sku-genz-cargo",
    priceAtSave: 1599,
    currentPrice: 1599,
    tag: "bookmarking",
    bucketId: "summer",
    catalog: { brand: "Sassafras", title: "Baggy Cargo Pants", image_url: "/shopper/genz-cargo.jpg" },
  }),
  asUser("user-kabir", SEED_ITEMS[4], "wish-kabir-sneaker", {
    productId: "prod-genz-sneaker",
    sku: "sku-genz-sneaker",
    priceAtSave: 2499,
    currentPrice: 2499,
    tag: "bookmarking",
    bucketId: "summer",
    catalog: { brand: "Puma", title: "Court Sneakers", image_url: "/shopper/genz-sneaker.jpg" },
  }),
];

export const PERSONAS: ShopperPersona[] = [
  {
    id: "sujata",
    userId: DEMO_USER_ID,
    name: "Sujata Banerjee",
    first: "Sujata",
    email: "sujata@example.com",
    age: 28,
    city: "Bengaluru",
    blurb: "plans outfits, waits for sale and size",
    phoneLine: "She's on her phone",
    address: "42, Koramangala 5th Block, Bengaluru, 560095",
    defaultCat: "WOMEN",
    prefs: { ...SEED_PREFS },
    items: SEED_ITEMS,
  },
  {
    id: "priya",
    userId: "user-priya",
    name: "Priya Sharma",
    first: "Priya",
    email: "priya@example.com",
    age: 32,
    city: "Mumbai",
    blurb: "occasion-driven, a few intentional saves",
    phoneLine: "She's on her phone",
    address: "11, Bandra West, Mumbai, 400050",
    defaultCat: "WOMEN",
    prefs: { ...SEED_PREFS },
    items: PRIYA_ITEMS,
  },
  {
    id: "kabir",
    userId: "user-kabir",
    name: "Kabir Mehta",
    first: "Kabir",
    email: "kabir@example.com",
    age: 21,
    city: "Delhi",
    blurb: "impulse saves — notifications demotivate him",
    phoneLine: "He's on his phone",
    address: "7, Greater Kailash I, Delhi, 110048",
    defaultCat: "GENZ",
    prefs: { priceDropAlerts: false, sizeRestockAlerts: true, occasionReminders: false },
    items: KABIR_ITEMS,
  },
];

export class ShopperStore {
  personaId = "sujata";
  userId = DEMO_USER_ID;
  items: WishlistItem[] = [];
  inbox: InboxRow[] = [];
  prefs: NotificationPrefs = { ...SEED_PREFS };
  bagItemId: string | null = null;
  bagAddonSkus: string[] = [];
  addToCarts = 0;
  purchases: PurchaseRecord[] = [];
  priceHistory: PricePoint[] = [];
  reviews: ProductReview[] = [];
  sizingReturns: SizingReturn[] = [];

  constructor() {
    this.reset();
  }

  persona(): ShopperPersona {
    return PERSONAS.find((row) => row.id === this.personaId) ?? PERSONAS[0];
  }

  reset(personaId = "sujata") {
    const persona = PERSONAS.find((row) => row.id === personaId) ?? PERSONAS[0];
    this.personaId = persona.id;
    this.userId = persona.userId;
    this.items = structuredClone(persona.items);
    this.inbox = [];
    this.prefs = { ...persona.prefs };
    this.bagItemId = null;
    this.bagAddonSkus = [];
    this.addToCarts = 0;
    this.purchases = structuredClone(purchasesFor(persona.userId));
    this.priceHistory = structuredClone(SEED_PRICE_HISTORY);
    this.reviews = structuredClone(SEED_REVIEWS);
    this.sizingReturns = structuredClone(returnsFor(persona.userId));
  }
}
