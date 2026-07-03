import ManufacturerLogo from "@/components/brand/ManufacturerLogo";
import { MANUFACTURER } from "@/config/branding";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-arx-borders shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3">

        {/* Row 1: Logo + tagline inline */}
        <div className="flex items-center gap-3 mb-2">
          <ManufacturerLogo className="h-7 w-auto max-w-[150px] object-contain flex-shrink-0" />
          <p className="text-[10px] text-arx-body-copy leading-tight">
            {MANUFACTURER.tagline}
          </p>
        </div>

        {/* Row 2: Legal, Support, Safety — 3 columns */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          <div>
            <h4 className="font-semibold text-arx-slate text-[10px] mb-1 uppercase tracking-wide">Legal</h4>
            <ul className="space-y-0.5">
              <li><a href={MANUFACTURER.legal.privacyUrl} className="text-[10px] text-arx-body-copy hover:text-arx-slate transition-colors">Privacy Policy</a></li>
              <li><a href={MANUFACTURER.legal.termsUrl} className="text-[10px] text-arx-body-copy hover:text-arx-slate transition-colors">Terms of Use</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-arx-slate text-[10px] mb-1 uppercase tracking-wide">Support</h4>
            <ul className="space-y-0.5">
              <li><a href="#" className="text-[10px] text-arx-body-copy hover:text-arx-slate transition-colors">Contact Us</a></li>
              <li><a href={`tel:${MANUFACTURER.support.phone.replace(/-/g, "")}`} className="text-[10px] text-arx-body-copy hover:text-arx-slate transition-colors">{MANUFACTURER.support.phone}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-arx-slate text-[10px] mb-1 uppercase tracking-wide">Safety</h4>
            <ul className="space-y-0.5">
              <li><a href={MANUFACTURER.legal.safetyUrl} className="text-[10px] text-arx-body-copy hover:text-arx-slate transition-colors">Important Safety Info</a></li>
              <li><a href={MANUFACTURER.legal.prescribingUrl} className="text-[10px] text-arx-body-copy hover:text-arx-slate transition-colors">Prescribing Information</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-arx-borders pt-1.5">
          <p className="text-[10px] text-arx-body-copy">
            {MANUFACTURER.copyright}
          </p>
          <div className="hidden" data-pendo-id="footer-section" title="Pendo: Footer Section Tracking" />
        </div>
      </div>
    </footer>
  );
}
