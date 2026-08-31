/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createRuntime } from "../runtime";
import { App } from "./App";

describe("Phase 1 researcher demo", () => {
  it("restock notification leads to a purchase decision", async () => {
    const user = userEvent.setup();
    render(<App runtime={createRuntime()} />);

    await user.click(screen.getByRole("button", { name: /Back in stock — Size M/i }));
    await user.click(screen.getByRole("button", { name: /Notifications/i }));
    await user.click(
      screen.getByRole("button", { name: /Back in Stock, Size M available/i }),
    );

    expect(screen.getByText("Size M back in stock")).toBeTruthy();
    const focused = document.querySelector(".wishlist-card.focused");
    expect(focused?.getAttribute("data-item-id")).toBe("wish-linen-shirt");

    await user.click(screen.getByRole("button", { name: "Add to Bag" }));
    await user.click(screen.getByRole("button", { name: /Continue to checkout/i }));
    await user.click(screen.getByRole("button", { name: /Place order/i }));

    expect(screen.getByText("Order successful")).toBeTruthy();
  });
});
