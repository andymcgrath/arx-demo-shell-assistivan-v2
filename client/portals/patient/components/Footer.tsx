import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";
import { MANUFACTURER, PROGRAM } from "@/portals/patient/config/branding";
import { resolveSurfaces } from "@/brand/theme";

// A brand footer is the brand color, so the manufacturer's white logo goes on it. The colors come from tokens.
const BRAND_FOOTER = resolveSurfaces(PROGRAM.colors.surfaces, !!PROGRAM.colors.accent).footer === "brand";

export default function Footer() {
  return (
    <footer className="w-full bg-arx-footer border-t border-arx-footer-rule shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-2">

        {/* Row 1: Logo + tagline inline */}
        <div className="flex items-center gap-3 mb-1.5">
          <ManufacturerLogo size="footer" variant={BRAND_FOOTER ? "hsl(var(--arx-white))" : "colors"} className="flex-shrink-0" />
          <p className="text-[11px] text-arx-footer-text leading-tight">
            {MANUFACTURER.tagline}
          </p>
        </div>

        {/* Row 2: Legal, Support, Safety — 3 columns */}
        <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2 mb-1.5">
          <div>
            <h4 className="text-footer text-arx-footer-heading mb-0.5 uppercase tracking-wide">Legal</h4>
            <ul className="space-y-0.5">
              <li><a href={MANUFACTURER.legal.privacyUrl} className="text-[11px] text-arx-footer-text hover:text-arx-footer-heading transition-colors whitespace-nowrap">Privacy Policy</a></li>
              <li><a href={MANUFACTURER.legal.termsUrl} className="text-[11px] text-arx-footer-text hover:text-arx-footer-heading transition-colors whitespace-nowrap">Terms of Use</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-footer text-arx-footer-heading mb-0.5 uppercase tracking-wide">Support</h4>
            <ul className="space-y-0.5">
              <li><a href="#" className="text-[11px] text-arx-footer-text hover:text-arx-footer-heading transition-colors whitespace-nowrap">Contact Us</a></li>
              <li><a href={`tel:${MANUFACTURER.support.phone.replace(/-/g, "")}`} className="text-[11px] text-arx-footer-text hover:text-arx-footer-heading transition-colors whitespace-nowrap">{MANUFACTURER.support.phone}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-footer text-arx-footer-heading mb-0.5 uppercase tracking-wide">Safety</h4>
            <ul className="space-y-0.5">
              <li><a href={MANUFACTURER.legal.safetyUrl} className="text-[11px] text-arx-footer-text hover:text-arx-footer-heading transition-colors whitespace-nowrap">Important Safety Info</a></li>
              <li><a href={MANUFACTURER.legal.prescribingUrl} className="text-[11px] text-arx-footer-text hover:text-arx-footer-heading transition-colors whitespace-nowrap">Prescribing Information</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-arx-footer-rule pt-1">
          <p className="text-[11px] text-arx-footer-text">
            {MANUFACTURER.copyright}
          </p>
          <div className="hidden" data-pendo-id="footer-section" title="Pendo: Footer Section Tracking" />
        </div>
      </div>
    </footer>
  );
}
