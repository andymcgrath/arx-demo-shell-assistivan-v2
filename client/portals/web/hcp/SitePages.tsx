/**
 * The first three pages of the client's HCP site: the product page, Support Services (with the Enroll Patient button),
 * and Available Services (what would you like to do today). Copy comes from the brand file. The page is a mock.
 */
import { ArrowRight } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";
import { useState } from "react";
import { hcpSite, withDrug } from "./content";
import { Radio, ghostBtn, primaryBtn } from "./fields";

export function ProductPage({ onSupport }: { onSupport: () => void }) {
  const site = hcpSite();
  return (
    <div>
      <section className="bg-arx-primary px-12 py-16 text-arx-on-primary">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-arx-accent">For healthcare professionals</p>
        <h1 className="mb-4 max-w-3xl text-4xl font-black leading-tight">{withDrug(site.headline)}</h1>
        <p className="mb-8 max-w-2xl text-base opacity-90">{site.intro}</p>
        <button type="button" onClick={onSupport} className="inline-flex items-center gap-2 rounded-full bg-arx-accent px-6 py-3 text-sm font-semibold text-arx-neutral-800">
          Explore Support Services <ArrowRight className="h-4 w-4" />
        </button>
      </section>
      <section className="grid gap-6 px-12 py-10 md:grid-cols-3">
        {["Efficacy", "Safety profile", "Dosing and administration"].map((t) => (
          <div key={t} className="rounded-lg border border-arx-borders bg-white p-5">
            <h2 className="mb-2 text-base font-bold text-arx-primary">{t}</h2>
            <p className="text-sm text-arx-body-copy">Review the data for {PROGRAM.name}. See the Prescribing Information.</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export function SupportPage({ onEnroll }: { onEnroll: () => void }) {
  const { support } = hcpSite();
  return (
    <div className="px-12 py-10">
      <h1 className="mb-3 max-w-3xl text-3xl font-black text-arx-primary">{support.headline}</h1>
      <p className="mb-6 max-w-2xl text-base text-arx-neutral-800">{support.intro}</p>
      <button type="button" onClick={onEnroll} className={`${primaryBtn} mb-10`}>
        Enroll Patient <ArrowRight className="h-4 w-4" />
      </button>
      <div className="grid gap-4 md:grid-cols-2">
        {support.roles.map((r) => (
          <div key={r.title} className="rounded-lg border border-arx-borders bg-white p-5">
            <h2 className="mb-1 text-base font-bold text-arx-primary">{r.title}</h2>
            <p className="text-sm text-arx-body-copy">{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Available Services. Only the enabled service continues. The others show as part of the program but stay off in the demo. */
export function ServicesPage({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
  const { services } = hcpSite();
  const [picked, setPicked] = useState(services.find((s) => s.enabled)?.id ?? "");
  return (
    <div className="grid gap-10 px-12 py-10 md:grid-cols-[1fr_1.4fr]">
      <div>
        <h1 className="mb-4 text-3xl font-black text-arx-primary">Let's get started</h1>
        <p className="text-base text-arx-body-copy">Please select a service to begin. Click Continue once you are finished completing all the services for your patient.</p>
      </div>
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-4 text-lg font-bold text-arx-neutral-800">What would you like to do today?</h2>
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className={`rounded-md border p-4 ${s.enabled ? "border-arx-borders bg-arx-neutral-100" : "border-arx-borders bg-arx-neutral-100 opacity-60"}`}>
              <Radio
                name="service"
                checked={picked === s.id}
                onChange={() => s.enabled && setPicked(s.id)}
                label={
                  <>
                    <span className="block text-sm font-semibold">{s.title}{!s.enabled && " (not in this demo)"}</span>
                    <span className="block text-xs text-arx-body-copy">{s.description}</span>
                  </>
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" className={ghostBtn} onClick={onCancel}>Cancel</button>
          <button type="button" className={primaryBtn} disabled={!picked} onClick={onContinue}>Continue</button>
        </div>
      </div>
    </div>
  );
}
