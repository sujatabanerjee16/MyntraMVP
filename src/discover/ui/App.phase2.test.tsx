/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createDiscoverRuntime } from "../runtime";
import { DiscoverApp } from "./App";

describe("Phase 2 dashboard demo", () => {
  it("filters, drills evidence, and keeps NS1 empty", async () => {
    const user = userEvent.setup();
    render(<DiscoverApp runtime={createDiscoverRuntime()} />);

    await user.selectOptions(screen.getByLabelText("Age"), "age_18_24");
    await user.selectOptions(screen.getByLabelText("Category"), "all");
    await user.selectOptions(screen.getByLabelText("Price"), "500-4700");

    expect(screen.getByRole("heading", { name: "Ranked non-conversion reasons" })).toBeTruthy();
    const reasonButtons = screen
      .getByRole("region", { name: "Ranked reasons" })
      .querySelectorAll("button");
    expect(reasonButtons.length).toBeGreaterThan(0);
    await user.click(reasonButtons[0] as HTMLElement);
    expect(screen.getByRole("heading", { name: "Evidence" })).toBeTruthy();
    expect(
      screen.getByText("Not in the scraped corpus — needs real checkout events"),
    ).toBeTruthy();
    expect(screen.getByText("Reason distribution by platform")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Deep Dive" })).toBeTruthy();
  });
});
