import { useNavigate } from "@/lib/portalRouter";
import { ArrowRight, ChevronRight, BookOpen, CreditCard } from "lucide-react";
import ProgramLogo from "@/components/brand/ProgramLogo";
import { PROGRAM } from "@/config/branding";
import { usePersonaState } from "@/engine/WorkflowProvider";

export default function PAApproved() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('patient');
  const flowType = workflowData.flowType;
  const pharmacyStatus = workflowData.pharmacyStatus;
  const paStatus = workflowData.paStatus;
  const isWorkflow1 = flowType === "Fax_QS_PA_Approved";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <main className="flex-grow pb-8">
        <div className="max-w-lg mx-auto px-4 space-y-5">

          {/* PA Approved card */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-center justify-between mb-4">
              <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain" />
              <span className="text-xs text-arx-body-copy">{dateStr}, {timeStr}</span>
            </div>

            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold leading-snug text-arx-slate">
                Great news! Assistivan is covered by your insurance
              </h2>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-arx-sky">
                <span className="text-lg font-bold text-arx-primary">Rx</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
              Now we can arrange for delivery. Complete a short form and choose a delivery date that works for you.
            </p>

            <button
              onClick={() => {
                navigate("/delivery-address");
              }}
              className="w-full bg-arx-primary text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:bg-arx-primary-dark transition-colors"
            >
              <span>Schedule delivery now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Copay card */}
          {!isWorkflow1 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold leading-snug text-arx-slate">
                  You might be eligible for the Assistivan Copay program!
                </h2>
                <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-arx-sky">
                  <CreditCard className="w-5 h-5 text-arx-primary" />
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-2 text-arx-body-copy">
                Based on your insurance information, you are eligible for the Copay Assistance program.
              </p>
              <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
                To help reduce your out-of-pocket cost, enroll in the program now.
              </p>

              <button
                onClick={() => navigate("/copay-enroll")}
                className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
              >
                <span>Enroll now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Prescriptions section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-arx-primary inline-block" />
                <span className="font-bold text-arx-slate text-base">Prescriptions</span>
              </div>
              <button className="flex items-center gap-1 text-sm font-semibold text-arx-primary hover:text-arx-primary-80 transition-colors">
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <button className="w-full flex items-center gap-4 text-arx-slate rounded-xl px-4 py-3.5 border-2 border-arx-borders hover:bg-arx-background transition-colors">
              <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-xs text-arx-body-copy">Pending delivery</p>
              </div>
              <ChevronRight className="w-5 h-5 text-arx-body-copy" />
            </button>
          </section>

          {/* Suggested section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-arx-primary inline-block" />
              <h3 className="font-semibold text-sm text-arx-primary">Suggested for you</h3>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="text-lg font-bold leading-snug text-arx-slate">Get ready for Assistivan</h4>
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-arx-sky">
                  <BookOpen className="w-5 h-5 text-arx-primary" />
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-2 text-arx-body-copy">
                Learn everything you need to know about your new prescription — from how to store it properly to how to take it safely.
              </p>
              <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
                We'll guide you step by step so you feel prepared from day one.
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full font-semibold py-3.5 rounded-lg border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
              >
                Learn more
              </button>
            </div>
          </section>

        </div>
    </main>
  );
}
