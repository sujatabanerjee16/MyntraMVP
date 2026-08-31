import { describe, expect, it } from "vitest";
import { catalogById, searchCatalog, toSimilarFields } from "../store/catalog";
import {
  SIMILAR_QUALITY_SAMPLE_N,
  pickSimilarMatch,
  type SimilarWishlistEntry,
} from "./similar";

function entry(
  productId: string,
  itemId: string,
  savedAt = "2026-08-10T10:00:00.000Z",
): SimilarWishlistEntry {
  const catalog = catalogById(productId);
  if (!catalog) throw new Error(productId);
  return {
    ...toSimilarFields(catalog),
    wishlist_item_id: itemId,
    saved_at: savedAt,
  };
}

const jacket = entry("prod-jacket", "wish-travel-jacket");
const linen = entry("prod-linen", "wish-linen-shirt", "2026-08-17T10:00:00.000Z");
const jeans = entry("prod-jeans", "wish-jeans", "2026-08-20T10:00:00.000Z");

describe("similar matcher", () => {
  it("EC-SIM-003 exact product_id is strongest", () => {
    const match = pickSimilarMatch({
      query: "jacket",
      results: searchCatalog("jacket").map(toSimilarFields),
      wishlist: [jacket, linen],
    });
    expect(match).toMatchObject({
      product_id: "prod-jacket",
      reason: "same_product",
    });
  });

  it("EC-SIM-004 one hint when several wishlist items match results", () => {
    const match = pickSimilarMatch({
      query: "",
      results: searchCatalog("").map(toSimilarFields),
      wishlist: [jacket, linen, jeans],
    });
    expect(match?.product_id).toBe("prod-jeans");
    expect(match?.reason).toBe("same_product");
  });

  it("matches the linen family when only the resort shirt is in results", () => {
    const match = pickSimilarMatch({
      query: "resort",
      results: searchCatalog("resort").map(toSimilarFields),
      wishlist: [linen],
    });
    expect(match).toMatchObject({
      product_id: "prod-linen",
      reason: "style_family",
    });
  });

  it("EC-SIM-002 / EC-SIM-013 rejects weak family and low embedding", () => {
    expect(
      pickSimilarMatch({
        query: "blazer",
        results: searchCatalog("blazer").map(toSimilarFields),
        wishlist: [jacket],
      }),
    ).toBeNull();
    expect(
      pickSimilarMatch({
        query: "kurta",
        results: searchCatalog("kurta").map(toSimilarFields),
        wishlist: [jacket],
      }),
    ).toBeNull();
    expect(
      pickSimilarMatch({
        query: "random dress",
        results: searchCatalog("random dress").map(toSimilarFields),
        wishlist: [jacket],
        embeddings: [{ product_id: "prod-jacket", score: 0.87 }],
      }),
    ).toBeNull();
  });

  it("accepts embedding at the 0.88 bar", () => {
    const match = pickSimilarMatch({
      query: "travel coat",
      results: searchCatalog("travel coat").map(toSimilarFields),
      wishlist: [jacket],
      embeddings: [{ product_id: "prod-jacket", score: 0.91 }],
    });
    expect(match).toMatchObject({ reason: "embedding", product_id: "prod-jacket" });
  });

  it("EC-SIM-011 / EC-SIM-012 empty wishlist or results → no hint", () => {
    expect(
      pickSimilarMatch({
        query: "jacket",
        results: searchCatalog("jacket").map(toSimilarFields),
        wishlist: [],
      }),
    ).toBeNull();
    expect(
      pickSimilarMatch({
        query: "zzzz-no-hit",
        results: searchCatalog("zzzz-no-hit").map(toSimilarFields),
        wishlist: [jacket],
      }),
    ).toBeNull();
  });
});

describe("P5 quality sample", () => {
  const sample: {
    name: string;
    expectHint: boolean;
    run: () => ReturnType<typeof pickSimilarMatch>;
  }[] = [
    {
      name: "jacket exact",
      expectHint: true,
      run: () =>
        pickSimilarMatch({
          query: "jacket",
          results: searchCatalog("jacket").map(toSimilarFields),
          wishlist: [jacket],
        }),
    },
    {
      name: "linen exact",
      expectHint: true,
      run: () =>
        pickSimilarMatch({
          query: "linen shirt",
          results: searchCatalog("linen shirt").map(toSimilarFields),
          wishlist: [linen],
        }),
    },
    {
      name: "jeans exact",
      expectHint: true,
      run: () =>
        pickSimilarMatch({
          query: "jeans",
          results: searchCatalog("jeans").map(toSimilarFields),
          wishlist: [jeans],
        }),
    },
    {
      name: "linen family via resort",
      expectHint: true,
      run: () =>
        pickSimilarMatch({
          query: "resort",
          results: searchCatalog("resort").map(toSimilarFields),
          wishlist: [linen],
        }),
    },
    {
      name: "embedding 0.91 travel coat",
      expectHint: true,
      run: () =>
        pickSimilarMatch({
          query: "travel coat",
          results: searchCatalog("travel coat").map(toSimilarFields),
          wishlist: [jacket],
          embeddings: [{ product_id: "prod-jacket", score: 0.91 }],
        }),
    },
    {
      name: "blazer vs Puma jacket — weak family",
      expectHint: false,
      run: () =>
        pickSimilarMatch({
          query: "blazer",
          results: searchCatalog("blazer").map(toSimilarFields),
          wishlist: [jacket],
        }),
    },
    {
      name: "kurta vs jacket — wrong article/gender",
      expectHint: false,
      run: () =>
        pickSimilarMatch({
          query: "kurta",
          results: searchCatalog("kurta").map(toSimilarFields),
          wishlist: [jacket],
        }),
    },
    {
      name: "embedding 0.87",
      expectHint: false,
      run: () =>
        pickSimilarMatch({
          query: "random dress",
          results: searchCatalog("random dress").map(toSimilarFields),
          wishlist: [jacket],
          embeddings: [{ product_id: "prod-jacket", score: 0.87 }],
        }),
    },
    {
      name: "empty wishlist",
      expectHint: false,
      run: () =>
        pickSimilarMatch({
          query: "jacket",
          results: searchCatalog("jacket").map(toSimilarFields),
          wishlist: [],
        }),
    },
    {
      name: "empty results",
      expectHint: false,
      run: () =>
        pickSimilarMatch({
          query: "no-such-style",
          results: [],
          wishlist: [jacket],
        }),
    },
  ];

  it(`false-positive rate is 0 on N=${SIMILAR_QUALITY_SAMPLE_N} labeled rows`, () => {
    expect(sample).toHaveLength(SIMILAR_QUALITY_SAMPLE_N);
    const falsePositives = sample.filter((row) => {
      const hit = row.run();
      return !row.expectHint && hit !== null;
    });
    expect(falsePositives.map((row) => row.name)).toEqual([]);
  });
});
