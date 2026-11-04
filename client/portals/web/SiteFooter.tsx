/**
 * The client page's footer, built for the phone frame. The live site uses a five-column grid keyed to the window
 * width. The frame is about 280px wide inside a wide window, so a window breakpoint never fires here. This layout
 * is fixed: logo, then link groups two to a row, then the support button and the legal links.
 */
import { MANUFACTURER } from "@/portals/patient/config/branding";
import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";
import { FOOTER_GROUPS, LEGAL_LINKS } from "./siteContent";

export default function SiteFooter() {
  const phone = MANUFACTURER.support?.phone;
  return (
    <footer className="bg-arx-primary px-5 py-8 text-arx-on-primary">
      <ManufacturerLogo variant="hsl(var(--arx-white))" size="footer" className="mb-6" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-6">
        {FOOTER_GROUPS.map((g) => (
          <nav key={g.title} aria-label={g.title.replace("{company}", MANUFACTURER.name)} className="min-w-0">
            <h3 className="mb-2 break-words text-sm font-semibold">{g.title.replace("{company}", MANUFACTURER.name)}</h3>
            <ul className="space-y-1.5">
              {g.links.map((l) => (
                <li key={l}><a href="#" className="block break-words text-xs text-arx-on-primary/80 underline">{l}</a></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {phone && (
        <a href={`tel:${phone.replace(/-/g, "")}`} className="mt-8 block rounded-full bg-arx-white px-4 py-2.5 text-center text-xs font-semibold text-arx-primary">
          Customer support: Call {phone}
        </a>
      )}

      <div className="mt-6 space-y-3 text-center text-[11px] text-arx-on-primary/80">
        <p>Your privacy choices | Cookie settings</p>
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {LEGAL_LINKS.map((l) => <li key={l}><a href="#" className="underline">{l}</a></li>)}
        </ul>
        <p>{MANUFACTURER.copyright}</p>
      </div>
    </footer>
  );
}
