/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createDiscoverRuntime } from "../runtime";
import { DiscoverApp } from "./App";

describe("Phase 0 researcher shell", () => {
  it("shows corpus as-of and an empty NS1 that reload cannot fill", async () => {
    const user = userEvent.setup();
    render(<DiscoverApp runtime={createDiscoverRuntime()} />);

    expect(screen.getByText(/Corpus as of 2026-08-29/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Wishlist-to-Purchase" })).toBeTruthy();
    expect(screen.getByLabelText("north star unavailable").textContent?.trim()).toBe(
      "—",
    );
    expect(
      screen.getByText("Not in the scraped corpus — needs real checkout events"),
    ).toBeTruthy();
    expect(screen.queryByText(/^0%$/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(screen.getByLabelText("north star unavailable").textContent?.trim()).toBe(
      "—",
    );
    expect(
      screen.getByText("Not in the scraped corpus — needs real checkout events"),
    ).toBeTruthy();
  });
});
