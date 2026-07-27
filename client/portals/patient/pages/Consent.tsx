import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { ChevronRight } from "lucide-react";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";

export default function Consent() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  return (
    <main className="flex-grow">
        <EnrollmentShell title="Please review the consent form below" stepsFilled={1} stepsTotal={3}>
          {/* Scrollable legal content */}
          <div className="bg-arx-neutral-100 rounded-xl p-5 max-h-80 overflow-y-auto text-sm leading-relaxed space-y-4 border border-arx-borders text-arx-body-copy">
            <p className="font-bold uppercase text-xs tracking-wide text-arx-slate">
              Patient Authorization to Share Protected Health Information and CoAssist Communications
            </p>

            <div>
              <p className="font-semibold mb-2 text-arx-slate">Authorization to Share Protected Health Information</p>
              <p>
                By signing this authorization, I (or my representative) authorize my healthcare
                providers, health plans, and pharmacies (collectively, "Healthcare Organizations")
                to use and share my personal and health information related to my medical condition,
                treatment, and insurance coverage (my "health information") with CoAssist to help me
                get coverage, reimbursement, or payment for the medication ordered by my prescriber,
                for referral to and enrollment in patient support, and for providing me with
                materials, information, and services related to my drug therapy and ways to help me
                maintain my prescribed treatment.
              </p>
              <p className="mt-2">
                I understand that, once disclosed pursuant to this authorization, my health
                information may no longer be protected under federal or state law. CoAssist will
                make reasonable efforts to keep it private and to disclose it only for the purposes
                set forth in this authorization.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-2 text-arx-slate">CoAssist Communications</p>
              <p>
                I authorize CoAssist to contact me by mail, telephone (including voicemail), or
                email for educational and support purposes, including contacting me for market
                research about CoAssist services.
              </p>
              <p className="mt-2">
                This authorization will remain valid for 10 years after the date set forth herein
                unless I revoke it earlier by cancelling my enrollment in writing by contacting
                CoAssist Patient Support.
              </p>
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 mt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 w-4 h-4 flex-shrink-0 accent-arx-primary"
            />
            <span className="text-sm leading-relaxed text-arx-body-copy">
              By checking this box, I consent to receiving support, reminder, and educational
              messages from the CoAssist Patient Support Program. Standard messaging rates may apply.
            </span>
          </label>

          {/* Continue button */}
          <div className="mt-6">
            <button
              onClick={() => navigate("/signature")}
              disabled={!checked}
              className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                checked
                  ? "bg-arx-primary text-white hover:bg-arx-primary-dark"
                  : "bg-arx-borders text-arx-inactive cursor-not-allowed"
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
