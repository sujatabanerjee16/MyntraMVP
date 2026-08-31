import type { CatalogSnapshot } from "../domain/models";
import type { SimilarCatalogFields } from "../domain/similar";
import { SEED_WISHLIST_ITEMS } from "./seed";

export type CatalogProduct = SimilarCatalogFields & {
  sku_id: string;
  preferred_size: string;
  sellable: boolean;
  catalog: CatalogSnapshot;
  keywords: string[];
};

function fromSeed(
  productId: string,
  keywords: string[],
  extras: Pick<
    CatalogProduct,
    "style_family_id" | "article_type" | "color_family" | "gender"
  >,
  sellable = false,
): CatalogProduct {
  const item = SEED_WISHLIST_ITEMS.find((row) => row.product_id === productId);
  if (!item) throw new Error(`Missing seed product ${productId}`);
  return {
    product_id: item.product_id,
    sku_id: item.sku_id ?? `${item.product_id}-m`,
    preferred_size: item.preferred_size ?? "M",
    sellable,
    catalog: item.catalog,
    keywords,
    brand: item.catalog.brand,
    ...extras,
  };
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  fromSeed("prod-linen", ["linen", "shirt", "linen shirt"], {
    style_family_id: "linen-shirt",
    article_type: "shirt",
    color_family: "beige",
    gender: "men",
  }),
  fromSeed("prod-jacket", ["jacket", "travel"], {
    style_family_id: "travel-outer",
    article_type: "jacket",
    color_family: "black",
    gender: "men",
  }),
  fromSeed("prod-jeans", ["jeans", "denim"], {
    style_family_id: "slim-denim",
    article_type: "jeans",
    color_family: "indigo",
    gender: "men",
  }),
  fromSeed("prod-tee", ["tee", "cotton"], {
    style_family_id: "basic-tee",
    article_type: "tee",
    color_family: "white",
    gender: "men",
  }, true),
  {
    product_id: "prod-linen-resort",
    sku_id: "sku-linen-resort-m",
    preferred_size: "M",
    sellable: true,
    catalog: {
      brand: "H&M",
      title: "Linen Resort Shirt",
      image_label: "Resort",
      price: { amount: 2299, currency: "INR" },
    },
    keywords: ["linen", "shirt", "linen shirt", "resort"],
    brand: "H&M",
    style_family_id: "linen-shirt",
    article_type: "shirt",
    color_family: "beige",
    gender: "men",
  },
  {
    product_id: "prod-blazer",
    sku_id: "sku-blazer-m",
    preferred_size: "M",
    sellable: true,
    catalog: {
      brand: "Rare Rabbit",
      title: "Tailored Work Blazer",
      image_label: "Blazer",
      price: { amount: 4999, currency: "INR" },
    },
    keywords: ["blazer", "work", "jacket"],
    brand: "Rare Rabbit",
    style_family_id: "work-outer",
    article_type: "jacket",
    color_family: "navy",
    gender: "men",
  },
  {
    product_id: "prod-rain-shell",
    sku_id: "sku-rain-shell-m",
    preferred_size: "M",
    sellable: true,
    catalog: {
      brand: "Decathlon",
      title: "Packable Rain Shell",
      image_label: "Shell",
      price: { amount: 1799, currency: "INR" },
    },
    keywords: ["travel", "coat", "travel coat", "rain"],
    brand: "Decathlon",
    style_family_id: "rain-outer",
    article_type: "shell",
    color_family: "green",
    gender: "unisex",
  },
  {
    product_id: "prod-gown",
    sku_id: "sku-gown-s",
    preferred_size: "S",
    sellable: true,
    catalog: {
      brand: "Sassafras",
      title: "Party Gown",
      image_label: "Gown",
      price: { amount: 2599, currency: "INR" },
    },
    keywords: ["party", "gown", "dress", "random dress"],
    brand: "Sassafras",
    style_family_id: "evening-dress",
    article_type: "dress",
    color_family: "red",
    gender: "women",
  },
  {
    product_id: "prod-kurta",
    sku_id: "sku-kurta-m",
    preferred_size: "M",
    sellable: true,
    catalog: {
      brand: "Libas",
      title: "Festive Kurta",
      image_label: "Kurta",
      price: { amount: 1899, currency: "INR" },
    },
    keywords: ["kurta", "festive"],
    brand: "Libas",
    style_family_id: "festive-ethnic",
    article_type: "kurta",
    color_family: "red",
    gender: "women",
  },
];

export const SEARCH_DEMO_QUERY = "linen shirt";
export const PDP_DEMO_PRODUCT_ID = "prod-blazer";
export const SEARCH_DEMO_PRODUCT_ID = "prod-linen-resort";

export function catalogById(productId: string): CatalogProduct | undefined {
  return CATALOG_PRODUCTS.find((row) => row.product_id === productId);
}

export function searchCatalog(query: string): CatalogProduct[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...CATALOG_PRODUCTS];
  return CATALOG_PRODUCTS.filter((row) => {
    const hay = [row.catalog.brand, row.catalog.title, ...row.keywords]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

export function toSimilarFields(product: CatalogProduct): SimilarCatalogFields {
  return {
    product_id: product.product_id,
    brand: product.brand,
    style_family_id: product.style_family_id,
    article_type: product.article_type,
    color_family: product.color_family,
    gender: product.gender,
  };
}
