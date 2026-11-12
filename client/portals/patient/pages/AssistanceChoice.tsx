import { PROGRAM } from "@/portals/patient/config/branding";
import { ArrowRight, CheckCircle, Sparkles, HeartHandshake } from "lucide-react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";

/**
 * The assistance fork's screen (workflows/coassist/forks.ts). The patient qualified for the free drug program and now
 * chooses it or the copay program. Qualifying committed nothing. The pick is `CHOOSE_ASSISTANCE`, and the route follows.
 */
export default function AssistanceChoice() {
  const dispatch = useWorkflowDispatch();
  const choose = (option: "pap" | "copay") => dispatch("CHOOSE_ASSISTANCE", { portal: "patient", option });

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-lg mx-auto px-4 space-y-5">
        <div className="bg-arx-white rounded-2xl shadow-sm p-5 border border-arx-borders">
          <h2 className="text-xl font-bold mb-1 text-arx-slate">Choose your assistance</h2>
          <p className="text-sm mb-5 text-arx-body-copy">
            You qualified for the free drug program. Pick the option that works best for you for {PROGRAM.drugDisplayName}.
          </p>

          <div className="rounded-xl p-4 mb-4 bg-arx-neutral-100 border border-arx-borders">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 bg-arx-sky">
                <HeartHandshake className="w-5 h-5 text-arx-link" />
              </div>
              <div>
                <p className="font-bold text-base text-arx-slate">Free drug program</p>
                <p className="text-sm font-semibold mt-0.5 text-arx-link">You qualified</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {["No cost to you", "Shipped to you by the program pharmacy", "Cancel anytime"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-arx-body-copy">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-arx-link" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => choose("pap")}
              className="w-full bg-arx-action text-arx-on-action font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-arx-action-hover transition-colors"
            >
              <span>Choose the free drug program</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-xl p-4 bg-arx-neutral-100 border border-arx-borders">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 bg-arx-sky">
                <Sparkles className="w-5 h-5 text-arx-link" />
              </div>
              <div>
                <p className="font-bold text-base text-arx-slate">{PROGRAM.drugDisplayName} Copay Program</p>
                <p className="text-2xl font-bold mt-0.5 text-arx-link">
                  As low as $25<span className="text-sm font-semibold">/month</span>
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {["Works with your insurance", "No separate approval required", "Cancel anytime"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-arx-body-copy">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-arx-link" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => choose("copay")}
              className="w-full font-semibold py-3 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-link hover:bg-arx-sky/30 transition-colors"
            >
              <span>Enroll in the copay program</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] mt-3 leading-relaxed text-arx-body-copy">
            Government insurance beneficiaries (Medicare, Medicaid, VA, TRICARE) are not eligible for the {PROGRAM.drugDisplayName} Copay Program. Terms and conditions apply.
          </p>
        </div>
      </div>
    </main>
  );
}
