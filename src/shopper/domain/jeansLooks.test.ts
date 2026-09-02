import { describe, expect, it } from "vitest";
import { isJeansItem, jeansLookPairs, lookKindOf } from "./jeansLooks";

const jeans = { productId: "prod-levis", brand: "Levi's", title: "511 Slim Jeans" };

const shirt = {
  id: "wish-linen",
  productId: "prod-linen",
  status: "active" as const,
  sku: "sku-linen-m",
  currentPrice: 1999,
  catalog: { brand: "H&M", title: "Regular Fit Linen Shirt", image_url: "/shopper/linen-product.jpg" },
};

const sneakers = {
  id: "wish-sneakers",
  productId: "prod-genz-sneaker",
  status: "active" as const,
  sku: "sku-genz-sneaker",
  currentPrice: 2499,
  catalog: { brand: "Puma", title: "Court Sneakers", image_url: "/shopper/genz-sneaker.jpg" },
};

const dress = {
  id: "wish-dress",
  productId: "prod-libas",
  status: "active" as const,
  catalog: { brand: "Libas", title: "Floral Printed Wrap Midi Dress", image_url: "/x.jpg" },
};

const levisTee = {
  productId: "prod-levis-tee",
  sku: "sku-levis-tee-m",
  brand: "Levi's",
  title: "Relaxed Fit Graphic Tee",
  image_url: "/shopper/men-polo.jpg",
  price: 1299,
};

const otherTee = {
  productId: "prod-roadster",
  sku: "sku-roadster-m",
  brand: "Roadster",
  title: "Cotton Casual Shirt",
  image_url: "/shopper/men-shirt.jpg",
  price: 1299,
};

describe("jeans look pairs", () => {
  it("only runs for jeans", () => {
    expect(isJeansItem("511 Slim Jeans")).toBe(true);
    expect(isJeansItem("Regular Fit Linen Shirt")).toBe(false);
    expect(lookKindOf("Pique Polo T-Shirt")).toBe("top");
    expect(lookKindOf("Court Sneakers")).toBe("shoes");
    expect(lookKindOf("511 Slim Jeans")).toBe("jeans");
    expect(lookKindOf("Infant Floral Vest Set", "KIDS")).toBe("top");
    expect(lookKindOf("Floral Printed Wrap Midi Dress")).toBeNull();
    expect(lookKindOf("Styled Drop Earrings")).toBe("earrings");
    expect(lookKindOf("Structured Studio Bag")).toBe("bag");
    expect(jeansLookPairs({ ...jeans, title: "Linen Shirt" }, [shirt], [levisTee])).toEqual([]);
  });

  it("prefers tops and shoes already on the wishlist, then same-brand catalog", () => {
    const pairs = jeansLookPairs(jeans, [dress, shirt, sneakers], [levisTee, otherTee, jeans as never]);
    expect(pairs.map((row) => row.productId)).toEqual(["prod-linen", "prod-genz-sneaker", "prod-levis-tee"]);
    expect(pairs[0]?.source).toBe("wishlist");
    expect(pairs[0]?.kind).toBe("top");
    expect(pairs[1]?.kind).toBe("shoes");
    expect(pairs[2]?.source).toBe("same_brand");
    expect(pairs.every((row) => row.productId !== "prod-levis")).toBe(true);
    expect(pairs.every((row) => row.productId !== "prod-libas")).toBe(true);
    expect(pairs.every((row) => row.productId !== "prod-roadster")).toBe(true);
  });
});
