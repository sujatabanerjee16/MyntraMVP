/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ITEM_B_ID } from "../domain/models";
import { SIMILAR_COPY } from "../domain/similar";
import { createRuntime } from "../runtime";
import { App } from "./App";

afterEach(() => {
  cleanup();
});

describe("Phase 5 researcher demo", () => {
  it("jacket search hint taps through; dismiss then search again has no hint", async () => {
    const user = userEvent.setup();
    const runtime = createRuntime();
    runtime.flags.set("reeng.similar_nudge", true);
    render(<App runtime={runtime} />);

    await user.click(screen.getByRole("button", { name: /Search jacket/i }));
    expect(await screen.findByText(SIMILAR_COPY)).toBeTruthy();
    expect(screen.getByText("Lightweight Travel Jacket")).toBeTruthy();
    expect(screen.getByText("Tailored Work Blazer")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /View saved item/i }));
    const focused = document.querySelector(".wishlist-card.focused");
    expect(focused?.getAttribute("data-item-id")).toBe(ITEM_B_ID);
    expect(screen.getByText("Lightweight Travel Jacket")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "MYNTRA" }));
    await user.click(screen.getByRole("button", { name: /Search jacket/i }));
    expect(await screen.findByText(SIMILAR_COPY)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Dismiss$/i }));
    expect(screen.queryByText(SIMILAR_COPY)).toBeNull();
    expect(screen.getByText("Lightweight Travel Jacket")).toBeTruthy();
  });

  it("flag off leaves search unchanged", async () => {
    const user = userEvent.setup();
    render(<App runtime={createRuntime()} />);
    await user.click(screen.getByRole("button", { name: /Search jacket/i }));
    expect(screen.queryByText(SIMILAR_COPY)).toBeNull();
    expect(screen.getByText("Lightweight Travel Jacket")).toBeTruthy();
  });
});
