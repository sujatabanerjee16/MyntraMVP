import { describe, expect, it } from "vitest";
import { parseDeepLink } from "./deepLink";

describe("deep links", () => {
  it("parses wishlist item signal links", () => {
    expect(
      parseDeepLink(
        "myntra://wishlist/items/wish-linen-shirt?signal=size_available&size=M",
      ),
    ).toEqual({
      kind: "wishlist_item",
      itemId: "wish-linen-shirt",
      signal: "size_available",
      size: "M",
    });
  });

  it("parses PDP fallback", () => {
    expect(parseDeepLink("myntra://pdp/prod-linen?size=M")).toEqual({
      kind: "pdp",
      productId: "prod-linen",
      size: "M",
    });
  });
});
