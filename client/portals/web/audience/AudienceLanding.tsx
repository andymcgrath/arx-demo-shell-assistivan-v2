/**
 * The client page's first screen for the audience scenario: who is this page for. Both audiences show, as on the live site.
 * The demo's pinned audience (the `audience` fork) is the one that works. The other stays visible and does nothing, so the
 * presenter never picks a branch on the page (CLAUDE.md rule 14).
 */
import { ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";
import SiteHeader from "../SiteHeader";
import Footer from "@/portals/patient/components/Footer";
import type { Audience } from "./audience";

const OPTIONS: { audience: Audience; label: string; blurb: string; Icon: typeof Stethoscope }[] = [
  { audience: "hcp", label: "I am a Healthcare Provider", blurb: "Enroll a patient and manage support services.", Icon: Stethoscope },
  { audience: "patient", label: "I am a Patient or Caregiver", blurb: "Check your coverage and sign up for support.", Icon: HeartPulse },
];

export default function AudienceLanding({ pinned, onChoose }: { pinned: Audience; onChoose: () => void }) {
  return (
    <div className="portal-patient h-full overflow-y-auto overflow-x-hidden bg-arx-neutral-100 text-arx-neutral-800">
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
          <h1 className="mb-2 text-3xl font-black">Welcome to {PROGRAM.name}</h1>
          <p className="mb-6 text-sm text-arx-body-copy">Tell us who you are so we can show you the right support.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {OPTIONS.map(({ audience, label, blurb, Icon }) => {
              const active = audience === pinned;
              return (
                <button
                  key={audience}
                  type="button"
                  disabled={!active}
                  onClick={onChoose}
                  className="rounded-2xl border border-arx-borders bg-white p-6 text-left disabled:cursor-default disabled:opacity-50"
                >
                  <Icon className="mb-3 h-8 w-8 text-arx-primary" aria-hidden="true" />
                  <span className="mb-1 block text-lg font-extrabold">{label}</span>
                  <span className="mb-4 block text-sm text-arx-body-copy">{blurb}</span>
                  {active ? (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-arx-action">Continue <ArrowRight className="h-4 w-4" /></span>
                  ) : (
                    <span className="text-xs text-arx-body-copy">Not in this demo</span>
                  )}
                </button>
              );
            })}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
