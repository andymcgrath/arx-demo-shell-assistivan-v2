import { ArrowRight } from "lucide-react";

interface PesHomeProps {
  /**
   * Passed in by each caller rather than imported from a branding config
   * module here — this file lives at the shell level (client/components/),
   * not inside any single portal, so it can't rely on the portal-local
   * import-alias resolution that lets e.g. client/portals/patient/pages/
   * files import "@/config/branding" (that module only exists at
   * client/portals/patient/config/branding.ts; there's no shell-level or
   * provider-portal equivalent, so importing it here would fail to resolve
   * for real at build time, not just as tsc noise).
   */
  programName: string;
  onSelectPatient?: () => void;
  onSelectProvider?: () => void;
  onSelectPharmacist?: () => void;
  /**
   * Optional short status message rendered under the intro copy, above the
   * role links — used by the patient portal to explain why "I am a
   * Patient/Caregiver" is temporarily disabled while a provider referral is
   * waiting on the Fulfillment Center (see PesHome.tsx's patient wrapper).
   * Unused (and harmless) for the provider/pharmacist callers.
   */
  note?: string;
}

type RoleKey = "onSelectPatient" | "onSelectProvider" | "onSelectPharmacist";

const ROLE_LINKS: Array<{ label: string; key: RoleKey }> = [
  { label: "I am a Patient/Caregiver", key: "onSelectPatient" },
  { label: "I am a Healthcare Provider", key: "onSelectProvider" },
  { label: "I am a Pharmacist", key: "onSelectPharmacist" },
];

/**
 * WF5 (PrES_PAP) shared entry screen — ported from
 * arx-pes-prototype-omniplan's Index.tsx ("Understanding Coverage Options"),
 * a role-selection landing page shown before either the patient or provider
 * enrollment flow begins.
 *
 * This one file is rendered by BOTH portals — client/portals/patient/pages/
 * PesHome.tsx wraps it for the patient portal, and the "pres-home" step in
 * client/portals/provider/index.tsx's PresPapProviderExperience wraps it for
 * the provider portal. It lives at this shell level (not under either
 * portal's own components/ folder) specifically so both can import the same
 * file — the demo shell has no mechanism for one portal to switch which
 * portal is on screen, so each renders its own copy of this page and only
 * wires the one link matching its own role.
 *
 * Each caller passes only the one onSelect* handler relevant to it — the
 * other two links get no handler and render disabled, mirroring the source
 * prototype, where only the "Patient/Caregiver" link is actually wired and
 * Healthcare Provider / Pharmacist are no-ops.
 */
export default function PesHome({ programName, onSelectPatient, onSelectProvider, onSelectPharmacist, note }: PesHomeProps) {
  const handlers: Record<RoleKey, (() => void) | undefined> = {
    onSelectPatient,
    onSelectProvider,
    onSelectPharmacist,
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="text-4xl font-bold text-arx-slate leading-tight">Understanding</h1>
      <h1 className="text-4xl font-extrabold text-arx-slate leading-tight mb-6">Coverage Options</h1>
      <p className={`text-arx-body-copy text-base leading-relaxed max-w-md ${note ? "mb-6" : "mb-10"}`}>
        The {programName} Patient Support Program offers assistance to eligible patients. Answer a few questions to see what support is available.
      </p>
      {note && (
        <p className="text-sm text-arx-slate bg-arx-sky/30 border border-arx-borders rounded-lg px-4 py-3 mb-8 max-w-md">
          {note}
        </p>
      )}
      <div className="flex flex-col gap-5">
        {ROLE_LINKS.map(({ label, key }) => {
          const handler = handlers[key];
          return (
            <button
              key={key}
              type="button"
              onClick={handler}
              disabled={!handler}
              className={`flex items-center gap-2 w-fit text-left font-bold tracking-wide text-sm uppercase transition-colors ${
                handler
                  ? "text-arx-primary hover:text-arx-primary-dark cursor-pointer"
                  : "text-arx-inactive cursor-not-allowed"
              }`}
            >
              {label}
              <ArrowRight className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
