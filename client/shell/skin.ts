/**
 * The skin resolver. It returns the component for each slot from the current view, so a page renders a slot and never
 * checks the view. This file, view.ts, and demoStore.ts are the only places that read the view
 * (see engine/__tests__/skin.rule2.test.ts). Both views map to the default components for now. The patient skin fills
 * its slots in later steps (components live in portals/patient/skins/patient/).
 */
import type { ComponentType } from "react";
import type { ViewId } from "@/brand/schema";
import { BRAND } from "@/brand";
import { useDemoStore } from "@/store/demoStore";
import { shellPolicy, toggleOptions, type ShellPolicy, type ToggleOption } from "./view";
import Header from "@/portals/patient/components/Header";
import Footer from "@/portals/patient/components/Footer";
import SMSMessage from "@/portals/patient/pages/SMSMessage";
import PhoneVerification from "@/portals/patient/pages/PhoneVerification";
import OTPVerification from "@/portals/patient/pages/OTPVerification";
import PaApprovedSms from "@/portals/patient/pages/PaApprovedSms";
import PaApprovedOtp from "@/portals/patient/pages/PaApprovedOtp";
import PatientSMSMessage from "@/portals/patient/skins/patient/SMSMessage";
import PatientPhoneVerification from "@/portals/patient/skins/patient/PhoneVerification";
import PatientOTPVerification from "@/portals/patient/skins/patient/OTPVerification";
import PatientPaApprovedSms from "@/portals/patient/skins/patient/PaApprovedSms";
import PatientPaApprovedOtp from "@/portals/patient/skins/patient/PaApprovedOtp";

/** The slots a skin can fill. A page for a route in the patient portal renders its slot and never checks the view. */
export interface SkinSlots {
  Header: ComponentType;
  Footer: ComponentType;
  SMSMessage: ComponentType;
  PhoneVerification: ComponentType;
  OTPVerification: ComponentType;
  PaApprovedSms: ComponentType;
  PaApprovedOtp: ComponentType;
}

const DEFAULT_SKIN: SkinSlots = { Header, Footer, SMSMessage, PhoneVerification, OTPVerification, PaApprovedSms, PaApprovedOtp };

/** The patient skin changes the text-message tap cue and the two-factor screens. Everything else stays the default. */
const PATIENT_SKIN: SkinSlots = {
  ...DEFAULT_SKIN,
  SMSMessage: PatientSMSMessage,
  PhoneVerification: PatientPhoneVerification,
  OTPVerification: PatientOTPVerification,
  PaApprovedSms: PatientPaApprovedSms,
  PaApprovedOtp: PatientPaApprovedOtp,
};

const SKINS: Record<ViewId, SkinSlots> = {
  full: DEFAULT_SKIN,
  patient: PATIENT_SKIN,
};

/** The slots for a view. */
export const skinFor = (view: ViewId): SkinSlots => SKINS[view];

/** The slots for the current view. */
export function useSkin(): SkinSlots {
  return skinFor(useDemoStore((s) => s.view));
}

export interface ShellView {
  /** Which portals the shell shows and whether it stays in one panel. */
  policy: ShellPolicy;
  /** The header Full / Patient toggle, or null when the brand offers no choice of views. */
  toggle: ToggleOption[] | null;
  setView: (view: ViewId) => void;
  /** Goes on the shell root as `data-shell`, so a skin's CSS can hang off `[data-shell="patient"]`. */
  dataShell: ViewId;
}

/** What the shell chrome needs from the current view. The shell reads this and never the view itself. */
export function useShellView(): ShellView {
  const view = useDemoStore((s) => s.view);
  const setView = useDemoStore((s) => s.setView);
  return { policy: shellPolicy(view), toggle: toggleOptions(view, BRAND.enabledViews), setView, dataShell: view };
}
