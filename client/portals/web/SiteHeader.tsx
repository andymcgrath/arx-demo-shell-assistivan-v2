/**
 * The client page's header for a phone. The live site floats a dark pill (logos and a menu button) and a Sign in pill
 * over a brand band. The pill opens a menu card. Here both sit inside the band so nothing floats over the page, and
 * the menu card takes the band's full width.
 */
import { useState } from "react";
import { Menu, User, X } from "lucide-react";
import { MANUFACTURER, PROGRAM } from "@/portals/patient/config/branding";
import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";
import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";

const AUDIENCES = ["Consumers", "Healthcare Providers", "Employers", "Contact us"];
const SUBMENU = ["What is {drug}", "Taking {drug}", "Side Effects", "Coverages and Savings", "Support and Resources", "FAQs"];
const REFERENCE = ["Prescribing Information", "Medication Guide"];

const logos = (
  <>
    <ManufacturerLogo variant="hsl(var(--arx-white))" size="footer" />
    <span className="h-6 w-px flex-shrink-0 bg-white/40" />
    <ProgramLogo variant="hsl(var(--arx-white))" size="small" />
  </>
);

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-arx-primary px-3 py-3 text-white">
      {!open ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={false}
            onClick={() => setOpen(true)}
            className="flex min-w-0 items-center gap-3 rounded-full bg-arx-black px-4 py-2.5"
          >
            {logos}
            <Menu className="h-4 w-4 flex-shrink-0" />
          </button>
          <button type="button" className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-arx-black px-3 py-2.5 text-xs">
            <User className="h-4 w-4" /> Sign in
          </button>
        </div>
      ) : (
        <nav aria-label="Site" className="rounded-2xl bg-arx-black/95 p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">{logos}</div>
            <button type="button" aria-label="Close menu" aria-expanded onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-2 border-b border-white/20 pb-4 text-xs text-white/80">
            {AUDIENCES.map((a) => <li key={a}>{a}</li>)}
          </ul>
          <ul className="mb-4 text-sm text-white">
            {SUBMENU.map((s) => (
              <li key={s}><a href="#" className="block py-2">{s.split("{drug}").join(PROGRAM.name)}</a></li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/20 pt-4 text-xs text-white/70">
            {REFERENCE.map((r) => <li key={r}><a href="#">{r}</a></li>)}
          </ul>
          <span className="sr-only">{MANUFACTURER.name}</span>
        </nav>
      )}
    </header>
  );
}
