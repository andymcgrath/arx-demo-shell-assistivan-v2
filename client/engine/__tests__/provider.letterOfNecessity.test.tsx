// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PaQuestionsStep } from "@/portals/provider";
import { letterOfNecessityDocument } from "@/brand/documents";

vi.mock("@/engine/WorkflowProvider", async (orig) => ({ ...(await orig<object>()), useWorkflowDispatch: () => vi.fn() }));

/**
 * The provider's PA form: the Letter of Necessity box. Nothing uploads. A click attaches the brand's sample PDF, and its name
 * opens the PDF in the viewer the iAssist documents use.
 */
afterEach(cleanup);

function open() {
  render(<PaQuestionsStep showLetterOfNecessity onBack={() => {}} onCancel={() => {}} onNext={() => {}} />);
  const question = screen.getByText("Is a Letter of Necessity required?").parentElement!;
  fireEvent.click([...question.querySelectorAll("button, label, input")].find((e) => /yes/i.test(e.textContent ?? "") || (e as HTMLInputElement).value === "yes")!);
}

describe("Letter of Necessity upload", () => {
  it("attaches the sample PDF when the box is clicked, with no file picker", () => {
    open();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect((screen.getByText("Submit document") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText("Upload document"));
    expect(screen.getByText(letterOfNecessityDocument().fileName)).toBeTruthy();
    expect(screen.getByText("Document attached")).toBeTruthy();
    expect((screen.getByText("Submit document") as HTMLButtonElement).disabled).toBe(false);
  });

  it("opens the PDF in the reader when its name is clicked", () => {
    open();
    fireEvent.click(screen.getByText("Upload document"));
    fireEvent.click(screen.getByText(letterOfNecessityDocument().fileName));
    const reader = document.querySelector('object[type="application/pdf"]') as HTMLObjectElement;
    expect(reader.getAttribute("data")).toBe(letterOfNecessityDocument().file);
    // A full takeover: it sits directly in the body, so no scrolled or transformed ancestor clips it, and it fills the window.
    const dialog = screen.getByRole("dialog");
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain("fixed inset-0");
    fireEvent.click(screen.getByLabelText("Close"));
    expect(document.querySelector('object[type="application/pdf"]')).toBeNull();
  });

  it("submits the attached document", () => {
    open();
    fireEvent.click(screen.getByText("Upload document"));
    fireEvent.click(screen.getByText("Submit document"));
    expect(screen.getByText("Submitted")).toBeTruthy();
  });
});
