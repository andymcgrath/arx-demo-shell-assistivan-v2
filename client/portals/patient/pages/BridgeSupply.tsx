import { ArrowRight, Phone } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";
import { PROGRAM } from "@/portals/patient/config/branding";

/**
 * The bridge variant of `cash_offer`: the free supply is active while the PA appeal runs. No price and no payment. The patient
 * enrolls in the copay program here, at $0, and moves on to the delivery address.
 * The pharmacy is the brand's transfer partner (`program.transferPartner`), and a generic name shows when the brand has none.
 */
export default function BridgeSupply() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  // The Bridge is free drug, dispensed by the non-commercial pharmacy (`program.transferPartner`), not the commercial one.
  const pharmacy = PROGRAM.transferPartner;
  const where = [pharmacy?.address, pharmacy?.city && pharmacy?.state ? `${pharmacy.city}, ${pharmacy.state} ${pharmacy.zip ?? ""}`.trim() : undefined].filter(Boolean);

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-lg mx-auto px-4 space-y-5">
        <div className="bg-arx-white rounded-2xl shadow-sm p-5 border border-arx-borders">
          <div className="mb-4">
            <ProgramLogo variant="colors" />
          </div>
          <h2 className="text-xl font-bold leading-snug text-arx-slate mb-3">Your free supply is on its way</h2>
          <p className="text-sm leading-relaxed mb-4 text-arx-body-copy">
            While we appeal your insurer's decision, {pharmacy?.name ?? "our pharmacy"} will provide {PROGRAM.drugDisplayName} at no cost to you. There is nothing to pay.
          </p>
          <p className="text-sm leading-relaxed text-arx-body-copy">
            The supply continues until your appeal is decided. We'll text you as soon as we have an update.
          </p>
          <div className="rounded-xl p-4 mt-4 border border-arx-borders">
            <p className="font-bold text-arx-slate">{PROGRAM.drugDisplayName} Copay Program</p>
            <p className="text-2xl font-bold text-arx-slate">$0<span className="text-sm font-semibold">/shipment</span></p>
          </div>
          <button
            onClick={() => {
              dispatch("SELECT_SELF_PAY", { portal: "patient" });
              navigate("/delivery-address");
            }}
            className="w-full mt-4 bg-arx-action text-arx-on-action font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:bg-arx-action-hover transition-colors"
          >
            <span>Enroll at $0 and confirm delivery</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {pharmacy?.name && (
          <div className="bg-arx-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <h2 className="text-base font-bold text-arx-slate mb-2">{pharmacy.name}</h2>
            {where.map((line) => (
              <p key={line} className="text-sm text-arx-body-copy">{line}</p>
            ))}
            {pharmacy.phone && (
              <p className="text-sm mt-3 flex items-center gap-2 text-arx-body-copy">
                <Phone className="w-4 h-4 text-arx-link" />
                <a href={`tel:${pharmacy.phone.replace(/\D/g, "")}`} className="font-semibold underline text-arx-link">{pharmacy.phone}</a>
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
