/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ITEM_A_ID } from "../domain/models";
import { createRuntime } from "../runtime";
import { App } from "./App";

afterEach(() => {
  cleanup();
});

describe("Phase 4 researcher demo", () => {
  it("revisit shows why saved; optional note; Add to Bag stays one tap", async () => {
    const user = userEvent.setup();
    const runtime = createRuntime();
    render(<App runtime={runtime} />);

    await user.click(screen.getByRole("button", { name: /^Wishlist$/i }));
    expect(
      screen.getByText("Saved from search “linen shirt” · 12 days ago"),
    ).toBeTruthy();
    expect(screen.getByText("Saved from the product page · 19 days ago")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "MYNTRA" }));
    await user.click(screen.getByRole("button", { name: /Search “linen shirt”/i }));
    await user.click(
      screen.getByRole("button", { name: /Save Linen Resort Shirt/i }),
    );

    await user.click(screen.getByRole("button", { name: /^MYNTRA$/i }));
    await user.click(screen.getByRole("button", { name: /^Wishlist$/i }));
    expect(screen.getByText("Saved from search “linen shirt” · today")).toBeTruthy();

    const resort = [...document.querySelectorAll("[data-item-id]")].find((node) =>
      node.textContent?.includes("Linen Resort Shirt"),
    );
    expect(resort).toBeTruthy();
    const card = within(resort as HTMLElement);
    await user.click(card.getByText("More"));
    await user.click(card.getByRole("button", { name: /Add a note/i }));
    await user.type(screen.getByLabelText("Note"), "For the Goa trip");
    await user.click(screen.getByRole("button", { name: /Save note/i }));
    expect(screen.getByText("For the Goa trip")).toBeTruthy();

    const resortAfterNote = [...document.querySelectorAll("[data-item-id]")].find(
      (node) => node.textContent?.includes("Linen Resort Shirt"),
    );
    await user.click(
      within(resortAfterNote as HTMLElement).getByRole("button", {
        name: "Add to Bag",
      }),
    );
    await user.click(screen.getByRole("button", { name: /Continue to checkout/i }));
    await user.click(screen.getByRole("button", { name: /Place order/i }));
    expect(screen.getByText("Order successful")).toBeTruthy();

    expect(
      runtime.analytics.events.some(
        (event) =>
          event.name === "wishlist_item_saved" &&
          event.source === "search" &&
          event.has_note === false,
      ),
    ).toBe(true);
    expect(JSON.stringify(runtime.analytics.events)).not.toContain(
      "For the Goa trip",
    );
  });

  it("long note truncates and expand still leaves Add to Bag one tap", async () => {
    const user = userEvent.setup();
    const runtime = createRuntime();
    const long =
      "Need this linen shirt for the Goa trip next month and maybe the wedding after that";
    runtime.api.patchNote("user-demo", ITEM_A_ID, { note: long });
    render(<App runtime={runtime} />);

    await user.click(screen.getByRole("button", { name: /^Wishlist$/i }));
    expect(screen.queryByText(long)).toBeNull();
    expect(screen.getByText(/Need this linen shirt/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "more" }));
    expect(screen.getByText(long)).toBeTruthy();

    const linen = document.querySelector(`[data-item-id="${ITEM_A_ID}"]`);
    expect(
      within(linen as HTMLElement).getByRole("button", {
        name: "Currently unavailable",
      }),
    ).toBeTruthy();
  });
});
