import { inferArticleType } from "./stylist";

export type SizeChart = {
  label: string;
  unit: string;
  headers: string[];
  rows: string[][];
  note: string;
};

const SKIP_ARTICLES = new Set([
  "saree",
  "earrings",
  "bag",
  "lipstick",
  "serum",
  "makeup",
  "cushion",
  "lamp",
  "bedsheet",
]);

const WOMEN: SizeChart = {
  label: "Women's apparel",
  unit: "inches",
  headers: ["Size", "Bust", "Waist", "Hip"],
  rows: [
    ["XS", "32", "24", "34"],
    ["S", "34", "26", "36"],
    ["M", "36", "28", "38"],
    ["L", "38", "30", "40"],
    ["XL", "40", "32", "42"],
  ],
  note: "Body measurements. If you are between sizes, pick the larger one.",
};

const MEN: SizeChart = {
  label: "Men's apparel",
  unit: "inches",
  headers: ["Size", "Chest", "Shoulder", "Length"],
  rows: [
    ["S", "38", "17", "27"],
    ["M", "40", "17.5", "28"],
    ["L", "42", "18", "29"],
    ["XL", "44", "18.5", "30"],
  ],
  note: "Garment measurements. Chest is measured pit to pit, doubled.",
};

const JEANS: SizeChart = {
  label: "Jeans / trousers",
  unit: "inches",
  headers: ["Size", "Waist", "Hip", "Inseam"],
  rows: [
    ["28", "28", "36", "32"],
    ["30", "30", "38", "32"],
    ["32", "32", "40", "32"],
    ["34", "34", "42", "32"],
  ],
  note: "Waist is the garment waistband, laid flat and doubled.",
};

const KIDS: SizeChart = {
  label: "Kids' apparel",
  unit: "inches",
  headers: ["Size", "Age", "Chest", "Waist"],
  rows: [
    ["3-4Y", "3–4 yrs", "22", "21"],
    ["5-6Y", "5–6 yrs", "24", "22"],
    ["7-8Y", "7–8 yrs", "26", "23"],
    ["8-9Y", "8–9 yrs", "27", "24"],
  ],
  note: "Pick the age band closest to the child. If between sizes, size up.",
};

const SHOES: SizeChart = {
  label: "Footwear",
  unit: "cm",
  headers: ["UK", "EU", "Foot length"],
  rows: [
    ["6", "40", "25"],
    ["7", "41", "25.5"],
    ["8", "42", "26.5"],
    ["9", "43", "27.5"],
  ],
  note: "Measure the foot heel to toe and match the closest length.",
};

export function hasSizeChart(title: string, category?: string): boolean {
  return sizeChartFor(title, category) != null;
}

export function sizesFor(title: string, category?: string): string[] {
  const chart = sizeChartFor(title, category);
  return chart ? chart.rows.map((row) => row[0]) : [];
}

export function sizeChartFor(title: string, category?: string): SizeChart | null {
  if (category === "HOME" || category === "BEAUTY") return null;
  const article = inferArticleType(title);
  if (SKIP_ARTICLES.has(article)) return null;
  if (/palette|cream|curtain|dinner|chair|lounge|bedding|quilt|jewel|sock|bootie/i.test(title)) return null;
  if (article === "sneakers") return SHOES;
  if (article === "jeans" || article === "cargo" || /chino|trouser/i.test(title)) return JEANS;
  if (category === "KIDS" || article === "frock") return KIDS;
  if (category === "MEN" || article === "shirt" || article === "polo" || article === "tee") return MEN;
  if (article === "other" && category !== "WOMEN" && category !== "GENZ" && category !== "STUDIO") return null;
  return WOMEN;
}
