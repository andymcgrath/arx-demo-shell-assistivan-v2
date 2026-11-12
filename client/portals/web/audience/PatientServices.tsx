/**
 * The patient's services page on the client's site. The list comes from the brand file (`patientSite.services`). Only the
 * enabled service continues. The others show as part of the program and stay off in the demo.
 */
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { patientSite } from "../hcp/content";

const primary = "inline-flex items-center justify-center gap-2 rounded-full bg-arx-action px-6 py-2.5 text-sm font-semibold text-arx-on-action disabled:opacity-40";

export default function PatientServices({ onContinue }: { onContinue: () => void }) {
  const site = patientSite();
  const [picked, setPicked] = useState(site.services.find((s) => s.enabled)?.id ?? "");
  return (
    <section className="px-5 pb-10 pt-10 text-arx-neutral-800">
      <h1 className="mb-2 text-3xl font-black">{site.headline}</h1>
      <p className="mb-5 text-sm text-arx-body-copy">{site.intro}</p>
      <div className="mb-6 space-y-3">
        {site.services.map((s) => (
          <label key={s.id} className={`flex items-start gap-3 rounded-lg border border-arx-borders bg-white p-4 ${s.enabled ? "" : "opacity-60"}`}>
            <input type="radio" name="service" className="mt-1" disabled={!s.enabled} checked={picked === s.id} onChange={() => setPicked(s.id)} />
            <span>
              <span className="block text-sm font-semibold">{s.title}{!s.enabled && " (not in this demo)"}</span>
              <span className="block text-xs text-arx-body-copy">{s.description}</span>
            </span>
          </label>
        ))}
      </div>
      <button type="button" className={primary} disabled={!picked} onClick={onContinue}>Continue <ArrowRight className="h-4 w-4" /></button>
    </section>
  );
}
