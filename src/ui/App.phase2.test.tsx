/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createRuntime } from "../runtime";
import { App } from "./App";

describe("Phase 2 researcher demo", () => {
  it("restock both: one notification and two badges", async () => {
    const user = userEvent.setup();
    render(<App runtime={createRuntime()} />);

    await user.click(screen.getByRole("button", { name: /Restock both items/i }));
    await user.click(screen.getByRole("button", { name: /^Wishlist$/i }));

    expect(screen.getAllByText("Size M back in stock")).toHaveLength(2);
    const order = [...document.querySelectorAll("[data-item-id]")].map((node) =>
      node.getAttribute("data-item-id"),
    );
    expect(order[0]).toBe("wish-linen-shirt");
    expect(order[1]).toBe("wish-travel-jacket");
    expect(order[2]).toBe("wish-jeans");

    await user.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(
      screen.getAllByRole("button", { name: /Back in Stock, Size M available/i }),
    ).toHaveLength(1);
  });
});
