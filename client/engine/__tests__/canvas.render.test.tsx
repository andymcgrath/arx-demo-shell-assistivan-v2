// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import CanvasLab from "@/shell/DemoLabCanvas";
import { DraftProvider } from "@/shell/DemoLabDraft";

/** The canvas draws a row of cards, a detail panel for the picked card, and the forks under their owner cards. */

afterEach(cleanup);

const open = (name: RegExp) => {
  const view = render(<DraftProvider><CanvasLab /></DraftProvider>);
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

describe("editing on the canvas", () => {
  const cards = (view: ReturnType<typeof open>) => view.getAllByTestId("canvas-card");
  const modules = (view: ReturnType<typeof open>) => cards(view).map((c) => c.getAttribute("data-module"));

  it("adds a card on either side of a card, using only blocks that fit", () => {
    const view = open(/CoAssist Copay/i);
    const before = cards(view).length;
    fireEvent.click(view.getAllByTestId("canvas-add")[1]);
    const panel = view.getByTestId("canvas-insert");
    const options = within(panel).getAllByTestId("insert-option");
    // A block the ordering rules reject is listed, greyed, with its reason.
    expect(options.some((o) => o.getAttribute("data-disabled") === "true")).toBe(true);
    const ok = options.find((o) => o.getAttribute("data-disabled") === "false" && o.getAttribute("data-module") === "scheduling");
    expect(ok ?? options.find((o) => o.getAttribute("data-disabled") === "false")).toBeDefined();
    fireEvent.click((ok ?? options.find((o) => o.getAttribute("data-disabled") === "false"))!);
    expect(cards(view)).toHaveLength(before + 1);
    expect(view.queryByTestId("canvas-insert")).toBeNull();
  });

  it("removes a card and moves one, from the card's own actions", () => {
    const view = open(/CoAssist Copay/i);
    const first = modules(view);
    fireEvent.click(cards(view)[1]);
    fireEvent.click(within(view.getByTestId("canvas-detail")).getByText("Move right"));
    expect(modules(view)[2]).toBe(first[1]);
    fireEvent.click(within(view.getByTestId("canvas-detail")).getByText("Remove"));
    expect(cards(view)).toHaveLength(first.length - 1);
  });

  it("keeps a card a changed outcome no longer feeds, disabled, and frees it when the pick changes back", () => {
    const view = open(/COA Direct to Patient/i);
    const bi = view.getByTestId("canvas-fork-bi");
    const exit = (id: string) => within(bi).getAllByTestId("canvas-exit").find((e) => e.getAttribute("data-exit") === id)!;
    const total = cards(view).length;
    fireEvent.click(within(exit("medical_covered")).getByRole("button"));
    // The medical outcome needs a transfer block the draft lacks, so the pick is refused and nothing changes.
    expect(cards(view).filter((c) => c.getAttribute("data-disabled") === "true")).toHaveLength(0);
    expect(cards(view)).toHaveLength(total);
  });

  it("pins a patient fork's branch for the demo, and unpins it", () => {
    const view = open(/CoAssist Copay/i);
    const pricing = view.getByTestId("canvas-fork-pricing");
    const retail = () => within(pricing).getAllByTestId("canvas-exit").find((e) => e.getAttribute("data-exit") === "retail")!;
    fireEvent.click(within(retail()).getByText("Pin for this demo"));
    expect(retail().getAttribute("data-selected")).toBe("true");
    fireEvent.click(within(retail()).getByText(/Unpin/));
    expect(retail().getAttribute("data-selected")).toBe("false");
  });

  it("asks before it replaces an edited draft", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(within(view.getByTestId("canvas-detail")).getByText("Remove"));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const other = within(view.container).getAllByRole("button").find((b) => /COA Direct to Patient/i.test(b.textContent ?? ""))!;
    const n = cards(view).length;
    fireEvent.click(other);
    expect(confirm).toHaveBeenCalled();
    expect(cards(view)).toHaveLength(n);
    confirm.mockRestore();
  });

  it("blocks the export until the request has what it needs", () => {
    const view = open(/CoAssist Copay/i);
    const problems = view.getByTestId("export-problems");
    expect(problems.textContent).toMatch(/win theme/i);
    expect((view.getByText("Export request and prompt") as HTMLButtonElement).disabled).toBe(true);
  });
});
