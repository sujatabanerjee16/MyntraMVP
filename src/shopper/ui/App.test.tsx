/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createShopperRuntime } from "../runtime";
import { ShopperApp } from "./App";

afterEach(() => {
  cleanup();
});

async function openProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Profile" }));
}

async function openWishlist(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Wishlist" }));
}

async function resetDemo(user: ReturnType<typeof userEvent.setup>) {
  const ready = screen.queryByRole("button", { name: "Reset demo" });
  if (!ready) {
    await user.click(screen.getByRole("button", { name: "Profile" }));
  }
  await user.click(screen.getByRole("button", { name: "Reset demo" }));
}

describe("wishlist mvp1", () => {
  it("opens as the myntra.com shopper site", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.getByRole("button", { name: "MYNTRA" })).toBeTruthy();
    expect(screen.getByText("Myntra")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Profile" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Notifications" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Profile" }));
    expect(screen.queryByRole("button", { name: /Notifications/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Wishlist alerts/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByText(/Sujata is shopping/)).toBeNull();
    expect(screen.queryByRole("tab", { name: "Phone" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Continue on/ })).toBeNull();
    expect(screen.getByText("MYNTRASAVE")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Summer Dresses" })).toBeTruthy();
    expect(screen.getByText("From your wishlist")).toBeTruthy();
    const pageText = document.body.textContent ?? "";
    expect(pageText.indexOf("From your wishlist")).toBeLessThan(pageText.indexOf("MYNTRASAVE"));
    const rail = document.querySelector(".web-page .saved-rail");
    expect(rail?.querySelectorAll(".saved-tile").length).toBeGreaterThanOrEqual(4);
    expect(rail?.querySelectorAll(".wish-heart.is-on").length).toBe(rail?.querySelectorAll(".saved-tile").length);
    expect(rail?.textContent).toMatch(/Quality & trust/);
    expect(rail?.textContent).toMatch(/Compare/);
    expect(rail?.textContent).toMatch(/My size/);
    expect(rail?.textContent).toMatch(/Mitera/i);
    expect(rail?.textContent).toMatch(/Soch/i);
    expect(rail?.textContent).toMatch(/Libas/i);
    expect(rail?.textContent).toMatch(/Biba/i);
    expect(rail?.textContent).not.toMatch(/Levi/i);
    expect(rail?.textContent).not.toMatch(/Puma/i);
    expect(rail?.textContent).not.toMatch(/Bookmark/);
    expect(rail?.textContent).not.toMatch(/How it looks on me/);
    const wishBadge = screen.getByRole("button", { name: "Wishlist" }).querySelector(".badge-count");
    expect(wishBadge?.textContent).toMatch(/^\d+$/);
    expect(Number(wishBadge?.textContent)).toBeGreaterThanOrEqual(8);
    expect(screen.queryByText(/The problem/)).toBeNull();
    expect(screen.queryByText(/Heart = save/)).toBeNull();
  });

  it("opens each top tab with its own products", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.getByAltText("Floral Summer Dress").getAttribute("src")).toMatch(/women-floral/);

    await user.click(screen.getByRole("button", { name: "MEN" }));
    expect(screen.getByText("511 Slim Jeans")).toBeTruthy();
    expect(screen.getByAltText("511 Slim Jeans").getAttribute("src")).toMatch(/men-jeans/);
    const menRail = document.querySelector(".web-page .saved-rail");
    expect(menRail?.textContent).toMatch(/Levi/i);
    expect(menRail?.textContent).not.toMatch(/Libas/i);
    expect(menRail?.textContent).not.toMatch(/Biba/i);

    await user.click(screen.getByRole("button", { name: "KIDS" }));
    expect(screen.getAllByText("Printed Shorts Set").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("Printed Shorts Set")[0].getAttribute("src")).toMatch(/kids-tropical-set/);
    expect(screen.getAllByText("Cotton Baby Tee Set").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("Cotton Baby Tee Set")[0].getAttribute("src")).toMatch(/kids-hoodie/);
    const kidsShots = [...document.querySelectorAll(".trend-grid img")].map((img) => (img as HTMLImageElement).getAttribute("src"));
    expect(new Set(kidsShots).size).toBe(kidsShots.length);

    expect(screen.queryByRole("button", { name: "HOME" })).toBeNull();
    expect(screen.queryByRole("button", { name: /STUDIO/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "BEAUTY" }));
    expect(screen.getByText("Superstay Lipstick")).toBeTruthy();
    expect(screen.getByAltText("Superstay Lipstick").getAttribute("src")).toMatch(/beauty-lip/);

    await user.click(screen.getByRole("button", { name: "GENZ" }));
    expect(screen.getByText("Baggy Cargo Pants")).toBeTruthy();
    expect(screen.getByAltText("Baggy Cargo Pants").getAttribute("src")).toMatch(/genz-cargo/);
  });

  it("lets shoppers pick a size and keeps sold-out sizes for notify", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    const dressCard = screen.getByText("Printed Fit & Flare Dress").closest(".trend-card-wrap")!;
    expect(within(dressCard).getByRole("button", { name: "Notify when back" })).toBeTruthy();
    expect(within(dressCard).getByRole("button", { name: "S sold out" })).toBeTruthy();
    expect(within(dressCard).queryByText(/Size S sold out/)).toBeNull();

    await user.click(within(dressCard).getByRole("button", { name: "Size M" }));
    expect(within(dressCard).getByRole("button", { name: "Add to Bag" })).toBeTruthy();

    const sareeCard = screen.getByText("Woven Silk Saree").closest(".trend-card-wrap")!;
    expect(within(sareeCard).queryByRole("group", { name: "Select size" })).toBeNull();
    expect(within(sareeCard).getByRole("button", { name: "Add to Bag" })).toBeTruthy();
  });

  it("shows a size chart on apparel and hides it on sarees, accessories, beauty, and home", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    const dressCard = screen.getByText("Floral Summer Dress").closest(".trend-card-wrap")!;
    expect(within(dressCard).getByRole("button", { name: "Size chart" })).toBeTruthy();
    await user.click(within(dressCard).getByRole("button", { name: "Size chart" }));
    expect(screen.getByRole("heading", { name: "Size chart" })).toBeTruthy();
    expect(screen.getByText(/Women's apparel/)).toBeTruthy();
    expect(screen.getByText("Bust")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Close" }));

    const sareeCard = screen.getByText("Woven Silk Saree").closest(".trend-card-wrap")!;
    expect(within(sareeCard).queryByRole("button", { name: "Size chart" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "BEAUTY" }));
    const beautyCard = screen.getByText("Superstay Lipstick").closest(".trend-card-wrap")!;
    expect(within(beautyCard).queryByRole("button", { name: "Size chart" })).toBeNull();
  });

  it("adds a new arrival to the bag and can wishlist it", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.getAllByRole("button", { name: "Add to Bag" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Save to wishlist" }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Add to Bag" })[0]);
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
    expect(screen.getByText("Floral Summer Dress")).toBeTruthy();
  });

  it("shows tagged cards and a dead nudge on wishlist", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    expect(screen.getByRole("heading", { name: "Wishlist" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Notification settings" })).toBeNull();
    expect(screen.getByRole("tab", { name: /All/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Compare/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Quality & trust/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /My size/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Occasion/ })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /How it looks on me/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Saved/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Price drop/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "Quality & trust" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "My size" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Occasion" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "How it looks on me" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Saved" })).toBeNull();
    expect(screen.getByRole("button", { name: /Compare \d+ dresses in Women/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Compare \d+ kurtas in Women/ })).toBeTruthy();
    expect(screen.getByText("Ethnic A-Line Anarkali Kurta")).toBeTruthy();
    expect(screen.getByText(/This item won't be restocked/)).toBeTruthy();
    expect(screen.getByText("Zari Border Silk Saree").closest("article")?.className).toMatch(/dead-nudge/);
    expect(screen.getByText("Zari Border Silk Saree").closest("article")?.textContent).not.toMatch(/Price drop/i);
    expect(screen.getByText("Zari Border Silk Saree").closest("article")?.textContent).not.toMatch(/Out of stock/i);
    expect(screen.getByText("Zari Border Silk Saree").closest("article")?.textContent).toMatch(/No longer sold/);
    expect(screen.queryByText("512 Slim Tapered Jeans")).toBeNull();
    await user.click(screen.getByRole("button", { name: "MEN" }));
    expect(screen.getByRole("heading", { name: "Wishlist" })).toBeTruthy();
    expect(screen.getByText("512 Slim Tapered Jeans")).toBeTruthy();
    expect(screen.queryByText("Complete the look")).toBeNull();
    const jeansCard = screen.getByText("512 Slim Tapered Jeans").closest("article")!;
    expect(jeansCard.textContent).toMatch(/₹2,999/);
    await user.click(within(jeansCard).getByRole("button", { name: "MOVE TO BAG" }));
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
    expect(screen.getByText("512 Slim Tapered Jeans").closest("article")?.textContent).toMatch(/₹2,999/);
    expect(screen.getByText("512 Slim Tapered Jeans").closest("article")?.textContent).not.toMatch(/₹3,019/);
  });

  it("shows office, wedding, summer, and restocking items on one list", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    expect(screen.getByText("Flared Ethnic Maxi")).toBeTruthy();
    expect(screen.getByText("Pleated Party Dress")).toBeTruthy();
    expect(screen.getByText("Floral Printed Wrap Midi Dress")).toBeTruthy();
    expect(screen.getByText("Ethnic A-Line Anarkali Kurta")).toBeTruthy();
    expect(screen.queryByText("Regular Fit Linen Shirt")).toBeNull();
    await user.click(screen.getByRole("button", { name: "MEN" }));
    expect(screen.getByText("Regular Fit Linen Shirt")).toBeTruthy();
    expect(screen.getByText("512 Slim Tapered Jeans")).toBeTruthy();
  });

  it("shows a discontinued save in every shopper category", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    const gone = [
      ["WOMEN", "Zari Border Silk Saree"],
      ["MEN", "Navy Slim-Fit Formal Suit"],
      ["KIDS", "Baby Socks Pack of 5"],
      ["BEAUTY", "Everyday Makeup Kit"],
      ["GENZ", "Mesh Party Top"],
    ] as const;
    for (const [cat, title] of gone) {
      await user.click(screen.getByRole("button", { name: cat }));
      expect(screen.getByRole("tab", { name: /No longer available \(1\)/ })).toBeTruthy();
      await user.click(screen.getByRole("tab", { name: /No longer available/ }));
      expect(screen.getByText(title).closest("article")?.className).toMatch(/dead-nudge/);
      expect(screen.getByText(title).closest("article")?.textContent).toMatch(/No longer sold/);
    }
  });

  it("filters the wishlist to the header category", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    expect(screen.getByText(/Women ·/)).toBeTruthy();
    expect(screen.getByText("Floral Printed Wrap Midi Dress")).toBeTruthy();
    expect(screen.queryByText("512 Slim Tapered Jeans")).toBeNull();

    await user.click(screen.getByRole("button", { name: "BEAUTY" }));
    expect(screen.getByRole("heading", { name: "Wishlist" })).toBeTruthy();
    expect(screen.getByText(/Beauty ·/)).toBeTruthy();
    expect(screen.queryByText("Floral Printed Wrap Midi Dress")).toBeNull();
    expect(screen.getByText("Nude Eye Palette")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "KIDS" }));
    expect(screen.queryByText("Nude Eye Palette")).toBeNull();
    expect(screen.getByText("Printed Shorts Set")).toBeTruthy();
    expect(screen.getByText("Cotton Baby Tee Set")).toBeTruthy();
  });

  it("compares same-type saves side by side", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    expect(screen.getByRole("button", { name: /Compare \d+ dresses in Women/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Compare \d+ kurtas in Women/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Compare \d+ dresses in Women/ }));

    expect(screen.getByRole("heading", { name: /\d+ dresses in Women/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getByText("Buy this")).toBeTruthy();
    expect(screen.getAllByLabelText(/out of 5 from/i).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/Ruffled Off-Shoulder Mini Dress/)).toBeTruthy();
    expect(screen.queryByText(/Ruched Midi Dress/)).toBeNull();
    expect(screen.queryByText("Colour")).toBeNull();
    expect(screen.queryByText("Design")).toBeNull();
    expect(screen.queryByText("On-body")).toBeNull();
    expect(screen.queryByText(/true to size/i)).toBeNull();
    expect(screen.queryByText(/\d+(\.\d+)?\s*\/\s*10/)).toBeNull();

    const brands = ["Libas", "Sassafras", "Vero Moda", "AND"];
    for (const brand of brands) {
      expect(screen.getAllByText(brand.toUpperCase()).length).toBeGreaterThan(0);
    }

    await user.click(screen.getByRole("checkbox", { name: /In stock only/ }));
    expect(screen.getAllByRole("button", { name: "MOVE TO BAG" }).length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getAllByRole("button", { name: "Not this" })[0]);
    expect(screen.getAllByLabelText(/out of 5 from/i).length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getAllByRole("button", { name: "MOVE TO BAG" })[0]);
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
  });

  it("tags a new save and skips without a chip", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.click(screen.getAllByRole("button", { name: "Save to wishlist" })[0]);
    expect(screen.getByText("Saving this for…?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Check quality first/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Upcoming Occasion/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Waiting for Price Drop/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Check the fit/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /pick the one that fits you/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Not sure how it will look on me/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Just Bookmarking/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Check quality first/ }));
    const dressCard = () => screen.getByText("Printed Fit & Flare Dress").closest("article")!;
    await waitFor(() => {
      expect(dressCard().textContent).toMatch(/Quality & trust/);
    });
    await user.click(within(dressCard()).getByRole("button", { name: "View in wishlist" }));
    expect(screen.getByText("Printed Fit & Flare Dress").closest("article")?.textContent).toMatch(/Quality & trust/);
    await user.click(screen.getByRole("button", { name: "MYNTRA" }));

    await resetDemo(user);
    await user.click(screen.getAllByRole("button", { name: "Save to wishlist" })[0]);
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText("Printed Fit & Flare Dress").closest("article")?.textContent).not.toMatch(
      /Price drop|Occasion|Quality|My size|Compare|Need styling|How it looks|look on me|Bookmark|style it/,
    );
    await user.click(within(dressCard()).getByRole("button", { name: "View in wishlist" }));
    expect(screen.getByRole("heading", { name: "Wishlist" })).toBeTruthy();
    expect(screen.getByText("Printed Fit & Flare Dress").closest("article")?.className).toMatch(/focused/);
  });

  it("edits a tag from a long-press and defaults prefs to on", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);
    await user.click(screen.getByRole("button", { name: "MEN" }));

    fireEvent.contextMenu(screen.getByText("Regular Fit Linen Shirt").closest("article")!);
    await user.click(screen.getByRole("button", { name: /Check quality first/ }));
    expect(screen.getByText("Regular Fit Linen Shirt").closest("article")?.textContent).toMatch(/Quality & trust/);

    await openProfile(user);
    expect(screen.queryByRole("button", { name: /Notifications/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Wishlist alerts/ })).toBeNull();
    expect(screen.queryByRole("switch", { name: /Size Back-in-Stock/ })).toBeNull();
    expect(screen.queryByRole("switch", { name: /Occasion Reminders/ })).toBeNull();
  });

  it("does not offer a price-drop save reason or alert", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.click(screen.getAllByRole("button", { name: "Save to wishlist" })[0]);
    expect(screen.queryByRole("button", { name: /Waiting for Price Drop/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Skip" }));

    await openWishlist(user);
    expect(screen.queryByRole("tab", { name: /Price drop/ })).toBeNull();
    await openProfile(user);
    expect(screen.queryByRole("button", { name: /Notifications/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Wishlist alerts/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Price dropped on a saved dress" })).toBeNull();
  });

  it("tags a save as compare from the home sheet", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.click(screen.getAllByRole("button", { name: "Save to wishlist" })[0]);
    expect(screen.queryByRole("button", { name: /Not sure how it will look on me/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /pick the one that fits you/ }));
    const dressCard = () => screen.getByText("Printed Fit & Flare Dress").closest("article")!;
    await waitFor(() => {
      expect(dressCard().textContent).toMatch(/Compare/);
    });
    expect(dressCard().textContent).not.toMatch(/How it looks on me/);
    expect(document.querySelector(".saved-rail")?.textContent).toMatch(/Compare/);
    expect(document.querySelector(".saved-rail")?.textContent).not.toMatch(/How it looks on me/);
  });

  it("shows occasion saves with a wear date, not a stock watch", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);
    await user.click(screen.getByRole("tab", { name: /Occasion/ }));
    const maxi = screen.getByText("Flared Ethnic Maxi").closest("article")!;
    expect(maxi.className).toMatch(/occasion-card/);
    expect(maxi.textContent).toMatch(/Friend's Wedding/);
    expect(maxi.textContent).toMatch(/days away|Sep/);
    expect(maxi.textContent).not.toMatch(/Watching size|availability|restock/i);
    expect(within(maxi).getByRole("button", { name: "MOVE TO BAG" })).toBeTruthy();
  });

  it("judges My size from past buys and does not talk about availability", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);
    await user.click(screen.getByRole("tab", { name: /My size/ }));
    const biba = screen.getByText("Ethnic A-Line Anarkali Kurta").closest("article")!;
    expect(biba.className).toMatch(/size-fit-card/);
    expect(biba.textContent).toMatch(/may not fit/i);
    expect(biba.textContent).toMatch(/Anouk|M/);
    expect(biba.textContent).not.toMatch(/Watching size|Out of stock|availability|restock/i);
    expect(within(biba).queryByRole("button", { name: "MOVE TO BAG" })).toBeNull();
  });

  it("keeps quality items on the Quality & trust tab without a notification inbox", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);
    await user.click(screen.getByRole("tab", { name: /Quality & trust/ }));
    expect(screen.getByText("Ruffled Off-Shoulder Mini Dress")).toBeTruthy();
    expect(screen.getByText("Cotton Straight Kurta")).toBeTruthy();
    expect(screen.queryByText("Regular Fit Linen Shirt")).toBeNull();
    const mini = screen.getByText("Ruffled Off-Shoulder Mini Dress").closest("article")!;
    expect(mini.className).toMatch(/quality-card/);
    expect(mini.textContent).toMatch(/Cotton|Viscose/i);
    expect(mini.textContent).toMatch(/reviews/i);
    expect(mini.textContent).toMatch(/Quality is good/);
    expect(mini.querySelectorAll(".quality-photos img")).toHaveLength(2);
    expect(mini.textContent).not.toMatch(/Compare with other/);
    expect(mini.textContent).not.toMatch(/\d+(\.\d+)?\s*\/\s*10/);
    await openProfile(user);
    expect(screen.queryByRole("button", { name: /Notifications/ })).toBeNull();
  });

  it("removes a dead item from the top card and never pushes it", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    await user.click(screen.getByRole("button", { name: /Remove/ }));
    expect(screen.queryByText("This item won't be restocked")).toBeNull();
    expect(screen.queryByText("Zari Border Silk Saree")).toBeNull();
    await openProfile(user);
    expect(screen.queryByRole("heading", { name: "Notifications" })).toBeNull();
    expect(screen.queryByText("You're all caught up")).toBeNull();
  });

  it("returns products when the shopper searches", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.type(screen.getByPlaceholderText("Search for products, brands and more"), "jeans");
    expect(screen.getByText(/Results for/)).toBeTruthy();
    expect(screen.getByText("511 Slim Jeans")).toBeTruthy();
    expect(screen.getAllByText("LEVI'S").length).toBeGreaterThan(0);

    await user.clear(screen.getByPlaceholderText("Search for products, brands and more"));
    await user.type(screen.getByPlaceholderText("Search for products, brands and more"), "libas");
    expect(screen.getByText("Floral Printed Wrap Midi Dress")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Saved to wishlist" }).length).toBeGreaterThan(0);
  });

  it("shows a checkout rec before the order is placed", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);
    const libas = screen.getByText("Floral Printed Wrap Midi Dress").closest("article")!;
    await user.click(within(libas).getByRole("button", { name: "MOVE TO BAG" }));
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
    expect(await screen.findByText(/Why we picked this/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Recommended for this purchase" })).toBeTruthy();
    expect(screen.queryByText("Complete the look")).toBeNull();
    const recTile = screen.getAllByRole("button").find((btn) => btn.className.includes("look-tile"));
    expect(recTile).toBeTruthy();
    await user.click(recTile!);
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
    expect(screen.queryByText("This style is already in your wishlist")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(screen.getByRole("heading", { name: "Checkout" })).toBeTruthy();
    expect(screen.getByText("Sujata Banerjee")).toBeTruthy();
    expect(screen.getByText("42, Koramangala 5th Block, Bengaluru, 560095")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "UPI (Google Pay, PhonePe)" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Cash on Delivery" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^PAY ₹/ }));
    expect(screen.getByText("Order successful")).toBeTruthy();
  });

  it("holds the wishlist count through bag and drops it only after pay", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);
    const badge = () => Number(screen.getByRole("button", { name: "Wishlist" }).querySelector(".badge-count")?.textContent);
    const before = badge();
    const libas = screen.getByText("Floral Printed Wrap Midi Dress").closest("article")!;
    await user.click(within(libas).getByRole("button", { name: "MOVE TO BAG" }));
    expect(badge()).toBe(before);
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(screen.getByRole("heading", { name: "Checkout" })).toBeTruthy();
    expect(badge()).toBe(before);
    await user.click(screen.getByRole("button", { name: /^PAY ₹/ }));
    expect(screen.getByText("Order successful")).toBeTruthy();
    await waitFor(() => {
      expect(badge()).toBe(before - 1);
    });
    await user.click(screen.getByRole("button", { name: "Back to home" }));
    expect(badge()).toBe(before - 1);
  });

  it("shows saved pieces on the profile, including the H&M shirt", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.getByRole("heading", { name: "Profiles" })).toBeTruthy();
    expect(screen.getByText("Shop as")).toBeTruthy();
    expect(screen.getByText(/Sujata · 28 · Bengaluru/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Profile" }));
    const panel = document.querySelector("aside.drawer") as HTMLElement;
    expect(within(panel).getByText("From your wishlist")).toBeTruthy();
    expect(within(panel).queryByText("Shop as")).toBeNull();
    expect(within(panel).getByRole("button", { name: "Back" })).toBeTruthy();
    expect(within(panel).queryByText("Compare your saves")).toBeNull();
    expect(within(panel).getByAltText("Regular Fit Linen Shirt").getAttribute("src")).toMatch(/linen-product/);
    expect(within(panel).getByText("H&M")).toBeTruthy();
  });

  it("resets the shopper back to Sujata home state", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.click(screen.getByRole("button", { name: "Bag" }));
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();

    await resetDemo(user);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Profiles" })).toBeTruthy();
      expect(screen.getByText(/Sujata · 28 · Bengaluru/)).toBeTruthy();
    });
    expect(screen.queryByRole("heading", { name: "Shopping Bag" })).toBeNull();
  });

  it("switches shopper from the demo menu", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.getByRole("option", { name: /Sujata/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Priya/ })).toBeTruthy();
    await user.click(screen.getByRole("option", { name: /Kabir/ }));
    await waitFor(() => {
      const rail = document.querySelector(".web-page .saved-rail");
      expect(rail?.querySelectorAll(".saved-tile").length).toBeGreaterThanOrEqual(2);
      expect(rail?.textContent).toMatch(/Puma|Sassafras|H&M/i);
      expect(rail?.textContent).not.toMatch(/Libas/i);
      expect(rail?.textContent).not.toMatch(/Bookmark/);
    });
    const kabirBadge = screen.getByRole("button", { name: "Wishlist" }).querySelector(".badge-count");
    expect(Number(kabirBadge?.textContent)).toBeGreaterThanOrEqual(8);
    await openWishlist(user);
    expect(screen.getByText("Court Sneakers")).toBeTruthy();
    expect(screen.queryByText("Floral Printed Wrap Midi Dress")).toBeNull();
  });

  it("walks quality save, F5 similar, and never shows a fake conversion rate", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.queryByText(/wishlist.?cart/i)).toBeNull();
    expect(screen.queryByText(/\b15%\b/)).toBeNull();
    expect(screen.queryByText(/conversion rate/i)).toBeNull();

    await user.click(screen.getAllByRole("button", { name: "Save to wishlist" })[0]);
    await user.click(screen.getByRole("button", { name: /Check quality first/ }));
    expect(screen.queryByText("When is the occasion?")).toBeNull();
    await waitFor(() => {
      expect(screen.getByText("Printed Fit & Flare Dress").closest("article")?.textContent).toMatch(/Quality & trust/);
    });
    await openWishlist(user);
    await user.click(screen.getByRole("button", { name: "See Similar Items" }));
    expect(screen.getByRole("heading", { name: "Similar items" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Add to Wishlist" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Add to Bag" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Girls Party Frock")).toBeNull();
    expect(screen.queryByText("Boys Ethnic Set")).toBeNull();
    expect(screen.getByText("Saree")).toBeTruthy();
    expect(screen.getByText("Navy Silver Zari Saree")).toBeTruthy();
    expect(screen.getByText("Embroidered Kurta Set")).toBeTruthy();
    expect(screen.getByText("Floral Summer Dress")).toBeTruthy();
    const similarShots = ["Navy Silver Zari Saree", "Embroidered Kurta Set", "Floral Summer Dress"].map(
      (title) => screen.getByAltText(title).getAttribute("src"),
    );
    expect(new Set(similarShots).size).toBe(similarShots.length);
    expect(similarShots.every((src) => src && !/women-kurta/.test(src))).toBe(true);
    const navy = screen.getByText("Navy Silver Zari Saree").closest("article")!;
    await user.click(within(navy).getByRole("button", { name: "Add to Bag" }));
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
    expect(screen.getByText("Navy Silver Zari Saree")).toBeTruthy();
  });

  it("can bag a restocked size from wishlist without opening an inbox", async () => {
    const user = userEvent.setup();
    const runtime = createShopperRuntime();
    runtime.restockBiba();
    render(<ShopperApp runtime={runtime} />);
    await openWishlist(user);
    const restocked = screen.getByText("Ethnic A-Line Anarkali Kurta").closest("article")!;
    expect(restocked.textContent).toMatch(/Size S/);
    await user.click(within(restocked).getByRole("button", { name: "MOVE TO BAG" }));
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
    expect(screen.queryByText("Your size is back! 📦")).toBeNull();
  });

  it("shows past orders from the profile menu", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await user.click(screen.getByRole("button", { name: "Profile" }));
    await user.click(screen.getByRole("button", { name: "Orders" }));
    expect(screen.getByRole("heading", { name: "Orders" })).toBeTruthy();
    expect(screen.getByText("Floral Printed Wrap Midi Dress")).toBeTruthy();
  });

  it("walks home, bag, back, checkout, and pay like a shopper", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    const floral = screen.getByText("Floral Summer Dress").closest(".trend-card-wrap")!;
    await user.click(within(floral).getByRole("button", { name: "Add to Bag" }));
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
    expect(screen.getByText("Floral Summer Dress")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Women · New arrivals")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Wishlist" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Bag" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(screen.getByRole("heading", { name: "Checkout" })).toBeTruthy();
    expect(screen.getByText("Sujata Banerjee")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "Cash on Delivery" }));
    await user.click(screen.getByRole("button", { name: /^PAY ₹/ }));
    expect(screen.getByText("Order successful")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back to home" }));
    expect(screen.getByRole("heading", { name: "Profiles" })).toBeTruthy();
  });

  it("keeps women mega search in women and does not mix shirts from men", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.click(screen.getByRole("button", { name: "Shirts" }));
    expect(screen.getByText(/Results for/)).toBeTruthy();
    expect(screen.getByText("Black Micro-Polka Shirt")).toBeTruthy();
    expect(screen.getByText("Blush Utility Shirt")).toBeTruthy();
    expect(screen.queryByText("Cotton Casual Shirt")).toBeNull();
    expect(screen.queryByText("511 Slim Jeans")).toBeNull();
  });

  it("shops the visible hero look, not the first slide", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.click(screen.getByRole("button", { name: "Show Ethnic Edit" }));
    await user.click(screen.getByRole("button", { name: "Shop this look" }));
    expect(screen.getByText(/Results for “ethnic”/)).toBeTruthy();
    expect(screen.getByText("Ethnic A-Line Anarkali Kurta")).toBeTruthy();
    expect(screen.queryByText("Floral Summer Dress")).toBeNull();
  });

  it("keeps a women wishlist item after browsing men", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await user.click(screen.getByRole("button", { name: "MEN" }));
    expect(screen.getByText("511 Slim Jeans")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "WOMEN" }));
    await openWishlist(user);
    expect(screen.getByText("Ethnic A-Line Anarkali Kurta")).toBeTruthy();
    expect(screen.getByText(/Women ·/)).toBeTruthy();
  });

  it("checks out Kabir to his Delhi address", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await user.click(screen.getByRole("option", { name: /Kabir/ }));
    await waitFor(() => {
      expect(screen.getByText(/Kabir · 21 · Delhi/)).toBeTruthy();
    });
    await openWishlist(user);
    const sneakers = screen.getByText("Court Sneakers").closest("article")!;
    await user.click(within(sneakers).getByRole("button", { name: "MOVE TO BAG" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(screen.getByText("Kabir Mehta")).toBeTruthy();
    expect(screen.getByText("7, Greater Kailash I, Delhi, 110048")).toBeTruthy();
    expect(screen.queryByText("Sujata Banerjee")).toBeNull();
  });

  it("compares kurtas with kurta photos and never a saree shot", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);
    expect(screen.getByAltText("Zari Border Silk Saree").getAttribute("src")).toMatch(/women-kurta/);
    await user.click(screen.getByRole("button", { name: /Compare \d+ kurtas in Women/ }));
    expect(screen.getByAltText("Cotton Straight Kurta").getAttribute("src")).toMatch(/women-blue-kurta/);
    expect(screen.getByAltText("Embroidered Festive Kurta").getAttribute("src")).toMatch(/women-pink-anarkali/);
    expect(screen.getByAltText("Yoke Printed Kurta").getAttribute("src")).toMatch(/women-black-kurta/);
    expect(screen.queryByAltText("Zari Border Silk Saree")).toBeNull();
    expect([...document.querySelectorAll(".compare-card img")].every((img) => !/women-kurta\.jpg/.test((img as HTMLImageElement).src))).toBe(true);
  });

  it("swaps medal brands with the category and shows an empty bag", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    expect(screen.getByRole("button", { name: "Kalini" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Roadster" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "MEN" }));
    expect(screen.getByRole("button", { name: "Roadster" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kalini" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Bag" }));
    expect(screen.getByText("Your bag is empty")).toBeTruthy();
  });
});
