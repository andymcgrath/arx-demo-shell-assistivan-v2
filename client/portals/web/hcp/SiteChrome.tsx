/** The client's HCP site header and footer. Brand logos and links only. The page is a mock, so no link goes anywhere. */
import { MANUFACTURER, PROGRAM } from "@/portals/patient/config/branding";
import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";
import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";

export type HcpPage = "product" | "support" | "services" | "form" | "submitted";

const TOP_LINKS = ["Prescription & Patient Support Program Enrollment Form", "Full Prescribing Information", "For Patients", "Contact a Sales Consultant"];
const NAV: { label: string; page?: HcpPage }[] = [
  { label: "Efficacy", }, { label: "Safety" }, { label: "Dosing" }, { label: "Support Services", page: "support" }, { label: "Resources" },
];

export function SiteHeader({ page, go }: { page: HcpPage; go: (p: HcpPage) => void }) {
  return (
    <header>
      <div className="bg-arx-black px-8 py-2 text-xs text-white">
        <ul className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1">
          {TOP_LINKS.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </div>
      <div className="flex items-center justify-between gap-6 border-b border-arx-borders bg-white px-8 py-4">
        <button type="button" className="flex items-center gap-4" onClick={() => go("product")} aria-label="Home">
          <ProgramLogo variant="colors" size="small" />
          <span className="h-8 w-px bg-arx-borders" />
          <ManufacturerLogo variant="colors" size="footer" />
        </button>
        <nav aria-label="Site">
          <ul className="flex items-center gap-6 text-sm font-semibold text-arx-neutral-800">
            {NAV.map((n) => (
              <li key={n.label}>
                <button
                  type="button"
                  disabled={!n.page}
                  onClick={() => n.page && go(n.page)}
                  className={`border-b-2 pb-1 ${n.page && (page === n.page || (n.page === "support" && page !== "product")) ? "border-arx-accent" : "border-transparent"} disabled:cursor-default`}
                >
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-arx-primary px-8 py-6 text-xs text-arx-on-primary">
      <p className="mb-2 font-semibold">{PROGRAM.name} is a prescription medicine. See the Important Safety Information, Prescribing Information and Patient Information.</p>
      <p className="opacity-80">{MANUFACTURER.copyright}</p>
    </footer>
  );
}
