import { PenLine, ChevronRight } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";
import YesNoToggle from "@/components/enrollment/YesNoToggle";
import SignatureField from "@/components/enrollment/SignatureField";
import { usePresPapStore } from "@/store/presPapStore";
import { PROGRAM } from "@/config/branding";

const HEALTH_INFO_CONSENT = `By signing this form, I give my permission for my physicians, pharmacies, laboratories, and other healthcare providers ("Healthcare Providers") and my health insurers to share my health information with the organization administering the ${PROGRAM.name} Patient Assistance Program and its vendors and affiliates. This authorization will expire one (1) year from the date I sign below. I understand I have the right to revoke this authorization at any time by contacting the program administrator.`;

const PRIVACY_CONSENT = `By checking the box below, you understand that the organization administering this patient assistance program and its vendors and affiliates will use the health information you and your healthcare providers provide to deliver support services. You have the right to withdraw these permissions at any time by contacting the program administrator.`;

const CALLS_CONSENT = `By providing my mobile number and agreeing below, I agree to receive calls and texts from the program administrator or parties acting on its behalf to determine my eligibility, provide benefits verification, financial assistance resources, refill reminders, and other support services. Message and data rates may apply. I may opt out at any time.`;

/**
 * WF5 (PrES_PAP) consent capture — ported from arx-pes-prototype-omniplan's
 * PatientConsent.tsx, bundling all three consent blocks (health info,
 * privacy, calls/text) onto one page like the prototype does. The
 * minor/caregiver "who is authorizing" branch is intentionally not
 * ported — see PesPatientInfo.tsx's header comment for why.
 *
 * On Continue, fires CONFIRM_CONSENT — the same event WF1/WF2/WF4 fire from
 * Signature.tsx — which is what unblocks the shared "waiting for BI" screen
 * (/enrollment-complete) via derivePatientRoute's dedicated PrES_PAP branch.
 */
export default function PesConsent() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const data = usePresPapStore();
  const setField = usePresPapStore((s) => s.setField);

  const canContinue =
    data.healthInfoConsent === "Yes" && data.healthInfoSignature.trim() &&
    data.privacyConsent === "Yes" && data.privacySignature.trim() &&
    data.callsConsent === "Yes" && data.callsSignature.trim();

  function handleContinue() {
    if (!canContinue) return;
    dispatch("CONFIRM_CONSENT", { portal: "patient" });
    navigate("/enrollment-complete");
  }

  return (
    <main className="flex-grow">
      <EnrollmentShell icon={<PenLine className="w-7 h-7" />} title="Patient Consent" stepsFilled={3} stepsTotal={3} wide>
        <p className="text-sm text-arx-body-copy mb-6">
          Please review and consent to each section below to continue the enrollment.
        </p>

        <div className="flex flex-col gap-8">
          {/* Consent 1: Health Information */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-arx-slate">Authorization to Share Health Information</p>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-arx-borders bg-arx-neutral-100 p-3 text-xs leading-relaxed text-arx-body-copy">
              {HEALTH_INFO_CONSENT}
            </div>
            <label className="text-sm font-bold text-arx-slate">Do you agree to this consent?</label>
            <YesNoToggle name="healthInfoConsent" value={data.healthInfoConsent} onChange={(v: "Yes" | "No") => setField("healthInfoConsent", v)} />
            <SignatureField
              label="Type Signature"
              value={data.healthInfoSignature}
              onChange={(v: string) => setField("healthInfoSignature", v)}
              placeholder="Input patient (or representative) signature here"
              disclaimer="By signing, you certify that you have read, understand, and agree to the Authorization to Share Health Information Statement above."
            />
          </div>

          {/* Consent 2: Privacy Notice */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-arx-slate">Privacy Notice and Consent to Process Health Information</p>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-arx-borders bg-arx-neutral-100 p-3 text-xs leading-relaxed text-arx-body-copy">
              {PRIVACY_CONSENT}
            </div>
            <label className="text-sm font-bold text-arx-slate">Do you agree to this consent?</label>
            <YesNoToggle name="privacyConsent" value={data.privacyConsent} onChange={(v: "Yes" | "No") => setField("privacyConsent", v)} />
            <SignatureField
              label="Type Signature"
              value={data.privacySignature}
              onChange={(v: string) => setField("privacySignature", v)}
              placeholder="Input patient name here"
              disclaimer="By signing, you certify that you have read, understand, and agree to the Privacy Notice above."
            />
          </div>

          {/* Consent 3: Calls and Text */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-arx-slate">Consent to Receive Calls and Text</p>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-arx-borders bg-arx-neutral-100 p-3 text-xs leading-relaxed text-arx-body-copy">
              {CALLS_CONSENT}
            </div>
            <label className="text-sm font-bold text-arx-slate">Do you agree to this consent?</label>
            <YesNoToggle name="callsConsent" value={data.callsConsent} onChange={(v: "Yes" | "No") => setField("callsConsent", v)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-arx-body-copy">Patient Cell Phone Number</label>
              <input
                type="tel"
                value={data.cellPhone}
                onChange={(e) => setField("cellPhone", e.target.value)}
                placeholder="(___) ___-____"
                className="w-full border border-arx-borders rounded-lg px-4 py-3 text-sm text-arx-slate placeholder:text-arx-inactive focus:outline-none focus:ring-2 focus:ring-arx-primary/30 focus:border-arx-primary transition-colors"
              />
            </div>
            <SignatureField
              label="Type Signature"
              value={data.callsSignature}
              onChange={(v: string) => setField("callsSignature", v)}
              placeholder="Input patient (or representative) signature here"
              disclaimer="By signing, you certify that you have read, understand, and agree to the Authorization to Receive Communications Statement above."
            />
          </div>

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              canContinue ? "bg-arx-primary text-white hover:bg-arx-primary-dark" : "bg-arx-borders text-arx-inactive cursor-not-allowed"
            }`}
          >
            <span>Continue</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </EnrollmentShell>
    </main>
  );
}
