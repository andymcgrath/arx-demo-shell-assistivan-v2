import { CheckCircle, Phone } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";
import { usePersonaState } from "@/engine/WorkflowProvider";

// CoA_DME, `pharmacy_transfer` branch. The terminal screen: the PA is approved and the scenario has already
// assigned the pharmacy, so the patient has nothing to choose. It shows the pharmacy's contact details.
// The pharmacy is `workflowData.selectedPharmacy`, set by the rules from `program.transferPartner` in the brand file.
export default function PharmacyTransfer() {
  const { workflowData } = usePersonaState("patient");
  const pharmacy = workflowData.selectedPharmacy;
  const address = [pharmacy?.address, pharmacy?.city, [pharmacy?.state, pharmacy?.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="flex-grow min-h-full flex items-center justify-center px-6 py-6 bg-arx-hero">
      <div className="text-center max-w-sm mx-auto">
        <h1 className="text-h3 text-arx-on-hero mt-0 mb-3">You're all set!</h1>

        <div className="rounded-2xl p-4 mb-4 flex flex-col items-center gap-1.5 bg-arx-on-hero/15 border border-arx-on-hero/35">
          <CheckCircle className="w-7 h-7 text-arx-on-hero" />
          <p className="text-h5 text-arx-on-hero">Your {PROGRAM.name} prior authorization is approved</p>
        </div>

        <p className="text-arx-on-hero/90 text-body leading-snug mb-3">
          Your prescription has been transferred to {pharmacy?.name ?? "your pharmacy"}, which will complete your order.
        </p>

        <div className="rounded-2xl p-4 mb-3 flex items-start gap-2 bg-arx-on-hero/15 border border-arx-on-hero/35 text-left">
          <Phone className="w-4 h-4 text-arx-on-hero flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-h6 text-arx-on-hero">{pharmacy?.name}</p>
            {pharmacy?.phone && <p className="text-body-sm text-arx-on-hero/80">{pharmacy.phone}</p>}
            {address && <p className="text-body-sm text-arx-on-hero/80">{address}</p>}
          </div>
        </div>

        <p className="text-arx-on-hero/90 text-body leading-snug">
          {pharmacy?.name ?? "Your pharmacy"} will contact you directly. No further action is needed at this time.
        </p>
      </div>
    </main>
  );
}
