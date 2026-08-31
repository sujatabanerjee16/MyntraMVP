/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createRuntime } from "../runtime";
import { App } from "./App";

afterEach(() => {
  cleanup();
});

describe("Phase 6 researcher demo", () => {
  it("Phase 1 path shows conversion as the ship metric and leak 0", async () => {
    const user = userEvent.setup();
    render(<App runtime={createRuntime()} />);

    await user.click(screen.getByRole("button", { name: /Back in stock — Size M/i }));
    await user.click(screen.getByRole("button", { name: /Notifications/i }));
    await user.click(
      screen.getByRole("button", { name: /Back in Stock, Size M available/i }),
    );
    await user.click(screen.getByRole("button", { name: "Add to Bag" }));
    await user.click(screen.getByRole("button", { name: /Continue to checkout/i }));
    await user.click(screen.getByRole("button", { name: /Place order/i }));
    await user.click(screen.getByRole("button", { name: /Back to home/i }));

    const dash = within(screen.getByLabelText("Measurement dashboard"));
    expect(dash.getByText(/not the ship metric/i)).toBeTruthy();
    expect(dash.getByText(/P1 · primary proxy/i)).toBeTruthy();
    expect(dash.getByText(/nudged_in_last_7d 1/i)).toBeTruthy();
    expect(dash.getByText(/Monetary leak \(must be 0\)/i)).toBeTruthy();
  });

  it("double restock shows one sent and a suppressed event", async () => {
    const user = userEvent.setup();
    render(<App runtime={createRuntime()} />);

    await user.click(screen.getByRole("button", { name: /Restock both items/i }));
    const dash = within(screen.getByLabelText("Measurement dashboard"));
    expect(dash.getByText(/Funnel: sent 1/i)).toBeTruthy();
    await user.click(screen.getByText(/Measurement \(/i));
    expect(screen.getAllByText(/reengagement_suppressed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/daily_cap/i).length).toBeGreaterThan(0);
  });
});
