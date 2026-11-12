// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import CanvasLab from "@/shell/DemoLabCanvas";

/** The canvas draws a row of cards, a detail panel for the picked card, and the forks under their owner cards. */

afterEach(cleanup);

const open = (name: RegExp) => {
  const view = render(<CanvasLab />);
  const item = within(view.container).getAllByRole("button").find((b) => name.test(b.textContent ?? ""));
  expect(item, `no list entry matches ${name}`).toBeDefined();
  fireEvent.click(item!);
  return view;
};

describe("the canvas tab", () => {
  it("draws every card of a recipe and shows the first card's detail", () => {
    const view = open(/CoAssist Copay/i);
    const cards = view.getAllByTestId("canvas-card");
    expect(cards.length).toBeGreaterThan(4);
    expect(within(view.getByTestId("canvas-detail")).getByText(/Card 1/)).toBeDefined();
  });

  it("opens a card's detail when it is clicked", () => {
    const view = open(/CoAssist Copay/i);
    const second = view.getAllByTestId("canvas-card")[1];
    fireEvent.click(second);
    expect(within(view.getByTestId("canvas-detail")).getByText(/Card 2/)).toBeDefined();
    expect(second.getAttribute("aria-pressed")).toBe("true");
  });

  it("draws a patient fork's branches with their steps, and a story fork with its picked outcome", () => {
    const view = open(/CoAssist Copay/i);
    const pricing = view.getByTestId("canvas-fork-pricing");
    expect(pricing.getAttribute("data-chooser")).toBe("patient");
    expect(within(pricing).getAllByTestId("canvas-exit").length).toBe(2);
    expect(pricing.textContent).toMatch(/retail store/);
    const bi = view.getByTestId("canvas-fork-bi");
    expect(within(bi).getAllByTestId("canvas-exit").filter((e) => e.getAttribute("data-selected") === "true")).toHaveLength(1);
  });
});
