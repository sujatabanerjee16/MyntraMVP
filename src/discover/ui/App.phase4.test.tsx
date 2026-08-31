/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createDiscoverRuntime } from "../runtime";
import { DiscoverApp } from "./App";

describe("Phase 4 Ask AI demo", () => {
  it("refuses a conversion question from the dock", async () => {
    const user = userEvent.setup();
    render(<DiscoverApp runtime={createDiscoverRuntime()} />);
    await user.type(
      screen.getByLabelText("Ask a question"),
      "What is 30-day wishlist conversion?",
    );
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.getByText(/Not in the corpus/i)).toBeTruthy();
  });
});
