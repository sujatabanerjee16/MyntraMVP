import { describe, expect, it } from "vitest";
import { hasSizeChart, sizeChartFor, sizesFor } from "./sizeChart";

describe("size chart", () => {
  it("covers apparel and skips sarees, accessories, beauty, and home", () => {
    expect(hasSizeChart("Floral Summer Dress", "WOMEN")).toBe(true);
    expect(hasSizeChart("Embroidered Kurta Set", "WOMEN")).toBe(true);
    expect(hasSizeChart("Cotton Casual Shirt", "MEN")).toBe(true);
    expect(hasSizeChart("511 Slim Jeans", "MEN")).toBe(true);
    expect(hasSizeChart("Printed Shorts Set", "KIDS")).toBe(true);
    expect(hasSizeChart("Court Sneakers", "GENZ")).toBe(true);
    expect(hasSizeChart("Baggy Cargo Pants", "GENZ")).toBe(true);
    expect(hasSizeChart("Woven Silk Saree", "WOMEN")).toBe(false);
    expect(hasSizeChart("Styled Drop Earrings", "STUDIO")).toBe(false);
    expect(hasSizeChart("Structured Studio Bag", "STUDIO")).toBe(false);
    expect(hasSizeChart("Superstay Lipstick", "BEAUTY")).toBe(false);
    expect(hasSizeChart("Ochre Lounge Chair", "HOME")).toBe(false);
    expect(sizeChartFor("512 Slim Tapered Jeans", "MEN")?.label).toMatch(/Jeans/);
    expect(sizeChartFor("Embroidered Kurta Set", "WOMEN")?.label).toMatch(/Women/);
    expect(sizeChartFor("Baggy Cargo Pants", "GENZ")?.label).toMatch(/Jeans/);
    expect(sizeChartFor("Floral Summer Dress", "WOMEN")?.headers).toContain("Bust");
    expect(sizesFor("Floral Summer Dress", "WOMEN")).toEqual(["XS", "S", "M", "L", "XL"]);
    expect(sizesFor("511 Slim Jeans", "MEN")).toEqual(["28", "30", "32", "34"]);
    expect(sizesFor("Woven Silk Saree", "WOMEN")).toEqual([]);
  });
});
