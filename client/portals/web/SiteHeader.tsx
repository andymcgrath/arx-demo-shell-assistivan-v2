/**
 * The client page's header. It is the patient experience's header (white bar, hamburger, logo, safety links, accent
 * strip) so the hand-off from the page to the patient screens does not change the chrome. The hamburger opens the
 * site menu in place of the patient's screen list. Sign in sits where the patient header has Technical Help.
 */
import { useState } from "react";
import { Menu, User, X } from "lucide-react";
import { MANUFACTURER, PROGRAM } from "@/portals/patient/config/branding";
import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";

const AUDIENCES = ["Consumers", "Healthcare Providers", "Employers", "Contact us"];
const SUBMENU = ["What is {drug}", "Taking {drug}", "Side Effects", "Coverages and Savings", "Support and Resources", "FAQs"];

const linkStyle = { color: "hsl(var(--arx-link))" } as const;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-arx-borders bg-arx-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-arx-sky/30"
          style={{ color: "hsl(var(--arx-slate))" }}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex flex-1 justify-start">
          <ManufacturerLogo size="header" />
        </div>
        <button type="button" className="flex flex-shrink-0 items-center gap-2 text-xs font-semibold" style={{ color: "hsl(var(--arx-slate))" }}>
          Sign in <User className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <nav aria-label="Site" className="border-t border-arx-borders bg-arx-white px-4 py-3">
          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-2 border-b border-arx-borders pb-3 text-xs text-arx-body-copy">
            {AUDIENCES.map((a) => <li key={a}>{a}</li>)}
          </ul>
          <ul className="text-sm font-semibold">
            {SUBMENU.map((s) => (
              <li key={s}><a href="#" className="block py-2" style={linkStyle}>{s.split("{drug}").join(PROGRAM.name)}</a></li>
            ))}
          </ul>
        </nav>
      )}

      <div className="border-t border-arx-borders bg-arx-white">
        <div className="flex items-center justify-center gap-8 px-6 py-2">
          <a href={MANUFACTURER.legal.safetyUrl} className="whitespace-nowrap text-[11px] font-semibold" style={linkStyle}>Important Safety Information</a>
          <a href={MANUFACTURER.legal.prescribingUrl} className="whitespace-nowrap text-[11px] font-semibold" style={linkStyle}>Prescribing Information</a>
        </div>
      </div>
      <div className="h-[3px] bg-arx-strip" />
    </header>
  );
}
