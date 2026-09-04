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
  type ContextTag,
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
  description?: string;
};

export type ShopperOrderItem = {
  brand: string;
  title: string;
  price: number;
  image_url: string;
};

export type ShopperOrder = {
  id: string;
  placedAt: string;
  items: ShopperOrderItem[];
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
  menChinos: "/shopper/men-chinos.jpg",
  menJacket: "/shopper/men-jacket.jpg",
  womenDress: "/shopper/women-dress.jpg",
  womenKurta: "/shopper/women-kurta.jpg",
  womenFloral: "/shopper/women-floral.jpg",
  womenSaree: "/shopper/women-saree.jpg",
  womenTop: "/shopper/women-top.jpg",
  kidsTee: "/shopper/kids-tee.jpg",
  kidsEthnic: "/shopper/kids-ethnic.jpg",
  kidsFrock: "/shopper/kids-frock.jpg",
  kidsShorts: "/shopper/kids-shorts.jpg",
  kidsHoodie: "/shopper/kids-hoodie.jpg",
  homeSheet: "/shopper/home-sheet.jpg",
  homeCushion: "/shopper/home-cushion.jpg",
  homeLamp: "/shopper/home-lamp.jpg",
  homeCurtain: "/shopper/home-curtain.jpg",
  homeDinner: "/shopper/home-dinner.jpg",
  beautyLip: "/shopper/beauty-lip.jpg",
  beautySerum: "/shopper/beauty-serum.jpg",
  beautyKit: "/shopper/beauty-kit.jpg",
  beautyPalette: "/shopper/beauty-palette.jpg",
  beautyCream: "/shopper/beauty-cream.jpg",
  genzCargo: "/shopper/genz-cargo.jpg",
  genzTop: "/shopper/genz-top.jpg",
  genzSneaker: "/shopper/genz-sneaker.jpg",
  genzHoodie: "/shopper/genz-hoodie.jpg",
  genzSkirt: "/shopper/genz-skirt.jpg",
  studioLook: "/shopper/studio-look.jpg",
  studioDress: "/shopper/studio-dress.png",
  studioJewel: "/shopper/studio-jewel.jpg",
  studioBlazer: "/shopper/studio-blazer.jpg",
  studioBag: "/shopper/studio-bag.jpg",
  menBlackSuit: "/shopper/pics/men-black-suit.jpg",
  menBlueSherwani: "/shopper/pics/men-blue-sherwani.jpg",
  menTanJacket: "/shopper/pics/men-tan-jacket.jpg",
  menNavySuit: "/shopper/pics/men-navy-suit.jpg",
  menWhiteShirt: "/shopper/pics/men-white-shirt.jpg",
  menBlackTee: "/shopper/pics/men-black-tee.jpg",
  menLightJeans: "/shopper/pics/men-light-jeans.jpg",
  menWhiteTee: "/shopper/pics/men-white-tee.jpg",
  menChicagoTee: "/shopper/pics/men-chicago-tee.jpg",
  menMintKurta: "/shopper/pics/men-mint-kurta.jpg",
  menWhiteKurta: "/shopper/pics/men-white-kurta.jpg",
  menBlueKurta: "/shopper/pics/men-blue-kurta.jpg",
  menDenimJacket: "/shopper/pics/men-denim-jacket.jpg",
  womenMustardSaree: "/shopper/pics/women-mustard-saree.jpg",
  womenPolkaShirt: "/shopper/pics/women-polka-shirt.jpg",
  womenNavySaree: "/shopper/pics/women-navy-saree.jpg",
  womenEmeraldSaree: "/shopper/pics/women-emerald-saree.jpg",
  womenOliveMaxi: "/shopper/pics/women-olive-maxi.jpg",
  womenPinkShirt: "/shopper/pics/women-pink-shirt.jpg",
  womenBlueKurta: "/shopper/pics/women-blue-kurta.jpg",
  womenPinkAnarkali: "/shopper/pics/women-pink-anarkali.jpg",
  womenBlackKurta: "/shopper/pics/women-black-kurta.jpg",
  kidsTropicalSet: "/shopper/pics/kids-tropical-set.jpg",
  kidsBabySocks: "/shopper/pics/kids-baby-socks.jpg",
  kidsPlaidShirt: "/shopper/pics/kids-plaid-shirt.jpg",
  kidsInfantSet: "/shopper/pics/kids-infant-set.jpg",
  kidsFloralBooties: "/shopper/pics/kids-floral-booties.jpg",
  kidsWaistcoat: "/shopper/pics/kids-waistcoat.jpg",
  shoesChunky: "/shopper/pics/shoes-chunky.jpg",
  shoesGlitch: "/shopper/pics/shoes-glitch.jpg",
  shoesRedCanvas: "/shopper/pics/shoes-red-canvas.jpg",
  shoesLining: "/shopper/pics/shoes-lining-white.jpg",
};

export const SITE_HEROES: Record<SiteCat, HeroSlide[]> = {
  WOMEN: [
    { brand: "W", title: "Summer Dresses", offer: "Up To 50% Off", image_url: IMG.womenFloral },
    { brand: "LIBAS", title: "Festive Dresses", offer: "Min 40% Off", image_url: IMG.womenDress },
    { brand: "BIBA", title: "Ethnic Edit", offer: "From ₹999", image_url: "/shopper/biba-product.png" },
    { brand: "KALINI", title: "Silk Sarees", offer: "New In", image_url: IMG.womenSaree },
    { brand: "MITERA", title: "Festive Sarees", offer: "From ₹3499", image_url: IMG.womenMustardSaree },
    { brand: "VERO MODA", title: "Evening Maxi", offer: "Just In", image_url: IMG.womenOliveMaxi },
  ],
  MEN: [
    { brand: "ROADSTER", title: "Casual Shirts", offer: "Up To 50% Off", image_url: IMG.menShirt },
    { brand: "U.S. POLO ASSN.", title: "Polo Edit", offer: "Min 30% Off", image_url: IMG.menPolo },
    { brand: "LEVI'S", title: "Denim Edit", offer: "New Season", image_url: IMG.menJeans },
    { brand: "WROGN", title: "Smart Casuals", offer: "From ₹1299", image_url: IMG.menChinos },
    { brand: "RAYMOND", title: "Suit Edit", offer: "From ₹7499", image_url: IMG.menNavySuit },
    { brand: "MANYAVAR", title: "Wedding Sherwani", offer: "Festive In", image_url: IMG.menBlueSherwani },
  ],
  KIDS: [
    { brand: "MOTHERCARE", title: "Baby Tees", offer: "Starting ₹499", image_url: IMG.kidsHoodie },
    { brand: "GINI & JONY", title: "Shorts Sets", offer: "Min 20% Off", image_url: IMG.kidsTropicalSet },
    { brand: "HOPSCOTCH", title: "Little Festive", offer: "From ₹499", image_url: IMG.kidsInfantSet },
    { brand: "MAX", title: "Party Sets", offer: "Up To 40% Off", image_url: IMG.kidsWaistcoat },
    { brand: "H&M KIDS", title: "Check Shirts", offer: "New In", image_url: IMG.kidsPlaidShirt },
    { brand: "BABYHUG", title: "Soft Booties", offer: "From ₹399", image_url: IMG.kidsFloralBooties },
  ],
  HOME: [
    { brand: "GOOD HOMES", title: "Living Room", offer: "New In", image_url: IMG.homeDinner },
    { brand: "D'DECOR", title: "Bed Edit", offer: "From ₹799", image_url: IMG.homeCurtain },
    { brand: "RANDOM", title: "Lighting", offer: "From ₹299", image_url: IMG.homeLamp },
  ],
  BEAUTY: [
    { brand: "MAYBELLINE", title: "Glow Edit", offer: "Up To 30% Off", image_url: IMG.beautyLip },
    { brand: "LAKME", title: "Skin First", offer: "From ₹199", image_url: IMG.beautySerum },
    { brand: "NYKAA", title: "Makeup Minis", offer: "Bestsellers", image_url: IMG.beautyKit },
    { brand: "SUGAR", title: "Eye Palettes", offer: "New Shades", image_url: IMG.beautyPalette },
  ],
  GENZ: [
    { brand: "SASSAFRAS", title: "Campus Fits", offer: "Flat 40% Off", image_url: IMG.genzCargo },
    { brand: "URBANIC", title: "Night Out", offer: "New Drops", image_url: IMG.genzTop },
    { brand: "PUMA", title: "Street Layer", offer: "Min 25% Off", image_url: IMG.genzSneaker },
    { brand: "H&M", title: "Hoodie Drop", offer: "Just In", image_url: IMG.genzHoodie },
    { brand: "PUMA", title: "Chunky Sneakers", offer: "Street Drop", image_url: IMG.shoesChunky },
  ],
  STUDIO: [
    { brand: "MYNTRA STUDIO", title: "Style Cast", offer: "Watch & Shop", image_url: IMG.studioLook },
    { brand: "STUDIO", title: "Creator Picks", offer: "Just In", image_url: IMG.studioDress },
    { brand: "STUDIO", title: "Trend Talk", offer: "This Week", image_url: IMG.studioJewel },
    { brand: "STUDIO", title: "Blazer Edit", offer: "On Set", image_url: IMG.studioBlazer },
  ],
};

export const UNSAVED_CATALOG: CatalogProduct[] = [
  { productId: "prod-roadster", sku: "sku-roadster-m", brand: "Roadster", title: "Cotton Casual Shirt", price: 1299, size: "M", sizeOos: false, image_url: IMG.menShirt, category: "MEN" },
  { productId: "prod-polo", sku: "sku-polo-m", brand: "U.S. Polo Assn.", title: "Pique Polo T-Shirt", price: 1799, size: "M", sizeOos: false, image_url: IMG.menPolo, category: "MEN" },
  { productId: "prod-levis", sku: "sku-levis-m", brand: "Levi's", title: "511 Slim Jeans", price: 2999, size: "32", sizeOos: false, image_url: IMG.menJeans, category: "MEN" },
  { productId: "prod-chinos", sku: "sku-chinos-32", brand: "WROGN", title: "Slim Fit Chinos", price: 1699, size: "32", sizeOos: false, image_url: IMG.menChinos, category: "MEN", description: "Dark slim trousers, five-pocket, clean wash. Easy with a linen shirt or a white tee." },
  { productId: "prod-jacket", sku: "sku-jacket-m", brand: "HRX", title: "Olive Bomber Jacket", price: 2499, size: "M", sizeOos: false, image_url: IMG.menJacket, category: "MEN" },
  { productId: "prod-global-desi", sku: "sku-global-s", brand: "Global Desi", title: "Printed Fit & Flare Dress", price: 2199, size: "S", sizeOos: true, image_url: IMG.womenDress, category: "WOMEN" },
  { productId: "prod-w", sku: "sku-w-m", brand: "W", title: "Floral Summer Dress", price: 1899, size: "M", sizeOos: false, image_url: IMG.womenFloral, category: "WOMEN" },
  { productId: "prod-saree", sku: "sku-saree-os", brand: "Kalini", title: "Woven Silk Saree", price: 3499, size: "OS", sizeOos: false, image_url: IMG.womenSaree, category: "WOMEN" },
  { productId: "prod-kids-shorts", sku: "sku-kids-shorts", brand: "Gini & Jony", title: "Printed Shorts Set", price: 699, size: "7-8Y", sizeOos: false, image_url: IMG.kidsTropicalSet, category: "KIDS", description: "Short-sleeve shirt and matching shorts in an earthy botanical print. Soft cotton for vacation days." },
  { productId: "prod-kids-hoodie", sku: "sku-kids-hoodie", brand: "Mothercare", title: "Cotton Baby Tee Set", price: 999, size: "6-12M", sizeOos: false, image_url: IMG.kidsHoodie, category: "KIDS", description: "Plain cotton baby tee styled with a knit beanie, bear socks, and a wooden toy camera." },
  { productId: "prod-home-lamp", sku: "sku-home-lamp", brand: "Random", title: "Table Lamp", price: 1499, size: "1", sizeOos: false, image_url: IMG.homeLamp, category: "HOME" },
  { productId: "prod-home-curtain", sku: "sku-home-curtain", brand: "D'Decor", title: "Tufted Silver Bedding Set", price: 1899, size: "Q", sizeOos: false, image_url: IMG.homeCurtain, category: "HOME", description: "Silver quilted comforter on a cream tufted bed, layered with grey-lavender pillows and a matching bench." },
  { productId: "prod-home-dinner", sku: "sku-home-dinner", brand: "Good Homes", title: "Ochre Lounge Chair", price: 1599, size: "1", sizeOos: false, image_url: IMG.homeDinner, category: "HOME", description: "Mid-century lounge chair in ochre upholstery with tapered legs. Styled with a brass floor lamp and marble side table." },
  { productId: "prod-beauty-lip", sku: "sku-beauty-lip", brand: "Maybelline", title: "Superstay Lipstick", price: 499, size: "5g", sizeOos: false, image_url: IMG.beautyLip, category: "BEAUTY" },
  { productId: "prod-beauty-serum", sku: "sku-beauty-serum", brand: "Lakme", title: "Vitamin C Serum", price: 699, size: "30ml", sizeOos: false, image_url: IMG.beautySerum, category: "BEAUTY" },
  { productId: "prod-beauty-kit", sku: "sku-beauty-kit", brand: "Nykaa", title: "Everyday Makeup Kit", price: 999, size: "1", sizeOos: false, image_url: IMG.beautyKit, category: "BEAUTY" },
  { productId: "prod-beauty-palette", sku: "sku-beauty-palette", brand: "Sugar", title: "Nude Eye Palette", price: 899, size: "12g", sizeOos: false, image_url: IMG.beautyPalette, category: "BEAUTY" },
  { productId: "prod-beauty-cream", sku: "sku-beauty-cream", brand: "The Face Shop", title: "Rice Water Cream", price: 799, size: "50ml", sizeOos: false, image_url: IMG.beautyCream, category: "BEAUTY" },
  { productId: "prod-genz-cargo", sku: "sku-genz-cargo", brand: "Sassafras", title: "Baggy Cargo Pants", price: 1599, size: "M", sizeOos: false, image_url: IMG.genzCargo, category: "GENZ" },
  { productId: "prod-genz-top", sku: "sku-genz-top", brand: "Urbanic", title: "Mesh Party Top", price: 1299, size: "S", sizeOos: false, image_url: IMG.genzTop, category: "GENZ" },
  { productId: "prod-genz-sneaker", sku: "sku-genz-sneaker", brand: "Puma", title: "Court Sneakers", price: 2499, size: "7", sizeOos: false, image_url: IMG.genzSneaker, category: "GENZ" },
  { productId: "prod-genz-hoodie", sku: "sku-genz-hoodie", brand: "H&M", title: "Oversized Graphic Hoodie", price: 1499, size: "M", sizeOos: false, image_url: IMG.genzHoodie, category: "GENZ" },
  { productId: "prod-genz-skirt", sku: "sku-genz-skirt", brand: "Only", title: "Dark Wash Slim Jeans", price: 1199, size: "28", sizeOos: false, image_url: IMG.genzSkirt, category: "GENZ", description: "Dark indigo slim jeans with a clean five-pocket finish. Street staple for tees and oversized shirts." },
  { productId: "prod-studio-look", sku: "sku-studio-look", brand: "Myntra Studio", title: "Creator Look Book Shirt", price: 1699, size: "M", sizeOos: false, image_url: IMG.studioLook, category: "STUDIO" },
  { productId: "prod-studio-dress", sku: "sku-studio-dress", brand: "Myntra Studio", title: "On-Set Maxi Dress", price: 2299, size: "M", sizeOos: false, image_url: IMG.studioDress, category: "STUDIO" },
  { productId: "prod-studio-jewel", sku: "sku-studio-jewel", brand: "Myntra Studio", title: "Styled Drop Earrings", price: 599, size: "OS", sizeOos: false, image_url: IMG.studioJewel, category: "STUDIO" },
  { productId: "prod-studio-blazer", sku: "sku-studio-blazer", brand: "Myntra Studio", title: "Oversized Camel Blazer", price: 2799, size: "M", sizeOos: false, image_url: IMG.studioBlazer, category: "STUDIO" },
  { productId: "prod-studio-bag", sku: "sku-studio-bag", brand: "Myntra Studio", title: "Structured Studio Bag", price: 1899, size: "OS", sizeOos: false, image_url: IMG.studioBag, category: "STUDIO" },
  { productId: "prod-pic-black-suit", sku: "sku-pic-black-suit", brand: "Louis Philippe", title: "Midnight Slim-Fit Black Suit", price: 7499, size: "M", sizeOos: false, image_url: IMG.menBlackSuit, category: "MEN", description: "All-black slim-fit two-piece with notch lapels, a white pocket square, and tapered trousers. Sharp for evenings and boardrooms." },
  { productId: "prod-pic-sherwani", sku: "sku-pic-sherwani", brand: "Manyavar", title: "Royal Blue Zardosi Sherwani", price: 8999, size: "M", sizeOos: false, image_url: IMG.menBlueSherwani, category: "MEN", description: "Textured silk-blend sherwani with a mandarin collar, gold zardosi on the neck and cuffs, and ornate buttons for wedding nights." },
  { productId: "prod-pic-tan-jacket", sku: "sku-pic-tan-jacket", brand: "The Indian Garage Co", title: "Tan Faux-Suede Shirt Jacket", price: 2499, size: "M", sizeOos: false, image_url: IMG.menTanJacket, category: "MEN", description: "Soft faux-suede overshirt in camel, with a clean collar and button front. Layers easily over a dark shirt and denim." },
  { productId: "prod-pic-navy-suit", sku: "sku-pic-navy-suit", brand: "Raymond", title: "Navy Slim-Fit Formal Suit", price: 9999, size: "M", sizeOos: false, image_url: IMG.menNavySuit, category: "MEN", description: "Navy two-piece with notched lapels and a red pocket square. Pair with brown leather for weddings or client dinners." },
  { productId: "prod-pic-white-shirt", sku: "sku-pic-white-shirt", brand: "Van Heusen", title: "White Slim-Fit Dress Shirt", price: 1499, size: "M", sizeOos: false, image_url: IMG.menWhiteShirt, category: "MEN", description: "Crisp cotton dress shirt with a pointed collar. Roll the sleeves and add suspenders for a sharper evening look." },
  { productId: "prod-pic-black-tee", sku: "sku-pic-black-tee", brand: "H&M", title: "Contrast-Stitch Oversized Tee", price: 999, size: "M", sizeOos: false, image_url: IMG.menBlackTee, category: "MEN", description: "Drop-shoulder black jersey with white contrast stitching at the neck and sleeves. Everyday street staple." },
  { productId: "prod-pic-light-jeans", sku: "sku-pic-light-jeans", brand: "Levi's", title: "Light Wash Straight Jeans", price: 2899, size: "32", sizeOos: false, image_url: IMG.menLightJeans, category: "MEN", description: "Clean light-wash straight denim. Five-pocket, no heavy fade — easy with a white tee and slides." },
  { productId: "prod-pic-white-tee", sku: "sku-pic-white-tee", brand: "Roadster", title: "Classic White Crew Tee", price: 799, size: "M", sizeOos: false, image_url: IMG.menWhiteTee, category: "MEN", description: "Plain white cotton crew. Regular fit, everyday weight — the tee you wear under a jacket or on its own." },
  { productId: "prod-pic-chicago-tee", sku: "sku-pic-chicago-tee", brand: "Jack & Jones", title: "Chicago Graphic Oversized Tee", price: 1299, size: "M", sizeOos: false, image_url: IMG.menChicagoTee, category: "MEN", description: "Oversized black tee with a Chicago city graphic. Layer over a white shirt for a campus street look." },
  { productId: "prod-pic-mint-kurta", sku: "sku-pic-mint-kurta", brand: "House of Pataudi", title: "Mint Mirror-Work Kurta", price: 2799, size: "M", sizeOos: false, image_url: IMG.menMintKurta, category: "MEN", description: "Sage cotton-blend kurta with white schiffli and mirror work on the front. Mandarin collar, festive without being heavy." },
  { productId: "prod-pic-white-kurta", sku: "sku-pic-white-kurta", brand: "Anouk", title: "White Cotton Kurta Set", price: 2199, size: "M", sizeOos: false, image_url: IMG.menWhiteKurta, category: "MEN", description: "Straight white kurta and pajama in light cotton. Clean mandarin collar — Eid, puja, or a summer wedding." },
  { productId: "prod-pic-blue-kurta", sku: "sku-pic-blue-kurta", brand: "Manyavar", title: "Royal Blue Silk-Blend Kurta Set", price: 2999, size: "M", sizeOos: false, image_url: IMG.menBlueKurta, category: "MEN", description: "Knee-length royal blue kurta with tonal embroidery on the placket, matching pajamas, and a slight silk sheen." },
  { productId: "prod-pic-denim-jacket", sku: "sku-pic-denim-jacket", brand: "Roadster", title: "Light Wash Denim Trucker Jacket", price: 2499, size: "M", sizeOos: false, image_url: IMG.menDenimJacket, category: "MEN", description: "Classic trucker with chest flaps in a light wash. Wear it denim-on-denim or over a shirt and tie." },
  { productId: "prod-pic-red-canvas", sku: "sku-pic-red-canvas", brand: "Roadster", title: "Crimson Low-Top Canvas Sneakers", price: 1299, size: "8", sizeOos: false, image_url: IMG.shoesRedCanvas, category: "MEN", description: "Red canvas low-tops with a white rubber cap and midsole. Everyday colour for jeans and chinos." },
  { productId: "prod-pic-lining", sku: "sku-pic-lining", brand: "Li-Ning", title: "White Bronze Lifestyle Sneakers", price: 3499, size: "8", sizeOos: false, image_url: IMG.shoesLining, category: "MEN", description: "White pebbled upper with bronze side branding and a dark collar. Cushioned lifestyle trainer for city days." },
  { productId: "prod-pic-mustard-saree", sku: "sku-pic-mustard-saree", brand: "Mitera", title: "Mustard Paithani Silk Saree", price: 3499, size: "OS", sizeOos: false, image_url: IMG.womenMustardSaree, category: "WOMEN", description: "Mustard silk-blend saree with a wide red-gold zari border and scattered buttas. Festive drape with an unstitched blouse." },
  { productId: "prod-pic-polka-shirt", sku: "sku-pic-polka-shirt", brand: "DressBerry", title: "Black Micro-Polka Shirt", price: 1299, size: "M", sizeOos: false, image_url: IMG.womenPolkaShirt, category: "WOMEN", description: "Black regular-fit shirt in a dense white micro-dot. Pointed collar, long sleeves — office to dinner." },
  { productId: "prod-pic-navy-saree", sku: "sku-pic-navy-saree", brand: "Kalini", title: "Navy Silver Zari Saree", price: 4499, size: "OS", sizeOos: false, image_url: IMG.womenNavySaree, category: "WOMEN", description: "Navy woven saree with silver-gold florals and a dense metallic border, finished with a pink-yellow stripe." },
  { productId: "prod-pic-emerald-saree", sku: "sku-pic-emerald-saree", brand: "Soch", title: "Emerald Bandhani Silk Saree", price: 3999, size: "OS", sizeOos: false, image_url: IMG.womenEmeraldSaree, category: "WOMEN", description: "Emerald silk with gold foil buttas and a gold zari border. Orange-red bandhani pallu for wedding evenings." },
  { productId: "prod-pic-olive-maxi", sku: "sku-pic-olive-maxi", brand: "Vero Moda", title: "Olive Ruched Satin Maxi", price: 4999, size: "M", sizeOos: false, image_url: IMG.womenOliveMaxi, category: "WOMEN", description: "Olive satin maxi with a ruched sweetheart neck and marbled straps. Shawl included for garden weddings." },
  { productId: "prod-pic-pink-shirt", sku: "sku-pic-pink-shirt", brand: "StyleCast", title: "Blush Utility Shirt", price: 1199, size: "M", sizeOos: false, image_url: IMG.womenPinkShirt, category: "WOMEN", description: "Pastel pink cotton utility shirt with dual chest flaps. Tuck into a white midi for a clean daytime look." },
  { productId: "prod-pic-baby-socks", sku: "sku-pic-baby-socks", brand: "Mothercare", title: "Baby Socks Pack of 5", price: 399, size: "0-6M", sizeOos: false, image_url: IMG.kidsBabySocks, category: "KIDS", description: "Five-pair cotton pack: florals, stripes, and a solid. Gentle cuffs that stay on newborn feet." },
  { productId: "prod-pic-plaid-shirt", sku: "sku-pic-plaid-shirt", brand: "H&M Kids", title: "Boys Red Check Shirt", price: 899, size: "4-5Y", sizeOos: false, image_url: IMG.kidsPlaidShirt, category: "KIDS", description: "Red-white-blue check shirt with a chest pocket. Roll the sleeves for school photos or weekends." },
  { productId: "prod-pic-infant-set", sku: "sku-pic-infant-set", brand: "Hopscotch", title: "Infant Floral Vest Set", price: 1099, size: "6-12M", sizeOos: false, image_url: IMG.kidsInfantSet, category: "KIDS", description: "Shimmer tee, floral waistcoat, and coral trousers with a knitted beanie. Festive set for family functions." },
  { productId: "prod-pic-booties", sku: "sku-pic-booties", brand: "Babyhug", title: "Teal Floral Soft Booties", price: 499, size: "0-12M", sizeOos: false, image_url: IMG.kidsFloralBooties, category: "KIDS", description: "Aqua floral pre-walkers with a soft white sole and elastic laces. Gentle on pre-walker feet." },
  { productId: "prod-pic-waistcoat", sku: "sku-pic-waistcoat", brand: "Max", title: "Boys Check Waistcoat Set", price: 2499, size: "3-4Y", sizeOos: false, image_url: IMG.kidsWaistcoat, category: "KIDS", description: "Brown windowpane waistcoat, white shirt, trousers, and tie. Little-gentleman set for weddings." },
  { productId: "prod-pic-chunky", sku: "sku-pic-chunky", brand: "Puma", title: "Multi-Color Chunky Sneakers", price: 3499, size: "8", sizeOos: false, image_url: IMG.shoesChunky, category: "GENZ", description: "Chunky lifestyle sneaker in cream, teal, orange, and burgundy with red laces. Street drop energy." },
  { productId: "prod-pic-glitch", sku: "sku-pic-glitch", brand: "HRX", title: "Black Glitch-Sole Sneakers", price: 2999, size: "8", sizeOos: false, image_url: IMG.shoesGlitch, category: "GENZ", description: "Black canvas low-top with a layered cream-and-black midsole. Architectural street shoe." },
];

export const SEED_PREFS: NotificationPrefs = {
  priceDropAlerts: true,
  sizeRestockAlerts: true,
  occasionReminders: true,
};

const SEARCH_WORDS: Record<SiteCat, string> = {
  MEN: "men mens male",
  WOMEN: "women womens female",
  KIDS: "kids kid boys girls child baby infant",
  HOME: "home living decor",
  BEAUTY: "beauty makeup skincare cosmetics",
  GENZ: "genz gen-z street",
  STUDIO: "studio creator",
};

/** A typed word also matches these tokens on a product. */
const SEARCH_ALIASES: Record<string, string[]> = {
  saree: ["saree", "sari"],
  sari: ["saree", "sari"],
  sarees: ["saree", "sari"],
  lehenga: ["lehenga", "festive"],
  suit: ["suit", "kurta", "sherwani"],
  suits: ["suit", "kurta", "sherwani"],
  kurta: ["kurta", "kurtas", "anarkali"],
  kurtas: ["kurta", "kurtas", "anarkali"],
  dress: ["dress", "dresses", "maxi", "midi", "gown"],
  dresses: ["dress", "dresses", "maxi", "midi", "gown"],
  shirt: ["shirt", "shirts"],
  shirts: ["shirt", "shirts"],
  jeans: ["jeans", "jean", "denim"],
  jean: ["jeans", "jean", "denim"],
  denim: ["jeans", "jean", "denim"],
  tshirt: ["tshirt", "tee", "shirt"],
  "t-shirt": ["tshirt", "tee", "shirt"],
  jewellery: ["jewellery", "jewelry", "earrings"],
  jewelry: ["jewellery", "jewelry", "earrings"],
  shoes: ["shoes", "sneakers", "sneaker"],
  shoe: ["shoes", "sneakers", "sneaker"],
  sneakers: ["shoes", "sneakers", "sneaker"],
};

const PRODUCT_SEARCH: Record<string, string> = {
  "prod-biba": "kurta anarkali ethnic festive",
  "prod-anouk-live": "kurta anarkali ethnic festive",
  "prod-dead": "saree sari ethnic festive",
  "prod-occasion": "maxi dress festive ethnic",
  "prod-saree": "saree sari ethnic festive",
};

export const SAVED_CATALOG: CatalogProduct[] = [
  { productId: "prod-anouk-live", sku: "sku-anouk-m", brand: "Anouk", title: "Embroidered Kurta Set", price: 2499, size: "M", sizeOos: false, image_url: "/shopper/biba-product.png", category: "WOMEN" },
  { productId: "prod-libas", sku: LIBAS_SKU, brand: "Libas", title: "Floral Printed Wrap Midi Dress", price: 3299, size: "M", sizeOos: false, image_url: "/shopper/libas-product.png", category: "WOMEN", description: "Floral wrap midi in printed viscose. Soft drape; the wrap holds if you double-knot it." },
  { productId: "prod-biba", sku: BIBA_SKU, brand: "Biba", title: "Ethnic A-Line Anarkali Kurta", price: 4499, size: "S", sizeOos: true, image_url: "/shopper/biba-product.png", category: "WOMEN", description: "Anarkali kurta with a flared skirt. Heavier festive fabric — sits structured through a ceremony." },
  { productId: "prod-occasion", sku: "sku-occasion-m", brand: "Sassafras", title: "Flared Ethnic Maxi", price: 2799, size: "M", sizeOos: false, image_url: IMG.studioDress, category: "WOMEN", description: "Flared ethnic maxi with a gathered waist. Airy cotton-blend, easy for a ceremony." },
  { productId: "prod-occasion-2", sku: "sku-occasion-2-m", brand: "Vero Moda", title: "Pleated Party Dress", price: 2499, size: "M", sizeOos: false, image_url: "/shopper/women-floral.jpg", category: "WOMEN", description: "Pleated party dress in a crepe finish. Sharp folds, sits close without feeling stiff." },
  { productId: "prod-linen", sku: "sku-linen-m", brand: "H&M", title: "Regular Fit Linen Shirt", price: 1999, size: "M", sizeOos: false, image_url: "/shopper/linen-product.jpg", category: "MEN", description: "Regular-fit linen shirt in a speckled mid-blue. Breathable weave, full placket, easy with jeans or chinos." },
  { productId: "prod-dead", sku: "sku-dead-s", brand: "Anouk", title: "Zari Border Silk Saree", price: 1899, size: "OS", sizeOos: true, image_url: "/shopper/women-kurta.jpg", category: "WOMEN", description: "Plum silk-blend saree with a wide gold zari border and a magenta piping. Draped with a black velvet blouse." },
  { productId: "prod-levis-wish", sku: "sku-levis-wish-32", brand: "Levi's", title: "512 Slim Tapered Jeans", price: 2999, size: "32", sizeOos: false, image_url: IMG.menJeans, category: "MEN" },
  { productId: "prod-levis-tee", sku: "sku-levis-tee-m", brand: "Levi's", title: "Relaxed Fit Graphic Tee", price: 1299, size: "M", sizeOos: false, image_url: IMG.menPolo, category: "MEN" },
  { productId: "prod-kurta-cmp-1", sku: "sku-kurta-cmp-1", brand: "Global Desi", title: "Cotton Straight Kurta", price: 1599, size: "M", sizeOos: false, image_url: IMG.womenBlueKurta, category: "WOMEN", description: "Sky-blue cotton kurta with a yellow floral print, mandarin collar, and mid-calf length. Pair with white palazzos." },
  { productId: "prod-kurta-cmp-2", sku: "sku-kurta-cmp-2", brand: "Indya", title: "Embroidered Festive Kurta", price: 2199, size: "M", sizeOos: false, image_url: IMG.womenPinkAnarkali, category: "WOMEN", description: "Pale-pink flared Anarkali with floral print, a fuchsia dupatta, and matching palazzos. Festive set for functions." },
  { productId: "prod-kurta-cmp-3", sku: "sku-kurta-cmp-3", brand: "Aurelia", title: "Yoke Printed Kurta", price: 1299, size: "M", sizeOos: false, image_url: IMG.womenBlackKurta, category: "WOMEN", description: "Black short kurta with a gold botanical print, V-neck, and three-quarter sleeves. Everyday with jeans." },
  { productId: "prod-dress-cmp-1", sku: "sku-dress-cmp-1", brand: "AND", title: "Ruffled Off-Shoulder Mini Dress", price: 2099, size: "M", sizeOos: false, image_url: IMG.womenTop, category: "WOMEN", description: "White off-shoulder mini with a ruffled bust and eyelet tiers. Weekend dress with sneakers." },
  { productId: "prod-dress-cmp-2", sku: "sku-dress-cmp-2", brand: "Tokyo Talkies", title: "Dark Wash Slim Jeans", price: 1699, size: "28", sizeOos: false, image_url: IMG.genzSkirt, category: "WOMEN", description: "Dark indigo slim jeans, five-pocket, clean wash. Everyday denim with a straight fall from hip to hem." },
  { productId: "prod-shirt-cmp-1", sku: "sku-shirt-cmp-1", brand: "HERE&NOW", title: "Oxford Casual Shirt", price: 1199, size: "M", sizeOos: false, image_url: IMG.menShirt, category: "MEN" },
  { productId: "prod-shirt-cmp-2", sku: "sku-shirt-cmp-2", brand: "WROGN", title: "Pique Casual Shirt", price: 1399, size: "M", sizeOos: false, image_url: IMG.menPolo, category: "MEN" },
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

export function ordersFromPurchases(purchases: PurchaseRecord[]): ShopperOrder[] {
  const catalog = allCatalog();
  return [...purchases]
    .sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt))
    .map((row) => ({
      id: row.id.replace(/^po-/, "MYN-").toUpperCase(),
      placedAt: row.purchasedAt,
      items: [
        {
          brand: row.brand,
          title: row.title,
          price: row.price,
          image_url: catalog.find((product) => product.productId === row.productId)?.image_url ?? "",
        },
      ],
    }));
}

function searchTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

export function searchCatalog(query: string, category?: SiteCat): CatalogProduct[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return allCatalog().filter((row) => {
    if (category && row.category !== category) return false;
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
    tag: "compare",
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
    occasionDate: "2026-09-15T00:00:00.000Z",
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
      image_url: "/shopper/studio-dress.png",
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
    bucketId: "summer",
    occasionDate: "2026-09-20T00:00:00.000Z",
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
    tag: "compare",
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
    tag: "compare",
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
    tag: null,
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
      title: "Zari Border Silk Saree",
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

/** Extra home-rail saves — every site category, never Bookmark. */
const HOME_RAIL_MIX: Array<{ sku: string; tag: Exclude<ContextTag, "bookmarking" | "price_drop">; sizeOos?: boolean }> = [
  { sku: "sku-chinos-32", tag: "quality_trust" },
  { sku: "sku-jacket-m", tag: "size_wait" },
  { sku: "sku-saree-os", tag: "quality_trust" },
  { sku: "sku-kids-hoodie", tag: "compare" },
  { sku: "sku-kids-shorts", tag: "quality_trust" },
  { sku: "sku-home-curtain", tag: "quality_trust" },
  { sku: "sku-home-dinner", tag: "compare" },
  { sku: "sku-beauty-palette", tag: "quality_trust" },
  { sku: "sku-beauty-cream", tag: "compare" },
  { sku: "sku-genz-hoodie", tag: "compare" },
  { sku: "sku-studio-blazer", tag: "quality_trust" },
];

function itemFromCatalog(
  userId: string,
  id: string,
  spec: (typeof HOME_RAIL_MIX)[number],
  savedAt: string,
): WishlistItem {
  const product = [...SAVED_CATALOG, ...UNSAVED_CATALOG].find((row) => row.sku === spec.sku);
  if (!product) {
    throw new Error(`Unknown mix sku ${spec.sku}`);
  }
  const oos = Boolean(spec.sizeOos || product.sizeOos);
  return {
    id,
    user_id: userId,
    productId: product.productId,
    sku: product.sku,
    priceAtSave: product.price,
    currentPrice: product.price,
    selectedSize: product.size,
    tag: spec.tag,
    bucketId: spec.tag === "size_wait" ? "wedding" : "summer",
    occasionDate: null,
    savedAt,
    status: "active",
    stockStatus: oos ? "oos" : "in_stock",
    oosSince: oos ? savedAt : null,
    sizeWatch: oos ? { size: product.size, active: true } : null,
    lastPriceDropAt: null,
    deadNudgeShown: false,
    catalog: { brand: product.brand, title: product.title, image_url: product.image_url },
  };
}

function categoryMixFor(userId: string, idPrefix: string, existing: WishlistItem[]): WishlistItem[] {
  const taken = new Set(existing.map((row) => row.productId));
  const rows: WishlistItem[] = [];
  let i = 0;
  for (const spec of HOME_RAIL_MIX) {
    const product = UNSAVED_CATALOG.find((row) => row.sku === spec.sku);
    if (!product || taken.has(product.productId)) continue;
    i += 1;
    rows.push(itemFromCatalog(userId, `${idPrefix}-mix-${i}`, spec, `2026-07-${String(i).padStart(2, "0")}T10:00:00.000Z`));
  }
  return rows;
}

/** One discontinued save per shopper category — fills No longer available. */
const DEAD_MIX_SKUS = ["sku-dead-s", "sku-pic-navy-suit", "sku-pic-baby-socks", "sku-beauty-kit", "sku-genz-top"] as const;

function deadMixFor(userId: string, idPrefix: string, existing: WishlistItem[]): WishlistItem[] {
  const taken = new Set(existing.map((row) => row.productId));
  const rows: WishlistItem[] = [];
  let i = 0;
  for (const sku of DEAD_MIX_SKUS) {
    const product = [...SAVED_CATALOG, ...UNSAVED_CATALOG].find((row) => row.sku === sku);
    if (!product || taken.has(product.productId)) continue;
    i += 1;
    const item = itemFromCatalog(
      userId,
      `${idPrefix}-gone-${i}`,
      { sku, tag: "compare" },
      `2026-05-${String(10 + i).padStart(2, "0")}T10:00:00.000Z`,
    );
    item.tag = null;
    item.bucketId = null;
    item.stockStatus = "discontinued";
    item.sizeWatch = null;
    item.oosSince = item.savedAt;
    rows.push(item);
  }
  return rows;
}

function wishFromSaved(userId: string, id: string, sku: string, tag: ContextTag, savedAt: string): WishlistItem {
  const product = SAVED_CATALOG.find((row) => row.sku === sku);
  if (!product) throw new Error(`Unknown seed sku ${sku}`);
  return itemFromCatalog(userId, id, { sku: product.sku, tag }, savedAt);
}

function kurtaClusterFor(userId: string, idPrefix: string): WishlistItem[] {
  return [
    wishFromSaved(userId, `${idPrefix}-kurta-1`, "sku-kurta-cmp-1", "quality_trust", "2026-07-21T10:00:00.000Z"),
    wishFromSaved(userId, `${idPrefix}-kurta-2`, "sku-kurta-cmp-2", "compare", "2026-07-22T10:00:00.000Z"),
    wishFromSaved(userId, `${idPrefix}-kurta-3`, "sku-kurta-cmp-3", "quality_trust", "2026-07-23T10:00:00.000Z"),
  ];
}

function dressClusterFor(userId: string, idPrefix: string): WishlistItem[] {
  return [
    wishFromSaved(userId, `${idPrefix}-dress-1`, "sku-dress-cmp-1", "quality_trust", "2026-08-24T10:00:00.000Z"),
    wishFromSaved(userId, `${idPrefix}-dress-2`, "sku-dress-cmp-2", "compare", "2026-08-25T10:00:00.000Z"),
  ];
}

function shirtClusterFor(userId: string, idPrefix: string): WishlistItem[] {
  return [
    wishFromSaved(userId, `${idPrefix}-shirt-1`, "sku-shirt-cmp-1", "quality_trust", "2026-07-21T10:00:00.000Z"),
    wishFromSaved(userId, `${idPrefix}-shirt-2`, "sku-shirt-cmp-2", "compare", "2026-07-22T10:00:00.000Z"),
  ];
}

/** Four extra home-rail tiles so the second row fills on a 7-column grid. */
function picRailFor(userId: string, idPrefix: string): WishlistItem[] {
  const specs: Array<{ sku: string; tag: "quality_trust" | "compare"; at: string }> = [
    { sku: "sku-pic-mustard-saree", tag: "quality_trust", at: "2026-07-21T18:00:00.000Z" },
    { sku: "sku-pic-emerald-saree", tag: "quality_trust", at: "2026-07-21T16:00:00.000Z" },
    { sku: "sku-pic-olive-maxi", tag: "quality_trust", at: "2026-07-21T14:00:00.000Z" },
    { sku: "sku-pic-chunky", tag: "compare", at: "2026-07-21T12:00:00.000Z" },
  ];
  return specs.map((spec, index) =>
    itemFromCatalog(userId, `${idPrefix}-pic-${index + 1}`, { sku: spec.sku, tag: spec.tag }, spec.at),
  );
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
    tag: "compare",
    bucketId: "summer",
    catalog: { brand: "Sassafras", title: "Baggy Cargo Pants", image_url: "/shopper/genz-cargo.jpg" },
  }),
  asUser("user-kabir", SEED_ITEMS[4], "wish-kabir-sneaker", {
    productId: "prod-genz-sneaker",
    sku: "sku-genz-sneaker",
    priceAtSave: 2499,
    currentPrice: 2499,
    tag: "compare",
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
    items: [
      ...SEED_ITEMS,
      ...categoryMixFor(DEMO_USER_ID, "wish-sujata", SEED_ITEMS),
      ...kurtaClusterFor(DEMO_USER_ID, "wish-sujata"),
      ...dressClusterFor(DEMO_USER_ID, "wish-sujata"),
      ...picRailFor(DEMO_USER_ID, "wish-sujata"),
      ...deadMixFor(DEMO_USER_ID, "wish-sujata", [
        ...SEED_ITEMS,
        ...categoryMixFor(DEMO_USER_ID, "wish-sujata", SEED_ITEMS),
        ...kurtaClusterFor(DEMO_USER_ID, "wish-sujata"),
        ...dressClusterFor(DEMO_USER_ID, "wish-sujata"),
        ...picRailFor(DEMO_USER_ID, "wish-sujata"),
      ]),
    ],
  },
  {
    id: "priya",
    userId: "user-priya",
    name: "Priya Sharma",
    first: "Priya",
    email: "priya@example.com",
    age: 32,
    city: "Mumbai",
    blurb: "compares a few saves until the quality feels sure",
    phoneLine: "She's on her phone",
    address: "11, Bandra West, Mumbai, 400050",
    defaultCat: "WOMEN",
    prefs: { ...SEED_PREFS },
    items: [
      ...PRIYA_ITEMS,
      ...categoryMixFor("user-priya", "wish-priya", PRIYA_ITEMS),
      ...kurtaClusterFor("user-priya", "wish-priya"),
      ...dressClusterFor("user-priya", "wish-priya"),
      ...deadMixFor("user-priya", "wish-priya", [
        ...PRIYA_ITEMS,
        ...categoryMixFor("user-priya", "wish-priya", PRIYA_ITEMS),
        ...kurtaClusterFor("user-priya", "wish-priya"),
        ...dressClusterFor("user-priya", "wish-priya"),
      ]),
    ],
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
    items: [
      ...KABIR_ITEMS,
      ...categoryMixFor("user-kabir", "wish-kabir", KABIR_ITEMS),
      ...shirtClusterFor("user-kabir", "wish-kabir"),
      ...deadMixFor("user-kabir", "wish-kabir", [
        ...KABIR_ITEMS,
        ...categoryMixFor("user-kabir", "wish-kabir", KABIR_ITEMS),
        ...shirtClusterFor("user-kabir", "wish-kabir"),
      ]),
    ],
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
  orders: ShopperOrder[] = [];
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
    this.orders = ordersFromPurchases(this.purchases);
    this.priceHistory = structuredClone(SEED_PRICE_HISTORY);
    this.reviews = structuredClone(SEED_REVIEWS);
    this.sizingReturns = structuredClone(returnsFor(persona.userId));
  }
}
