/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createShopperRuntime } from "../runtime";
import { ShopperApp } from "./App";

afterEach(() => {
  cleanup();
});

async function openDemo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Notifications" }));
}

async function openWishlist(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Wishlist" }));
}

describe("wishlist mvp1", () => {
  it("opens on the laptop site, then can move to phone", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.getByText("Sujata is shopping on myntra.com")).toBeTruthy();
    expect(screen.getByText("myntra.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "MYNTRA" })).toBeTruthy();
    expect(screen.getByText("Myntra")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Send a notification/ })).toBeNull();
    expect(screen.getByText("MYNTRASAVE")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Summer Dresses" })).toBeTruthy();
    expect(screen.getByText("From your wishlist")).toBeTruthy();
    expect(screen.queryByText(/The problem/)).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Phone" }));
    expect(screen.getByText("She's on her phone")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Laptop" }));
    expect(screen.getByText("Sujata is shopping on myntra.com")).toBeTruthy();
  });

  it("opens each top tab with its own products", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.getByAltText("Floral Summer Dress").getAttribute("src")).toMatch(/women-floral/);

    await user.click(screen.getByRole("button", { name: "MEN" }));
    expect(screen.getByText("511 Slim Jeans")).toBeTruthy();
    expect(screen.getByAltText("511 Slim Jeans").getAttribute("src")).toMatch(/men-jeans/);

    await user.click(screen.getByRole("button", { name: "KIDS" }));
    expect(screen.getByText("Girls Party Frock")).toBeTruthy();
    expect(screen.getByAltText("Girls Party Frock").getAttribute("src")).toMatch(/kids-frock/);

    await user.click(screen.getByRole("button", { name: "HOME" }));
    expect(screen.getByText("Cotton Bed Sheet Set")).toBeTruthy();
    expect(screen.getByAltText("Cotton Bed Sheet Set").getAttribute("src")).toMatch(/home-sheet/);

    await user.click(screen.getByRole("button", { name: "BEAUTY" }));
    expect(screen.getByText("Superstay Lipstick")).toBeTruthy();
    expect(screen.getByAltText("Superstay Lipstick").getAttribute("src")).toMatch(/beauty-lip/);

    await user.click(screen.getByRole("button", { name: "GENZ" }));
    expect(screen.getByText("Baggy Cargo Pants")).toBeTruthy();
    expect(screen.getByAltText("Baggy Cargo Pants").getAttribute("src")).toMatch(/genz-cargo/);

    await user.click(screen.getByRole("button", { name: /STUDIO/ }));
    expect(screen.getByText("On-Set Maxi Dress")).toBeTruthy();
    expect(screen.getByAltText("On-Set Maxi Dress").getAttribute("src")).toMatch(/studio-dress/);
  });

  it("adds a new arrival to the bag and can wishlist it", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    expect(screen.getAllByRole("button", { name: "Add to Bag" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Add to Wishlist" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Save to wishlist" }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Add to Bag" })[0]);
    expect(screen.getByRole("heading", { name: "Shopping Bag" })).toBeTruthy();
    expect(screen.getByText("Printed Fit & Flare Dress")).toBeTruthy();
  });

  it("shows tagged cards and a dead nudge on wishlist", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    expect(screen.getByRole("heading", { name: "Wishlist" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notification settings" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /All available/ })).toBeTruthy();
    expect(screen.getByText(/Price drop/)).toBeTruthy();
    expect(screen.queryByText("Ethnic A-Line Anarkali Kurta")).toBeNull();
    await user.click(screen.getByRole("tab", { name: /Restocking Soon/ }));
    expect(screen.getByText(/My size/)).toBeTruthy();
    expect(screen.getByText("Ethnic A-Line Anarkali Kurta")).toBeTruthy();
    expect(screen.queryByText(/This item won't be restocked/)).toBeNull();
    await user.click(screen.getByRole("tab", { name: /All available/ }));
    expect(screen.getByText(/This item won't be restocked/)).toBeTruthy();
    expect(screen.getByText("Printed Straight Kurta").closest("article")?.className).toMatch(/dead-nudge/);
    expect(screen.getByText("512 Slim Tapered Jeans")).toBeTruthy();
    expect(screen.getByText("Complete the look")).toBeTruthy();
    expect(screen.getByText(/In your wishlist/)).toBeTruthy();
    expect(screen.getAllByText(/Same brand/).length).toBeGreaterThan(0);
  });

  it("filters wishlist collections into office, wedding, and summer buckets", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    await user.click(screen.getByRole("tab", { name: /Office Wear/ }));
    expect(screen.getByText("Regular Fit Linen Shirt")).toBeTruthy();
    expect(screen.getByText("512 Slim Tapered Jeans")).toBeTruthy();
    expect(screen.queryByText("Flared Ethnic Maxi")).toBeNull();

    await user.click(screen.getByRole("tab", { name: /Friend's Wedding/ }));
    expect(screen.getByText("Flared Ethnic Maxi")).toBeTruthy();
    expect(screen.getByText("Pleated Party Dress")).toBeTruthy();
    expect(screen.queryByText("Regular Fit Linen Shirt")).toBeNull();
    await user.click(screen.getByRole("tab", { name: /Restocking Soon/ }));
    expect(screen.getByText("Ethnic A-Line Anarkali Kurta")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: /Summer Casuals/ }));
    expect(screen.getByText("Floral Printed Wrap Midi Dress")).toBeTruthy();
    expect(screen.queryByText("512 Slim Tapered Jeans")).toBeNull();
  });

  it("tags a new save and skips without a chip", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.click(screen.getAllByRole("button", { name: "Add to Wishlist" })[0]);
    expect(screen.getByText("Saving this for…?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Upcoming Occasion/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Waiting for Price Drop/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Waiting for My Size/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Just Bookmarking/ })).toBeTruthy();
    await user.hover(screen.getByRole("button", { name: /Waiting for Price Drop/ }));
    expect(screen.getByText("Saving this for…?")).toBeTruthy();
    expect(screen.getByText("Printed Fit & Flare Dress").closest("article")?.textContent).not.toMatch(/Price drop/);

    await user.click(screen.getByRole("button", { name: /Waiting for Price Drop/ }));
    const added = screen.getByText("Printed Fit & Flare Dress").closest("article");
    expect(added?.textContent).toMatch(/Price drop/);

    await openDemo(user);
    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    await user.click(screen.getAllByRole("button", { name: "Add to Wishlist" })[0]);
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText("Printed Fit & Flare Dress").closest("article")?.textContent).not.toMatch(
      /Price drop|Occasion|My size|Bookmark/,
    );
  });

  it("edits a tag from a long-press and defaults prefs to on", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    fireEvent.contextMenu(screen.getByText("Regular Fit Linen Shirt").closest("article")!);
    await user.click(screen.getByRole("button", { name: /Waiting for Price Drop/ }));
    expect(screen.getByText("Regular Fit Linen Shirt").closest("article")?.textContent).toMatch(/Price drop/);

    await user.click(screen.getByRole("button", { name: "Notification settings" }));
    expect(screen.getByRole("switch", { name: /Price Drop Alerts/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: /Size Back-in-Stock/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: /Occasion Reminders/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("opens a price-drop on the product and stays silent when the toggle is off", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await openDemo(user);
    await user.click(screen.getByRole("button", { name: "Drop Libas price" }));
    expect(screen.getByRole("dialog", { name: "Phone lock screen" })).toBeTruthy();
    expect(screen.getByText(/Lock screen — tap the Myntra notification/)).toBeTruthy();
    expect(screen.getByText("Price Drop on your Wishlist 🎉")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Price Drop on your Wishlist/ }));
    expect(screen.queryByRole("dialog", { name: "Phone lock screen" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add to Bag" }).className).toMatch(/is-highlight/);
    expect(screen.getByText("20% OFF")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continue on laptop" }));
    expect(screen.getByText("myntra.com")).toBeTruthy();
    expect(screen.getByText("20% OFF")).toBeTruthy();

    await openDemo(user);
    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    await openWishlist(user);
    await user.click(screen.getByRole("button", { name: "Notification settings" }));
    await user.click(screen.getByRole("switch", { name: /Price Drop Alerts/ }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await openDemo(user);
    await user.click(screen.getByRole("button", { name: "Drop Libas price" }));
    expect(screen.queryByRole("dialog", { name: "Phone lock screen" })).toBeNull();
    expect(screen.getByText(/This shopper turned this alert off in Settings/)).toBeTruthy();
  });

  it("restocks only size S and filters the wishlist from an occasion ping", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await openDemo(user);
    await user.click(screen.getByRole("button", { name: /Other size restocked \(L\)/ }));
    expect(screen.queryByRole("dialog", { name: "Phone lock screen" })).toBeNull();
    expect(screen.getByText(/Correct: no push/)).toBeTruthy();

    await openDemo(user);
    await user.click(screen.getByRole("button", { name: /Restock her saved size \(S\)/ }));
    expect(screen.getByRole("dialog", { name: "Phone lock screen" })).toBeTruthy();
    expect(screen.getByText("Your size is back! 📦")).toBeTruthy();

    await openDemo(user);
    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    await openDemo(user);
    await user.click(screen.getByRole("button", { name: "Send occasion reminder" }));
    expect(screen.getByRole("dialog", { name: "Phone lock screen" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Occasion is in/ }));
    expect(screen.getByText("Items saved for your occasion")).toBeTruthy();
    expect(screen.getByText("Flared Ethnic Maxi")).toBeTruthy();
    expect(screen.queryByText("Regular Fit Linen Shirt")).toBeNull();
  });

  it("removes a dead item from the top card and never pushes it", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);

    await user.click(screen.getByRole("button", { name: /Remove/ }));
    expect(screen.queryByText("This item won't be restocked")).toBeNull();
    expect(screen.queryByText("Printed Straight Kurta")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("You're all caught up")).toBeTruthy();
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
    expect(screen.getByRole("button", { name: "In wishlist" })).toBeTruthy();
  });

  it("shows a checkout rec before the order is placed", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await openWishlist(user);
    const libas = screen.getByText("Floral Printed Wrap Midi Dress").closest("article")!;
    await user.click(within(libas).getByRole("button", { name: "MOVE TO BAG" }));
    await user.click(screen.getByRole("button", { name: "Continue to checkout" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(screen.getByRole("dialog", { name: "Recommended for today's order" })).toBeTruthy();
    expect(screen.getByText(/Why we picked this/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Maybe next time" }));
    expect(screen.getByText("Order successful")).toBeTruthy();
  });

  it("switches shopper from the demo menu", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);

    await user.click(screen.getByRole("button", { name: "Switch shopper" }));
    expect(screen.getByText(/switch the shopper/)).toBeTruthy();
    await user.click(screen.getByRole("option", { name: /Kabir/ }));
    expect(screen.getByText("Kabir is shopping on myntra.com")).toBeTruthy();
    await openWishlist(user);
    expect(screen.getByText("Court Sneakers")).toBeTruthy();
    expect(screen.queryByText("Floral Printed Wrap Midi Dress")).toBeNull();
  });

  it("opens stylist picks with a why-recommended line", async () => {
    const user = userEvent.setup();
    render(<ShopperApp runtime={createShopperRuntime()} />);
    await user.click(screen.getByRole("button", { name: "See picks" }));
    expect(screen.getByRole("heading", { name: "Styled for you" })).toBeTruthy();
    expect(screen.getAllByText(/pairs with your recent/i).length).toBeGreaterThan(0);
  });
});
