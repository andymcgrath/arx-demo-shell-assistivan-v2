/** The client page's safety summary and indication, stacked for the phone frame. */
import { PROGRAM } from "@/portals/patient/config/branding";
import { INDICATION, SAFETY_BLOCKS } from "./siteContent";

const fill = (s: string) => s.split("{drug}").join(PROGRAM.name);

export default function SafetySummary() {
  return (
    <section className="bg-white px-5 py-8 text-arx-neutral-800">
      <h2 className="mb-4 text-sm font-bold uppercase leading-snug text-arx-neutral-800">
        Safety summary with warnings for {PROGRAM.drugDisplayName}
      </h2>
      <div className="space-y-4 text-xs leading-relaxed">
        {SAFETY_BLOCKS.map((b, i) => (
          <div key={i}>
            {b.heading && <h3 className="mb-1 font-semibold text-arx-neutral-800">{fill(b.heading)}</h3>}
            {b.text && <p>{fill(b.text)}</p>}
            {b.bullets && (
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {b.bullets.map((t) => <li key={t}>{fill(t)}</li>)}
              </ul>
            )}
            {b.items && (
              <ul className="mt-1 space-y-2 pl-4">
                {b.items.map((it) => (
                  <li key={it.lead} className="list-disc"><strong>{fill(it.lead)}</strong> {fill(it.body)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 text-sm font-bold uppercase text-arx-neutral-800">Indication</h2>
      <p className="text-xs leading-relaxed">{fill(INDICATION.text)}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
        {INDICATION.bullets.map((t) => <li key={t}>{fill(t)}</li>)}
      </ul>
    </section>
  );
}
