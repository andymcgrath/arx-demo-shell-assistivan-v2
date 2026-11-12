// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import CanvasLab from "@/shell/DemoLabCanvas";
import { DraftProvider } from "@/shell/DemoLabDraft";

/** The canvas draws a row of cards, a detail panel for the picked card, and the forks under their owner cards. */

const setWidth = (w: number) => Object.defineProperty(window, "innerWidth", { value: w, configurable: true, writable: true });
beforeEach(() => setWidth(1400));
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

  it("names the first card for the EHR referral and lists the Provider app", () => {
    const view = open(/CoAssist Copay/i);
    const first = view.getAllByTestId("canvas-card")[0];
    expect(first.textContent).toMatch(/EHR referral and patient onboarding/);
    expect(first.textContent).toMatch(/Provider/);
  });

  it("collapses and restores both side panels", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(view.getByRole("button", { name: "Hide demo list" }));
    expect(view.queryByLabelText("Demo list")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Hide card detail" }));
    expect(view.queryByLabelText("Card detail")).toBeNull();
    expect(view.getAllByTestId("canvas-card").length).toBeGreaterThan(4);
    fireEvent.click(view.getByRole("button", { name: "Show card detail" }));
    expect(view.getByLabelText("Card detail")).toBeDefined();
    fireEvent.click(view.getByRole("button", { name: "Show demo list" }));
    expect(view.getByLabelText("Demo list")).toBeDefined();
  });

  it("opens the detail panel when a card is added while it is collapsed", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(view.getByRole("button", { name: "Hide card detail" }));
    fireEvent.click(view.getAllByTestId("canvas-add")[1]);
    expect(view.getByLabelText("Card detail")).toBeDefined();
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
    const off = () => cards(view).filter((c) => c.getAttribute("data-disabled") === "true").length;
    const before = off();
    fireEvent.click(within(exit("medical_covered")).getByRole("button"));
    // The medical outcome needs a transfer block the draft lacks, so the pick is refused and nothing changes.
    expect(off()).toBe(before);
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

  it("prefills the win theme from the cards, so a loaded recipe is not blocked by it", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(view.getByRole("button", { name: /^(show|hide) request details/i }));
    const theme = within(view.getByTestId("request-panel")).getByLabelText("Win theme") as HTMLInputElement;
    expect(theme.value).toMatch(/^One eRx starts everything/);
    expect(view.queryByTestId("export-problems")?.textContent ?? "").not.toMatch(/win theme/i);
  });

  it("blocks the export until the request has what it needs, and the alert opens the details", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(view.getByRole("button", { name: /^(show|hide) request details/i }));
    fireEvent.change(within(view.getByTestId("request-panel")).getByLabelText("Win theme"), { target: { value: "" } });
    expect(view.getByTestId("export-problems").textContent).toMatch(/win theme/i);
    expect((view.getByText("Export request and prompt") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(view.getByRole("button", { name: /^(show|hide) request details/i }));
    expect(view.queryByTestId("request-panel")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Open Request details" }));
    expect(view.getByTestId("request-panel")).toBeDefined();
  });
});

describe("the request details and blank starts", () => {
  it("fills the request fields from the brand, edits them, and lets an empty field block the export", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(view.getByRole("button", { name: /^(show|hide) request details/i }));
    const panel = view.getByTestId("request-panel");
    const title = within(panel).getByLabelText("Title") as HTMLInputElement;
    expect(title.value).toMatch(/CoAssist Copay/);
    fireEvent.change(within(panel).getByLabelText("Win theme"), { target: { value: "" } });
    expect(view.getByTestId("export-problems").textContent).toMatch(/win theme/i);
    fireEvent.click(within(panel).getByRole("button", { name: "Suggest from the cards" }));
    expect(view.queryByTestId("export-problems")).toBeNull();
    fireEvent.change(within(panel).getByLabelText("Win theme"), { target: { value: "" } });
    fireEvent.change(within(panel).getByLabelText("Win theme"), { target: { value: "One handoff" } });
    expect((within(panel).getByLabelText("Win theme") as HTMLInputElement).value).toBe("One handoff");
    expect(view.queryByTestId("export-problems")).toBeNull();
    expect((view.getByText("Export request and prompt") as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps a new line when Enter is pressed in a list field", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(view.getByRole("button", { name: /^(show|hide) request details/i }));
    const box = within(view.getByTestId("request-panel")).getByLabelText(/Open questions/) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "First\n" } });
    expect(box.value).toBe("First\n");
    fireEvent.change(box, { target: { value: "First\nSecond" } });
    expect(box.value).toBe("First\nSecond");
  });

  it("starts a blank draft for either workflow, with the brand filled in", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(within(view.container).getAllByRole("button").find((b) => /Blank CoAssist demo/.test(b.textContent ?? ""))!);
    expect(view.queryAllByTestId("canvas-card")).toHaveLength(0);
    fireEvent.click(view.getByRole("button", { name: /^(show|hide) request details/i }));
    expect((within(view.getByTestId("request-panel")).getByLabelText("Brand name") as HTMLInputElement).value).not.toBe("");
  });

  it("marks the card an ordering problem belongs to", () => {
    const view = open(/CoAssist Copay/i);
    // Drag tracking off the end: move it left so it is no longer last.
    const cards = () => view.getAllByTestId("canvas-card");
    fireEvent.click(cards()[cards().length - 1]);
    fireEvent.click(within(view.getByTestId("canvas-detail")).getByText("Move left"));
    const flagged = view.getAllByTestId("card-issue");
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged[0].textContent).toMatch(/must be last/);
  });
});

describe("scenario and recipe sections", () => {
  it("draws the scenario and the recipe under their own headers", () => {
    const view = open(/CoAssist Copay/i);
    const scenario = view.getByTestId("section-scenario");
    const recipe = view.getByTestId("section-recipe");
    expect(within(scenario).getByTestId("band-scenario").textContent).toMatch(/Scenario/);
    expect(within(recipe).getByTestId("band-recipe").textContent).toMatch(/Recipe/);
    expect(within(scenario).queryAllByTestId("canvas-card")).toHaveLength(0);
    expect(within(recipe).getAllByTestId("canvas-card").length).toBeGreaterThan(4);
  });
});

describe("forks on the recipe", () => {
  it("shows where a fork sits when its name is clicked, and changes nothing", () => {
    const view = open(/CoAssist Copay/i);
    const before = view.getAllByTestId("canvas-card").length;
    const undoBefore = (view.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled;
    fireEvent.click(view.getByRole("button", { name: /Show where the Prior authorization decision fork sits/ }));
    expect(view.getByTestId("canvas-fork-pa").getAttribute("data-highlight")).toBe("true");
    expect(view.getAllByTestId("canvas-fork-pa")).toHaveLength(1);
    expect(view.getAllByTestId("canvas-card")).toHaveLength(before);
    expect((view.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(undoBefore);
  });

  it("removes a fork only from its x button", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(view.getByRole("button", { name: "Remove the Prior authorization decision fork" }));
    expect(view.queryByTestId("canvas-fork-pa")).toBeNull();
    expect(view.getByRole("button", { name: "Add the Prior authorization decision fork" })).toBeDefined();
  });
});

describe("undo, redo, reset, and history", () => {
  it("undoes and redoes an edit, and lists it in the history", () => {
    const view = open(/CoAssist Copay/i);
    const n = view.getAllByTestId("canvas-card").length;
    const undo = () => view.getByRole("button", { name: "Undo" }) as HTMLButtonElement;
    const redo = () => view.getByRole("button", { name: "Redo" }) as HTMLButtonElement;
    expect(undo().disabled).toBe(true);
    fireEvent.click(view.getAllByTestId("canvas-card")[1]);
    fireEvent.click(within(view.getByTestId("canvas-detail")).getByText("Remove"));
    expect(view.getAllByTestId("canvas-card")).toHaveLength(n - 1);
    fireEvent.click(view.getByRole("button", { name: /^History/ }));
    expect(view.getByTestId("canvas-history").textContent).toMatch(/Removed/);
    fireEvent.click(undo());
    expect(view.getAllByTestId("canvas-card")).toHaveLength(n);
    expect(redo().disabled).toBe(false);
    fireEvent.click(redo());
    expect(view.getAllByTestId("canvas-card")).toHaveLength(n - 1);
  });

  it("resets to the loaded draft, and the reset can be undone", () => {
    const view = open(/CoAssist Copay/i);
    const n = view.getAllByTestId("canvas-card").length;
    const reset = () => view.getByRole("button", { name: "Reset" }) as HTMLButtonElement;
    expect(reset().disabled).toBe(true);
    fireEvent.click(view.getAllByTestId("canvas-card")[1]);
    fireEvent.click(within(view.getByTestId("canvas-detail")).getByText("Remove"));
    fireEvent.click(reset());
    expect(view.getAllByTestId("canvas-card")).toHaveLength(n);
    fireEvent.click(view.getByRole("button", { name: "Undo" }));
    expect(view.getAllByTestId("canvas-card")).toHaveLength(n - 1);
  });

  it("jumps back to a point in the history", () => {
    const view = open(/CoAssist Copay/i);
    const n = view.getAllByTestId("canvas-card").length;
    for (let i = 0; i < 2; i++) {
      fireEvent.click(view.getAllByTestId("canvas-card")[1]);
      fireEvent.click(within(view.getByTestId("canvas-detail")).getByText("Remove"));
    }
    expect(view.getAllByTestId("canvas-card")).toHaveLength(n - 2);
    fireEvent.click(view.getByRole("button", { name: /^History/ }));
    const items = within(view.getByTestId("canvas-history")).getAllByRole("button");
    fireEvent.click(items[items.length - 1]);
    expect(view.getAllByTestId("canvas-card")).toHaveLength(n);
  });
});

describe("the request details expander", () => {
  it("reads as an expander: label, aria-expanded, and the to-fill count", () => {
    const view = open(/CoAssist Copay/i);
    const btn = () => view.getByRole("button", { name: /^(show|hide) request details/i });
    expect(btn().getAttribute("aria-expanded")).toBe("false");
    expect(btn().textContent).toMatch(/Show request details/);
    fireEvent.click(btn());
    expect(btn().getAttribute("aria-expanded")).toBe("true");
    expect(btn().textContent).toMatch(/Hide request details/);
    expect(view.getByTestId("request-panel").textContent).toMatch(/Request details/);
  });

  it("keeps the count of fields to fill", () => {
    const view = open(/CoAssist Copay/i);
    fireEvent.click(within(view.container).getAllByRole("button").find((b) => /Blank CoAssist demo/.test(b.textContent ?? ""))!);
    expect(view.getByRole("button", { name: /^show request details/i }).textContent).toMatch(/\(\d+ to fill\)/);
  });
});

describe("a narrow window", () => {
  it("starts with both side panels collapsed so the cards have room", () => {
    setWidth(800);
    const view = render(<DraftProvider><CanvasLab /></DraftProvider>);
    expect(view.queryByLabelText("Demo list")).toBeNull();
    expect(view.queryByLabelText("Card detail")).toBeNull();
    expect(view.getAllByTestId("canvas-card").length).toBeGreaterThan(4);
  });
});
