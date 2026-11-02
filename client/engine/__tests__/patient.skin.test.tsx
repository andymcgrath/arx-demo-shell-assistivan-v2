// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { switchWorkflow, useActorStore } from "@/engine/actorSingleton";
import { WorkflowProvider } from "@/engine/WorkflowProvider";
import { PortalRouter, useLocation } from "@/lib/portalRouter";
import { useDemoStore } from "@/store/demoStore";
import { usePatientStore } from "@/store/patientStore";
import { skinFor } from "@/shell/skin";
import type { ViewId } from "@/brand/schema";
import { startFlow } from "./harness";

/**
 * The two-factor screens in both skins. The patient skin changes the look and the code length (eight boxes, not six),
 * never the check or the events. Each case runs against the default screen and the patient screen with the same
 * expectation: the right code or digits send the same event and go to the same route, a wrong one does neither.
 */

const SKIN_CODES = { OTPVerification: "83145897", PaApprovedOtp: "20439761" } as const;
const DEFAULT_CODE = "314589";

let actor: ReturnType<typeof startFlow>;
let sent: string[];

beforeEach(() => {
  sessionStorage.clear();
  Element.prototype.scrollTo = () => {};
  (window as any).scrollTo = () => {};
  actor = startFlow("CoA_DTP");
  switchWorkflow("CoA_DTP");
  useActorStore.getState().setActor(actor as any);
  sent = [];
  const send = actor.send.bind(actor);
  vi.spyOn(actor, "send").mockImplementation(((e: any) => {
    sent.push(e.type);
    return send(e);
  }) as any);
  useDemoStore.setState({ flowType: "CoA_DTP" } as any);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Path() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function mount(slot: "PhoneVerification" | "OTPVerification" | "PaApprovedOtp", view: ViewId) {
  const Screen = skinFor(view)[slot];
  return render(
    <WorkflowProvider>
      <PortalRouter initialPath="/start">
        <Screen />
        <Path />
      </PortalRouter>
    </WorkflowProvider>,
  );
}

const path = () => screen.getByTestId("path").textContent;

/** Types a code the way each skin takes it: one input for the default, one box per digit for the patient skin. */
function enterCode(view: ViewId, code: string) {
  if (view === "full") {
    fireEvent.change(screen.getByPlaceholderText("••••••"), { target: { value: code } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    return;
  }
  const boxes = screen.getAllByRole("textbox");
  expect(boxes).toHaveLength(code.length);
  code.split("").forEach((digit, i) => fireEvent.change(boxes[i], { target: { value: digit } }));
}

describe.each<ViewId>(["full", "patient"])("%s skin: enrollment code", (view) => {
  const right = view === "full" ? DEFAULT_CODE : SKIN_CODES.OTPVerification;
  const wrong = view === "full" ? "000000" : "00000000";

  it("a wrong code shows the error and sends nothing", () => {
    mount("OTPVerification", view);
    enterCode(view, wrong);
    expect(screen.getByText(/didn't match/i)).toBeTruthy();
    expect(sent).not.toContain("VERIFY_OTP");
    expect(path()).toBe("/start");
  });

  it("the right code sends VERIFY_OTP and goes to Confirm Details", () => {
    mount("OTPVerification", view);
    enterCode(view, right);
    expect(sent).toContain("VERIFY_OTP");
    expect(path()).toBe("/confirm-details");
  });
});

describe.each<ViewId>(["full", "patient"])("%s skin: phone check", (view) => {
  const lastFour = () => usePatientStore.getState().phone.replace(/\D/g, "").slice(-4);
  const cta = () => screen.getByRole("button", { name: view === "full" ? "Send code" : "Get verification code" }) as HTMLButtonElement;

  it("wrong digits show the error and keep the button off", () => {
    mount("PhoneVerification", view);
    const wrong = lastFour() === "0000" ? "1111" : "0000";
    fireEvent.change(screen.getByPlaceholderText("0000"), { target: { value: wrong } });
    expect(screen.getByText(/don't match what we have on file/i)).toBeTruthy();
    expect(cta().disabled).toBe(true);
  });

  it("the last four on file send VERIFY_SMS and go to the code screen", () => {
    mount("PhoneVerification", view);
    fireEvent.change(screen.getByPlaceholderText("0000"), { target: { value: lastFour() } });
    expect(cta().disabled).toBe(false);
    fireEvent.click(cta());
    expect(sent).toContain("VERIFY_SMS");
    expect(path()).toBe("/otp-verification");
  });

  it("Get help fills in the digits for the presenter", () => {
    mount("PhoneVerification", view);
    fireEvent.click(screen.getByText("Get help"));
    expect((screen.getByPlaceholderText("0000") as HTMLInputElement).value).toBe(lastFour());
  });
});

describe("patient skin: PA-approved re-check", () => {
  it("rejects a wrong code and keeps the patient on the screen", () => {
    mount("PaApprovedOtp", "patient");
    enterCode("patient", "00000000");
    expect(screen.getByText(/didn't match/i)).toBeTruthy();
    expect(sent).not.toContain("VERIFY_PA_APPROVED_OTP");
    expect(path()).toBe("/start");
  });

  it("sends VERIFY_PA_APPROVED_OTP for the right code and leaves the screen", () => {
    mount("PaApprovedOtp", "patient");
    enterCode("patient", SKIN_CODES.PaApprovedOtp);
    expect(sent).toContain("VERIFY_PA_APPROVED_OTP");
    expect(path()).not.toBe("/start");
  });
});

describe("patient skin: autofill bubble", () => {
  it("fills the boxes with the code and then submits it, after a pause", () => {
    vi.useFakeTimers();
    try {
      mount("OTPVerification", "patient");
      const boxes = screen.getAllByRole("textbox");
      fireEvent.focus(boxes[0]);
      fireEvent.click(screen.getByText(SKIN_CODES.OTPVerification));
      expect(sent).not.toContain("VERIFY_OTP");
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(sent).toContain("VERIFY_OTP");
      expect(path()).toBe("/confirm-details");
    } finally {
      vi.useRealTimers();
    }
  });
});
